# Link Preview

## Project Overview
Link Preview is a browser extension (Chrome, Firefox, Edge) that displays a popup preview of a link's content when you hover over it. This allows users to peek at web pages without opening new tabs.

## Key Technologies
- **Platform:** Web Extension (Manifest V3)
- **Languages:** JavaScript (ES Modules), HTML, CSS
- **Core Library:** `Microtip` (CSS tooltip library) for displaying the preview.

## Features
- **Hover Preview:** Shows a tooltip with link content/metadata on hover.
- **Custom Encoding:** Options to handle different text encodings.
- **Cross-Browser:** Supports Chrome, Firefox, and Edge.

## Building and Running

### Prerequisites
- Node.js (for Firefox build script)
- `zip` command line tool

### Key Commands

| Command | Description |
| :--- | :--- |
| `make build` | Build packages for both Chrome and Firefox |
| `make buildc` | Build Chrome package (`/tmp/link-preview-chrome.zip`) |
| `make buildf` | Build Firefox package (`/tmp/link-preview-firefox.zip`) |

## Architecture & Code Structure

### Directory Structure
- `src/`: Source code
    - `background.js`: Service worker.
    - `content.js`: Injected script that detects hovers and renders the tooltip.
    - `common.js`: Shared utilities.
    - `microtip.min.css`: CSS for the tooltip UI.
    - `option.html/js`: Settings page.
    - `manifest.json`: Extension configuration.
- `build.mjs`: Script to prepare the manifest for Firefox.
- `Makefile`: Automates packaging.

### Key Logic
- **Content Script (`content.js`):**
    - Listens for `mouseenter` events on anchor (`<a>`) tags.
    - Fetches the target URL (or metadata) to display in the tooltip.
- **Permissions:** Requires `host_permissions` on all URLs (`<all_urls>`) to fetch preview content from any site.
