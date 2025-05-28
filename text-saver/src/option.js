'use strict';

import { Database } from './module.js';

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
  <a class="button" href="${url}">Goto</a><br/>
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
      await db.clear();
      await refresh(table);
    }
  };
  document.getElementById('btn-export').onclick = async function () {
    const texts = await db.getTexts();
    await createDownload(texts);
  };
  const inputImportFile = document.getElementById('import-file');
  inputImportFile.addEventListener("change", importTexts, false);
  document.getElementById('btn-import').onclick = async function () {
    inputImportFile.click();
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

async function importTexts() {
  if (!this.files || this.files.length === 0) {
    alert('Please select a file to import.');
    return;
  }
  const file = this.files[0];

  const reader = new FileReader();
  reader.onload = async function (event) {
    try {
      const body = event.target.result;
      console.log('Importing file:', body);
      return;
      const data = JSON.parse(event.target.result);
      if (!data.texts || !Array.isArray(data.texts)) {
        throw new Error('Invalid file format');
      }
      for (const text of data.texts) {
        await db.addText(text[0], text[1], text[2], text[3]);
      }
      alert('Import successful!');
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert('Import failed: ' + e.message);
    }
  };
  reader.readAsText(file);
}
