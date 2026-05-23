// IssuePilot - Context Extraction

const IssuePilotContext = {
  // --- Entry point ---
  async getContext() {
    const host = window.location.hostname;

    // Step 1: Site-specific extraction
    if (host === 'github.com') {
      const ctx = await this._getGitHubContext();
      if (ctx) return ctx;
    }

    // Step 2: User-selected text (works everywhere)
    const selection = window.getSelection()?.toString().trim();
    if (selection) {
      return this._makeContext(selection);
    }

    // Step 3: Generic fallback
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
      return { title, body, recentComments, existingInput: '' };
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
        console.warn('[IssuePilot] GitHub API fallback failed:', e);
      }
    }

    return null;
  },

  _getGitHubReplyTarget() {
    // User selected text takes priority
    const selection = window.getSelection()?.toString().trim();
    if (selection) return selection.length > 1000 ? selection.slice(0, 1000) + '...' : selection;

    const target = window._issuepilotGetTarget ? window._issuepilotGetTarget() : null;
    if (!target) return null;

    const container = target.closest(
      '.js-comment-container, .js-comment, .review-comment, .timeline-comment-group'
    );
    if (!container) return null;

    const commentBody = container.querySelector('.markdown-body');
    if (commentBody && !container.querySelector('form')?.contains(commentBody)) {
      const text = commentBody.textContent.trim();
      if (text) return text.length > 1000 ? text.slice(0, 1000) + '...' : text;
    }
    return null;
  },

  _ghTitle() {
    const selectors = ['.gh-header-title .js-issue-title', 'h1.gh-header-title', '[data-testid="issue-title"]', 'h1 bdi'];
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
    const match = window.location.pathname.match(/\/([^/]+)\/([^/]+)\/(issues|pull)\/(\d+)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2], issueNumber: match[4] };
  },

  // --- Helpers ---
  _makeContext(body) {
    return {
      title: document.title,
      body: body.length > 1000 ? body.slice(0, 1000) + '...' : body,
      recentComments: [],
      existingInput: '',
    };
  },
};
