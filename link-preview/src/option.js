'use strict';

document.addEventListener("DOMContentLoaded", onload);

async function onload() {
  const footer = document.getElementById("footer");
  const home = document.getElementById("home");
  const manifest = chrome.runtime.getManifest();
  footer.textContent = `Current version: ${manifest.version}`;
  home.href = manifest.homepage_url;

  const position = document.getElementById("position");
  const defaultPosition = await getPosition();
  position.value = defaultPosition;
  position.onchange = async function() {
    await setPosition(position.value);
  };

  const maxLength = document.getElementById("max-length");
  const defaultMaxLength = await getMaxLength();
  maxLength.value = defaultMaxLength;
  maxLength.oninput = async function() {
    await setMaxLength(maxLength.value);
  };

  const cacheSize = document.getElementById("cache-size");
  cacheSize.textContent = humanSize(await cache.getBytesInUse());

  document.getElementById("clear-cache").onclick = async function() {
    if(confirm("Are you sure?")) {
      await cache.clear();
      window.location.reload();
    }
  };
}
