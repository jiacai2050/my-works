import { readFileSync, writeFileSync } from 'fs';

const manifest = JSON.parse(readFileSync('./src/manifest.json', 'utf8'));

const overwrite = {
  background: {
    scripts: ['background.js'],
    type: 'module',
  },
  browser_specific_settings: {
    gecko: {
      id: 'liujiacai@yandex.com',
    },
  },
};

for (const [key, value] of Object.entries(overwrite)) {
  manifest[key] = value;
}

writeFileSync('./src/manifest.json', JSON.stringify(manifest, null, 2));
