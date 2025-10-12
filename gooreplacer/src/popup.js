'use strict';

import { getGlobalSwitch, setGlobalSwitch, getDynamicRules } from './common.js';

document.addEventListener('DOMContentLoaded', onload);

async function onload() {
  const enableSwitch = document.getElementById('enableSwitch');
  const moreSettings = document.getElementById('moreSettings');

  enableSwitch.checked = await getGlobalSwitch();
  // Listen for changes
  enableSwitch.addEventListener('change', async function () {
    await setGlobalSwitch(this.checked);
    const rawRules = this.checked ? await getDynamicRules() : '';
    const { success, error } = await chrome.runtime.sendMessage({
      action: 'updateGlobalSwitch',
      value: this.checked,
      input: rawRules,
    });
    console.log('Switch changed:', this.checked, success, error);
    if (!success) {
      alert(`Update failed, error:${error}`);
    }
  });

  // Open settings page
  moreSettings.addEventListener('click', function (e) {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}
