'use strict';

const linkSelector = 'a[href]:not([href=""]):not([href^="#"])';
const links = document.querySelectorAll(linkSelector);

links.forEach(link => {
  link.addEventListener('mouseover', handleLinkHover);
});

const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    if (mutation.addedNodes) {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === 'A' && node.href) {
            node.addEventListener('mouseover', handleLinkHover);
          }

          const childLinks = node.querySelectorAll(linkSelector);
          childLinks.forEach(link => {
            link.addEventListener('mouseover', handleLinkHover);
          });
        }
      });
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

async function handleLinkHover(event) {
  const link = event.currentTarget;
  await handleLink(link);
}

async function handleLink(link) {
  if (link.href === '' || link.href.startsWith('#')) {
    return;
  }

  const pos = await getPosition();
  link.setAttribute('role', 'tooltip');
  link.setAttribute('data-microtip-position', pos);
  link.setAttribute('data-microtip-size', 'large');
  try {
    let value = await fetchLinkInfo(link);
    let maxLength = await getMaxLength();
    if(value.length > maxLength) {
      value = value.substring(0, maxLength) + '...';
    }
    link.setAttribute('aria-label', value);
  } catch(e) {
    link.setAttribute('aria-label', e.toString());
    console.error(`Fetch link info failed, url:${link.href}, err:${e}`);
  }
}

async function fetchLinkInfo(link) {
  const url = link.href;
  if (!url.startsWith('http')) {
    return url;
  }

  const cachedValue = await cache.get(url);
  if (cachedValue) {
    return cachedValue;
  }

  const {
    success,
    string,
    isHtml,
    error
  } = await chrome.runtime.sendMessage({ action: "fetchPage", url: url });
  if (!success) {
    throw new Error(error);
  }

  if(!isHtml) {
    await cache.set(url, string);
    return string;
  }

  const {title, description} = parseHtml(string);
  let value = 'NA';
  if(title) {
    value = title;
  }
  if(description) {
    if (value === 'NA') {
      value = description;
    } else {
      value += '\n️\n' + description;
    }
  }

  await cache.set(url, value);
  return value;
}

function parseHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const title = doc.title;
  let description = parseDescription(doc);

  return {title: title, description: description};
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
