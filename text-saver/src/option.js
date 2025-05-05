'use strict';

import { Database } from './module.js';

const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
const db = Database.getInstance();

function humanSize(size) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (i < units.length - 1 && size >= 1024) {
    size /= 1024;
    i += 1;
  }
  return `${size.toFixed(2)} ${units[i]}`;
}

async function textAction(id, action, btn) {
  switch (action) {
    case 'copy':
      navigator.clipboard.writeText(
        document.getElementById(`${id}`).textContent,
      );
      btn.textContent = 'Copied!';
      setTimeout(() => {
        btn.textContent = 'Copy';
      }, 1000);
      break;
    case 'delete':
      if (confirm('Are you sure?')) {
        await db.remove(id);
        btn.closest('tr').remove();
      }
      break;
    default:
      alert('Unknown action: ' + action);
  }
}

async function refresh(tableElement) {
  const rows = await db.getTexts();
  // sort by createdAt desc
  rows.sort((a, b) => b[3] - a[3]);
  let table = [];
  for (const row of rows) {
    let [id, text, url, createdAt] = row;
    table.push(`<tr>
<td id="${id}">${text}</td>
<td>${new Date(createdAt).toLocaleString('en-GB')}</td>
<td>
  <a href="${url}">Goto</a><br/>
  <button>Copy</button>
  <button>Delete</button>
</td>
      </tr>`);
  }

  tableElement.innerHTML = table.join('');
}

window.onload = async function () {
  const manifest = chrome.runtime.getManifest();
  document.getElementById('version').textContent = manifest.version;
  document.getElementById('home').href = manifest.homepage_url;
  document.getElementById('description').textContent = manifest.description;
  const table = document.getElementById('text-list');
  table.addEventListener('click', function (event) {
    if (event.target && event.target.tagName === 'BUTTON') {
      const button = event.target;
      const action = button.textContent.toLowerCase();
      const row = button.closest('tr');
      const idElement = row.querySelector('td:first-child'); // row.querySelector('[id^="id-"]');
      try {
        textAction(idElement.id, action, button);
      } catch (e) {
        console.error(e);
        alert(e);
      }
    }
  });

  document.getElementById('btn-clear').onclick = async function () {
    if (confirm('Are you sure to clear all saved texts?')) {
      await clearTexts();
      await refresh(table);
    }
  };
  document.getElementById('btn-export').onclick = async function () {
    const texts = await getTexts();
    await createDownload(texts);
  };

  const engineSelect = document.getElementById('storage-engine');
  engineSelect.value = await db.getEngine();
  engineSelect.onchange = async function () {
    await db.setEngine(engineSelect.value);
    window.location.reload();
  };

  document.getElementById('input-size').value = humanSize(
    await db.getBytesInUse(),
  );

  document.getElementById('export-old').onclick = exportOldTexts;
  await refresh(table);
};

async function createDownload(texts) {
  const { version, author, homepage_url } = await chrome.runtime.getManifest();
  const payload = {
    homepage: homepage_url,
    version: version,
    author: author,
    createdAt: new Date().toLocaleString(),
    texts: texts,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  chrome.downloads.download({
    url: URL.createObjectURL(blob),
    saveAs: true,
    filename: 'saved-texts.json',
  });
}

// This function is designed to export legacy data stored in chrome.storage.local.
// It is intentionally using local storage instead of sync storage to handle older data.
async function exportOldTexts() {
  const texts = await chrome.storage.local.get();
  await createDownload(texts);
}
