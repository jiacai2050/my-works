# IssuePilot

A Chrome extension that helps Chinese developers write professional English comments on GitHub issues and PRs.

## Features

- **Intent-based drafting** — Pick from 6 presets (agree, question, disagree, suggestion, info, help) or type your own notes in Chinese/English
- **Context-aware** — Reads the issue title, body, and recent comments to generate relevant replies
- **PR Review support** — Extracts diff code context for inline review comments
- **Tone adjustment** — Rewrite drafts as Formal, Friendly, or Concise after generation
- **Draft history** — Stores your last 20 drafts locally
- **Theme adaptive** — Follows GitHub's Light/Dark mode via CSS variables
- **Dual API support** — Works with Anthropic Claude or OpenAI

## Installation

1. Clone or download this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the `issue-pilot` directory
5. Click the IssuePilot icon in the toolbar to configure your API key

## Setup

1. Click the extension icon to open Settings
2. Select your **API Provider** (Anthropic or OpenAI)
3. Enter your **API Key**
4. Optionally set a custom model name and default tone
5. Click **Save**

## Usage

1. Navigate to any GitHub issue or PR page
2. Find the **✨ Draft** button in the comment toolbar
3. Click it (or press `Cmd+Shift+G` / `Ctrl+Shift+G`)
4. Select an intent and/or type additional notes
5. Click **生成草稿** (Generate Draft)
6. Edit the draft if needed, adjust tone, or regenerate
7. Click **📋 插入输入框** (Insert) to fill the comment box
8. Review and submit using GitHub's native button

## Keyboard Shortcut

| Platform      | Shortcut           |
| ------------- | ------------------ |
| macOS         | `Cmd + Shift + E`  |
| Windows/Linux | `Ctrl + Shift + E` |

To customize, open `chrome://extensions/shortcuts` in your browser and find IssuePilot.

## Privacy

- Your API key is stored locally in `chrome.storage.local` only
- No data is sent to any server other than your chosen LLM provider
- No telemetry or analytics

## Project Structure

```
issue-pilot/
├── manifest.json          # Manifest V3 config
├── content/
│   ├── github.js          # Issue/PR context extraction
│   ├── ui.js              # Popover UI rendering
│   └── content.js         # Button injection logic
├── background/
│   └── service-worker.js  # LLM API calls
├── popup/
│   ├── popup.html         # Settings page
│   └── popup.js
├── styles/
│   └── content.css        # Injected styles
└── icons/
    ├── icon-16.png
    └── icon-48.png
```

## License

MIT
