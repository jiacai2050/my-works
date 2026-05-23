// DraftPilot - Popup Settings
import { DraftPilotStorage } from '../shared/storage.js';

const $ = (id) => document.getElementById(id);
const _m = (key) => chrome.i18n.getMessage(key);

// Apply i18n to DOM
document.querySelectorAll('[data-i18n]').forEach((el) => {
  el.textContent = _m(el.dataset.i18n);
});
document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
  el.placeholder = _m(el.dataset.i18nPlaceholder);
});

// Load saved settings
DraftPilotStorage.getSettings().then((s) => {
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
      $('status').textContent = _m('saved');
      setTimeout(() => ($('status').textContent = ''), 2000);
    },
  );
});

// Toggle key visibility
$('toggleKey').addEventListener('click', () => {
  const input = $('apiKey');
  input.type = input.type === 'password' ? 'text' : 'password';
});
