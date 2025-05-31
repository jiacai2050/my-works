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
      navigator.clipboard.writeText(document.getElementById(id).textContent);
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
  inputImportFile.addEventListener('change', handleFiles, false);
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

async function handleFiles() {
  if (!this.files || this.files.length === 0) {
    alert('Please select a file to import.');
    return;
  }
  const file = this.files[0];
  await importTexts(file);
}

async function importTexts(file) {
  const fileType = file.type;
  const fileSize = file.size;
  console.log('Importing file:', file, 'Size:', humanSize(fileSize));

  const reader = new FileReader();
  reader.onload = async function (event) {
    const body = event.target.result.trim();
    switch (fileType) {
      case 'text/csv':
        await importPocket(body);
        break;
      case 'application/json':
        await importJson(body);
        break;
      default:
        throw new Error('Unsupported file type: ' + fileType);
    }
  };
  reader.readAsText(file);
}

const StorageFormat = Object.freeze({
  // Version 0: Initial version
  // Texts are stored as an array of objects with id, text, url and createdAt fields.
  ZERO: 0,
});

function formatFromVersion(version) {
  const parts = version.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid version format. Expected format: x.y.z');
  }
  // Each part should less than 1000
  const _numVersion =
    Number(parts[0]) * 1000_000 + Number(parts[1]) * 1000 + Number(parts[2]);

  // For now we always return ZERO.
  return StorageFormat.ZERO;
}

async function importJson(jsonContent) {
  const json = JSON.parse(jsonContent);
  if (!json.texts || !Array.isArray(json.texts)) {
    alert('Invalid JSON format. Expected an array of texts.');
    return;
  }
  const format = formatFromVersion(json.version);
  const items = {};
  switch (format) {
    case StorageFormat.ZERO: {
      // Version 0: Initial version
      // Texts are stored as an array of objects with id, text, url and createdAt fields.
      for (const text of json.texts) {
        const [id, content, url, createdAt] = text;
        console.log(id, content, url, createdAt);
        if (!id || !content || !url || !createdAt) {
          alert(
            `Invalid text format. Each text must have id, text, url and createdAt fields. line: ${JSON.stringify(text)}`,
          );
          return;
        }
        const newText = await db.prepareText(content, url, createdAt, id);
        Object.assign(items, newText);
      }
      break;
    }
    default:
      throw new Error(`Unsupported storage format: ${format}`);
  }

  await db.saveItems(items);
  alert(
    `Import Success! input:${json.texts.length}, imported:${Object.keys(items).length}`,
  );
  window.location.reload();
}

async function importPocket(csvContent) {
  const lines = csvContent.split('\n');
  let successCount = 0;
  const items = {};
  for (const line of lines) {
    try {
      const { title, url, createdAt } = parsePocketRow(line);
      console.log(createdAt);
      if (title === 'title' || url === 'url') {
        // Skip header line
        continue;
      }
      const createdAtMs = createdAt * 1000; // Convert to milliseconds
      const newText = await db.prepareText(
        title,
        url,
        createdAtMs,
        `id-${createdAtMs}`,
      );
      Object.assign(items, newText);
      successCount += 1;
    } catch (e) {
      console.error(e);
      alert(
        `Error when parsing line: ${line}, processed:${successCount}, error:\n${e.message}`,
      );
      return;
    }
  }

  await db.saveItems(items);
  alert(
    `Import Success! input:${successCount}, imported:${Object.keys(items).length}`,
  );
  window.location.reload();
}

function parsePocketRow(inputString) {
  const parts = [];
  let inQuote = false;
  let currentPart = '';

  for (let i = 0; i < inputString.length; i++) {
    const char = inputString[i];

    if (char === '"') {
      inQuote = !inQuote; // 切换引用状态
      // 如果是开头的引号，不添加到 currentPart；如果是结尾的引号，也不添加到 currentPart
      if (i === 0 || inputString[i - 1] === ',') {
        // 假设开头或紧跟逗号的引号是标题的开始
        continue;
      }
      if (i === inputString.length - 1 || inputString[i + 1] === ',') {
        // 假设结尾或紧跟逗号的引号是标题的结束
        continue;
      }
    }

    if (char === ',' && !inQuote) {
      parts.push(currentPart);
      currentPart = '';
    } else {
      currentPart += char;
    }
  }
  parts.push(currentPart); // 添加最后一个部分

  // 解析并返回结构化数据
  return {
    title: parts[0].trim(),
    url: parts[1].trim(),
    createdAt: Number(parts[2]),
    // those fieldsare not used in this extension
    // tags: parts[3],
    // status: parts[4]
  };
}
