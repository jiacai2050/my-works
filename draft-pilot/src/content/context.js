// DraftPilot - Context Extraction

/* global Readability:readonly */
/* exported DraftPilotContext */
// eslint-disable-next-line no-unused-vars
const DraftPilotContext = {
  // --- Entry point ---
  async getContext() {
    const host = window.location.hostname;

    // Step 1: Site-specific extraction
    if (host === 'github.com') {
      const ctx = await this._getGitHubContext();
      if (ctx) return ctx;
    }

    // Step 2: User-selected text (works everywhere)
    const selection =
      window._draftpilotSavedSelection ||
      window.getSelection()?.toString().trim();
    if (selection) {
      return this._makeContext(selection);
    }

    // Step 3: Readability extraction fallback
    const readable = this._getReadableContent();
    if (readable) {
      return this._makeContext(readable);
    }

    // Step 4: Empty fallback
    return this._makeContext('');
  },

  // --- GitHub-specific ---
  async _getGitHubContext() {
    // Try to find the comment being replied to
    const replyText = this._getGitHubReplyTarget();
    if (replyText) return this._makeContext(replyText);

    // Try DOM extraction for issue/PR page
    const title = this._ghTitle();
    const body = this._ghBody();
    const recentComments = this._ghRecentComments();

    if (title && (body || recentComments.length)) {
      return {
        url: window.location.href,
        title,
        body,
        recentComments,
        existingInput: '',
      };
    }

    // Fallback to GitHub API
    const parsed = this._ghParseURL();
    if (parsed) {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'fetch-context',
          payload: parsed,
        });
        if (response.context) return response.context;
      } catch (e) {
        console.warn('[DraftPilot] GitHub API fallback failed:', e);
      }
    }

    return null;
  },

  _getGitHubReplyTarget() {
    // User selected text takes priority (use saved selection since right-click clears it)
    const selection =
      window._draftpilotSavedSelection ||
      window.getSelection()?.toString().trim();
    if (selection)
      return selection.length > 1000
        ? selection.slice(0, 1000) + '...'
        : selection;

    const target = window._draftpilotGetTarget
      ? window._draftpilotGetTarget()
      : null;
    if (!target) return null;

    const container = target.closest(
      '.js-comment-container, .js-comment, .review-comment, .timeline-comment-group',
    );
    if (!container) return null;

    const commentBody = container.querySelector('.markdown-body');
    if (
      commentBody &&
      !container.querySelector('form')?.contains(commentBody)
    ) {
      const text = commentBody.textContent.trim();
      if (text) return text.length > 1000 ? text.slice(0, 1000) + '...' : text;
    }
    return null;
  },

  _ghTitle() {
    const selectors = [
      '.gh-header-title .js-issue-title',
      'h1.gh-header-title',
      '[data-testid="issue-title"]',
      'h1 bdi',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el?.textContent.trim()) return el.textContent.trim();
    }
    return '';
  },

  _ghBody() {
    const el = document.querySelector('.markdown-body');
    if (!el) return '';
    const text = el.textContent.trim();
    return text.length > 2000 ? text.slice(0, 2000) + '...' : text;
  },

  _ghRecentComments(count = 3) {
    const bodies = document.querySelectorAll('.markdown-body');
    const comments = Array.from(bodies).slice(1).slice(-count);
    return comments.map((el) => {
      const text = el.textContent.trim();
      return text.length > 1000 ? text.slice(0, 1000) + '...' : text;
    });
  },

  _ghParseURL() {
    const match = window.location.pathname.match(
      /\/([^/]+)\/([^/]+)\/(issues|pull)\/(\d+)/,
    );
    if (!match) return null;
    return { owner: match[1], repo: match[2], issueNumber: match[4] };
  },

  // --- Readability fallback ---
  _getReadableContent() {
    try {
      const clone = document.cloneNode(true);
      const article = new Readability(clone).parse();
      const text = article?.textContent?.trim();
      if (text) {
        return text;
      }
    } catch (e) {
      console.warn('[DraftPilot] Readability extraction failed:', e);
    }
    return null;
  },

  // --- Helpers ---
  _makeContext(body) {
    return {
      url: window.location.href,
      title: document.title,
      body: body.length > 1000 ? body.slice(0, 1000) + '...' : body,
      recentComments: [],
      existingInput: '',
    };
  },
};
