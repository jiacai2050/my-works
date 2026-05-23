// IssuePilot - Service Worker (API calls)
import { IssuePilotStorage } from '../shared/storage.js';

const SYSTEM_PROMPT = `You are helping a developer write professional replies in English.
The user will provide their intent and context.
Generate a natural, concise, and appropriate English reply.
Do not add unnecessary pleasantries. Match the tone of the conversation.
Reply with only the text, no explanations.`;

function buildUserPrompt({ context, intent, userNote }) {
  let prompt = `Context: ${context.title}\n`;
  if (context.body) prompt += `Content: ${context.body}\n`;
  if (context.recentComments?.length) {
    prompt += `Recent messages:\n${context.recentComments.map((c, i) => `[${i + 1}] ${c}`).join('\n')}\n`;
  }
  if (context.diffContext) {
    prompt += `\nCode Review Context (file: ${context.diffContext.fileName}):\n\`\`\`\n${context.diffContext.code}\n\`\`\`\n`;
  }
  prompt += '\n';
  if (intent) prompt += `User Intent: ${intent}\n`;
  if (userNote) prompt += `User Note: ${userNote}\n`;
  prompt += '\nWrite the reply:';
  return prompt;
}

async function callAnthropic(
  apiKey,
  model,
  userPrompt,
  system = SYSTEM_PROMPT,
) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error?.message || err.message || err.detail || JSON.stringify(err);
    throw new Error(`API error ${res.status}: ${msg}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

async function callOpenAI(
  apiKey,
  model,
  userPrompt,
  system = SYSTEM_PROMPT,
  baseUrl = 'https://api.openai.com/v1',
) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
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
    const msg = err.error?.message || err.message || err.detail || JSON.stringify(err);
    throw new Error(`API error ${res.status}: ${msg}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function handleGenerate(payload) {
  const settings = await IssuePilotStorage.getSettings();
  const provider = settings.provider || 'openai';
  const apiKey = settings.apiKey;
  const model =
    settings.model ||
    (provider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4o');
  const baseUrl =
    settings.baseUrl ||
    (provider === 'anthropic'
      ? 'https://api.anthropic.com'
      : 'https://api.openai.com/v1');

  if (!apiKey) throw new Error(chrome.i18n.getMessage('errorNoApiKey'));

  const userPrompt = buildUserPrompt(payload);
  const toneMap = {
    formal: 'Use a formal, professional tone.',
    friendly: 'Use a friendly, approachable tone.',
    concise: 'Be very concise and to-the-point.',
  };
  const systemWithTone = settings.defaultTone
    ? SYSTEM_PROMPT + '\n' + toneMap[settings.defaultTone]
    : SYSTEM_PROMPT;

  if (provider === 'openai') {
    const draft = await callOpenAI(
      apiKey,
      model,
      userPrompt,
      systemWithTone,
      baseUrl,
    );
    await IssuePilotStorage.saveDraft(draft, payload.context?.title);
    return draft;
  }
  const draft = await callAnthropic(apiKey, model, userPrompt, systemWithTone);
  await IssuePilotStorage.saveDraft(draft, payload.context?.title);
  return draft;
}

async function handleToneAdjust({ draft, tone }) {
  const settings = await IssuePilotStorage.getSettings();
  const provider = settings.provider || 'openai';
  const apiKey = settings.apiKey;
  const model =
    settings.model ||
    (provider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4o');
  const baseUrl =
    settings.baseUrl ||
    (provider === 'anthropic'
      ? 'https://api.anthropic.com'
      : 'https://api.openai.com/v1');
  if (!apiKey) throw new Error(chrome.i18n.getMessage('errorNoApiKey'));

  const toneMap = {
    formal: 'more formal and professional',
    friendly: 'more friendly and approachable',
    concise: 'more concise and to-the-point',
  };
  const prompt = `Rewrite this GitHub comment to be ${toneMap[tone]}. Keep the same meaning. Reply with only the rewritten text:\n\n${draft}`;

  if (provider === 'openai')
    return await callOpenAI(apiKey, model, prompt, SYSTEM_PROMPT, baseUrl);
  return await callAnthropic(apiKey, model, prompt);
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
    IssuePilotStorage.getDraftHistory().then((history) =>
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
  const { ghToken } = await IssuePilotStorage.getSettings();
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

// Register context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'issuepilot-draft',
    title: '✨ IssuePilot - Draft Reply',
    contexts: ['editable'],
  });
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'issuepilot-draft' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'open-draft' });
  }
});

// Keyboard shortcut command
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-draft') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: 'open-draft' });
    });
  }
});
