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
  function characterCanvas(ch) {
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

      // emblem
      var glyph = ch.role === 'monster' ? '☠' : ch.role === 'npc' ? '◈' : '⚔';
      emblem(ctx, W / 2, 470, 150, rc, glyph);
      ctx.fillStyle = C.muted; ctx.font = '26px ' + MONO; ctx.textAlign = 'center';
      ctx.fillText((ch.role || '').toUpperCase(), W / 2, 660); ctx.textAlign = 'left';

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
  };
  var BEAT_STYLE_BY_ID = {
    masquerade: 'gothic', 'round-table': 'feedbait', 'proving-grounds': 'telecast', forge: 'terminal',
  };
  function beatStyleFor(beatId, styleKey) {
    if (styleKey === 'B') return BEAT_STYLES['graphic-novel'];
    if (styleKey === 'C' && BEAT_STYLE_BY_ID[beatId]) return BEAT_STYLES[BEAT_STYLE_BY_ID[beatId]];
    return BEAT_STYLES.painterly;
  }
  function beatCanvas(beat, index, styleKey) {
    var card = beat.cards[index] || {};
    var s = beatStyleFor(beat.id, styleKey);
    return make(function (ctx) {
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
      // eyebrow
      ctx.fillStyle = s.accent; ctx.font = '24px ' + MONO;
      ctx.fillText((beat.adventure || '').toUpperCase().slice(0, 42), 70, 96);
      // title
      ctx.fillStyle = s.ink; var ts = fit(ctx, beat.title || '', W - 140, 56, 'bold', SERIF);
      ctx.font = 'bold ' + ts + 'px ' + SERIF; wrap(ctx, beat.title || '', 70, 156, W - 140, ts + 8, 2);
      // scene art-direction (faint)
      ctx.fillStyle = s.ink; ctx.globalAlpha = 0.78; ctx.font = 'italic 30px ' + SERIF;
      wrap(ctx, card.scene || '', 70, 300, W - 140, 42, 6); ctx.globalAlpha = 1;
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
  function adventureCanvas(adv, names) {
    names = names || {};
    var key = Object.keys(BEAT_STYLE_BY_ID).find(function (k) { return adv.id && adv.id.indexOf(k) !== -1; });
    var pal = BEAT_STYLES[BEAT_STYLE_BY_ID[key]] || BEAT_STYLES.painterly;
    return make(function (ctx) {
      var g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, pal.bg[0]); g.addColorStop(1, pal.bg[1]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = pal.accent; ctx.globalAlpha = 0.14; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '600px ' + SERIF; ctx.fillText(pal.motif, W / 2, H / 2);
      ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
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

  window.CardRender = {
    characterCanvas: characterCanvas,
    adventureCanvas: adventureCanvas,
    beatCanvas: beatCanvas,
    download: download, saveButton: saveButton, lightbox: lightbox,
  };
})();
