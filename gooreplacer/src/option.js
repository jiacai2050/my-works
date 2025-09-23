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

// 每段最大存储 7.5KB，给一些 margin
const CHUNK_SIZE = 7500;

async function getDynamicRules() {
  const all = await chrome.storage.sync.get(null);
  const keys = Object.keys(all).filter(k => k.startsWith('rules_part_'));
  if (keys.length === 0) return '';

  // 按序号排序后拼接
  keys.sort((a, b) => {
    const ai = parseInt(a.replace('rules_part_', ''), 10);
    const bi = parseInt(b.replace('rules_part_', ''), 10);
    return ai - bi;
  });

  return keys.map(k => all[k]).join('');
}

async function setDynamicRules(value) {
  // 先清理旧的规则分片
  const all = await chrome.storage.sync.get(null);
  const oldKeys = Object.keys(all).filter(k => k.startsWith('rules_part_'));
  if (oldKeys.length > 0) {
    await chrome.storage.sync.remove(oldKeys);
  }

  // 分片存储
  const chunks = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }

  const obj = {};
  chunks.forEach((chunk, idx) => {
    obj[`rules_part_${idx}`] = chunk;
  });

  await chrome.storage.sync.set(obj);
}
