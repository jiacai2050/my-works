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
  if (isFirefox) {
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/permissions/request
    const perm = { origins: ['https://*/*', 'http://*/*'] };
    chrome.permissions.request(perm);
  } else {
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchPage' && request.url) {
    fetchPage(request.url, request.encoding)
      .then((ret) => {
        sendResponse({ success: true, ...ret });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

async function fetchPage(url, encoding) {
  const typeOnly = await maybeFetchType(url);
  if (typeOnly) {
    return { string: typeOnly };
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`${response.status}\n${response.url}`);
  }

  let string;
  if (encoding) {
    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder(encoding);
    string = decoder.decode(buffer);
  } else {
    string = await response.text();
  }
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
  if (!response.ok) {
    return null;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && !contentType.includes('html')) {
    return `${contentType}\n${response.url}`;
  }
}
