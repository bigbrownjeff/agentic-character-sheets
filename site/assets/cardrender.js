/* ============================================================
   CARDRENDER · client-side image rendering for the whole site
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
        coverDraw(ctx, art, 110, 318, W - 220, 334, 0.14); // anchor high so the face isn't cropped
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

      brand(ctx, ch.role ? ('AC ' + (ch.ac != null ? ch.ac : '−')) : '');
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
    // Reel/video registers (docs/REELS.md section 2.5). These are the committed anti-uncanny
    // looks for the MOTION pilots and also govern the in-register keyframe. They are additive:
    // styleNameFor() never returns them, so the DEFAULT register stays painterly and no existing
    // still card changes. They are here so a future keyframe pass can be generated in-register
    // from the app. Wording is Jeff-approved verbatim from REELS.md section 2.5.
    miniature: 'Photograph of a painted tabletop RPG miniatures diorama on a lit gaming board: hand-painted resin figures at ~32mm scale, visible brushwork and matte primer, shallow macro depth of field, warm practical lighting, tiny sculpted terrain. Charming, tactile, deliberately toy-like (zero photoreal humans). 9:16. ',
    anime: 'Hyper-stylized cel-shaded anime action still, shonen "battle-manga" grade: bold ink linework, flat cel shading, dramatic speed-lines and impact frames, glowing aura and energy FX, hard rim light, high-contrast dynamic composition. Anime, not photoreal. 9:16. ',
  };
  // Shared video NEGATIVE prompt — the actual anti-uncanny fix. Passed to Veo's negativePrompt
  // field so it keeps our painted still SACRED. Veo guidance: list UNWANTED ELEMENTS as bare
  // noun phrases, never "no/don't" wording. Canonical source is beats.json `video_negative`; this
  // is a fallback the beats page overrides via setVideoNegative() once beats.json loads. See
  // docs/REELS.md section 3.
  var VIDEO_NEGATIVE = 'face morphing, facial warping, melting features, extra fingers, re-rendering, redesigned characters, style drift, added characters, removed characters, changed outfits, moving lips, talking mouths, photoreal skin, plastic sheen, fast motion, scene change, on-screen text, captions, subtitles, watermark';
  function setVideoNegative(s) { if (s && typeof s === 'string') VIDEO_NEGATIVE = s; }
  function videoNegative() { return VIDEO_NEGATIVE; }
  // The per-adventure "consistency bible" (style-INDEPENDENT world/cast), built from beat.bible
  // and prepended to every frame's prompt so Veo/Gemini re-render the same place, cast, motifs,
  // and threat across frames. Per docs/research/dm-consistency-craft.md (the DM "fixed world").
  function buildBible(beat) {
    var b = beat && beat.bible;
    if (!b) return '';
    var cast = (b.recurring_cast || []).map(function (c) {
      return c.locked_descriptor + (c.mannerism ? ' (' + c.mannerism + ')' : '');
    }).join('; ');
    var p = [];
    p.push('[WORLD] ' + b.setting + (b.setting_aspects && b.setting_aspects.length ? ', ' + b.setting_aspects.join(', ') : '') + '. Establishing anchor: ' + b.establishing_anchor + '.');
    if (b.recurring_motifs && b.recurring_motifs.length) p.push('[MOTIFS] recurring, show at least one: ' + b.recurring_motifs.join(', ') + '.');
    if (cast) p.push('[CAST] keep identical across frames: ' + cast + '.');
    if (b.bigbad_silhouette) p.push('[THREAT] antagonist silhouette: ' + b.bigbad_silhouette + (b.bigbad_foreshadow ? '; foreshadow ' + b.bigbad_foreshadow : '') + '.');
    if (b.tone && b.tone.length) p.push('[TONE] ' + b.tone.join(', ') + '.');
    p.push('[RULE] re-render this exact place and cast; only ' + (b.moving_element || 'the action') + ' changes between frames.');
    return ' ' + p.join(' ') + ' ';
  }
  // The small per-card "moving set": only what changes this frame (the DM "moving clock").
  function frameCues(card) {
    if (!card) return '';
    var p = [];
    if (card.arc_position) p.push('arc ' + card.arc_position);
    if (card.time_marker) p.push('time: ' + card.time_marker);
    if (card.escalation_cue) p.push('escalation: ' + card.escalation_cue);
    if (card.callbacks && card.callbacks.length) p.push('reuse from earlier frames: ' + card.callbacks.join(', '));
    if (card.is_ring_close) p.push('closing frame: resolve the opening establishing image, transformed by the outcome');
    return p.length ? '[FRAME] ' + p.join('. ') + '. ' : '';
  }
  function beatPrompt(beat, index, styleKey) {
    var card = (beat.cards || [])[index] || {};
    return (STYLE_PROMPT[styleNameFor(beat.id, styleKey)] || STYLE_PROMPT.painterly) +
      buildBible(beat) + frameCues(card) + (card.scene || beat.title || '');
  }
  // Per-cell video prompt: animate ONE keyframe (one card) into a 3-5s shot.
  // The whole beat = the sequence of these per-cell clips (~15-30s across 5-6 cards).
  //
  // ANTI-SLOP CONTRACT (see docs/REELS.md): the keyframe already carries 100% of the content,
  // so this prompt is MOTION-ONLY plus prohibitions. We do NOT re-inject the style preamble or
  // the full `scene` prose — naming people/objects/scene to a video model makes it re-render and
  // morph faces (the uncanny valley). One camera move + one environmental motion, nothing more;
  // the real preservation rides in VIDEO_NEGATIVE (Veo's negativePrompt field).
  function videoPrompt(beat, index, styleKey, note) {
    var card = (beat.cards || [])[index] || {};
    var camera = card.camera || 'slow push-in';
    var motion = card.motion || 'subtle ambient life: faint drifting particles and a slow flicker of the key light';
    return 'Animate this exact image. Do not re-render, redesign, or change the scene. ' +
      'Camera: ' + camera + '. Motion: ' + motion + '. ' +
      'Preserve the exact composition, every character, face, object, linework, and color palette. ' +
      (card.is_ring_close ? 'Let the motion settle to calm on this final beat. ' : '') +
      'No on-screen text or captions.' +
      (note ? ' Art-director note: ' + note : '');
  }

  // object-fit: cover for a loaded image into a rect
  // focusY picks the vertical crop anchor when the image is taller than the box:
  // 0 = show the top, 0.5 = center (default), 1 = bottom. For portraits in the card's
  // short, wide art band, anchor near the top so the FACE survives the crop (not the torso).
  function coverDraw(ctx, img, x, y, w, h, focusY) {
    var iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight;
    if (!iw || !ih) return;
    var scale = Math.max(w / iw, h / ih), dw = iw * scale, dh = ih * scale;
    var fy = (focusY == null) ? 0.5 : focusY;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) * fy, dw, dh);
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
    wrap.appendChild(document.createTextNode('Engine'));
    var sel = document.createElement('select');
    [['auto', 'Auto'], ['gemini', 'Best (Gemini)'], ['cloudflare', 'Fast (Cloudflare)']].forEach(function (o) {
      var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; sel.appendChild(op);
    });
    sel.value = imageProvider();
    sel.addEventListener('change', function () { try { localStorage.setItem('cs-image-provider', sel.value); } catch (e) {} });
    wrap.appendChild(sel);
    return wrap;
  }
  // POST a prompt to /api/image; resolve to the image data URL, or null on any failure.
  // quality:'hq' (the default) runs the server's hidden generate->critique->redo gate.
  // opts.refImages: [dataURL|url] are identity anchors (e.g. a locked portrait); the
  // server conditions generation on them so the SAME character recurs across images.
  // opts.aspect ('9:16'|'1:1'|'16:9') sets the gemini aspect ratio (ignored by Cloudflare).
  // opts.docs: [{ mimeType, data }] are reference documents (base64-stripped) the server
  // appends as inlineData parts so the model can read an attached brief.
  function postImage(prompt, provider, opts) {
    opts = opts || {};
    var body = {
      prompt: String(prompt || '').slice(0, 1400),
      provider: provider || imageProvider(),
      quality: opts.quality || 'hq',
    };
    if (opts.refImages && opts.refImages.length) body.refImages = opts.refImages;
    if (opts.intent) body.intent = String(opts.intent).slice(0, 1400);
    if (opts.saveKey) body.saveKey = String(opts.saveKey); // server persists to R2 -> d.saved
    if (opts.aspect) body.aspect = String(opts.aspect);
    if (opts.docs && opts.docs.length) body.docs = opts.docs;
    return fetch('./api/image', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    }).then(function (d) {
      return (d && d.image) ? d : null; // {image, saved?, ...} or null
    }).catch(function () { return null; });
  }
  // Resolve to a loaded <img> (most callers), the raw data URL (fetchArtData, for a
  // reference anchor), or the full {image, saved} object (fetchArtFull, when the caller
  // needs the durable R2 url, e.g. to persist a forged portrait).
  function fetchArt(prompt, provider, opts) {
    return postImage(prompt, provider, opts).then(function (d) { return d ? loadImage(d.image) : null; });
  }
  function fetchArtData(prompt, provider, opts) {
    return postImage(prompt, provider, opts).then(function (d) { return d ? d.image : null; });
  }
  function fetchArtFull(prompt, provider, opts) {
    return postImage(prompt, provider, opts);
  }

  // POST a prompt to /api/video, then poll the long-running Veo op to completion.
  // Resolves to a PLAYABLE video URL (the server's streaming proxy, './api/video?file=…'),
  // or null on any failure / timeout. Self-contained: no external poll loop needed.
  //   opts.aspectRatio ('9:16'|'1:1'|'16:9'), opts.image (data-URL first frame, optional)
  // Veo is ~1-2 min; we poll every POLL_MS up to MAX_POLLS (≈4 min ceiling) then give up.
  function postVideo(prompt, opts) {
    opts = opts || {};
    var POLL_MS = 5000, MAX_POLLS = 48;
    var body = { prompt: String(prompt || '').slice(0, 1900) };
    if (opts.aspectRatio) body.aspectRatio = String(opts.aspectRatio);
    if (opts.image) body.image = String(opts.image);
    // Default the negative to the shared anti-slop clause unless the caller overrides it.
    body.negativePrompt = (opts.negative != null ? String(opts.negative) : VIDEO_NEGATIVE).slice(0, 1900);
    return fetch('./api/video', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    }).then(function (d) {
      if (!d || !d.op) return null;
      var op = d.op;
      return new Promise(function (resolve) {
        var tries = 0;
        function poll() {
          tries++;
          if (tries > MAX_POLLS) return resolve(null);
          fetch('./api/video?op=' + encodeURIComponent(op), { headers: { 'Accept': 'application/json' } })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (p) {
              if (!p) return resolve(null);
              if (!p.done) { setTimeout(poll, POLL_MS); return; }
              if (p.error || !p.video) return resolve(null);
              resolve(p.video); // './api/video?file=…' (proxy); a usable <video src>
            })
            .catch(function () { resolve(null); });
        }
        setTimeout(poll, POLL_MS);
      });
    }).catch(function () { return null; });
  }

  // POST text + a voice id to /api/tts; resolve to an audio data URL, or null on failure.
  function postTTS(text, voiceId) {
    if (!text || !voiceId) return Promise.resolve(null);
    return fetch('./api/tts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: String(text).slice(0, 2400), voiceId: String(voiceId) }),
    }).then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    }).then(function (d) { return (d && d.audio) ? d.audio : null; })
      .catch(function () { return null; });
  }

  // UX concurrency cap. Generations are slow and costly, so at most CAP run at once
  // across the whole page; while at the cap, every other Make button greys out so a
  // user can't pile a stack of jobs onto the queue (or double-fire one). Every maker
  // button registers here; auto-illustrate counts too (see forge.js). CAP=1 by default
  // → strictly one generation at a time, which is what "grey out if one's in progress"
  // means; setCap() can loosen it.
  var GenGate = (function () {
    var active = 0, cap = 1, btns = [], subs = [];
    function refresh() {
      var blocked = active >= cap;
      for (var i = 0; i < btns.length; i++) {
        var b = btns[i];
        if (b._running) continue;        // the running button manages its own busy label
        b.disabled = blocked;
        if (b.classList) b.classList.toggle('cr-gated', blocked);
      }
      for (var j = 0; j < subs.length; j++) { try { subs[j](active); } catch (e) {} } // notify the WIP rail
    }
    return {
      register: function (btn) { if (btns.indexOf(btn) < 0) btns.push(btn); refresh(); },
      gated: function () { return active >= cap; },
      begin: function (btn) { active++; if (btn) btn._running = true; refresh(); },
      end: function (btn) { active = Math.max(0, active - 1); if (btn) btn._running = false; refresh(); },
      setCap: function (n) { cap = Math.max(1, n | 0); refresh(); },
      active: function () { return active; },
      onChange: function (fn) { if (typeof fn === 'function') subs.push(fn); },
    };
  })();

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

    // Per-run art-engine picker, scoped to THIS maker. Each "Add your take"
    // section carries its own engine choice, passed explicitly into the run so
    // the engine shown is the engine used (no global cross-talk between cards).
    var engineSelect = null;
    if (opts.engine !== false && typeof providerToggle === 'function') {
      var engineEl = providerToggle();
      engineSelect = engineEl.querySelector('select');
      row.appendChild(engineEl);
    }

    (opts.buttons || []).forEach(function (b) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cr-save-btn' + (b.ghost ? ' ghost' : '');
      btn.textContent = b.label;
      if (b.title) btn.title = b.title;
      GenGate.register(btn);
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (btn.disabled || btn._running || GenGate.gated()) return; // gated or already running
        var note = noteEl ? noteEl.value.trim() : '';
        var provider = engineSelect ? engineSelect.value : undefined;
        var orig = b.label;
        GenGate.begin(btn);            // greys every other make button while this runs
        btn.disabled = true;
        btn.textContent = b.busy || '…working…';
        Promise.resolve(b.run(note, btn, provider)).then(function (ok) {
          btn.textContent = (ok === false) ? (b.fail || orig) : (b.done || orig);
        }).catch(function () { btn.textContent = b.fail || orig; })
          .then(function () { GenGate.end(btn); }); // re-enables the others (or stays gated if another is running)
      });
      row.appendChild(btn);
    });
    (opts.extra || []).forEach(function (node) { row.appendChild(node); });
    wrap.appendChild(row);
    return wrap;
  }

  // A collapsed "Add your take" disclosure. Hides the maker controls behind a
  // single quiet summary so a card reads calm until you choose to shape it.
  // Returns a <details> whose ._body is where content goes; .setLabel(text)
  // updates the summary copy (e.g. a take count).
  function takeDisclosure(opts) {
    opts = opts || {};
    var details = document.createElement('details');
    details.className = 'cr-take';
    if (opts.open) details.open = true;
    var summary = document.createElement('summary');
    summary.className = 'cr-take-summary';
    summary.innerHTML = '<span class="cr-take-caret" aria-hidden="true"></span>' +
      '<span class="cr-take-label">' + (opts.label || 'Add your take') + '</span>';
    // Never let opening/closing bubble to a clickable parent card.
    summary.addEventListener('click', function (e) { e.stopPropagation(); });
    details.appendChild(summary);
    var body = document.createElement('div');
    body.className = 'cr-take-body';
    details.appendChild(body);
    details._body = body;
    details.setLabel = function (t) {
      var l = summary.querySelector('.cr-take-label');
      if (l) l.textContent = t;
    };
    return details;
  }

  // A versioned image maker: every "Make image" ADDS a named pill (never
  // replaces), so no content is lost. Pills summarize the prompt; hover shows
  // it in full; each generated pill has a delete (×). The prompt history is
  // persisted to localStorage per item id, so user input survives reloads.
  //   opts.itemId      · stable id (persistence key)
  //   opts.show(imgOrNull)  · caller swaps the visible image (null = default)
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
    // mediaMount (video/audio results) is created below and inserted here after pills.

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
        window.CardRender.fetchArt(v.prompt, undefined, { refImages: refImages() }).then((img) => { if (img) { v.img = img; if (active === i) opts.show(img); } });
      }
    }
    // Reference images for every generation here: a lazy identity anchor (e.g. a locked
    // portrait) PLUS any inspiration the user attached below (files / inspo URLs). Max 3.
    var attached = [];
    function refImages() {
      var base = (opts.getRefImages ? (opts.getRefImages() || []) : []);
      return base.concat(attached).slice(0, 3);
    }
    // Attached docs ride as {name,type,data:dataURL}; the image API wants {mimeType,data}
    // with bare base64 (no data-URL prefix). Convert + drop anything malformed. Max 2.
    function docsForApi() {
      var out = [];
      docs.forEach(function (d) {
        var m = /^data:([^;]+);base64,(.+)$/.exec(d && d.data || '');
        if (m) out.push({ mimeType: d.type || m[1] || 'application/octet-stream', data: m[2] });
      });
      return out.slice(0, 2);
    }
    // Where a generated video/audio renders (latest only; the image path keeps its pills).
    // Lives just under the pills, inside the maker, so it never routes through opts.show()
    // (which expects an <img> and re-renders a Canvas card).
    var mediaMount = document.createElement('div'); mediaMount.className = 'cr-media';
    wrap.insertBefore(mediaMount, pills.nextSibling);
    function showMedia(node) {
      mediaMount.innerHTML = '';
      if (node) mediaMount.appendChild(node);
    }
    function updateTakeLabel() {
      if (!take) return;
      var n = versions.filter(function (v) { return !v.isDefault; }).length;
      take.setLabel(n > 0 ? ('Your takes · ' + n) : 'Add your take');
    }
    function renderPills() {
      updateTakeLabel();
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

    // Per-output Make handler. IMAGE is the default and the only versioned path (keeps the
    // pill history); VIDEO and AUDIO replace the single latest result in mediaMount and never
    // touch the pills. The selections from "More options" (aspect, docs, voice, output) flow
    // in here off the closure vars set by the sub-controls below.
    const makeBtn = {
      label: '🖼 Make image', busy: '🖼 making…', done: '🖼 Make another', fail: 'image not enabled',
      run: (note, btn, provider) => {
        const prompt = opts.buildPrompt(note);
        if (output === 'video') {
          // First frame: prefer the active version's in-session image so the clip animates the
          // exact still the user is looking at (image-to-video lock); else text-to-video.
          var firstFrame = (versions[active] && versions[active].img && versions[active].img.src) || null;
          // ANTI-SLOP: a video clip must NOT be driven by the full image prompt (style preamble +
          // scene) over a keyframe — that makes Veo re-render and morph. Use a motion-only prompt
          // (opts.buildVideoPrompt when the caller supplies one, else a safe generic move).
          var vprompt = (typeof opts.buildVideoPrompt === 'function')
            ? opts.buildVideoPrompt(note)
            : ('Animate this exact image. Do not re-render, redesign, or change the scene. Camera: slow push-in. Motion: subtle ambient life. Preserve the exact composition, every character, face, object, linework, and color palette. No on-screen text or captions.' + (note ? ' Art-director note: ' + note : ''));
          return window.CardRender.postVideo(vprompt, { aspectRatio: aspect, image: firstFrame }).then((src) => {
            if (!src) return false;
            var vid = document.createElement('video');
            vid.className = 'cr-media-video'; vid.controls = true; vid.playsInline = true;
            vid.style.maxWidth = '100%'; vid.src = src;
            showMedia(vid);
            return true;
          });
        }
        if (output === 'audio') {
          // Speak the note if given, else the built prompt (whatever the user typed to steer).
          var text = (note && note.trim()) || prompt;
          return window.CardRender.postTTS(text, voiceId).then((audioUrl) => {
            if (!audioUrl) return false;
            var au = document.createElement('audio');
            au.className = 'cr-media-audio'; au.controls = true;
            au.style.maxWidth = '100%'; au.src = audioUrl;
            showMedia(au);
            return true;
          });
        }
        // IMAGE (default): aspect + docs flow to the gen. To keep the default path BYTE-FOR-BYTE
        // identical to today, '9:16' (the default + the card's native portrait) is treated as
        // "unspecified" and NOT sent; only an explicit 1:1/16:9 and/or attached docs change the
        // request. docsForApi() is [] when nothing is attached, so the body is unchanged then too.
        var imgAspect = (aspect && aspect !== '9:16') ? aspect : undefined;
        var imgDocs = docsForApi();
        return window.CardRender.fetchArt(prompt, provider, { refImages: refImages(), aspect: imgAspect, docs: imgDocs.length ? imgDocs : undefined }).then((img) => {
          if (!img) return false;
          versions.push({ label: summarize(note, versions.filter((v) => !v.isDefault).length + 1), prompt, img, ts: Date.now() });
          active = versions.length - 1; persist(); select(active);
          return true;
        });
      },
    };
    // Inspiration attachments: image files and/or pasted image URLs (inspo boards, external
    // refs) ride along as refImages, so the next generation is conditioned on them. Max 3.
    var attachWrap = document.createElement('div'); attachWrap.className = 'cr-attach';
    var chips = document.createElement('div'); chips.className = 'cr-attach-chips';
    function renderAttach() {
      chips.innerHTML = '';
      attached.forEach(function (ref, i) {
        var c = document.createElement('span'); c.className = 'cr-attach-chip';
        c.textContent = (ref.indexOf('data:') === 0 ? 'image' : ref.replace(/^https?:\/\//, '').slice(0, 22)) + ' ×';
        c.title = 'remove'; c.addEventListener('click', function (e) { e.stopPropagation(); attached.splice(i, 1); renderAttach(); });
        chips.appendChild(c);
      });
    }
    var fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.multiple = true; fileInput.className = 'cr-attach-file'; fileInput.id = itemId + '-attach';
    fileInput.addEventListener('change', function (e) {
      e.stopPropagation();
      Array.prototype.slice.call(fileInput.files).forEach(function (f) {
        if (attached.length >= 3) return;
        var r = new FileReader(); r.onload = function () { if (attached.length < 3) { attached.push(r.result); renderAttach(); } }; r.readAsDataURL(f);
      });
      fileInput.value = '';
    });
    var fileLbl = document.createElement('label'); fileLbl.className = 'cr-attach-btn'; fileLbl.setAttribute('for', fileInput.id); fileLbl.textContent = '📎 Attach image';
    var urlInput = document.createElement('input'); urlInput.type = 'url'; urlInput.placeholder = 'or paste an inspo image URL ↵'; urlInput.className = 'cr-attach-url';
    urlInput.addEventListener('click', function (e) { e.stopPropagation(); });
    urlInput.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); var v = urlInput.value.trim(); if (v && attached.length < 3) { attached.push(v); urlInput.value = ''; renderAttach(); } }
    });
    attachWrap.appendChild(fileLbl); attachWrap.appendChild(fileInput); attachWrap.appendChild(urlInput); attachWrap.appendChild(chips);
    wrap.appendChild(attachWrap);

    // ---- "More options" expander -------------------------------------------
    // A second, collapsed layer under the attach row. Captures choices the maker
    // does not yet fully wire (output type, a reference doc, an aspect ratio, a
    // voice) but EXPOSES them on the returned node so a caller can read them.
    // Image is the only output fully wired today; the rest are captured + ready.
    var output = 'image';                  // 'image' | 'video' | 'audio'
    var aspect = '9:16';                   // 9:16 | 1:1 | 16:9 (image/video)
    var voiceId = '';                      // chosen ElevenLabs voice id (audio)
    try { voiceId = (window.localStorage && localStorage.getItem('cs-voice')) || ''; } catch (e) {}
    // Reference documents (PDF/txt/md) as data URLs. Separate from `attached`
    // (images): docs ride alongside but are not pushed into refImages. Max 2.
    var docs = [];

    var more = document.createElement('details'); more.className = 'cr-more';
    var moreSum = document.createElement('summary'); moreSum.className = 'cr-more-summary';
    moreSum.innerHTML = '<span class="cr-more-caret" aria-hidden="true"></span><span>More options</span>';
    moreSum.addEventListener('click', function (e) { e.stopPropagation(); });
    more.appendChild(moreSum);
    var moreBody = document.createElement('div'); moreBody.className = 'cr-more-body';
    more.appendChild(moreBody);

    // 1) Attach a document / PDF (data URL, max 2), shown as removable chips.
    var docWrap = document.createElement('div'); docWrap.className = 'cr-more-row cr-doc';
    var docChips = document.createElement('div'); docChips.className = 'cr-attach-chips';
    function renderDocs() {
      docChips.innerHTML = '';
      docs.forEach(function (d, i) {
        var c = document.createElement('span'); c.className = 'cr-attach-chip';
        c.textContent = (d.name || 'document').slice(0, 24) + ' ×';
        c.title = 'remove'; c.addEventListener('click', function (e) { e.stopPropagation(); docs.splice(i, 1); renderDocs(); });
        docChips.appendChild(c);
      });
    }
    var docInput = document.createElement('input');
    docInput.type = 'file'; docInput.accept = '.pdf,.txt,.md,application/pdf'; docInput.className = 'cr-attach-file'; docInput.id = itemId + '-doc';
    docInput.addEventListener('change', function (e) {
      e.stopPropagation();
      Array.prototype.slice.call(docInput.files).forEach(function (f) {
        if (docs.length >= 2) return;
        var r = new FileReader();
        r.onload = function () { if (docs.length < 2) { docs.push({ name: f.name, type: f.type, data: r.result }); renderDocs(); } };
        r.readAsDataURL(f);
      });
      docInput.value = '';
    });
    var docLbl = document.createElement('label'); docLbl.className = 'cr-attach-btn'; docLbl.setAttribute('for', docInput.id); docLbl.textContent = '📄 Attach document';
    docWrap.appendChild(docLbl); docWrap.appendChild(docInput); docWrap.appendChild(docChips);
    moreBody.appendChild(docWrap);

    // 2) Output type: Image | Video | Audio (default Image). Toggling it shows
    // the matching sub-controls (aspect ratio vs. voice picker).
    var outWrap = document.createElement('div'); outWrap.className = 'cr-more-row cr-output';
    var outLbl = document.createElement('span'); outLbl.className = 'cr-more-label'; outLbl.textContent = 'Output';
    outWrap.appendChild(outLbl);
    var outName = itemId + '-output';
    [['image', 'Image'], ['video', 'Video'], ['audio', 'Audio']].forEach(function (o) {
      var lab = document.createElement('label'); lab.className = 'cr-radio';
      var rad = document.createElement('input'); rad.type = 'radio'; rad.name = outName; rad.value = o[0];
      if (o[0] === output) rad.checked = true;
      rad.addEventListener('change', function (e) { e.stopPropagation(); if (rad.checked) { output = rad.value; syncOutput(); } });
      lab.appendChild(rad); lab.appendChild(document.createTextNode(o[1]));
      outWrap.appendChild(lab);
    });
    moreBody.appendChild(outWrap);

    // 4) Image / Video sub-controls: aspect ratio (kept minimal).
    var avWrap = document.createElement('div'); avWrap.className = 'cr-more-row cr-av-opts';
    var arLbl = document.createElement('span'); arLbl.className = 'cr-more-label'; arLbl.textContent = 'Aspect';
    var arSel = document.createElement('select'); arSel.className = 'cr-more-select';
    [['9:16', '9:16 · portrait'], ['1:1', '1:1 · square'], ['16:9', '16:9 · wide']].forEach(function (o) {
      var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; arSel.appendChild(op);
    });
    arSel.value = aspect;
    arSel.addEventListener('change', function (e) { e.stopPropagation(); aspect = arSel.value; });
    avWrap.appendChild(arLbl); avWrap.appendChild(arSel);
    moreBody.appendChild(avWrap);

    // 3) Audio sub-controls: ElevenLabs voice picker + a "preview" link that
    // opens the selected voice's sample at the source. Voices load lazily the
    // first time Audio is chosen; the chosen id persists to localStorage.
    var audWrap = document.createElement('div'); audWrap.className = 'cr-more-row cr-audio-opts';
    var voiceLbl = document.createElement('span'); voiceLbl.className = 'cr-more-label'; voiceLbl.textContent = 'Voice';
    var voiceSel = document.createElement('select'); voiceSel.className = 'cr-more-select'; voiceSel.disabled = true;
    var voiceOpt0 = document.createElement('option'); voiceOpt0.value = ''; voiceOpt0.textContent = 'loading voices…'; voiceSel.appendChild(voiceOpt0);
    var voicePreview = document.createElement('a'); voicePreview.className = 'cr-voice-preview'; voicePreview.textContent = 'preview ↗';
    voicePreview.target = '_blank'; voicePreview.rel = 'noopener'; voicePreview.href = '#'; voicePreview.style.visibility = 'hidden';
    voicePreview.addEventListener('click', function (e) { e.stopPropagation(); if (!voicePreview.href || voicePreview.getAttribute('href') === '#') e.preventDefault(); });
    var voicesById = {};
    function syncPreview() {
      var url = voicesById[voiceSel.value];
      if (url) { voicePreview.href = url; voicePreview.style.visibility = 'visible'; }
      else { voicePreview.setAttribute('href', '#'); voicePreview.style.visibility = 'hidden'; }
    }
    voiceSel.addEventListener('change', function (e) {
      e.stopPropagation(); voiceId = voiceSel.value;
      try { localStorage.setItem('cs-voice', voiceId); } catch (err) {}
      syncPreview();
    });
    audWrap.appendChild(voiceLbl); audWrap.appendChild(voiceSel); audWrap.appendChild(voicePreview);
    moreBody.appendChild(audWrap);

    var voicesLoaded = false;
    function loadVoices() {
      if (voicesLoaded) return; voicesLoaded = true;
      fetch('./api/voices', { headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          var list = (d && Array.isArray(d.voices)) ? d.voices : [];
          voiceSel.innerHTML = '';
          if (!list.length) {
            var none = document.createElement('option'); none.value = ''; none.textContent = 'no voices available'; voiceSel.appendChild(none);
            voiceSel.disabled = true; syncPreview(); return;
          }
          list.forEach(function (v) {
            if (!v || !v.voice_id) return;
            voicesById[v.voice_id] = v.preview_url || '';
            var op = document.createElement('option'); op.value = v.voice_id;
            op.textContent = (v.name || v.voice_id) + (v.category ? ' · ' + v.category : '');
            voiceSel.appendChild(op);
          });
          voiceSel.disabled = false;
          if (voiceId && voicesById.hasOwnProperty(voiceId)) voiceSel.value = voiceId;
          else { voiceId = voiceSel.value; try { localStorage.setItem('cs-voice', voiceId); } catch (err) {} }
          syncPreview();
        })
        .catch(function () {
          voiceSel.innerHTML = '';
          var none = document.createElement('option'); none.value = ''; none.textContent = 'voices unavailable'; voiceSel.appendChild(none);
          voiceSel.disabled = true; syncPreview();
        });
    }
    // The live Make <button>, captured after makerControls builds (below). Used to relabel
    // it per output type. Null until then; syncOutput()'s first call (above the build) no-ops
    // the relabel.
    var makeBtnEl = null;
    // Per-output Make-button copy. The handler reads label/busy/done/fail off makeBtn (the same
    // object) at click time, so mutating those keys + the resting textContent keeps the button
    // honest for whichever output is selected.
    var MAKE_COPY = {
      image: { label: '🖼 Make image', busy: '🖼 making…', done: '🖼 Make another', fail: 'image not enabled' },
      video: { label: '🎬 Make video', busy: '🎬 rendering…', done: '🎬 Make another', fail: 'video not enabled' },
      audio: { label: '🔊 Make audio', busy: '🔊 speaking…', done: '🔊 Make another', fail: 'audio not enabled' },
    };
    function relabelMake() {
      var c = MAKE_COPY[output] || MAKE_COPY.image;
      makeBtn.label = c.label; makeBtn.busy = c.busy; makeBtn.done = c.done; makeBtn.fail = c.fail;
      // Only repaint the resting label; never stomp a button mid-run (it owns its busy text).
      if (makeBtnEl && !makeBtnEl._running) makeBtnEl.textContent = c.label;
    }
    // Show aspect (image/video) OR voice (audio) to match the current output type, and relabel
    // the Make button (Make image / Make video / Make audio).
    function syncOutput() {
      var audio = output === 'audio';
      avWrap.style.display = audio ? 'none' : '';
      audWrap.style.display = audio ? '' : 'none';
      if (audio) loadVoices();
      relabelMake();
    }
    syncOutput();
    wrap.appendChild(more);

    const extras = [];
    if (opts.makeSaveCanvas) extras.push(window.CardRender.saveButton('⬇ Save', opts.makeSaveCanvas, itemId + '.png'));
    var makerEl = makerControls({
      placeholder: opts.placeholder,
      buttons: [makeBtn].concat(opts.extraButtons || []),
      extra: extras,
    });
    // The Make button is the FIRST action button (makeBtn is first in the buttons[]); grab it
    // so syncOutput()/relabelMake() can retitle it per output. The engine picker is a <label>,
    // not a .cr-save-btn, so the first .cr-save-btn in the row is ours.
    makeBtnEl = makerEl.querySelector('.cr-actions .cr-save-btn');
    relabelMake(); // apply the initial output's label now that the button exists
    wrap.appendChild(makerEl);
    var take = takeDisclosure({ label: 'Add your take' });
    take._body.appendChild(wrap);
    renderPills();
    // Expose the "More options" selections to callers WITHOUT changing the return
    // contract (still the <details> node). A caller reads them off the node, e.g.
    //   maker.getOutput()  -> 'image' | 'video' | 'audio'
    //   maker.getAspect()  -> '9:16' | '1:1' | '16:9'
    //   maker.getVoiceId() -> ElevenLabs voice id ('' if none / not audio)
    //   maker.getDocs()    -> [{ name, type, data:dataURL }]  (max 2)
    //   maker.getAttached()-> [dataURL|url]  (the inspiration images, max 3)
    //   maker.getTakeOptions() -> a snapshot object of all of the above
    take.getOutput = function () { return output; };
    take.getAspect = function () { return aspect; };
    take.getVoiceId = function () { return voiceId; };
    take.getDocs = function () { return docs.slice(); };
    take.getAttached = function () { return attached.slice(); };
    take.getTakeOptions = function () {
      return { output: output, aspect: aspect, voiceId: voiceId, docs: docs.slice(), attached: attached.slice() };
    };
    return take;
  }

  window.CardRender = {
    characterCanvas: characterCanvas,
    adventureCanvas: adventureCanvas,
    beatCanvas: beatCanvas,
    beatPrompt: beatPrompt,
    videoPrompt: videoPrompt,
    videoNegative: videoNegative,
    setVideoNegative: setVideoNegative,
    stylePrompt: STYLE_PROMPT,
    loadImage: loadImage, fetchArt: fetchArt, fetchArtData: fetchArtData, fetchArtFull: fetchArtFull, providerToggle: providerToggle,
    postVideo: postVideo, postTTS: postTTS,
    makerControls: makerControls, versionedMaker: versionedMaker, takeDisclosure: takeDisclosure, GenGate: GenGate,
    download: download, saveButton: saveButton, lightbox: lightbox,
  };
})();
