'use strict';

/* global getPosition:readonly, getMaxLength:readonly metaCache:readonly
   setPosition:readonly, getPerSiteConfig:readonly, setPerSiteConfig:readonly
   setMaxLength:readonly, humanSize:readonly */

const validPositions = Object.freeze([
  'top',
  'bottom',
  'left',
  'right',
  'top-right',
  'top-left',
  'bottom-right',
  'bottom-left',
]);
document.addEventListener('DOMContentLoaded', onload);

async function onload() {
  const manifest = chrome.runtime.getManifest();
  document.getElementById('version').textContent = manifest.version;
  document.getElementById('description').textContent = manifest.description;
  document.getElementById('home').href = manifest.homepage_url;

  const position = document.getElementById('position');
  validPositions.forEach((pos) => {
    const option = document.createElement('option');
    option.value = pos;
    option.textContent = pos;
    position.appendChild(option);
  });
  const defaultPosition = await getPosition([]);
  position.value = defaultPosition;
  position.onchange = async function () {
    await setPosition(position.value);
  };

  const maxLength = document.getElementById('max-length');
  const defaultMaxLength = await getMaxLength([]);
  maxLength.value = defaultMaxLength;
  maxLength.oninput = async function () {
    await setMaxLength(maxLength.value);
  };

  const perSiteConfig = document.getElementById('per-site-config');
  perSiteConfig.value = stringifyConfig(await getPerSiteConfig());
  const btnConfig = document.getElementById('btn-config');
  btnConfig.textContent = perSiteConfig.hasAttribute('disabled')
    ? 'Edit'
    : 'Save';
  btnConfig.onclick = async function () {
    if (perSiteConfig.hasAttribute('disabled')) {
      // Enter input mode
      perSiteConfig.removeAttribute('disabled');
      btnConfig.textContent = 'Save';
    } else {
      // Enter review mode
      try {
        const str = parseConfig(perSiteConfig.value);
        await setPerSiteConfig(str);
        perSiteConfig.setAttribute('disabled', true);
        btnConfig.textContent = 'Edit';
        alert(`Succeed, ${str.length} rules saved!`);
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

// return [ [domain, [k1,v1], [k2,v2]], ...]
const validKeys = Object.freeze([
  'status',
  'encoding',
  'max-length',
  'position',
]);
const validValues = Object.freeze({
  position: validPositions,
  status: ['on', 'off'],
  'max-length': (str) => {
    const length = Number(str);
    if (isNaN(length)) {
      throw new Error(
        `Invalid config, max-length config must be number, current:${str}`,
      );
    }
    return length;
  },
});

function parseConfig(str) {
  if (str.trim() === '') {
    throw new Error('Input cannot be empty!');
  }

  const lines = str.trim().split('\n');
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0 || line[0] === '#') {
      continue;
    }

    const parts = line.split(',');
    const domain = parts[0].trim();
    if (domain === '') {
      throw new Error(`There are empty values in line ${i + 1}`);
    }

    const rule = [domain];
    for (const kv of parts.slice(1)) {
      const pair = kv.split('=');
      if (pair.length !== 2) {
        throw new Error(`There is an invalid setting (${kv}) in line ${i + 1}`);
      }
      let [key, value] = pair;
      if (!validKeys.includes(key)) {
        throw new Error(`There are known config(${key}) in line ${i + 1}`);
      }
      const values = validValues[key];
      if (values) {
        if (typeof values === 'function') {
          value = values(value);
        } else if (!values.includes(value)) {
          throw new Error(
            `Invalid config value(${value}) for ${key} in line ${i + 1}`,
          );
        }
      }
      rule.push([key, value]);
    }

    if (rule.length < 2) {
      throw new Error(
        `There is no config value for ${domain} in line ${i + 1}`,
      );
    }
    result.push(rule);
  }

  return result;
}

// configs is [[domain, [k, v]... ], [...] ]
function stringifyConfig(configs) {
  return configs
    .map(([domain, ...keyValues]) => {
      const keyValueString = keyValues.map(([k, v]) => `${k}=${v}`).join(',');
      return `${domain},${keyValueString}`;
    })
    .join('\n');
}
