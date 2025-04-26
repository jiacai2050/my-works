import manifest from './src/manifest.json' assert { type: 'json' };
import { writeFileSync } from 'fs';

const overwrite = {
  background: {
    scripts: ['background.js'],
  },
  browser_specific_settings: {
    gecko: {
      id: 'gooreplacer@liujiacai.net',
    },
  },
};

for (const [key, value] of Object.entries(overwrite)) {
  manifest[key] = value;
}

writeFileSync('./src/manifest.json', JSON.stringify(manifest, null, 2));
