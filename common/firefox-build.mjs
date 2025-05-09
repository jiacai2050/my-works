import { readFileSync, writeFileSync } from 'fs';

export function rewriteManifest(manifestFile, id) {
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));

  const overwrite = {
    background: {
      scripts: ['background.js'],
      type: 'module',
    },
    browser_specific_settings: {
      gecko: {
        id: id,
      },
    },
  };

  for (const [key, value] of Object.entries(overwrite)) {
    manifest[key] = value;
  }

  writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
}
