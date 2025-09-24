'use strict';

document.addEventListener('DOMContentLoaded', onload);

async function onload() {
  const manifest = chrome.runtime.getManifest();
  document.getElementById('version').textContent = manifest.version;
  document.getElementById('home').href = manifest.homepage_url;
  document.getElementById('description').textContent = manifest.description;

  const rules = document.getElementById('rules');
  const defaultRules = await getDynamicRules();
  rules.value = defaultRules;
  const ruleRowNum = defaultRules.split('\n').length;
  if (ruleRowNum > 20) {
    rules.setAttribute('rows', ruleRowNum + 1);
  }

  const previewPre = document.getElementById('preview');
  const ruleNumSpan = document.getElementById('rule-num');
  const { success, preview, error } = await chrome.runtime.sendMessage({
    action: 'preview',
    input: rules.value,
  });
  if (!success) {
    previewPre.textContent = `Invalid rules: error:${error}`;
  } else {
    previewPre.textContent = JSON.stringify(preview, null, 2);
    ruleNumSpan.textContent = preview.length;
  }

  const btnRule = document.getElementById('btn-rule');
  btnRule.textContent = rules.hasAttribute('disabled') ? 'Edit' : 'Save';
  btnRule.onclick = async function () {
    if (rules.hasAttribute('disabled')) {
      // Enter input mode
      rules.removeAttribute('disabled');
      btnRule.textContent = 'Save';
    } else {
      // Enter review mode
      try {
        const { success, preview, error } = await chrome.runtime.sendMessage({
          action: 'updateDynamicRules',
          input: rules.value,
        });
        if (!success) {
          alert(`Update failed, error:${error}`);
          return;
        }

        await setDynamicRules(rules.value);
        rules.setAttribute('disabled', true);
        btnRule.textContent = 'Edit';
        previewPre.textContent = JSON.stringify(preview, null, 2);
        ruleNumSpan.textContent = preview.length;
        alert(`Succeed, ${preview.length} rules saved!`);
      } catch (e) {
        alert(`${e}`);
      }
    }
  };
}

// Chrome storage.sync has a per-item quota of 8KB (8192 bytes) and a total quota per extension.
// See: https://developer.chrome.com/docs/extensions/reference/storage/#property-sync
// To avoid exceeding the per-item limit, we store rules in up to 5 separate keys, each holding up to 7KB (7000 characters).
// This provides a safety margin below the 8KB limit and helps prevent quota errors.
const MAX_KEYS = 5; // Use up to 5 keys for storing rules (rules, rules2, ..., rules5)
const CHUNK_SIZE = 7000; // Each key stores up to 7KB (~7000 characters) to stay under the 8KB per-item limit

async function getDynamicRules() {
  const ruleKeys = Array.from(
    { length: MAX_KEYS },
    (_, i) => (i === 0 ? 'rules' : `rules${i + 1}`),
  );
  const defaults = Object.fromEntries(ruleKeys.map((key) => [key, '']));
  const data = await chrome.storage.sync.get(defaults);
  return ruleKeys.map((key) => data[key]).join('');
}

async function setDynamicRules(value) {
  if (value.length > MAX_KEYS * CHUNK_SIZE) {
    throw new Error(
      `Rule length is too large, max: ${MAX_KEYS * CHUNK_SIZE}, current: ${value.length}`,
    );
  }

  const parts = [];
  for (
    let i = 0;
    i < value.length;
    i += CHUNK_SIZE
  ) {
    parts.push(value.slice(i, i + CHUNK_SIZE));
  }

  // Construct new key-value pairs, reset to empty string when parts[i] is null.
 const obj = Array.from({ length: MAX_KEYS }).reduce((acc, _, i) => {
    const key = i === 0 ? 'rules' : `rules${i + 1}`;
    acc[key] = parts[i] || '';
    return acc;
  }, {});

  await chrome.storage.sync.set(obj);
}
