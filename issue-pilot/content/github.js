// IssuePilot - GitHub Context Extraction

const IssuePilotGitHub = {
  getTitle() {
    const selectors = [
      '.gh-header-title .js-issue-title',
      'h1.gh-header-title',
      '[data-testid="issue-title"]',
      'h1 bdi',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el.textContent.trim();
    }
    return '';
  },

  getBody() {
    const el = document.querySelector(
      '.js-comment-body, .comment-body, [data-testid="issue-body"]',
    );
    if (!el) return '';
    const text = el.textContent.trim();
    return text.length > 500 ? text.slice(0, 500) + '...' : text;
  },

  getRecentComments(count = 3) {
    const bodies = document.querySelectorAll('.js-comment-body, .comment-body');
    const comments = Array.from(bodies).slice(1);
    const recent = comments.slice(-count);
    return recent.map((el) => {
      const text = el.textContent.trim();
      return text.length > 300 ? text.slice(0, 300) + '...' : text;
    });
  },

  getCommentBoxValue() {
    const textarea = document.querySelector(
      'textarea#new_comment_field, textarea[name="comment[body]"]',
    );
    return textarea ? textarea.value : '';
  },

  // PR Review: get diff snippet near a review comment box
  getDiffContext(commentBox) {
    if (!commentBox) return null;
    const diffTable = commentBox.closest(
      '.diff-table, .js-diff-table, [data-diff-anchor]',
    );
    if (!diffTable) return null;
    // Get the code lines near the comment
    const lines = diffTable.querySelectorAll('.blob-code-inner');
    const codeLines = Array.from(lines)
      .slice(-10)
      .map((el) => el.textContent)
      .join('\n');
    const fileName =
      diffTable.closest('[data-tagsearch-path]')?.dataset.tagsearchPath ||
      diffTable.closest('.file')?.querySelector('.file-header')?.dataset.path ||
      '';
    return { fileName, code: codeLines.slice(0, 500) };
  },

  isPRPage() {
    return /\/pull\/\d+/.test(window.location.pathname);
  },

  getContext(anchorEl) {
    const base = {
      title: this.getTitle(),
      body: this.getBody(),
      recentComments: this.getRecentComments(),
      existingInput: this.getCommentBoxValue(),
    };
    // If in PR review context, add diff info
    if (this.isPRPage() && anchorEl) {
      const diff = this.getDiffContext(anchorEl);
      if (diff) base.diffContext = diff;
    }
    return base;
  },
};
