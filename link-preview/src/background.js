'use strict';

const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

// https://stackoverflow.com/a/74425434/2163429
// Enable session storage in content script.
// Firefox will complain about this function
// chrome.storage.session.setAccessLevel is not a function
if (!isFirefox) {
  chrome.storage.session.setAccessLevel({
    accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS',
  });
}

chrome.action.onClicked.addListener(function () {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchPage' && request.url) {
    fetchPage(request.url)
      .then((ret) => {
        sendResponse({ success: true, ...ret });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

async function fetchPage(url) {
  const typeOnly = await maybeFetchType(url);
  if (typeOnly) {
    return { string: typeOnly };
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`${response.status}\n${response.url}`);
  }

  const string = await response.text();
  const mimeType = response.headers.get('content-type');
  if (!mimeType || mimeType.includes('html')) {
    return { string: string, isHtml: true };
  }

  const ret = `${mimeType}\n${response.url}`;
  return { string: ret };
}

const BINARY_SUFFIXES = [
  'jpg',
  'png',
  'webp',
  'svg',
  'gif',
  'pdf',
  'mp4',
  'mobi',
  'epub',
  'xml',
  'zip',
  'tar.gz',
];

async function maybeFetchType(url) {
  let isBinary = false;
  for (const suffix of BINARY_SUFFIXES) {
    if (url.endsWith(suffix)) {
      isBinary = true;
      break;
    }
  }
  if (!isBinary) {
    return null;
  }

  const response = await fetch(url, {
    method: 'OPTIONS',
  });
  const contentType = response.headers.get('content-type');
  if (contentType && !contentType.includes('html')) {
    return `${contentType}\n${response.url}`;
  }

  return null;
}
