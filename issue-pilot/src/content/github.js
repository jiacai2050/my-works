// IssuePilot - GitHub Context Extraction (DOM first, API fallback)

const IssuePilotGitHub = {
  // --- DOM extraction ---
  getTitleFromDOM() {
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

  getBodyFromDOM() {
    const el = document.querySelector('.markdown-body');
    if (!el) return '';
    const text = el.textContent.trim();
    return text.length > 2000 ? text.slice(0, 2000) + '...' : text;
  },

  getRecentCommentsFromDOM(count = 3) {
    const bodies = document.querySelectorAll('.markdown-body');
    if (!bodies) return '';
    const comments = Array.from(bodies).slice(1).slice(-count);
    return comments.map((el) => {
      const text = el.textContent.trim();
      return text.length > 1000 ? text.slice(0, 1000) + '...' : text;
    });
  },

  // --- URL parsing ---
  parseIssueURL() {
    const match = window.location.pathname.match(
      /\/([^/]+)\/([^/]+)\/(issues|pull)\/(\d+)/,
    );
    if (!match) return null;
    return { owner: match[1], repo: match[2], issueNumber: match[4] };
  },

  // --- Main entry: DOM first, API fallback ---
  async getContext() {
    const title = this.getTitleFromDOM();
    const body = this.getBodyFromDOM();
    const recentComments = this.getRecentCommentsFromDOM();

    // Try to get the specific comment being replied to
    const replyContext = this.getReplyContext();
    if (replyContext) {
      return {
        title,
        body: replyContext,
        recentComments: [],
        existingInput: '',
      };
    }

    // If DOM extraction got meaningful data, use it
    if (title && (body || recentComments.length)) {
      return { title, body, recentComments, existingInput: '' };
    }

    // Fallback to GitHub API
    const parsed = this.parseIssueURL();
    if (!parsed) return { title, body, recentComments, existingInput: '' };

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'fetch-context',
        payload: parsed,
      });
      if (response.context) return response.context;
    } catch (e) {
      console.warn('[IssuePilot] GitHub API fallback failed:', e);
    }

    return { title, body, recentComments, existingInput: '' };
  },

  // Get the comment content that the user is replying to
  getReplyContext() {
    // Priority 1: user selected text
    const selection = window.getSelection()?.toString().trim();
    if (selection) return selection.length > 1000 ? selection.slice(0, 1000) + '...' : selection;

    // Priority 2: find comment container from textarea
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
};
