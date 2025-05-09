'use strict';

import {
  metaCache,
  getPosition,
  setPosition,
  getMaxLength,
  setMaxLength,
  getDomainEncoding,
  setDomainEncoding,
  humanSize,
} from './common.js';

document.addEventListener('DOMContentLoaded', onload);

async function onload() {
  const manifest = chrome.runtime.getManifest();
  document.getElementById('version').textContent = manifest.version;
  document.getElementById('description').textContent = manifest.description;
  document.getElementById('home').href = manifest.homepage_url;

  const position = document.getElementById('position');
  const defaultPosition = await getPosition();
  position.value = defaultPosition;
  position.onchange = async function () {
    await setPosition(position.value);
  };

  const maxLength = document.getElementById('max-length');
  const defaultMaxLength = await getMaxLength();
  maxLength.value = defaultMaxLength;
  maxLength.oninput = async function () {
    await setMaxLength(maxLength.value);
  };

  const domainEncoding = document.getElementById('domain-encoding');
  const defaultDomainEncoding = await getDomainEncoding();
  domainEncoding.value = stringifyDomainEncoding(defaultDomainEncoding);
  const btnEncoding = document.getElementById('btn-encoding');
  btnEncoding.textContent = domainEncoding.hasAttribute('disabled')
    ? 'Edit'
    : 'Save';
  btnEncoding.onclick = async function () {
    if (domainEncoding.hasAttribute('disabled')) {
      // Enter input mode
      domainEncoding.removeAttribute('disabled');
      btnEncoding.textContent = 'Save';
    } else {
      // Enter review mode
      try {
        const encodings = parseDomainEncoding(domainEncoding.value);
        await setDomainEncoding(encodings);
        domainEncoding.setAttribute('disabled', true);
        btnEncoding.textContent = 'Edit';
        alert(`Succeed, ${encodings.length} rules saved!`);
      } catch (e) {
        alert(`${e}`);
      }
    }
  };

  const cacheSize = document.getElementById('cache-size');
  cacheSize.textContent = humanSize(await metaCache.getBytesInUse());

  document.getElementById('clear-cache').onclick = async function () {
    if (confirm('Are you sure?')) {
      await metaCache.clear();
      window.location.reload();
    }
  };
}

// return [ [domain, encoding], ...]
function parseDomainEncoding(encodings) {
  if (!encodings || encodings.trim() === '') {
    throw new Error('Input cannot be empty!');
  }

  const lines = encodings.trim().split('\n');
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(',');

    if (parts.length !== 2) {
      throw new Error(
        `Error occurs in line ${i + 1}, should be 'domain,encoding' format`,
      );
    }

    const domain = parts[0].trim();
    const encoding = parts[1].trim();

    if (domain === '' || encoding === '') {
      throw new Error(`There are empty values in line ${i + 1}`);
    }

    result.push([domain, encoding]);
  }

  return result;
}

// return [ [domain, encoding], ...]
function stringifyDomainEncoding(encodings) {
  return encodings
    .map(([domain, encoding]) => `${domain},${encoding}`)
    .join('\n');
}
