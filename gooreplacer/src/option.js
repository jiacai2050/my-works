'use strict';

document.addEventListener('DOMContentLoaded', onload);

async function onload() {
  const footer = document.getElementById('footer');
  const home = document.getElementById('home');
  const manifest = chrome.runtime.getManifest();
  footer.textContent = `Current version: ${manifest.version}`;
  home.href = manifest.homepage_url;

  const rules = document.getElementById('rules');
  const defaultRules = await getDynamicRules();
  rules.value = defaultRules;

  const previewPre = document.getElementById('preview');
  const { success, preview, error } = await chrome.runtime.sendMessage({
    action: 'preview',
    input: rules.value,
  });
  if (!success) {
    previewPre.textContent = `Invalid rules: error:${error}`;
  } else {
    previewPre.textContent = JSON.stringify(preview, null, 2);
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
