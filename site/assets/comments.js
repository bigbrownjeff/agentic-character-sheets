/* ============================================================
   CHARACTER SHEETS — COMMENTS.JS
   Lightweight collaborative comment layer.
   No external dependencies. Calls /api/comments; falls back
   to localStorage silently when the Function is unreachable.
   ============================================================ */

'use strict';

/* --- HELPERS --------------------------------------------- */

function escHtmlC(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/** Minimal Markdown → HTML: bold, italic, code, links, line-breaks. */
function renderMd(text) {
  if (!text) return '';
  let s = escHtmlC(text);
  // code (must come before bold/italic)
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  // bold
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // italic
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // links [text](url)
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  // line breaks
  s = s.replace(/\n/g, '<br>');
  return s;
}

/** Relative time: "just now", "3m ago", "2h ago", "5d ago". */
function relTime(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* --- NAME PERSISTENCE ------------------------------------ */

const NAME_KEY = 'cs_commenter_name';

function getSavedName() {
  try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
}

function saveName(name) {
  try { localStorage.setItem(NAME_KEY, name); } catch {}
}

/* --- STORAGE BACKEND (API + localStorage fallback) ------- */

const API_BASE = '/api/comments';

function lsKey(targetId) {
  return 'cs_comments_' + targetId;
}

function lsRead(targetId) {
  try {
    const raw = localStorage.getItem(lsKey(targetId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function lsWrite(targetId, comments) {
  try { localStorage.setItem(lsKey(targetId), JSON.stringify(comments)); } catch {}
}

/** GET comments from API; on failure fall back to localStorage. */
async function fetchComments(targetId) {
  try {
    const res = await fetch(`${API_BASE}?target=${encodeURIComponent(targetId)}`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error('non-ok');
    const data = await res.json();
    // Sync to localStorage so offline still works after a real load
    lsWrite(targetId, data);
    return { comments: data, remote: true };
  } catch {
    return { comments: lsRead(targetId), remote: false };
  }
}

async function apiAdd(targetId, comment) {
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: targetId, comment }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error('non-ok');
    return await res.json();
  } catch {
    return null;
  }
}

async function apiEdit(targetId, id, body) {
  try {
    const res = await fetch(API_BASE, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: targetId, id, body }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error('non-ok');
    return await res.json();
  } catch {
    return null;
  }
}

async function apiDelete(targetId, id) {
  try {
    const res = await fetch(API_BASE, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: targetId, id }),
      signal: AbortSignal.timeout(6000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* ============================================================
   COMMENT WIDGET
   ============================================================ */

/**
 * Mount a comment widget onto `anchorEl`.
 *
 * @param {HTMLElement} anchorEl  - Element to append the widget to.
 * @param {string}      targetId  - Stable target id, e.g. "char:ponytail".
 */
async function mountComments(anchorEl, targetId) {
  if (!anchorEl) return;

  /* --- Wrapper ----------------------------------------- */
  const wrapper = document.createElement('div');
  wrapper.className = 'cs-comments';
  wrapper.dataset.target = targetId;

  /* --- Toggle affordance ------------------------------- */
  const toggle = document.createElement('button');
  toggle.className = 'cs-comments-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<span class="cs-comments-label">Comments</span><span class="cs-comments-badge">…</span>';
  wrapper.appendChild(toggle);

  /* --- Panel ------------------------------------------- */
  const panel = document.createElement('div');
  panel.className = 'cs-comments-panel';
  panel.setAttribute('aria-hidden', 'true');
  wrapper.appendChild(panel);

  anchorEl.appendChild(wrapper);

  /* State */
  let comments = [];
  let open = false;
  let editingId = null;

  function currentName() { return getSavedName(); }

  /* --- Badge update ------------------------------------ */
  function updateBadge() {
    const badge = toggle.querySelector('.cs-comments-badge');
    badge.textContent = comments.length > 0 ? String(comments.length) : '0';
    toggle.querySelector('.cs-comments-label').textContent =
      comments.length === 1 ? 'Comment' : 'Comments';
  }

  /* --- Render list ------------------------------------- */
  function renderList() {
    const listEl = panel.querySelector('.cs-comment-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (comments.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'cs-comment-empty';
      empty.textContent = 'No comments yet. Be first.';
      listEl.appendChild(empty);
      return;
    }

    comments.forEach(c => {
      const mine = currentName() && c.author === currentName();
      const item = document.createElement('div');
      item.className = 'cs-comment-item' + (mine ? ' cs-comment-mine' : '');
      item.dataset.id = c.id;

      const meta = document.createElement('div');
      meta.className = 'cs-comment-meta';
      meta.innerHTML = `<span class="cs-comment-author">${escHtmlC(c.author)}</span><span class="cs-comment-time">${relTime(c.ts)}</span>${c.updated ? '<span class="cs-comment-edited">edited</span>' : ''}`;

      const body = document.createElement('div');
      body.className = 'cs-comment-body';
      body.innerHTML = renderMd(c.body);

      item.appendChild(meta);
      item.appendChild(body);

      if (mine) {
        const actions = document.createElement('div');
        actions.className = 'cs-comment-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'cs-comment-action-btn';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => startEdit(c));

        const delBtn = document.createElement('button');
        delBtn.className = 'cs-comment-action-btn cs-comment-action-delete';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', () => handleDelete(c.id));

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        item.appendChild(actions);
      }

      listEl.appendChild(item);
    });
  }

  /* --- Render full panel ------------------------------- */
  function renderPanel() {
    panel.innerHTML = '';

    // List
    const listEl = document.createElement('div');
    listEl.className = 'cs-comment-list';
    panel.appendChild(listEl);

    // Add form
    const form = document.createElement('form');
    form.className = 'cs-comment-form';
    form.noValidate = true;

    const nameRow = document.createElement('div');
    nameRow.className = 'cs-comment-name-row';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'cs-comment-name-input';
    nameInput.placeholder = 'Your name';
    nameInput.maxLength = 40;
    nameInput.value = getSavedName();
    nameInput.required = true;
    nameInput.addEventListener('input', () => saveName(nameInput.value.trim()));

    nameRow.appendChild(nameInput);
    form.appendChild(nameRow);

    const textarea = document.createElement('textarea');
    textarea.className = 'cs-comment-textarea';
    textarea.placeholder = 'Add a comment… (Markdown: **bold**, *italic*, `code`, [link](url))';
    textarea.rows = 3;
    textarea.required = true;
    form.appendChild(textarea);

    const formFooter = document.createElement('div');
    formFooter.className = 'cs-comment-form-footer';

    const errMsg = document.createElement('span');
    errMsg.className = 'cs-comment-err';

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'cs-comment-submit';
    submitBtn.textContent = 'Post';

    formFooter.appendChild(errMsg);
    formFooter.appendChild(submitBtn);
    form.appendChild(formFooter);
    panel.appendChild(form);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const author = nameInput.value.trim();
      const body = textarea.value.trim();
      if (!author) { errMsg.textContent = 'Name required.'; nameInput.focus(); return; }
      if (!body) { errMsg.textContent = 'Comment body required.'; textarea.focus(); return; }
      errMsg.textContent = '';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Posting…';

      await handleAdd(author, body);

      submitBtn.disabled = false;
      submitBtn.textContent = 'Post';
      textarea.value = '';
    });

    renderList();
  }

  /* --- Edit flow --------------------------------------- */
  function startEdit(c) {
    editingId = c.id;
    const item = panel.querySelector(`.cs-comment-item[data-id="${c.id}"]`);
    if (!item) return;

    const bodyEl = item.querySelector('.cs-comment-body');
    const actionsEl = item.querySelector('.cs-comment-actions');
    const originalBody = c.body;

    const editArea = document.createElement('textarea');
    editArea.className = 'cs-comment-textarea cs-comment-edit-area';
    editArea.value = originalBody;
    editArea.rows = 3;

    const editFooter = document.createElement('div');
    editFooter.className = 'cs-comment-form-footer';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'cs-comment-action-btn';
    cancelBtn.textContent = 'Cancel';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'cs-comment-submit cs-comment-submit-sm';
    saveBtn.textContent = 'Save';

    const editErr = document.createElement('span');
    editErr.className = 'cs-comment-err';

    editFooter.appendChild(editErr);
    editFooter.appendChild(cancelBtn);
    editFooter.appendChild(saveBtn);

    bodyEl.style.display = 'none';
    actionsEl.style.display = 'none';
    item.appendChild(editArea);
    item.appendChild(editFooter);

    cancelBtn.addEventListener('click', () => {
      editingId = null;
      bodyEl.style.display = '';
      actionsEl.style.display = '';
      editArea.remove();
      editFooter.remove();
    });

    saveBtn.addEventListener('click', async () => {
      const newBody = editArea.value.trim();
      if (!newBody) { editErr.textContent = 'Body required.'; return; }
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
      editErr.textContent = '';

      await handleEdit(c.id, newBody);

      editingId = null;
      saveBtn.disabled = false;
    });
  }

  /* --- CRUD handlers ----------------------------------- */

  async function handleAdd(author, body) {
    saveName(author);
    const newComment = { id: uid(), author, body, ts: Date.now(), updated: false };

    // Optimistic local
    comments.push(newComment);
    lsWrite(targetId, comments);
    updateBadge();
    renderList();

    // Try remote
    const saved = await apiAdd(targetId, newComment);
    if (saved) {
      // Server may assign its own id; replace our optimistic entry
      const idx = comments.findIndex(c => c.id === newComment.id);
      if (idx !== -1) comments[idx] = saved;
      lsWrite(targetId, comments);
      renderList();
    }
  }

  async function handleEdit(id, newBody) {
    const idx = comments.findIndex(c => c.id === id);
    if (idx === -1) return;

    // Optimistic
    comments[idx] = { ...comments[idx], body: newBody, updated: true };
    lsWrite(targetId, comments);
    renderList();

    const saved = await apiEdit(targetId, id, newBody);
    if (saved) {
      comments[idx] = saved;
      lsWrite(targetId, comments);
      renderList();
    }
  }

  async function handleDelete(id) {
    // Optimistic
    comments = comments.filter(c => c.id !== id);
    lsWrite(targetId, comments);
    updateBadge();
    renderList();

    await apiDelete(targetId, id);
    // Re-fetch to sync (fire-and-forget reconcile)
    const { comments: remote } = await fetchComments(targetId);
    if (remote.length !== comments.length) {
      comments = remote;
      updateBadge();
      renderList();
    }
  }

  /* --- Toggle ------------------------------------------ */

  toggle.addEventListener('click', () => {
    open = !open;
    toggle.setAttribute('aria-expanded', String(open));
    panel.setAttribute('aria-hidden', String(!open));
    panel.classList.toggle('cs-comments-panel-open', open);
    if (open && !panel.querySelector('.cs-comment-list')) {
      renderPanel();
    }
  });

  /* --- Initial load ------------------------------------ */

  const { comments: loaded } = await fetchComments(targetId);
  comments = loaded;
  updateBadge();
}

/* ============================================================
   PAGE-LEVEL WIRING HELPERS
   Called after page data is ready.
   ============================================================ */

/**
 * Wire comment widget into the character modal.
 * Call this inside (or after) renderModal(), passing the char object.
 */
function mountCharComments(char) {
  const body = document.getElementById('modal-container');
  if (!body) return;
  // Remove any stale widget from a previous modal open
  const existing = body.querySelector('.cs-comments');
  if (existing) existing.remove();

  const anchor = document.createElement('div');
  anchor.className = 'cs-comments-anchor';
  body.querySelector('.modal-body')?.appendChild(anchor);
  mountComments(anchor, `char:${char.id}`);
}

/**
 * Wire comment widget beneath an adventure block element.
 * @param {HTMLElement} blockEl  - The .adventure-block element.
 * @param {string}      advId    - Adventure id string.
 */
function mountAdvComments(blockEl, advId) {
  if (!blockEl) return;
  const anchor = document.createElement('div');
  anchor.className = 'cs-comments-anchor';
  blockEl.appendChild(anchor);
  mountComments(anchor, `adv:${advId}`);
}

/**
 * Wire comment widget beneath a beat section.
 * @param {HTMLElement} sectionEl - The .beat-section element.
 * @param {string}      beatId    - Beat id.
 * @param {number}      n         - Beat index (0-based).
 */
function mountBeatComments(sectionEl, beatId, n) {
  if (!sectionEl) return;
  const anchor = document.createElement('div');
  anchor.className = 'cs-comments-anchor';
  sectionEl.appendChild(anchor);
  mountComments(anchor, `beat:${beatId}-${n}`);
}

/* Export helpers to global scope (no module bundler) */
window.CS = window.CS || {};
window.CS.mountCharComments = mountCharComments;
window.CS.mountAdvComments = mountAdvComments;
window.CS.mountBeatComments = mountBeatComments;
