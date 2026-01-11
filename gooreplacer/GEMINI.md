# Gooreplacer

## Project Overview
Gooreplacer is a browser extension (Chrome, Firefox, Edge) designed to modify web requests on the fly. It allows users to redirect URLs, block requests, and modify HTTP headers using user-defined rules.

## Key Technologies
- **Platform:** Web Extension (Manifest V3)
- **Languages:** JavaScript (ES Modules), HTML, CSS
- **Storage:** `chrome.storage.sync` (with sharding strategy for large rulesets)
- **Core API:** `declarativeNetRequest`

## Features
- **URL Redirection:** Redirect URLs based on wildcards or regex.
- **Request Blocking:** Block specific requests.
- **Header Modification:** Add, modify, or remove request/response headers.
- **Global Switch:** Quickly enable/disable all rules.
- **Sync:** Syncs rules across devices (using chunked storage).
- **Import/Export:** Rules can be edited as text (JSON/CSV-like format).

## Building and Running

### Prerequisites
- Node.js (for Firefox build script)
- `zip` command line tool

### Key Commands

| Command | Description |
| :--- | :--- |
| `make build` | Build packages for both Chrome and Firefox |
| `make buildc` | Build Chrome package (`/tmp/gooreplacer-chrome.zip`) |
| `make buildf` | Build Firefox package (`/tmp/gooreplacer-firefox.zip`) |

## Architecture & Code Structure

### Directory Structure
- `src/`: Source code
    - `background.js`: Service worker. Handles rule updates (`declarativeNetRequest`) and global switch logic.
    - `common.js`: Shared utilities (storage access, rule parsing).
    - `option.html/js`: Options page for managing rules.
    - `popup.html/js`: Toolbar popup for the global on/off switch.
    - `manifest.json`: Extension configuration.
- `build.mjs`: Script to prepare the manifest for Firefox (adjusting ID/email).
- `Makefile`: Automates packaging.

### Key Logic
- **Rule Storage:** Rules are split into 7KB chunks (`rules`, `rules2`, ...) to bypass the 8KB `chrome.storage.sync` item limit.
- **Rule Application:**
    - The `background.js` listens for `updateDynamicRules` messages.
    - It parses text rules into `declarativeNetRequest` JSON format.
    - If the global switch is ON, rules are applied via `chrome.declarativeNetRequest.updateDynamicRules`.
    - If OFF, rules are only validated.
