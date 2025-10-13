'use strict';

import { getGlobalSwitch, setGlobalSwitch, getDynamicRules } from './common.js';

document.addEventListener('DOMContentLoaded', onload);

async function onload() {
  const enableSwitch = document.getElementById('enableSwitch');
  const moreSettings = document.getElementById('moreSettings');

  enableSwitch.checked = await getGlobalSwitch();
  // Listen for changes
  enableSwitch.addEventListener('change', async function () {
    const rawRules = this.checked ? await getDynamicRules() : '';
    const { success, error, preview } = await chrome.runtime.sendMessage({
      action: 'updateGlobalSwitch',
      value: this.checked,
      input: rawRules,
    });
    if (success) {
      await setGlobalSwitch(this.checked);
      console.log(`Rule: ${preview.length}`);
    } else {
      alert(`Update failed, error: ${error}`);
    }
  });

  // Open settings page
  moreSettings.addEventListener('click', function (e) {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}
