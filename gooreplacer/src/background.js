'use strict';

const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

// https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#type-RuleActionType
const ACTIONS = [
  'block',
  'redirect',
  'allow',
  'upgradeScheme',
  'modifyHeaders',
  'allowAllRequests',
];
const REDIRECT_OPS = ['url', 'transform', 'regexSubstitution'];
const MODIFY_HEADER_TYPES = ['requestHeaders', 'responseHeaders'];
const MODIFY_HEADER_OPS = ['append', 'set', 'remove'];
// https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#type-URLTransform
const URL_TRANSFORM_OPS = [
  'fragment',
  'host',
  'password',
  'path',
  'port',
  'query',
  'scheme',
  'username',
];

const resourceTypes = {
  resourceTypes: [
    'main_frame',
    'sub_frame',
    'stylesheet',
    'script',
    'image',
    'font',
    'object',
    'xmlhttprequest',
    'media',
    'websocket',
  ],
};

function parseRules(input) {
  const lines = input.split('\n');
  let state = 'init';
  let rules = [];
  let id = 0;
  let prevFilter;
  let prevFilterType;
  let requestHeaders = [];
  let responseHeaders = [];
  for (const row of lines) {
    console.log(state, row);
    if (row.startsWith('#')) {
      continue;
    }
    id += 1;
    if (state === 'init') {
      if (row.trim().length === 0) {
        continue;
      }
      const parts = row.split(',');
      if (parts.length !== 3) {
        throw Error(`Each rule must have three parts, current:${row}`);
      }
      const [filter, filterType, action] = parts;
      if (action === 'block') {
        const filterExpr =
          filterType === 'wildcard'
            ? { urlFilter: filter }
            : { regexFilter: filter };
        rules.push({
          id: id,
          priority: id,
          action: { type: 'block' },
          condition: {
            ...resourceTypes,
            ...filterExpr,
          },
        });
      } else {
        prevFilter = filter;
        prevFilterType = filterType;
        state = action === 'redirect' ? 'redirect_opt' : 'header_opt';
      }
    } else if (state === 'redirect_opt') {
      // [operation]:[url]
      const filterExpr =
        prevFilterType === 'wildcard'
          ? { urlFilter: prevFilter }
          : { regexFilter: prevFilter };
      const sep = row.indexOf(':');
      if (sep < 0) {
        throw new Error(`Invalid redirectOpts, format '[operation]:[url]'`);
      }
      const op = row.substring(0, sep);
      if (REDIRECT_OPS.indexOf(op) < 0) {
        throw new Error(
          `Invalid redirect operation, valid: ${REDIRECT_OPS.join(',')}, current:${op}`,
        );
      }
      const url = row.substring(sep + 1);
      const moreArgs = {};
      if (op === 'url') {
        moreArgs['url'] = url;
      } else if (op === 'transform') {
        moreArgs['transform'] = {};
        for (const part of url.split(';')) {
          const kv = part.split('=');
          const k = kv[0].trim();
          if (URL_TRANSFORM_OPS.indexOf(k) < 0) {
            throw new Error(
              `Invalid transform key, valid: ${URL_TRANSFORM_OPS.join(',')}, current:{k}`,
            );
          }
          const v = kv[1].trim();
          moreArgs['transform'][k] = v;
        }
      } else {
        moreArgs['regexSubstitution'] = url;
      }
      rules.push({
        id: id,
        priority: id,
        action: { type: 'redirect', redirect: moreArgs },
        condition: {
          ...resourceTypes,
          ...filterExpr,
        },
      });
      state = 'init';
    } else if (state === 'header_opt') {
      if (row.trim().length === 0) {
        if (requestHeaders.length === 0 && responseHeaders.length === 0) {
          throw new Error(`No header options`);
        }
        const filterExpr =
          prevFilterType === 'wildcard'
            ? { urlFilter: prevFilter }
            : { regexFilter: prevFilter };
        rules.push({
          id: id,
          priority: id,
          action: {
            type: 'modifyHeaders',
            requestHeaders: requestHeaders.length === 0 ? null : requestHeaders,
            responseHeaders:
              responseHeaders.length === 0 ? null : responseHeaders,
          },
          condition: {
            ...resourceTypes,
            ...filterExpr,
          },
        });
        state = 'init';
        requestHeaders = [];
        responseHeaders = [];
        continue;
      }

      const parts = row.split(':');
      if (parts.length !== 3) {
        throw new Error(
          `Header Options should be '[type]:[operation]:[headers...]'`,
        );
      }
      const [type, op, headers] = parts;
      if (MODIFY_HEADER_TYPES.indexOf(type) < 0) {
        throw new Error(
          `Invalid modify header type, valid:${MODIFY_HEADER_TYPES.join(',')}, current:${type}`,
        );
      }
      if (MODIFY_HEADER_OPS.indexOf(op) < 0) {
        throw new Error(
          `Invalid modify header operation, valid:${MODIFY_HEADER_OPS.join(',')}, current:${op}`,
        );
      }
      if (type === 'requestHeaders' && op === 'append') {
        throw new Error(
          `Append is not supported for request headers. ${parts}`,
        );
      }
      let headerArr = [];
      for (const header of headers.split(';')) {
        if (header.trim().length === 0) {
          continue;
        }
        const kv = header.split('=');
        if (kv.length !== 2) {
          throw new Error(
            `Header should be in 'key=value' format, current:${header}`,
          );
        }
        let [key, value] = kv;
        headerArr.push({
          header: key.trim(),
          operation: op,
          value: value.trim(),
        });
      }
      if (type === 'requestHeaders') {
        requestHeaders = requestHeaders.concat(headerArr);
      } else {
        responseHeaders = responseHeaders.concat(headerArr);
      }
    } else {
      throw new Error(`Parse rules failed, unknown state: ${state}`);
    }
  }

  return rules;
}

async function updateDynamicRules(input) {
  const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
  const oldRuleIds = oldRules.map((rule) => rule.id);
  const newRules = parseRules(input);
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: oldRuleIds,
    addRules: newRules,
  });
  return newRules;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateDynamicRules') {
    updateDynamicRules(request.input)
      .then((ret) => {
        sendResponse({ success: true, preview: ret });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  } else if (request.action === 'preview') {
    try {
      const rules = parseRules(request.input);
      sendResponse({ success: true, preview: rules });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
});

chrome.action.onClicked.addListener(function () {
  if (isFirefox) {
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/permissions/request
    const perm = { origins: ['https://*/*', 'http://*/*'] };
    chrome.permissions.request(perm);
  } else {
    chrome.runtime.openOptionsPage();
  }
});

async function getDynamicRules() {
  const opt = await chrome.storage.sync.get({ rules: '' });
  return opt['rules'];
}

(async () => {
  const input = await getDynamicRules();
  const rules = await updateDynamicRules(input);
  console.log(`Install success`);
  console.table(rules);
})();
