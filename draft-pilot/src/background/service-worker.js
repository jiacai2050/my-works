// DraftPilot - Service Worker (API calls)
import { DraftPilotStorage } from '../shared/storage.js';

const SYSTEM_PROMPT = `You are helping a non-native English speaker write natural, professional replies in English.
The user will provide their intent, context, and the platform they are on.
Generate a natural, concise, and appropriate English reply that fits the platform's conventions.
Do not add unnecessary pleasantries unless the platform calls for it.
Reply with only the text, no explanations or meta-commentary.`;

function detectPlatform(context) {
  const title = (context.title || '').toLowerCase();
  const url = context.url || '';
  if (url.includes('github.com') || title.includes('github')) return 'github';
  if (
    /mail\.google\.com|outlook\.(live|office)\.com|mail\.yahoo\.com|proton\.me|mail\.proton\.me|fastmail\.com|zoho\.com\/mail|icloud\.com\/mail|ymail\.com|aol\.com\/mail|mail\.yandex\.com/.test(
      url,
    ) ||
    /gmail|outlook|邮件|邮箱|inbox/.test(title)
  )
    return 'email';
  if (
    /slack\.com|discord\.com|teams\.microsoft\.com|telegram\.org|web\.telegram|messenger\.com/.test(
      url,
    )
  )
    return 'chat';
  return 'general';
}

const PLATFORM_HINTS = {
  github:
    'Platform: GitHub (issue/PR discussion). Keep it technical and concise.',
  email:
    'Platform: Email. Use appropriate greeting and sign-off. Be polite but not overly verbose.',
  chat: 'Platform: Chat/messaging. Keep it conversational and brief.',
  general:
    'Platform: Web forum/discussion. Match the formality of the context.',
};

function buildUserPrompt({ context, intent, intentValue, userNote }) {
  const platform = detectPlatform(context);
  let prompt = `${PLATFORM_HINTS[platform]}\n\n`;

  if (context.title) prompt += `Subject/Title: ${context.title}\n`;
  if (context.body) prompt += `Content to reply to:\n${context.body}\n`;
  if (context.recentComments?.length) {
    prompt += `Recent messages:\n${context.recentComments.map((c, i) => `[${i + 1}] ${c}`).join('\n')}\n`;
  }
  prompt += '\n';
  if (intent) {
    const INTENT_INSTRUCTIONS = {
      agree:
        'Express clear agreement/approval. Acknowledge the good points made.',
      question: 'Ask a clarifying question. Show what part is unclear and why.',
      disagree:
        'Respectfully disagree. State your concern and reasoning clearly.',
      suggestion:
        'Propose an alternative or improvement. Be specific and actionable.',
      info: 'Provide additional relevant information or context that others may have missed.',
      help: 'Ask for help. Clearly describe what you need and what you have tried.',
    };
    const instruction = INTENT_INSTRUCTIONS[intentValue] || '';
    prompt += `User Intent: ${intent}${instruction ? '. ' + instruction : ''}\n`;
  }
  if (userNote) prompt += `Additional notes: ${userNote}\n`;
  prompt += '\nWrite the reply:';
  return prompt;
}

async function callOpenAI(apiKey, model, userPrompt, system, baseUrl) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg =
      err.error?.message || err.message || err.detail || JSON.stringify(err);
    throw new Error(`API error ${res.status}: ${msg}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function handleGenerate(payload) {
  const settings = await DraftPilotStorage.getSettings();
  const apiKey = settings.apiKey;
  const model = settings.model || 'gpt-4o';
  const baseUrl = settings.baseUrl;

  if (!apiKey) throw new Error(chrome.i18n.getMessage('errorNoApiKey'));
  if (!baseUrl) throw new Error(chrome.i18n.getMessage('errorNoBaseUrl'));

  const userPrompt = buildUserPrompt(payload);
  const toneMap = {
    formal: 'Use a formal, professional tone.',
    friendly: 'Use a friendly, approachable tone.',
    concise: 'Be very concise and to-the-point.',
  };
  const systemWithTone = settings.defaultTone
    ? SYSTEM_PROMPT + '\n' + toneMap[settings.defaultTone]
    : SYSTEM_PROMPT;

  const draft = await callOpenAI(apiKey, model, userPrompt, systemWithTone, baseUrl);
  await DraftPilotStorage.saveDraft(draft, payload.context?.title);
  return draft;
}

async function handleToneAdjust({ draft, tone }) {
  const settings = await DraftPilotStorage.getSettings();
  const apiKey = settings.apiKey;
  const model = settings.model || 'gpt-4o';
  const baseUrl = settings.baseUrl;
  if (!apiKey) throw new Error(chrome.i18n.getMessage('errorNoApiKey'));
  if (!baseUrl) throw new Error(chrome.i18n.getMessage('errorNoBaseUrl'));

  const toneMap = {
    formal: 'more formal and professional',
    friendly: 'more friendly and approachable',
    concise: 'more concise and to-the-point',
  };
  const prompt = `Rewrite this text to be ${toneMap[tone]}. Keep the same meaning. Reply with only the rewritten text:\n\n${draft}`;

  return await callOpenAI(apiKey, model, prompt, SYSTEM_PROMPT, baseUrl);
}

// Message listener
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'generate') {
    handleGenerate(msg.payload)
      .then((draft) => sendResponse({ draft }))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === 'adjust-tone') {
    handleToneAdjust(msg.payload)
      .then((draft) => sendResponse({ draft }))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === 'get-history') {
    DraftPilotStorage.getDraftHistory().then((history) =>
      sendResponse({ history }),
    );
    return true;
  }
  if (msg.type === 'fetch-context') {
    fetchGitHubContext(msg.payload)
      .then((ctx) => sendResponse({ context: ctx }))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
});

async function fetchGitHubContext({ owner, repo, issueNumber }) {
  const { ghToken } = await DraftPilotStorage.getSettings();
  const headers = { Accept: 'application/vnd.github+json' };
  if (ghToken) headers.Authorization = `Bearer ${ghToken}`;

  const base = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`;

  const [issueRes, commentsRes] = await Promise.all([
    fetch(base, { headers }),
    fetch(`${base}/comments?per_page=5&direction=desc`, { headers }),
  ]);

  if (!issueRes.ok) throw new Error(`GitHub API: ${issueRes.status}`);
  const issue = await issueRes.json();
  const comments = commentsRes.ok ? await commentsRes.json() : [];

  const body = issue.body || '';
  return {
    url: `https://github.com/${owner}/${repo}/issues/${issueNumber}`,
    title: issue.title,
    body: body.length > 2000 ? body.slice(0, 2000) + '...' : body,
    recentComments: comments
      .reverse()
      .slice(-3)
      .map((c) => {
        const t = c.body || '';
        return t.length > 1000 ? t.slice(0, 1000) + '...' : t;
      }),
    existingInput: '',
  };
}

async function ensureContentScripts(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'ping' });
  } catch (_) {
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['styles/content.css'],
    });
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [
        'shared/Readability.min.js',
        'content/context.js',
        'content/ui.js',
        'content/content.js',
      ],
    });
  }
}

async function openDraftInTab(tabId) {
  await ensureContentScripts(tabId);
  await chrome.tabs.sendMessage(tabId, { type: 'open-draft' });
}

// Toolbar icon opens the options page
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

// Register context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'draftpilot-draft',
    title: '✨ Draft Pilot - Smart Draft Reply',
    contexts: ['editable'],
  });
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'draftpilot-draft' && tab?.id) {
    openDraftInTab(tab.id).catch(console.error);
  }
});

// Keyboard shortcut command
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-draft') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) openDraftInTab(tabs[0].id).catch(console.error);
    });
  }
});
