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

async function getDynamicRules() {
  const opt = await chrome.storage.sync.get({ rules: '' });
  return opt['rules'];
}

async function setDynamicRules(value) {
  await chrome.storage.sync.set({ rules: value });
}
