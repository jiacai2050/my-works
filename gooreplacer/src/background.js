'use strict';

const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

if (!isFirefox) {
  // https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#type-ExtensionActionOptions
  chrome.declarativeNetRequest.setExtensionActionOptions({
    displayActionCountAsBadgeText: true,
  });
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

(async () => {
  const input = await getDynamicRules();
  const rules = await updateDynamicRules(input);
  console.log(`Install success`);
  console.table(rules);
})();

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
async function getDynamicRules() {
  const opt = await chrome.storage.sync.get({ rules: '' });
  return opt['rules'];
}

function splitN(str, delimiter, n) {
  if (
    typeof str !== 'string' ||
    typeof delimiter !== 'string' ||
    typeof n !== 'number' ||
    n <= 0
  ) {
    return []; // Handle invalid input
  }

  const parts = str.split(delimiter);

  if (parts.length <= n) {
    return parts; // No need to combine if the number of parts is already within the limit
  } else {
    const firstNMinus1 = parts.slice(0, n - 1);
    const lastPart = parts.slice(n - 1).join(delimiter);
    return [...firstNMinus1, lastPart];
  }
}

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

const RESOURCE_TYPES = [
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
];
const FILTER_TYPES = ['wildcard', 'regex'];
const ACTION_TYPES = ['block', 'redirect', 'modifyHeaders'];
const METHODS = [
  'connect',
  'delete',
  'get',
  'head',
  'options',
  'patch',
  'post',
  'put',
];

function isRuleSeparator(line) {
  return line.trim().length === 0 || line.startsWith('#');
}

function parseRules(input) {
  const lines = input.split('\n');
  // push one more empty line if case of missing the last line when parsing
  lines.push('');
  let rules = [];
  let id = 0;
  let state = 'init';
  let prevAction = {};
  let prevCondition = {};
  for (const row of lines) {
    console.log(state, row);
    id += 1;
    if (state === 'init') {
      if (isRuleSeparator(row)) {
        continue;
      }

      const parts = row.split(',');
      if (parts.length !== 3) {
        throw Error(
          `Each rule must in format '[filter],[filterType],[action]', current:${row}`,
        );
      }
      const [filter, filterType, action] = parts;
      if (FILTER_TYPES.indexOf(filterType) < 0) {
        throw new Error(
          `Invalid filterType, valid:${FILTER_TYPES.join(',')}, current:${filterType}`,
        );
      }
      if (ACTION_TYPES.indexOf(action) < 0) {
        throw new Error(
          `Invalid action, valid:${ACTION_TYPES.join(',')}, current:${action}`,
        );
      }
      if (filterType === 'wildcard') {
        prevCondition['urlFilter'] = filter;
      } else {
        prevCondition['regexFilter'] = filter;
      }
      prevCondition['resourceTypes'] = RESOURCE_TYPES;
      prevAction['type'] = action;
      switch (action) {
        case 'block':
          state = 'block_opt';
          break;
        case 'redirect':
          state = 'redirect_opt';
          break;
        case 'modifyHeaders':
          state = 'header_opt';
          break;
        default:
          throw new Error(
            `Invalid action, valid:${ACTION_TYPES.join(',')}, current:${action}`,
          );
      }
    } else if (state === 'block_opt') {
      if (isRuleSeparator(row)) {
        rules.push({
          id: id,
          priority: id,
          action: {
            ...prevAction,
          },
          condition: {
            ...prevCondition,
          },
        });
        state = 'init';
        prevAction = {};
        prevCondition = {};
        continue;
      }

      const cond = tryParseActionCondition(row.trim());
      if (cond) {
        // Merge current cond into prevCondition.
        Object.assign(prevCondition, cond);
      } else {
        throw new Error(
          `Parse block options failed, format 'condition:key=value'`,
        );
      }
    } else if (state === 'redirect_opt') {
      if (isRuleSeparator(row)) {
        if (!Object.hasOwn(prevAction, 'redirect')) {
          throw new Error(
            `redirect action should have redirect option, rule:'${JSON.stringify(prevAction)}'`,
          );
        }
        rules.push({
          id: id,
          priority: id,
          action: {
            ...prevAction,
          },
          condition: {
            ...prevCondition,
          },
        });

        state = 'init';
        prevAction = {};
        prevCondition = {};
        continue;
      }

      const line = row.trim();
      const cond = tryParseActionCondition(line);
      if (cond) {
        Object.assign(prevCondition, cond);
      } else {
        Object.assign(prevAction, { redirect: parseRedirectOptions(line) });
      }
    } else if (state === 'header_opt') {
      if (isRuleSeparator(row)) {
        if (
          !Object.hasOwn(prevAction, 'requestHeaders') &&
          !Object.hasOwn(prevAction, 'responseHeaders')
        ) {
          throw new Error(
            `modifyHeaders action should have header option, rule:'${JSON.stringify(prevAction)}'`,
          );
        }
        rules.push({
          id: id,
          priority: id,
          action: {
            ...prevAction,
          },
          condition: {
            ...prevCondition,
          },
        });

        state = 'init';
        prevAction = {};
        prevCondition = {};
        continue;
      }

      const line = row.trim();
      const cond = tryParseActionCondition(line);
      if (cond) {
        Object.assign(prevCondition, cond);
      } else {
        let [type, header] = parseHeaderOptions(line);
        (prevAction[type] ||= []).push(header);
      }
    } else {
      throw new Error(`Parse rules failed, unknown state: ${state}`);
    }
  }

  return rules;
}

const CONDITION_TYPES = [
  'initiatorDomains',
  'excludedInitiatorDomains',
  'isUrlFilterCaseSensitive',
  'resourceTypes',
  'excludedResourceTypes',
  'requestDomains',
  'requestMethods',
];

// Conditions when rule will in effect. See `CONDITION_TYPES` for supported keys.
// https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#type-RuleCondition
/**
 * Parses a condition line and returns a structured object if valid.
 *
 * Expected input format:
 *   - The line must start with "condition:".
 *   - The format should be "conditionType=value".
 *
 * Supported condition keys (from CONDITION_TYPES):
 *   - 'initiatorDomains': A comma-separated list of domains that initiate the request.
 *   - 'excludedInitiatorDomains': A comma-separated list of domains to exclude as initiators.
 *   - 'isUrlFilterCaseSensitive': A boolean ('true' or 'false') indicating case sensitivity.
 *   - 'resourceTypes': A comma-separated list of resource types (e.g., 'script', 'image').
 *   - 'excludedResourceTypes': A comma-separated list of resource types to exclude.
 *   - 'requestDomains': A comma-separated list of domains for the request.
 *   - 'requestMethods': A comma-separated list of HTTP methods (e.g., 'get', 'post').
 *
 * Throws an error if the input format is invalid or if unsupported keys/values are provided.
 *
 * @param {string} line - The condition line to parse.
 * @returns {Object|null} - A structured object representing the condition, or null if the line is invalid.
 */
function tryParseActionCondition(line) {
  if (!line.startsWith('condition:')) {
    return null;
  }

  const condition = splitN(line, ':', 2)[1];
  const parts = splitN(condition, '=', 2);
  if (parts.length !== 2) {
    throw new Error(
      `Invalid action condition, format 'conditionType=value', current:${condition}`,
    );
  }

  const [conditionType, value] = parts;
  if (CONDITION_TYPES.indexOf(conditionType) < 0) {
    throw new Error(
      `Invalid action conditionType, valid: ${CONDITION_TYPES.join(',')}, current:${conditionType}`,
    );
  }

  switch (conditionType) {
    case 'requestDomains':
    case 'initiatorDomains':
    case 'excludedInitiatorDomains': {
      const domains = value
        .trim()
        .split(',')
        .map((domain) => domain.trim());
      if (domains.length === 0) {
        throw new Error(`Invalid domains, should not be empty. line:'${line}'`);
      }
      for (const domain of domains) {
        if (domain.length === 0) {
          throw new Error(
            `Invalid domain, should not be empty. line:'${line}'`,
          );
        }
      }

      return { [conditionType]: domains };
    }
    case 'isUrlFilterCaseSensitive': {
      const isCaseSensitive = value.trim().toLowerCase() === 'true';
      return { [conditionType]: isCaseSensitive };
    }
    case 'excludedResourceTypes':
    case 'resourceTypes': {
      const resourceTypes = value
        .trim()
        .split(',')
        .map((type) => type.trim());

      for (const type of resourceTypes) {
        if (RESOURCE_TYPES.indexOf(type) < 0) {
          throw new Error(
            `Invalid resource type, valid:[${RESOURCE_TYPES.join(',')}], current:${type}`,
          );
        }
      }

      return { [conditionType]: resourceTypes };
    }
    case 'requestMethods': {
      const methods = value
        .trim()
        .split(',')
        .map((method) => method.toLowerCase().trim());
      for (const method of methods) {
        if (METHODS.indexOf(method) < 0) {
          throw new Error(
            `Invalid request method, valid:[${METHODS.join(',')}], current:${method}`,
          );
        }
      }
      return { [conditionType]: methods };
    }
    default:
      throw new Error(`Invalid action conditionType, current:${conditionType}`);
  }
}

// Return redirect options, supported: regexSubstitution, transform, url.
// https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#type-Redirect
function parseRedirectOptions(line) {
  const parts = splitN(line, ':', 2);
  if (parts.length !== 2) {
    throw new Error(`Invalid redirectOpts, format '[operation]:[url]'`);
  }
  let [op, url] = parts;
  if (REDIRECT_OPS.indexOf(op) < 0) {
    throw new Error(
      `Invalid redirect operation, valid: ${REDIRECT_OPS.join(',')}, current:${op}`,
    );
  }
  const moreArgs = {};
  if (op === 'url') {
    moreArgs['url'] = url;
  } else if (op === 'transform') {
    moreArgs['transform'] = {};
    for (const part of url.split(',')) {
      const kv = splitN(part, '=', 2);
      if (kv.length !== 2) {
        throw new Error(
          `Invalid transform, format 'key=value', current:${part}`,
        );
      }
      let [k, v] = kv;
      if (URL_TRANSFORM_OPS.indexOf(k) < 0) {
        throw new Error(
          `Invalid transform key, valid:[${URL_TRANSFORM_OPS.join(',')}], current:${k}`,
        );
      }
      moreArgs['transform'][k] = v.trim();
    }
  } else {
    moreArgs['regexSubstitution'] = url;
  }

  return moreArgs;
}

// Return tuple [type, header]
function parseHeaderOptions(line) {
  const parts = splitN(line, ':', 3);
  if (parts.length !== 3) {
    throw new Error(`Header Options should be '[type]:[operation]:[header]'`);
  }
  const [type, op, header] = parts;
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
    throw new Error(`Append is not supported for request headers. ${parts}`);
  }
  const kv = splitN(header, '=', 2);
  if (kv.length !== 2) {
    throw new Error(
      `Header should be in 'key=value' format, current:${header}`,
    );
  }

  return [
    type,
    {
      header: kv[0].trim(),
      operation: op,
      value: kv[1].trim(),
    },
  ];
}
