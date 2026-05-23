// IssuePilot - Service Worker (API calls)

const SYSTEM_PROMPT = `You are helping a Chinese developer write professional GitHub issue comments in English.
The user will provide their intent and the issue context.
Generate a natural, concise, and technically appropriate English comment.
Do not add unnecessary pleasantries. Match the tone of the issue thread.
Reply with only the comment text, no explanations.`;

function buildUserPrompt({ context, intent, userNote }) {
  let prompt = `Issue Title: ${context.title}\n`;
  if (context.body) prompt += `Issue Body: ${context.body}\n`;
  if (context.recentComments?.length) {
    prompt += `Recent Comments:\n${context.recentComments.map((c, i) => `[${i + 1}] ${c}`).join('\n')}\n`;
  }
  if (context.diffContext) {
    prompt += `\nCode Review Context (file: ${context.diffContext.fileName}):\n\`\`\`\n${context.diffContext.code}\n\`\`\`\n`;
  }
  prompt += '\n';
  if (intent) prompt += `User Intent: ${intent}\n`;
  if (userNote) prompt += `User Note: ${userNote}\n`;
  prompt += '\nWrite the comment:';
  return prompt;
}

async function callAnthropic(apiKey, model, userPrompt, system = SYSTEM_PROMPT) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error: ${res.status}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

async function callOpenAI(apiKey, model, userPrompt, system = SYSTEM_PROMPT, baseUrl = 'https://api.openai.com/v1') {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt }
      ]
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error: ${res.status}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function handleGenerate(payload) {
  const settings = await chrome.storage.local.get(['provider', 'apiKey', 'model', 'defaultTone', 'baseUrl']);
  const provider = settings.provider || 'openai';
  const apiKey = settings.apiKey;
  const model = settings.model || (provider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4o');
  const baseUrl = settings.baseUrl || (provider === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1');

  if (!apiKey) throw new Error('请先在插件设置中配置 API Key');

  const userPrompt = buildUserPrompt(payload);
  const toneMap = { formal: 'Use a formal, professional tone.', friendly: 'Use a friendly, approachable tone.', concise: 'Be very concise and to-the-point.' };
  const systemWithTone = settings.defaultTone
    ? SYSTEM_PROMPT + '\n' + toneMap[settings.defaultTone]
    : SYSTEM_PROMPT;

  if (provider === 'openai') {
    const draft = await callOpenAI(apiKey, model, userPrompt, systemWithTone, baseUrl);
    await saveDraftHistory(draft, payload.context);
    return draft;
  }
  const draft = await callAnthropic(apiKey, model, userPrompt, systemWithTone);
  await saveDraftHistory(draft, payload.context);
  return draft;
}

async function saveDraftHistory(draft, context) {
  const { draftHistory = [] } = await chrome.storage.local.get('draftHistory');
  draftHistory.unshift({ draft, title: context?.title || '', timestamp: Date.now() });
  if (draftHistory.length > 20) draftHistory.length = 20;
  await chrome.storage.local.set({ draftHistory });
}

async function handleToneAdjust({ draft, tone }) {
  const settings = await chrome.storage.local.get(['provider', 'apiKey', 'model', 'baseUrl']);
  const provider = settings.provider || 'openai';
  const apiKey = settings.apiKey;
  const model = settings.model || (provider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4o');
  const baseUrl = settings.baseUrl || (provider === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1');
  if (!apiKey) throw new Error('请先在插件设置中配置 API Key');

  const toneMap = { formal: 'more formal and professional', friendly: 'more friendly and approachable', concise: 'more concise and to-the-point' };
  const prompt = `Rewrite this GitHub comment to be ${toneMap[tone]}. Keep the same meaning. Reply with only the rewritten text:\n\n${draft}`;

  if (provider === 'openai') return await callOpenAI(apiKey, model, prompt, SYSTEM_PROMPT, baseUrl);
  return await callAnthropic(apiKey, model, prompt);
}

// Message listener
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'generate') {
    handleGenerate(msg.payload)
      .then(draft => sendResponse({ draft }))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === 'adjust-tone') {
    handleToneAdjust(msg.payload)
      .then(draft => sendResponse({ draft }))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === 'get-history') {
    chrome.storage.local.get('draftHistory', (data) => sendResponse({ history: data.draftHistory || [] }));
    return true;
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
