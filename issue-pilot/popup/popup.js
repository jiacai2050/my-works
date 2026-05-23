// IssuePilot - Popup Settings
import { IssuePilotStorage } from '../shared/storage.js';

const $ = (id) => document.getElementById(id);

// Load saved settings
IssuePilotStorage.getSettings().then((s) => {
  $('provider').value = s.provider;
  $('apiKey').value = s.apiKey;
  $('model').value = s.model;
  $('tone').value = s.defaultTone;
  $('baseUrl').value = s.baseUrl;
  $('ghToken').value = s.ghToken;
});

// Save
$('save').addEventListener('click', () => {
  chrome.storage.local.set(
    {
      provider: $('provider').value,
      apiKey: $('apiKey').value,
      model: $('model').value,
      defaultTone: $('tone').value,
      baseUrl: $('baseUrl').value.trim(),
      ghToken: $('ghToken').value.trim(),
    },
    () => {
      $('status').textContent = '✓ 已保存';
      setTimeout(() => ($('status').textContent = ''), 2000);
    },
  );
});

// Toggle key visibility
$('toggleKey').addEventListener('click', () => {
  const input = $('apiKey');
  input.type = input.type === 'password' ? 'text' : 'password';
});
