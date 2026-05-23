# CLAUDE.md

## Overview

DraftPilot is a Chrome extension (Manifest V3) that helps non-native English speakers write natural English replies on any website. Deeply optimized for GitHub issue/PR scenarios, also supports Gmail, Slack, forums, etc.

## Tech Stack

- Plain JavaScript (no build step, no framework)
- Chrome Extension Manifest V3
- Content scripts share globals (not ES modules)
- Vendor lib: Readability.min.js (Mozilla, page content extraction)

## Project Structure

```
src/
├── manifest.json              # Manifest V3 config
├── shared/
│   ├── storage.js             # chrome.storage wrapper (ES module, service-worker only)
│   └── Readability.min.js     # Mozilla Readability (vendor, global)
├── content/
│   ├── content.js             # Entry: context menu & shortcut trigger, event listeners
│   ├── context.js             # Context extraction (GitHub DOM/API, selection, Readability)
│   └── ui.js                  # Popover UI rendering & interaction
├── background/
│   └── service-worker.js      # LLM API calls, GitHub API, prompt building
├── popup/
│   ├── popup.html             # Settings page UI
│   └── popup.js               # Settings page logic
├── styles/
│   └── content.css            # Injected styles (must work on non-GitHub sites)
└── _locales/
    ├── en/messages.json
    └── zh_CN/messages.json
```

## Key Conventions

### Content Scripts Load Order

`Readability.min.js` → `context.js` → `ui.js` → `content.js`

Inter-script communication via globals:

- `DraftPilotContext` (exported by context.js, used by ui.js)
- `DraftPilotUI` (exported by ui.js, used by content.js)
- `window._draftpilotGetTarget` (exported by content.js, used by ui.js)
- `window._draftpilotSavedSelection` (written by content.js, read by context.js)

### ESLint Comments

No build step, so `/* global */` and `// eslint-disable-next-line no-unused-vars` are used for cross-file references.

### Styles

CSS uses GitHub CSS variables with hardcoded fallbacks to ensure visibility on non-GitHub sites:

```css
var(--github-var, var(--github-var-alt, #fallback))
```

### Context Extraction Priority

1. GitHub-specific (selected text → comment container → issue title/body/comments → GitHub API)
2. Selected text (non-GitHub sites)
3. Readability.js page content extraction
4. Empty fallback

### Platform-Aware Prompts

`service-worker.js` has `detectPlatform()` which identifies the platform by URL (github/email/chat/general) and provides tailored writing instructions to the LLM.

### contenteditable Insertion

Uses `document.execCommand('insertText')` to insert content, compatible with Gmail, CKEditor, and other rich text editors.

## Build & Package

```bash
make build   # produces /tmp/draft-pilot-chrome.zip
```

No npm install or dependency installation needed.

## Local Development

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Load unpacked extension, select the `src/` directory
4. After code changes, click the refresh button on the extension card

## Gotchas

- `shared/storage.js` is an ES module (only imported by service-worker); content scripts cannot import it
- Selected text is saved on `mousedown` (capture phase) because right-clicking a textarea clears the selection
- i18n uses `chrome.i18n.getMessage()`; default locale is en
