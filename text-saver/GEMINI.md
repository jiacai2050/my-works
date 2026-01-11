# Text Saver

## Project Overview
Text Saver is a browser extension (Chrome, Firefox, Edge) that allows users to select text, links, or images on a webpage and save them instantly via the context menu. It provides a simple interface to manage, export, and import saved snippets.

## Key Technologies
- **Platform:** Web Extension (Manifest V3)
- **Languages:** JavaScript (ES Modules), HTML, CSS
- **Storage:** `chrome.storage.sync` (for cross-device access) and `chrome.storage.local` (implied for larger data if needed, uses `unlimitedStorage` permission).
- **Styling:** `simple.min.css` (classless CSS framework).

## Features
- **Context Menu Integration:** Right-click to save selected text, link addresses, or image sources.
- **Storage Management:** View, search, and delete saved texts.
- **Export/Import:** Export saved data to JSON and import backups.
- **Dark Mode:** Supports color scheme switching.
- **Storage Statistics:** Displays current storage usage.
- **Notifications:** visual feedback on successful/failed saves.

## Building and Running

### Prerequisites
- Node.js (for Firefox build script)
- `zip` command line tool

### Key Commands

| Command | Description |
| :--- | :--- |
| `make build` | Build packages for both Chrome and Firefox |
| `make buildc` | Build Chrome package (`/tmp/text-saver-chrome.zip`) |
| `make buildf` | Build Firefox package (`/tmp/text-saver-firefox.zip`) |

## Architecture & Code Structure

### Directory Structure
- `src/`: Source code
    - `background.js`: Service worker. Handles context menu events and saving logic.
    - `option.html/js`: Management interface for saved texts (view/delete/export/import).
    - `manifest.json`: Extension configuration.
- `build.mjs`: Script to prepare the manifest for Firefox.
- `Makefile`: Automates packaging.

### Key Logic
- **Background Worker:** Listens for `chrome.contextMenus.onClicked`. Depending on the `menuItemId`, it saves `selectionText`, `linkUrl`, or `srcUrl` to storage.
- **Permissions:**
    - `contextMenus`: To add the "Save Text" option.
    - `storage`/`unlimitedStorage`: To persist data.
    - `downloads`: To export data.
    - `activeTab`/`scripting`: To inject content scripts for notifications (e.g., toast messages) on the active page.
