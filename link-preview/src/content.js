'use strict';

/* global getPosition:readonly, getMaxLength:readonly metaCache:readonly getDomainEncoding:readonly */

const linkSelector = 'a[href]:not([href=""]):not([href^="#"])';
const links = document.querySelectorAll(linkSelector);
// console.log(`Total links:${links.length}`);

links.forEach((link) => {
  link.addEventListener('mouseover', handleLinkHover);
});

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === 'A' && node.href) {
            node.addEventListener('mouseover', handleLinkHover);
          }

          const childLinks = node.querySelectorAll(linkSelector);
          childLinks.forEach((link) => {
            link.addEventListener('mouseover', handleLinkHover);
          });
        }
      });
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

async function handleLinkHover(event) {
  const link = event.currentTarget;
  await handleLink(link);
}

async function handleLink(link) {
  if (link.href === '' || link.href.startsWith('#')) {
    return;
  }

  link.setAttribute('role', 'tooltip');
  link.setAttribute('data-microtip-position', await getPosition());
  link.setAttribute('data-microtip-size', 'large');
  try {
    const value = await fetchLinkInfo(link);
    const maxLength = await getMaxLength();
    const label =
      value.length > maxLength ? value.substring(0, maxLength) : value;
    link.setAttribute('aria-label', label);
  } catch (e) {
    link.setAttribute('aria-label', e.toString());
    console.error(`Fetch link info failed, url:${link.href}, err:${e}`);
  }
}

async function fetchLinkInfo(link) {
  const url = link.href;
  if (!url.startsWith('http')) {
    return url;
  }

  let cached = await metaCache.get(url);
  if (cached) {
    return cached;
  }

  const customEncodings = await getDomainEncoding();
  let encoding;
  for (const [domain, expected] of customEncodings) {
    if (domain === link.hostname) {
      encoding = expected;
      break;
    }
  }

  console.log(link.hostname, encoding);
  const { success, string, isHtml, error } = await chrome.runtime.sendMessage({
    action: 'fetchPage',
    url: url,
    encoding: encoding,
  });
  if (!success) {
    throw new Error(error);
  }

  if (!isHtml) {
    await metaCache.set(url, string);
    return string;
  }

  const { title, description } = parseHtml(string);
  let value = 'NA';
  if (title) {
    value = title;
  }
  if (description) {
    if (value === 'NA') {
      value = description;
    } else {
      value += `\n️\n${description}`;
    }
  }

  await metaCache.set(url, value);
  return value;
}

function parseHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const title = doc.title;
  let description = parseDescription(doc);

  return { title: title, description: description };
}

function parseDescription(doc) {
  const names = ['description', 'og:description', 'twitter:description'];
  const metas = [...doc.querySelectorAll('meta')];
  for (const name of names) {
    for (const meta of metas) {
      const content = meta.getAttribute('content');
      if (meta.getAttribute('name') === name && content) {
        return content.trim();
      }
    }
  }
}
