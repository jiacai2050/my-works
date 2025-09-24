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
  // 一次性取多个 key
  const defaults = {
    rules: '',
    rules2: '',
    rules3: '',
    rules4: '',
    rules5: '',
  };
  const data = await chrome.storage.sync.get(defaults);
  return [data.rules, data.rules2, data.rules3, data.rules4, data.rules5].join(
    '',
  );
}

async function setDynamicRules(value) {
  // 先检测长度
  if (value.length > MAX_KEYS * CHUNK_SIZE) {
    throw new Error(
      `Rule length is too large, max: ${MAX_KEYS * CHUNK_SIZE}, current: ${value.length}`,
    );
  }

  // 切分为多个 key
  const parts = [];
  for (
    let i = 0;
    i < value.length && parts.length < MAX_KEYS;
    i += CHUNK_SIZE
  ) {
    parts.push(value.slice(i, i + CHUNK_SIZE));
  }

  // 构造存储对象，未用到的 key 清空
  const obj = {
    rules: parts[0] || '',
    rules2: parts[1] || '',
    rules3: parts[2] || '',
    rules4: parts[3] || '',
    rules5: parts[4] || '',
  };

  await chrome.storage.sync.set(obj);
}
