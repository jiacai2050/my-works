'use strict';

import { Options } from './module.js';

const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

async function getTexts() {
  return await chrome.storage.sync.get();
}

async function clearTexts() {
  return await chrome.storage.sync.clear();
}

async function removeTexts(id) {
  return await chrome.storage.sync.remove(id);
}

async function textStats() {
  // Only firefox local storage need this
  // if (isFirefox) {
  //   // https://bugzilla.mozilla.org/show_bug.cgi?id=1385832#c20
  //   return new TextEncoder().encode(
  //     Object.entries(await browser.storage.local.get())
  //       .map(([key, value]) => key + JSON.stringify(value))
  //       .join(''),
  //   ).length;
  // }

  return await chrome.storage.sync.getBytesInUse(null);
}

function removePrefix(str, prefix) {
  if (str.startsWith(prefix)) {
    return str.slice(prefix.length);
  }
  return str; // Return the original string if it doesn't start with the prefix
}

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
        await removeTexts(id);
        btn.closest('tr').remove();
      }
      break;
    default:
      alert('Unknown action: ' + action);
  }
}

async function refresh(tableElement) {
  let rows = [];
  for (const entry of Object.entries(await getTexts())) {
    const id = entry[0];
    if (!id.startsWith('id-')) {
      continue;
    }
    const [text, url] = entry[1];
    const createdAt = parseInt(removePrefix(id, 'id-'), 10);
    // console.table(id, text, url, createdAt);
    rows.push([id, text, url, createdAt]);
  }
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

  let opt = new Options(chrome.storage.sync);
  // console.log(await opt.dump());

  const table = document.getElementById('text-list');

  table.addEventListener('click', function (event) {
    if (event.target && event.target.tagName === 'BUTTON') {
      const button = event.target;
      const action = button.textContent.toLowerCase();
      const row = button.closest('tr');
      const idElement = row.querySelector('[id^="id-"]');
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

  document.getElementById('input-size').value = humanSize(await textStats());

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
