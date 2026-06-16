/*
 * admin.js: owner-only content browser (/admin).
 *
 * Merges four sources into ONE client-side table:
 *   1. R2 media        ← GET ./api/content  (sheets/covers/beat-images/clips/moments)
 *   2. Character text  ← ./data/characters.json
 *   3. Beat text       ← ./data/beats.json   (per-card caption + scene)
 *   4. Site pages      ← a static list of site/*.html
 *
 * Plain DOM, client-side search + filter + column sort, lazy inline preview
 * (image / video / text rendered in an expanded row). Fast at a few hundred rows.
 *
 * No build step, no framework; just a <script> on admin.html.
 */
(function () {
  'use strict';

  /* ---- media base URL (mirror of media.js / media.json) ---------------- */
  function mediaBase() {
    if (window.MEDIA_BASE) return window.MEDIA_BASE;
    return null; // fall back to fetching ./data/media.json
  }
  function mediaUrl(base, key) {
    return base.replace(/\/$/, '') + '/' + String(key).replace(/^\.?\//, '');
  }

  /* ---- the static page list (site/*.html) ------------------------------ */
  // Kept here (not on the server) because pages are git files, not R2 objects.
  var PAGES = [
    { file: 'index.html',       title: 'Home (the party, not the PC)' },
    { file: 'characters.html',  title: 'Characters (the roster)' },
    { file: 'adventures.html',  title: 'Adventures (six modules)' },
    { file: 'beats.html',       title: 'Beats (illustrated storyboards)' },
    { file: 'forge.html',       title: 'Forge (make your own)' },
    { file: 'admin.html',       title: 'Admin (content browser, this page)' }
  ];

  /* ---- type metadata: label + group (drives the colour tick + filters) - */
  var TYPE_GROUP = {
    'page':           'page',
    'character-text': 'text',
    'beat-text':      'text',
    'sheet':          'media',
    'cover':          'media',
    'beat-image':     'media',
    'clip':           'media',
    'moment':         'media'
  };
  // Order the filter pills appear in.
  var TYPE_ORDER = ['page', 'character-text', 'beat-text', 'sheet', 'cover', 'beat-image', 'clip', 'moment'];

  /* ---- helpers --------------------------------------------------------- */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function fmtBytes(n) {
    if (n == null || isNaN(n)) return '';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(2) + ' MB';
  }
  function isVideoKey(key) { return /\.mp4$/i.test(key); }

  /* ---- preview builders (lazy; called once per row on first open) ------ */
  function buildMediaPreview(box, row, base) {
    if (!base) { box.appendChild(el('p', 'preview-error', 'Media base URL unavailable; cannot preview.')); return; }
    var url = mediaUrl(base, row.key);
    var node;
    if (isVideoKey(row.key)) {
      node = el('video');
      node.controls = true;
      node.preload = 'metadata';
      node.src = url;
    } else {
      node = el('img');
      node.loading = 'lazy';
      node.alt = row.key;
      node.src = url;
      node.addEventListener('error', function () {
        var e = el('p', 'preview-error', 'Object did not load (404 or not yet uploaded): ' + row.key);
        if (node.parentNode) node.parentNode.replaceChild(e, node);
      });
    }
    box.appendChild(node);

    var meta = el('p', 'preview-meta');
    meta.textContent = row.key + (row.size != null ? '  ·  ' + fmtBytes(row.size) : '') +
      (row.uploaded ? '  ·  uploaded ' + row.uploaded.slice(0, 10) : '');
    box.appendChild(meta);

    box.appendChild(openLink(url, 'Open ' + (isVideoKey(row.key) ? 'video' : 'image') + ' ↗'));
  }

  function buildTextPreview(box, row) {
    var wrap = el('div', 'preview-text');
    (row.detail || []).forEach(function (p) {        // array of { label, value }
      if (p.value == null || p.value === '') return;
      wrap.appendChild(el('span', 'label', p.label));
      wrap.appendChild(document.createTextNode(p.value));
    });
    box.appendChild(wrap);
  }

  function openLink(href, label) {
    var a = el('a', 'preview-open', label);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return a;
  }

  /* ---- source loaders → normalized rows -------------------------------- */
  function rowsFromMedia(data) {
    return (data.objects || []).map(function (o) {
      var nm = o.key.split('/').pop();
      return {
        type: o.kind || 'other',
        name: nm,
        key: o.key,
        size: o.size,
        uploaded: o.uploaded,
        search: (o.key + ' ' + nm).toLowerCase(),
        previewKind: 'media'
      };
    });
  }

  function rowsFromCharacters(chars) {
    return (chars || []).map(function (c) {
      var statLine = ['ac', 'cr'].filter(function (k) { return c[k] != null; })
        .map(function (k) { return k.toUpperCase() + ' ' + c[k]; }).join('  ·  ');
      var ab = c.abilities ? Object.keys(c.abilities).map(function (k) {
        return k.toUpperCase() + ' ' + c.abilities[k];
      }).join('  ') : '';
      var detail = [
        { label: 'Name', value: c.name + (c.title ? ': ' + c.title : '') },
        { label: 'Represents', value: c.represents },
        { label: 'Role / alignment', value: [c.role, c.alignment].filter(Boolean).join('  ·  ') },
        { label: 'Stat line', value: [statLine, ab].filter(Boolean).join('   ') },
        { label: 'Tagline', value: c.tagline },
        { label: 'Signal', value: c.signal },
        { label: 'Source', value: c.source_url }
      ];
      var hay = [c.id, c.name, c.title, c.represents, c.tagline, c.signal, c.role]
        .filter(Boolean).join(' ').toLowerCase();
      return {
        type: 'character-text',
        name: c.name || c.id,
        key: c.id,
        size: null,
        search: hay,
        previewKind: 'text',
        detail: detail
      };
    });
  }

  function rowsFromBeats(beatsData) {
    var out = [];
    (beatsData.beats || []).forEach(function (b) {
      (b.cards || []).forEach(function (card, i) {
        var name = b.title + ', card ' + (i + 1);
        var detail = [
          { label: 'Beat / adventure', value: b.title + '  ·  ' + (b.adventure || '') },
          { label: 'Caption', value: card.caption },
          { label: 'Scene', value: card.scene }
        ];
        var hay = [b.id, b.title, b.adventure, card.caption, card.scene]
          .filter(Boolean).join(' ').toLowerCase();
        out.push({
          type: 'beat-text',
          name: name,
          key: b.id + '#' + (i + 1),
          size: null,
          search: hay,
          previewKind: 'text',
          detail: detail
        });
      });
    });
    return out;
  }

  function rowsFromPages() {
    return PAGES.map(function (p) {
      return {
        type: 'page',
        name: p.title,
        key: p.file,
        size: null,
        search: (p.file + ' ' + p.title).toLowerCase(),
        previewKind: 'page',
        href: './' + p.file
      };
    });
  }

  /* ---- state ----------------------------------------------------------- */
  var ALL = [];          // every row
  var BASE = null;       // media base URL
  var terms = [];        // lowercased search terms (token-AND)
  var activeType = 'all';
  var sortKey = 'type';
  var sortDir = 1;       // 1 asc, -1 desc
  var openKey = null;    // currently-expanded row key (one at a time)

  var elRows = document.getElementById('rows');
  var elSearch = document.getElementById('search');
  var elFilters = document.getElementById('filters');
  var elStatus = document.getElementById('status');

  /* ---- filter + sort + render ------------------------------------------ */
  function compare(a, b) {
    var r;
    if (sortKey === 'size') {
      // Null sizes (text/pages) sort to the bottom regardless of direction.
      var as = a.size, bs = b.size;
      if (as == null && bs == null) r = 0;
      else if (as == null) return 1;
      else if (bs == null) return -1;
      else r = as - bs;
    } else if (sortKey === 'type') {
      r = a.type.localeCompare(b.type);
      if (r === 0) r = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    } else { // name
      r = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    }
    return r * sortDir;
  }

  function visibleRows() {
    return ALL.filter(function (row) {
      if (activeType !== 'all' && row.type !== activeType) return false;
      // Token-AND: every whitespace-separated term must appear in the haystack.
      for (var i = 0; i < terms.length; i++) {
        if (row.search.indexOf(terms[i]) === -1) return false;
      }
      return true;
    }).sort(compare);
  }

  function makePreviewRow(row) {
    var tr = el('tr', 'preview-row');
    var td = el('td');
    td.colSpan = 4;
    var box = el('div', 'preview-box');
    if (row.previewKind === 'media') buildMediaPreview(box, row, BASE);
    else if (row.previewKind === 'text') buildTextPreview(box, row);
    else if (row.previewKind === 'page') {
      box.appendChild(el('p', 'preview-meta', 'Static page: ' + row.key));
      box.appendChild(openLink(row.href, 'Open page ↗'));
    }
    td.appendChild(box);
    tr.appendChild(td);
    return tr;
  }

  function render() {
    var rows = visibleRows();
    elRows.innerHTML = '';

    if (!rows.length) {
      var er = el('tr', 'empty-row');
      var td = el('td'); td.colSpan = 4;
      td.textContent = 'No content matches the current search / filter.';
      er.appendChild(td); elRows.appendChild(er);
    } else {
      rows.forEach(function (row) {
        var tr = el('tr', 'row');
        if (row.key === openKey) tr.classList.add('open');

        // Type
        var tdType = el('td', 'col-type');
        var badge = el('span', 'cell-type', row.type);
        badge.setAttribute('data-group', TYPE_GROUP[row.type] || 'media');
        tdType.appendChild(badge);
        tr.appendChild(tdType);

        // Name / key
        var tdName = el('td');
        tdName.appendChild(el('span', 'cell-name', row.name));
        if (row.key && row.key !== row.name) tdName.appendChild(el('span', 'cell-sub', row.key));
        tr.appendChild(tdName);

        // Size
        var tdSize = el('td', 'num cell-size');
        tdSize.textContent = row.size != null ? fmtBytes(row.size) : '';
        tr.appendChild(tdSize);

        // Preview affordance
        var tdPrev = el('td');
        tdPrev.appendChild(el('span', 'cell-key', row.key === openKey ? 'hide ▲' : 'view ▼'));
        tr.appendChild(tdPrev);

        tr.addEventListener('click', function () { toggle(row.key); });
        elRows.appendChild(tr);

        if (row.key === openKey) elRows.appendChild(makePreviewRow(row));
      });
    }

    elStatus.classList.remove('error');
    elStatus.textContent = rows.length + ' of ' + ALL.length + ' items';
  }

  function toggle(key) {
    openKey = (openKey === key) ? null : key;
    render();
  }

  /* ---- filter pills ---------------------------------------------------- */
  function buildFilters() {
    var counts = {};
    ALL.forEach(function (r) { counts[r.type] = (counts[r.type] || 0) + 1; });
    var present = TYPE_ORDER.filter(function (t) { return counts[t]; });

    function pill(value, label) {
      var b = el('button', 'pill', label);
      if (value === activeType) b.classList.add('active');
      b.addEventListener('click', function () {
        activeType = value;
        openKey = null;
        Array.prototype.forEach.call(elFilters.children, function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        render();
      });
      return b;
    }
    elFilters.innerHTML = '';
    elFilters.appendChild(pill('all', 'All (' + ALL.length + ')'));
    present.forEach(function (t) { elFilters.appendChild(pill(t, t + ' (' + counts[t] + ')')); });
  }

  /* ---- column-header sorting ------------------------------------------- */
  function wireHeaders() {
    var ths = document.querySelectorAll('table.admin-table th[data-sort]');
    function paint() {
      ths.forEach(function (th) {
        var k = th.getAttribute('data-sort');
        var base = th.textContent.replace(/\s*[▲▼]$/, '');
        th.textContent = base;
        if (k === sortKey) {
          var arrow = el('span', 'arrow', sortDir === 1 ? '▲' : '▼');
          th.appendChild(arrow);
        }
      });
    }
    ths.forEach(function (th) {
      th.addEventListener('click', function () {
        var k = th.getAttribute('data-sort');
        if (k === sortKey) sortDir = -sortDir;
        else { sortKey = k; sortDir = 1; }
        paint();
        render();
      });
    });
    paint();
  }

  /* ---- boot ------------------------------------------------------------ */
  function setStatus(msg, isError) {
    elStatus.textContent = msg;
    elStatus.classList.toggle('error', !!isError);
  }

  function fetchJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + ' → ' + r.status);
      return r.json();
    });
  }

  function boot() {
    elSearch.addEventListener('input', function () {
      terms = elSearch.value.toLowerCase().split(/\s+/).filter(Boolean);
      openKey = null;
      render();
    });
    wireHeaders();

    // Resolve the media base URL: prefer media.js global, else media.json.
    var baseP = mediaBase()
      ? Promise.resolve(mediaBase())
      : fetchJSON('./data/media.json').then(function (m) { return m.base; }).catch(function () { return null; });

    // Each source is independent: a failure in one shouldn't blank the table.
    var mediaErr = null;
    var mediaP = fetchJSON('./api/content').then(rowsFromMedia)
      .catch(function (e) { mediaErr = e.message; return []; });
    var charsP = fetchJSON('./data/characters.json').then(rowsFromCharacters).catch(function () { return []; });
    var beatsP = fetchJSON('./data/beats.json').then(rowsFromBeats).catch(function () { return []; });
    var pagesRows = rowsFromPages();

    Promise.all([baseP, mediaP, charsP, beatsP]).then(function (res) {
      BASE = res[0];
      ALL = pagesRows.concat(res[1], res[2], res[3]);
      buildFilters();
      render();
      if (mediaErr) {
        setStatus(ALL.length + ' items (R2 media unavailable: ' + mediaErr + ')', true);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
