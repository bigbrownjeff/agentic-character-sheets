/* ============================================================
   CARDRENDER — client-side image rendering for the whole site
   Draws real, downloadable PNG cards from data with Canvas 2D.
   No dependencies, no network, no cross-origin taint.
     window.CardRender.characterCanvas(char)
     window.CardRender.adventureCanvas(adv, names)
     window.CardRender.beatCanvas(beat, index, styleKey)
     window.CardRender.download(canvas, filename)
     window.CardRender.saveButton(label, getCanvas, filename)
     window.CardRender.lightbox(canvas, filename)
   Cards are 4:5 portrait at 1080×1350 (share-ready); CSS scales them down.
   ============================================================ */
(function () {
  'use strict';

  var W = 1080, H = 1350;

  /* --- palette (mirrors styles.css tokens) --------------- */
  var C = {
    bg: '#F1ECE2', paper: '#FAF6EC', ink: '#0E1116', body: '#2A2A2A',
    muted: '#6B6B6B', ruleSoft: '#C9C3B4', accent: '#C84B31',
    party: '#4a8c5c', npc: '#5a5abf', monster: '#C84B31', gold: '#9a7b18',
  };
  var SERIF = 'Georgia, "Times New Roman", serif';
  var SANS = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
  var MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';

  /* --- canvas factory with a font-ready redraw ----------- */
  function make(draw) {
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    function run() { ctx.save(); draw(ctx); ctx.restore(); }
    run();
    if (document.fonts && document.fonts.ready && document.fonts.status !== 'loaded') {
      document.fonts.ready.then(run).catch(function () {});
    }
    return cv;
  }

  /* --- 2D helpers ---------------------------------------- */
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  // wrap text; returns y after last line
  function wrap(ctx, text, x, y, maxW, lineH, maxLines) {
    if (!text) return y;
    var words = String(text).split(/\s+/), line = '', lines = [];
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = words[i]; }
      else line = test;
    }
    if (line) lines.push(line);
    if (maxLines && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      var last = lines[maxLines - 1];
      while (ctx.measureText(last + '…').width > maxW && last.length) last = last.slice(0, -1);
      lines[maxLines - 1] = last + '…';
    }
    for (var j = 0; j < lines.length; j++) ctx.fillText(lines[j], x, y + j * lineH);
    return y + lines.length * lineH;
  }
  function fit(ctx, text, maxW, base, weight, family) {
    var size = base;
    do { ctx.font = (weight || '') + ' ' + size + 'px ' + (family || SERIF);
    } while (ctx.measureText(text).width > maxW && (size -= 2) > 12);
    return size;
  }
  function roleColor(role) { return role === 'monster' ? C.monster : role === 'npc' ? C.npc : C.party; }
  function mod(s) { return Math.floor((s - 10) / 2); }
  function fmtMod(m) { return (m >= 0 ? '+' : '') + m; }

  /* --- shared frame -------------------------------------- */
  function frame(ctx, edge) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.paper); g.addColorStop(1, C.bg);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = edge || C.rule || '#231F1A';
    ctx.lineWidth = 10; ctx.strokeRect(20, 20, W - 40, H - 40);
    ctx.strokeStyle = edge || '#231F1A'; ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, W - 80, H - 80);
  }
  function brand(ctx, right) {
    ctx.fillStyle = C.muted; ctx.font = '22px ' + MONO; ctx.textAlign = 'left';
    ctx.fillText('agentic-character-sheets', 70, H - 64);
    if (right) { ctx.textAlign = 'right'; ctx.fillText(right, W - 70, H - 64); ctx.textAlign = 'left'; }
  }

  /* --- emblem (stands in for illustration) --------------- */
  function emblem(ctx, cx, cy, r, color, glyph) {
    var g = ctx.createRadialGradient(cx, cy - r * 0.2, r * 0.1, cx, cy, r);
    g.addColorStop(0, color); g.addColorStop(1, shade(color, -40));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, cy, r - 8, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.font = (r * 1.05) + 'px ' + SERIF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(glyph, cx, cy + 4);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.max(0, Math.min(255, (n >> 16) + amt));
    var g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
    var b = Math.max(0, Math.min(255, (n & 255) + amt));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /* ============================================================
     CHARACTER CARD
     ============================================================ */
  var ABIL = [['str', 'STR'], ['dex', 'DEX'], ['con', 'CON'], ['int', 'INT'], ['wis', 'WIS'], ['cha', 'CHA']];
  function characterCanvas(ch, art) {
    return make(function (ctx) {
      var rc = roleColor(ch.role);
      frame(ctx, rc);
      // header banner
      ctx.fillStyle = rc; rr(ctx, 40, 40, W - 80, 150, 0); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.font = '24px ' + MONO;
      var eyebrow = ch.role === 'monster'
        ? ('CR ' + (ch.cr || '?') + ' · ' + (ch.lineage || ''))
        : [ch['class'], ch.subclass].filter(Boolean).join(' · ');
      ctx.fillText(String(eyebrow).toUpperCase().slice(0, 46), 70, 92);
      ctx.fillStyle = '#fff';
      var ns = fit(ctx, ch.name || '', W - 160, 64, 'bold', SERIF);
      ctx.font = 'bold ' + ns + 'px ' + SERIF; ctx.fillText(ch.name || '', 70, 158);
      // title
      ctx.fillStyle = C.body; ctx.font = 'italic 30px ' + SERIF;
      var y = wrap(ctx, ch.title || '', 70, 240, W - 140, 38, 2);

      // portrait illustration if provided, else a role emblem
      if (art) {
        ctx.save();
        rr(ctx, 110, 318, W - 220, 334, 18); ctx.clip();
        coverDraw(ctx, art, 110, 318, W - 220, 334);
        ctx.restore();
        ctx.strokeStyle = rc; ctx.lineWidth = 5; rr(ctx, 110, 318, W - 220, 334, 18); ctx.stroke();
      } else {
        var glyph = ch.role === 'monster' ? '☠' : ch.role === 'npc' ? '◈' : '⚔';
        emblem(ctx, W / 2, 470, 150, rc, glyph);
        ctx.fillStyle = C.muted; ctx.font = '26px ' + MONO; ctx.textAlign = 'center';
        ctx.fillText((ch.role || '').toUpperCase(), W / 2, 660); ctx.textAlign = 'left';
      }

      // ability grid 3×2
      if (ch.abilities) {
        var gx = 70, gy = 700, cw = (W - 140) / 3, chh = 120, max = -99, min = 99;
        ABIL.forEach(function (a) { var v = ch.abilities[a[0]]; if (v > max) max = v; if (v < min) min = v; });
        ABIL.forEach(function (a, i) {
          var col = i % 3, row = Math.floor(i / 3);
          var x = gx + col * cw, yy = gy + row * (chh + 14), v = ch.abilities[a[0]];
          ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ruleSoft; ctx.lineWidth = 2;
          rr(ctx, x, yy, cw - 14, chh, 12); ctx.fill(); ctx.stroke();
          ctx.textAlign = 'center';
          ctx.fillStyle = C.muted; ctx.font = '22px ' + MONO; ctx.fillText(a[1], x + (cw - 14) / 2, yy + 32);
          ctx.fillStyle = v === max ? C.gold : v === min ? C.accent : C.ink;
          ctx.font = 'bold 46px ' + SERIF; ctx.fillText(String(v), x + (cw - 14) / 2, yy + 84);
          ctx.fillStyle = C.muted; ctx.font = '20px ' + MONO; ctx.fillText(fmtMod(mod(v)), x + (cw - 14) / 2, yy + 108);
          ctx.textAlign = 'left';
        });
        y = gy + 2 * (chh + 14) + 20;
      }

      // saves / auto-fail strip
      ctx.font = '24px ' + SANS;
      if (ch.role === 'monster' && ch.dumped_save) {
        ctx.fillStyle = C.accent; ctx.fillText('AUTO-FAILS ' + String(ch.dumped_save).toUpperCase() + '-SAVE', 70, y + 30);
      } else if (ch.saves && ch.saves.length) {
        ctx.fillStyle = C.party; ctx.fillText('✓ Saves: ' + ch.saves.map(function (s) { return s.toUpperCase(); }).join('  ✓ '), 70, y + 30);
      }
      // tagline
      ctx.fillStyle = C.ink; ctx.font = 'italic 30px ' + SERIF;
      wrap(ctx, ch.tagline ? '“' + ch.tagline + '”' : '', 70, y + 90, W - 140, 40, 3);

      brand(ctx, ch.role ? ('AC ' + (ch.ac != null ? ch.ac : '—')) : '');
    });
  }

  /* ============================================================
     BEAT / SCENE styles
     ============================================================ */
  var BEAT_STYLES = {
    painterly: { bg: ['#3a2a4a', '#1a1326'], ink: '#fff', accent: '#e9c46a', motif: '✦', label: 'Painterly' },
    'graphic-novel': { bg: ['#1c1c1c', '#000'], ink: '#fff', accent: '#e63946', motif: '✶', label: 'Graphic Novel' },
    gothic: { bg: ['#2b0709', '#0a0204'], ink: '#f3e6e6', accent: '#b4151c', motif: '†', label: 'Sanguine Gothic' },
    feedbait: { bg: ['#ff2e63', '#7a1fff'], ink: '#fff', accent: '#ffe600', motif: '▶', label: 'Feed-Bait' },
    telecast: { bg: ['#0b132b', '#1c2541'], ink: '#fff', accent: '#ffb703', motif: '★', label: 'Leaderboard Telecast' },
    terminal: { bg: ['#001100', '#000800'], ink: '#39ff14', accent: '#39ff14', motif: '▮', label: 'Terminal' },
    glitch: { bg: ['#2a1b3d', '#070310'], ink: '#eaffff', accent: '#ff3df2', motif: '▦', label: 'Glitchcore' },
  };
  var BEAT_STYLE_BY_ID = {
    masquerade: 'gothic', 'round-table': 'feedbait', 'proving-grounds': 'telecast', forge: 'terminal', echoes: 'glitch',
  };
  function styleNameFor(beatId, styleKey) {
    if (styleKey === 'B') return 'graphic-novel';
    if (styleKey === 'C' && BEAT_STYLE_BY_ID[beatId]) return BEAT_STYLE_BY_ID[beatId];
    return 'painterly';
  }
  function beatStyleFor(beatId, styleKey) { return BEAT_STYLES[styleNameFor(beatId, styleKey)] || BEAT_STYLES.painterly; }

  // Prompt preambles per style (used to compose the text-to-image prompt).
  var STYLE_PROMPT = {
    painterly: 'Painterly fantasy RPG illustration, Critical Role / Wizards-of-the-Coast house style, dramatic lighting, ornate, wholesome, 4:5 portrait. ',
    'graphic-novel': 'High-contrast inked graphic-novel illustration, bold linework, cinematic, 4:5 portrait. ',
    gothic: 'Gothic-punk World of Darkness illustration, blood-red and black, Tim Bradstreet ink chiaroscuro, 4:5 portrait. ',
    feedbait: 'Hyper-saturated bold poster style, punchy and vivid (tasteful, non-sexual), 4:5 portrait. ',
    telecast: 'Glossy esports-broadcast spectacle, stadium lighting, dynamic, 4:5 portrait. ',
    terminal: 'Retro phosphor-green CRT terminal / pixel art, 4:5 portrait. ',
    glitch: 'Digital glitch art: pastel porcelain gradients (blush, mint, pale gold) corrupted by JPEG datamosh, scanline tears and violent cyan/magenta chromatic aberration, 4:5 portrait. ',
  };
  function beatPrompt(beat, index, styleKey) {
    var card = (beat.cards || [])[index] || {};
    return (STYLE_PROMPT[styleNameFor(beat.id, styleKey)] || STYLE_PROMPT.painterly) + (card.scene || beat.title || '');
  }
  // Per-cell video prompt: animate ONE keyframe (one card) into a 3–5s shot.
  // The whole beat = the sequence of these per-cell clips (~15–30s across 5–6 cards).
  function videoPrompt(beat, index, styleKey, note) {
    var card = (beat.cards || [])[index] || {};
    var pre = STYLE_PROMPT[styleNameFor(beat.id, styleKey)] || STYLE_PROMPT.painterly;
    return pre +
      'Animate THIS single keyframe into a 3-5 second cinematic shot in this exact art style: ' +
      (card.scene || beat.title || '') +
      ' Bring it to life with motion and a moving camera (slow push-in, parallax, drifting elements), but stay on this one scene — do NOT cut to other scenes. No on-screen text or captions.' +
      (note ? ' Art-director note: ' + note : '');
  }

  // object-fit: cover for a loaded image into a rect
  function coverDraw(ctx, img, x, y, w, h) {
    var iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight;
    if (!iw || !ih) return;
    var scale = Math.max(w / iw, h / ih), dw = iw * scale, dh = ih * scale;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }
  function beatCanvas(beat, index, styleKey, art) {
    var card = beat.cards[index] || {};
    var s = beatStyleFor(beat.id, styleKey);
    return make(function (ctx) {
      if (art) {
        coverDraw(ctx, art, 0, 0, W, H);
        var tg = ctx.createLinearGradient(0, 0, 0, 280);
        tg.addColorStop(0, 'rgba(0,0,0,.72)'); tg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 280);
      } else {
        var g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, s.bg[0]); g.addColorStop(1, s.bg[1]);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        // vignette
        var vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.7);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
        // big motif watermark
        ctx.fillStyle = s.accent; ctx.globalAlpha = 0.16; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '620px ' + SERIF; ctx.fillText(s.motif, W / 2, H / 2 - 60);
        ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
        // scene art-direction (faint)
        ctx.fillStyle = s.ink; ctx.globalAlpha = 0.78; ctx.font = 'italic 30px ' + SERIF;
        wrap(ctx, card.scene || '', 70, 300, W - 140, 42, 6); ctx.globalAlpha = 1;
      }
      // eyebrow
      ctx.fillStyle = s.accent; ctx.font = '24px ' + MONO; ctx.textAlign = 'left';
      ctx.fillText((beat.adventure || '').toUpperCase().slice(0, 42), 70, 96);
      // title
      ctx.fillStyle = art ? '#fff' : s.ink; var ts = fit(ctx, beat.title || '', W - 140, 56, 'bold', SERIF);
      ctx.font = 'bold ' + ts + 'px ' + SERIF; wrap(ctx, beat.title || '', 70, 156, W - 140, ts + 8, 2);
      // caption banner
      var bh = 230;
      ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.fillRect(40, H - bh - 40, W - 80, bh);
      ctx.fillStyle = s.accent; ctx.fillRect(40, H - bh - 40, 10, bh);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 34px ' + SERIF;
      wrap(ctx, card.caption || '', 80, H - bh + 20, W - 160, 44, 4);
      // chip
      ctx.fillStyle = s.accent; ctx.font = '20px ' + MONO; ctx.textAlign = 'right';
      ctx.fillText((s.label + ' · ' + (index + 1) + '/' + beat.cards.length).toUpperCase(), W - 70, 96);
      ctx.textAlign = 'left';
    });
  }

  /* ============================================================
     ADVENTURE COVER
     ============================================================ */
  function adventureCanvas(adv, names, art) {
    names = names || {};
    var key = Object.keys(BEAT_STYLE_BY_ID).find(function (k) { return adv.id && adv.id.indexOf(k) !== -1; });
    var pal = BEAT_STYLES[BEAT_STYLE_BY_ID[key]] || BEAT_STYLES.painterly;
    return make(function (ctx) {
      if (art) {
        coverDraw(ctx, art, 0, 0, W, H);
        ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(0, 0, W, H);
      } else {
        var g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, pal.bg[0]); g.addColorStop(1, pal.bg[1]);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = pal.accent; ctx.globalAlpha = 0.14; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '600px ' + SERIF; ctx.fillText(pal.motif, W / 2, H / 2);
        ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      }
      // title banner
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(40, 70, W - 80, 220);
      ctx.fillStyle = pal.accent; ctx.font = '24px ' + MONO; ctx.fillText((adv.use_category || '').toUpperCase().slice(0, 50), 70, 120);
      ctx.fillStyle = '#fff'; var ts = fit(ctx, adv.name || '', W - 160, 66, 'bold', SERIF);
      ctx.font = 'bold ' + ts + 'px ' + SERIF; wrap(ctx, adv.name || '', 70, 200, W - 140, ts + 8, 2);
      // quest
      ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.9; ctx.font = 'italic 30px ' + SERIF;
      wrap(ctx, adv.quest || '', 70, 360, W - 140, 42, 8); ctx.globalAlpha = 1;
      // roster
      var fy = H - 320;
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(40, fy - 40, W - 80, 260);
      function row(label, arr, color, y) {
        if (!arr || !arr.length) return y;
        ctx.fillStyle = color; ctx.font = '22px ' + MONO; ctx.fillText(label.toUpperCase(), 70, y);
        ctx.fillStyle = '#fff'; ctx.font = '26px ' + SANS;
        return wrap(ctx, arr.join(' · '), 70, y + 34, W - 140, 32, 2) + 18;
      }
      var y = fy + 10;
      y = row('Party', names.party, C.party, y);
      y = row('NPCs', names.npcs, '#9aa0e0', y);
      y = row('Bestiary', names.bestiary, '#e08a7a', y);
      brand(ctx, pal.label);
    });
  }

  /* ============================================================
     EXPORT / UI
     ============================================================ */
  function download(canvas, filename) {
    function go() {
      canvas.toBlob(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = filename || 'card.png'; a.click();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      }, 'image/png');
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go).catch(go);
    else go();
  }
  function saveButton(label, getCanvas, filename) {
    var b = document.createElement('button');
    b.className = 'cr-save-btn'; b.type = 'button'; b.textContent = label || '⬇ Save as image';
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      lightbox(getCanvas(), filename);
    });
    return b;
  }
  function lightbox(canvas, filename) {
    var ov = document.createElement('div'); ov.className = 'cr-lightbox';
    var box = document.createElement('div'); box.className = 'cr-lightbox-inner';
    canvas.className = 'cr-preview';
    var bar = document.createElement('div'); bar.className = 'cr-bar';
    var dl = document.createElement('button'); dl.className = 'cr-save-btn'; dl.textContent = '⬇ Download PNG';
    dl.addEventListener('click', function () { download(canvas, filename); });
    var cl = document.createElement('button'); cl.className = 'cr-save-btn ghost'; cl.textContent = 'Close';
    cl.addEventListener('click', function () { ov.remove(); });
    bar.appendChild(dl); bar.appendChild(cl);
    box.appendChild(canvas); box.appendChild(bar); ov.appendChild(box);
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
  }

  /* --- AI illustration (optional; /api/image via Workers AI) --- */
  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var im = new Image();
      im.onload = function () { resolve(im); };
      im.onerror = reject;
      im.src = src;
    });
  }
  // Selected art engine (persisted): 'auto' | 'gemini' | 'cloudflare'.
  function imageProvider() {
    try { return (window.localStorage && localStorage.getItem('cs-image-provider')) || 'auto'; }
    catch (e) { return 'auto'; }
  }
  // A small <label><select> the user can drop anywhere to pick the art engine.
  function providerToggle() {
    var wrap = document.createElement('label');
    wrap.className = 'cr-provider';
    wrap.appendChild(document.createTextNode('Art engine: '));
    var sel = document.createElement('select');
    [['auto', 'Auto'], ['gemini', 'Best (Gemini)'], ['cloudflare', 'Fast (Cloudflare)']].forEach(function (o) {
      var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; sel.appendChild(op);
    });
    sel.value = imageProvider();
    sel.addEventListener('change', function () { try { localStorage.setItem('cs-image-provider', sel.value); } catch (e) {} });
    wrap.appendChild(sel);
    return wrap;
  }
  // POST a prompt to /api/image; resolve to a loaded <img>, or null on any failure.
  function fetchArt(prompt, provider) {
    return fetch('./api/image', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: String(prompt || '').slice(0, 1400), provider: provider || imageProvider() }),
    }).then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    }).then(function (d) {
      return (d && d.image) ? loadImage(d.image) : null;
    }).catch(function () { return null; });
  }

  // A reusable "maker" bar: an optional note input + action buttons.
  // The note text is passed to each button's run(note) so the user can steer
  // the NEXT image/video before it generates. Nothing auto-fires.
  //   opts.note (default true), opts.placeholder
  //   opts.buttons: [{ label, busy, done, fail, ghost, title, run(note, btn) -> Promise|any }]
  //   opts.extra: [DOM nodes appended to the button row, e.g. a Save button]
  function makerControls(opts) {
    opts = opts || {};
    var wrap = document.createElement('div');
    wrap.className = 'cr-maker';
    var noteEl = null;
    if (opts.note !== false) {
      noteEl = document.createElement('input');
      noteEl.type = 'text';
      noteEl.className = 'cr-note';
      noteEl.placeholder = opts.placeholder || 'Add a note to steer the next image / video (optional)…';
      noteEl.addEventListener('click', function (e) { e.stopPropagation(); });
      noteEl.addEventListener('keydown', function (e) { e.stopPropagation(); });
      wrap.appendChild(noteEl);
    }
    var row = document.createElement('div');
    row.className = 'cr-actions';
    (opts.buttons || []).forEach(function (b) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cr-save-btn' + (b.ghost ? ' ghost' : '');
      btn.textContent = b.label;
      if (b.title) btn.title = b.title;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var note = noteEl ? noteEl.value.trim() : '';
        var orig = b.label;
        btn.disabled = true;
        btn.textContent = b.busy || '…working…';
        Promise.resolve(b.run(note, btn)).then(function (ok) {
          btn.disabled = false;
          btn.textContent = (ok === false) ? (b.fail || orig) : (b.done || orig);
        }).catch(function () { btn.disabled = false; btn.textContent = b.fail || orig; });
      });
      row.appendChild(btn);
    });
    (opts.extra || []).forEach(function (node) { row.appendChild(node); });
    wrap.appendChild(row);
    return wrap;
  }

  // A versioned image maker: every "Make image" ADDS a named pill (never
  // replaces), so no content is lost. Pills summarize the prompt; hover shows
  // it in full; each generated pill has a delete (×). The prompt history is
  // persisted to localStorage per item id, so user input survives reloads.
  //   opts.itemId      — stable id (persistence key)
  //   opts.show(imgOrNull)  — caller swaps the visible image (null = default)
  //   opts.buildPrompt(note) -> string
  //   opts.placeholder, opts.makeSaveCanvas (optional), opts.extraButtons (optional)
  function versionedMaker(opts) {
    const itemId = opts.itemId || ('item-' + Math.random().toString(36).slice(2));
    const HKEY = 'cs-hist:' + itemId;
    const versions = [{ label: 'Default', prompt: null, img: null, isDefault: true }];
    try {
      const saved = JSON.parse((window.localStorage && localStorage.getItem(HKEY)) || '[]');
      if (Array.isArray(saved)) saved.forEach((h) => versions.push({ label: h.label || 'image', prompt: h.prompt || '', img: null, ts: h.ts }));
    } catch (e) {}
    let active = 0;

    const wrap = document.createElement('div'); wrap.className = 'cr-versions';
    const pills = document.createElement('div'); pills.className = 'cr-pills';
    wrap.appendChild(pills);

    function persist() {
      try {
        localStorage.setItem(HKEY, JSON.stringify(
          versions.filter((v) => !v.isDefault).map((v) => ({ label: v.label, prompt: v.prompt, ts: v.ts }))));
      } catch (e) {}
    }
    function select(i) {
      if (i < 0 || i >= versions.length) return;
      active = i;
      const v = versions[i];
      renderPills();
      if (v.isDefault) return opts.show(null);
      if (v.img) return opts.show(v.img);
      // persisted prompt, no in-session image → regenerate on this explicit click
      if (v.prompt) {
        opts.show(null);
        window.CardRender.fetchArt(v.prompt).then((img) => { if (img) { v.img = img; if (active === i) opts.show(img); } });
      }
    }
    function renderPills() {
      pills.innerHTML = '';
      versions.forEach((v, i) => {
        const pill = document.createElement('span');
        pill.className = 'cr-pill' + (i === active ? ' active' : '');
        const lbl = document.createElement('button');
        lbl.type = 'button'; lbl.className = 'cr-pill-label';
        lbl.textContent = v.isDefault ? 'Default' : (v.label || 'image');
        lbl.title = v.prompt || 'Original default';
        lbl.addEventListener('click', (e) => { e.stopPropagation(); select(i); });
        pill.appendChild(lbl);
        if (!v.isDefault) {
          const del = document.createElement('button');
          del.type = 'button'; del.className = 'cr-pill-del'; del.textContent = '×'; del.title = 'Delete this version';
          del.addEventListener('click', (e) => {
            e.stopPropagation();
            versions.splice(i, 1);
            if (active >= versions.length || active === i) active = 0;
            persist(); select(active);
          });
          pill.appendChild(del);
        }
        pills.appendChild(pill);
      });
    }
    function summarize(note, n) {
      const t = (note || '').trim();
      if (!t) return 'image ' + n;
      return t.length > 28 ? t.slice(0, 28) + '…' : t;
    }

    const makeBtn = {
      label: '🖼 Make image', busy: '🖼 making…', done: '🖼 Make another', fail: 'image not enabled',
      run: (note) => {
        const prompt = opts.buildPrompt(note);
        return window.CardRender.fetchArt(prompt).then((img) => {
          if (!img) return false;
          versions.push({ label: summarize(note, versions.filter((v) => !v.isDefault).length + 1), prompt, img, ts: Date.now() });
          active = versions.length - 1; persist(); select(active);
          return true;
        });
      },
    };
    const extras = [];
    if (opts.makeSaveCanvas) extras.push(window.CardRender.saveButton('⬇ Save', opts.makeSaveCanvas, itemId + '.png'));
    wrap.appendChild(makerControls({
      placeholder: opts.placeholder,
      buttons: [makeBtn].concat(opts.extraButtons || []),
      extra: extras,
    }));
    renderPills();
    return wrap;
  }

  window.CardRender = {
    characterCanvas: characterCanvas,
    adventureCanvas: adventureCanvas,
    beatCanvas: beatCanvas,
    beatPrompt: beatPrompt,
    videoPrompt: videoPrompt,
    stylePrompt: STYLE_PROMPT,
    loadImage: loadImage, fetchArt: fetchArt, providerToggle: providerToggle,
    makerControls: makerControls, versionedMaker: versionedMaker,
    download: download, saveButton: saveButton, lightbox: lightbox,
  };
})();
