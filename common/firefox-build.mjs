import { readFileSync, writeFileSync } from 'fs';

export function rewriteManifest(manifestFile, id) {
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));

  const bgScript = manifest.background?.service_worker || 'background.js';
  const overwrite = {
    background: {
      scripts: [bgScript],
      type: 'module',
    },
    browser_specific_settings: {
      gecko: {
        id: id,
        // https://blog.mozilla.org/addons/2025/10/23/data-collection-consent-changes-for-new-firefox-extensions/
        data_collection_permissions: {
          required: ['none'],
        },
      },
    },
  };

  for (const [key, value] of Object.entries(overwrite)) {
    manifest[key] = value;
  }

  writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
}
