/* ============================================================
   CHARACTER SHEETS — BEATS.JS
   Self-contained carousel viewer for beats.json.
   No external dependencies. No network calls except
   ./data/beats.json (same origin, relative path).
   ============================================================ */

'use strict';

/* --- HTML ESCAPING --------------------------------------- */

function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/* --- PREFERS-REDUCED-MOTION ----------------------------- */

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* --- NAV ACTIVE STATE ----------------------------------- */

function setNavActive() {
  const path = window.location.pathname;
  const links = document.querySelectorAll('.nav-links a');
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const linkFile = href.split('/').pop().split('?')[0];
    const currentFile = path.split('/').pop().split('?')[0] || 'index.html';
    if (linkFile === currentFile) {
      link.classList.add('active');
    }
  });
}

/* --- HAMBURGER TOGGLE ----------------------------------- */

function initHamburger() {
  const toggle = document.getElementById('nav-toggle');
  const navList = document.getElementById('nav-list');
  if (!toggle || !navList) return;
  toggle.addEventListener('click', () => {
    navList.classList.toggle('open');
    const expanded = navList.classList.contains('open');
    toggle.setAttribute('aria-expanded', expanded);
  });
}

/* ============================================================
   STYLE TOGGLE HELPERS
   ============================================================ */

const STYLE_LABELS = { A: 'Painterly', B: 'Graphic Novel', C: 'Trend' };

/** Fetch the style-C name for a beat. Falls back to "Trend" silently. */
async function fetchStyleCName(beatId) {
  try {
    const res = await fetch(`./data/style-c/${encodeURIComponent(beatId)}.json`,
      { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return 'Trend';
    const data = await res.json();
    return (data && typeof data.name === 'string' && data.name.trim()) ? data.name.trim() : 'Trend';
  } catch {
    return 'Trend';
  }
}

/** Reload all images in a slide set to use the given style key (A/B/C). */
function applyStyleToSlides(slides, cards, beatId, styleKey) {
  slides.forEach((slide, i) => {
    const img = slide.querySelector('.carousel-img');
    const textCard = slide.querySelector('.carousel-text-card');
    if (!img) return;

    // Reset fallback state
    img.style.display = '';
    textCard.style.display = '';
    textCard.setAttribute('aria-hidden', 'true');
    slide.classList.remove('carousel-slide-text-fallback');

    const newSrc = `${window.MEDIA_BASE || '.'}/cards/beats/${beatId}-${styleKey}-${i + 1}.png`;

    // Reattach error handler for new src
    const errorHandler = () => {
      img.style.display = 'none';
      textCard.style.display = 'flex';
      textCard.removeAttribute('aria-hidden');
      slide.classList.add('carousel-slide-text-fallback');
    };
    img.removeEventListener('error', img._styleErrorHandler);
    img._styleErrorHandler = errorHandler;
    img.addEventListener('error', errorHandler);

    img.src = newSrc;
  });
}

/* ============================================================
   CAROUSEL
   ============================================================ */

function buildCarousel(beat, beatIndex) {
  const cards = beat.cards;
  const total = cards.length;
  let current = 0;
  let currentStyle = 'A';
  let syncVideo = function () {}; // per-frame video refresh; assigned below when CardRender is present
  let timer = null;
  const INTERVAL = 3000;
  const reduced = prefersReducedMotion();

  /* Render a beat card as a real image (CardRender) into a slide. */
  function renderBeatSlide(slide, i, styleKey, art) {
    if (!window.CardRender) return false;
    const img = slide.querySelector('.carousel-img');
    const textCard = slide.querySelector('.carousel-text-card');
    const banner = slide.querySelector('.carousel-caption-banner');
    const prev = slide.querySelector('canvas.cr-incard');
    if (prev) prev.remove();
    const cv = window.CardRender.beatCanvas(beat, i, styleKey, art);
    cv.className = 'cr-incard';
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', (beat.title || '') + ' — card ' + (i + 1));
    if (img) img.style.display = 'none';
    if (textCard) { textCard.style.display = 'none'; textCard.setAttribute('aria-hidden', 'true'); }
    if (banner) banner.style.display = 'none';
    slide.insertBefore(cv, banner || null);
    slide.classList.remove('carousel-slide-text-fallback');
    return true;
  }

  /* --- DOM skeleton --------------------------------------- */

  const section = document.createElement('section');
  section.className = 'beat-section';
  section.setAttribute('aria-label', escHtml(beat.title));

  // Beat header
  const header = document.createElement('div');
  header.className = 'beat-header';
  header.innerHTML = `
    <span class="beat-eyebrow">${escHtml(beat.adventure)}</span>
    <h2 class="beat-title">${escHtml(beat.title)}</h2>
    <p class="beat-caption">${escHtml(beat.caption)}</p>
  `;
  section.appendChild(header);

  // Style toggle bar
  const styleToggleBar = document.createElement('div');
  styleToggleBar.className = 'beat-style-toggle';
  styleToggleBar.setAttribute('role', 'group');
  styleToggleBar.setAttribute('aria-label', 'Illustration style');

  const styleToggleLabel = document.createElement('span');
  styleToggleLabel.className = 'style-toggle-label';
  styleToggleLabel.textContent = 'Art style';
  styleToggleBar.appendChild(styleToggleLabel);

  const styleButtons = {};
  ['A', 'B', 'C'].forEach(key => {
    const btn = document.createElement('button');
    btn.className = 'beat-style-btn' + (key === 'A' ? ' active' : '');
    btn.dataset.style = key;
    btn.setAttribute('aria-pressed', key === 'A' ? 'true' : 'false');
    btn.textContent = key === 'C' ? STYLE_LABELS.C : STYLE_LABELS[key];
    btn.addEventListener('click', () => {
      if (currentStyle === key) return;
      currentStyle = key;
      // Update button states
      ['A', 'B', 'C'].forEach(k => {
        styleButtons[k].classList.toggle('active', k === key);
        styleButtons[k].setAttribute('aria-pressed', k === key ? 'true' : 'false');
      });
      // Re-render carousel images for the new style (stylized only; AI art is on-demand)
      if (window.CardRender) {
        slides.forEach((sl, idx) => renderBeatSlide(sl, idx, key));
      } else { applyStyleToSlides(slides, cards, beat.id, key); }
      syncVideo(); // load this frame's clip in the new style
    });
    styleButtons[key] = btn;
    styleToggleBar.appendChild(btn);
  });

  section.appendChild(styleToggleBar);

  // Maker controls — explicit only, no auto-generation. The note steers the
  // NEXT image/video for the CURRENT card. Video = one 3–5s clip per card.
  if (window.CardRender) {
    let videoEl = null, videoStatus = null, videoBtn = null;

    // One persisted clip per (beat, style, frame); the key doubles as the R2 object name.
    function videoKey() { return beat.id + '-' + currentStyle + '-' + (current + 1); }
    function videoUrlFor(key) { return (window.MEDIA_BASE || '.') + '/videos/' + key + '.mp4'; }
    function ensureVideoEls() {
      if (!videoEl) {
        videoEl = document.createElement('video');
        videoEl.className = 'beat-video'; videoEl.controls = true; videoEl.playsInline = true;
        videoEl.loop = true; videoEl.style.display = 'none';
        section.appendChild(videoEl);
      }
      if (!videoStatus) { videoStatus = document.createElement('p'); videoStatus.className = 'beat-video-status'; section.appendChild(videoStatus); }
    }
    // Load THIS frame+style's persisted clip if one exists, and set the button to Make/Remake
    // accordingly — fixes the cross-frame "Remake" leak and pages videos alongside images.
    syncVideo = function () {
      ensureVideoEls();
      videoStatus.textContent = '';
      videoEl.onloadeddata = function () { videoEl.style.display = ''; if (videoBtn) videoBtn.textContent = '🎬 Remake video'; };
      videoEl.onerror = function () { videoEl.style.display = 'none'; if (videoBtn) videoBtn.textContent = '🎬 Make video'; };
      videoEl.src = videoUrlFor(videoKey());
    };

    function poll(op, n, key) {
      return new Promise((resolve, reject) => {
        const tick = () => {
          fetch('./api/video?op=' + encodeURIComponent(op) + (key ? '&key=' + encodeURIComponent(key) : '')).then(r => r.json()).then(d => {
            if (d.error) return reject(d);
            if (d.done && d.video) return resolve(d.persisted ? ((window.MEDIA_BASE || '') + '/' + d.video) : d.video);
            if (n++ > 36) return reject({ error: 'timed out' });
            if (videoStatus) videoStatus.textContent = 'Rendering clip… (' + (n * 5) + 's)';
            setTimeout(tick, 5000);
          }).catch(reject);
        };
        tick();
      });
    }

    const saveBtn = window.CardRender.saveButton('⬇ Save card',
      () => window.CardRender.beatCanvas(beat, current, currentStyle),
      beat.id + '.png');
    const bar = window.CardRender.makerControls({
      placeholder: 'Note to steer this card’s image / video (optional)…',
      buttons: [
        {
          label: '🖼 Make image', busy: '🖼 making…', done: '🖼 Remake image', fail: 'image not enabled',
          title: 'Generate art for THIS card in the selected style',
          run: (note) => {
            const prompt = window.CardRender.beatPrompt(beat, current, currentStyle) + (note ? ' Art-director note: ' + note : '');
            return window.CardRender.fetchArt(prompt).then((img) => {
              if (img) { renderBeatSlide(slides[current], current, currentStyle, img); return true; }
              return false;
            });
          },
        },
        {
          label: '🎬 Make video', busy: '🎬 generating…', done: '🎬 Remake video', fail: '⚠ video failed', ghost: true,
          title: 'Render THIS card as a silent 3–5s clip; saves to this frame',
          run: (note) => {
            ensureVideoEls();
            const key = videoKey();
            videoStatus.textContent = 'Sending this card to the video model…';
            const prompt = window.CardRender.videoPrompt(beat, current, currentStyle, note);
            return fetch('./api/video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompt, aspectRatio: '9:16', durationSeconds: 4, key: key }) })
              .then(r => r.json().then(d => r.ok ? d : Promise.reject(d)))
              .then(d => { if (!d.op) return Promise.reject(d); return poll(d.op, 0, key); })
              .then(videoUrl => {
                videoEl.src = videoUrl; videoEl.style.display = '';
                videoStatus.textContent = 'Saved to this frame ✓';
                if (videoBtn) videoBtn.textContent = '🎬 Remake video';
                return true;
              })
              .catch(err => { videoStatus.textContent = (err && err.error) ? ('Video unavailable: ' + err.error) : 'Video failed.'; return false; });
          },
        },
      ],
      extra: [saveBtn],
    });
    videoBtn = bar.querySelectorAll('.cr-actions .cr-save-btn')[1] || null;
    section.appendChild(bar);
    syncVideo(); // initialize for the opening frame / style A
  }

  // Async: update style-C button label if a JSON name is available
  fetchStyleCName(beat.id).then(name => {
    if (name !== STYLE_LABELS.C) {
      styleButtons['C'].textContent = name;
    }
  });

  // Carousel wrapper (receives keyboard focus)
  const carouselEl = document.createElement('div');
  carouselEl.className = 'carousel';
  carouselEl.setAttribute('tabindex', '0');
  carouselEl.setAttribute('role', 'region');
  carouselEl.setAttribute('aria-label', `${escHtml(beat.title)} image carousel`);
  carouselEl.setAttribute('aria-roledescription', 'carousel');

  // Track (slides container)
  const track = document.createElement('div');
  track.className = 'carousel-track';

  // Build slides
  const slides = cards.map((card, i) => {
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `${i + 1} of ${total}`);
    if (i !== 0) slide.setAttribute('aria-hidden', 'true');

    // Image path: <MEDIA_BASE>/cards/beats/<beat.id>-<style>-<n>.png (1-indexed, default style A)
    const imgSrc = `${window.MEDIA_BASE || '.'}/cards/beats/${beat.id}-A-${i + 1}.png`;

    // Image element
    const img = document.createElement('img');
    img.className = 'carousel-img';
    img.alt = card.scene || '';
    img.setAttribute('loading', i === 0 ? 'eager' : 'lazy');
    img.setAttribute('decoding', 'async');

    // Text-card fallback (hidden until image error)
    const textCard = document.createElement('div');
    textCard.className = 'carousel-text-card';
    textCard.setAttribute('aria-hidden', 'true'); // image takes precedence when present
    textCard.innerHTML = `<p class="carousel-text-scene">${escHtml(card.scene)}</p>`;

    // Caption banner (always shown, over image or text card)
    const captionBanner = document.createElement('div');
    captionBanner.className = 'carousel-caption-banner';
    captionBanner.innerHTML = `<span>${escHtml(card.caption)}</span>`;

    // On error: render a card image from data; fall back to text card.
    const errorHandler = () => {
      if (slide.querySelector('canvas.cr-incard')) { img.style.display = 'none'; return; }
      if (renderBeatSlide(slide, i, currentStyle)) return;
      img.style.display = 'none';
      textCard.style.display = 'flex';
      textCard.removeAttribute('aria-hidden');
      slide.classList.add('carousel-slide-text-fallback');
    };
    img._styleErrorHandler = errorHandler;
    img.addEventListener('error', errorHandler);

    // Begin loading after handler is attached
    img.src = imgSrc;

    slide.appendChild(img);
    slide.appendChild(textCard);
    slide.appendChild(captionBanner);
    return slide;
  });

  slides.forEach(s => track.appendChild(s));
  carouselEl.appendChild(track);

  /* --- Controls ------------------------------------------- */

  const controls = document.createElement('div');
  controls.className = 'carousel-controls';

  // Prev button
  const prevBtn = document.createElement('button');
  prevBtn.className = 'carousel-btn carousel-btn-prev';
  prevBtn.setAttribute('aria-label', 'Previous slide');
  prevBtn.innerHTML = '&#8592;'; // ←

  // Counter
  const counter = document.createElement('span');
  counter.className = 'carousel-counter';
  counter.setAttribute('aria-live', 'polite');
  counter.setAttribute('aria-atomic', 'true');

  // Dots
  const dotsContainer = document.createElement('div');
  dotsContainer.className = 'carousel-dots';
  dotsContainer.setAttribute('role', 'tablist');
  dotsContainer.setAttribute('aria-label', 'Slide navigation');

  const dots = cards.map((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'carousel-dot';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    if (i === 0) {
      dot.classList.add('active');
      dot.setAttribute('aria-selected', 'true');
    } else {
      dot.setAttribute('aria-selected', 'false');
    }
    dot.addEventListener('click', () => goTo(i));
    return dot;
  });
  dots.forEach(d => dotsContainer.appendChild(d));

  // Next button
  const nextBtn = document.createElement('button');
  nextBtn.className = 'carousel-btn carousel-btn-next';
  nextBtn.setAttribute('aria-label', 'Next slide');
  nextBtn.innerHTML = '&#8594;'; // →

  controls.appendChild(prevBtn);
  controls.appendChild(dotsContainer);
  controls.appendChild(counter);
  controls.appendChild(nextBtn);

  carouselEl.appendChild(controls);
  section.appendChild(carouselEl);

  /* --- State machine --------------------------------------- */

  function updateUI() {
    // Show/hide slides
    slides.forEach((s, i) => {
      const isActive = i === current;
      s.classList.toggle('carousel-slide-active', isActive);
      if (isActive) {
        s.removeAttribute('aria-hidden');
      } else {
        s.setAttribute('aria-hidden', 'true');
      }
    });

    // Dots
    dots.forEach((d, i) => {
      const isActive = i === current;
      d.classList.toggle('active', isActive);
      d.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Counter
    counter.textContent = `${current + 1} / ${total}`;
  }

  function goTo(index) {
    current = ((index % total) + total) % total; // wrap
    updateUI();
    syncVideo(); // page the per-frame clip alongside the image
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  prevBtn.addEventListener('click', () => { stopAuto(); prev(); });
  nextBtn.addEventListener('click', () => { stopAuto(); next(); });

  /* --- Auto-advance --------------------------------------- */

  function startAuto() {
    return; // auto-advance disabled by request — navigation is manual (prev/next/dots/keys)
  }

  function stopAuto() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  // Pause on hover / focus
  carouselEl.addEventListener('mouseenter', stopAuto);
  carouselEl.addEventListener('focusin', stopAuto);
  carouselEl.addEventListener('mouseleave', startAuto);
  carouselEl.addEventListener('focusout', (e) => {
    // Only restart if focus left the carousel entirely
    if (!carouselEl.contains(e.relatedTarget)) {
      startAuto();
    }
  });

  /* --- Keyboard: left/right when carousel is focused ------ */

  carouselEl.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      stopAuto();
      prev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      stopAuto();
      next();
    }
  });

  /* --- Touch swipe ---------------------------------------- */

  let touchStartX = 0;
  carouselEl.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  carouselEl.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) {
      stopAuto();
      dx < 0 ? next() : prev();
    }
  }, { passive: true });

  /* --- Init ----------------------------------------------- */

  updateUI();
  startAuto();

  // Comment widget per beat
  if (window.CS && window.CS.mountBeatComments) {
    window.CS.mountBeatComments(section, beat.id, beatIndex);
  }

  return section;
}

/* ============================================================
   BEATS PAGE INIT
   ============================================================ */

async function initBeatsPage() {
  const container = document.getElementById('beats-container');
  if (!container) return;

  try {
    const res = await fetch('./data/beats.json');
    if (!res.ok) throw new Error(`Failed to load beats.json (${res.status})`);
    const data = await res.json();
    const beats = data.beats;

    if (!beats || beats.length === 0) {
      container.innerHTML = '<p class="beats-error">No beats found in data.</p>';
      return;
    }

    // Eyebrow count is data-driven so it can't drift as adventures are added.
    const eyebrowEl = document.querySelector('.page-eyebrow');
    if (eyebrowEl) eyebrowEl.textContent = `${beats.length} Adventures · Illustrated`;

    // Art-engine picker (Auto / Gemini / Cloudflare)
    const hero = document.querySelector('.page-hero');
    if (hero && window.CardRender && window.CardRender.providerToggle) {
      const t = document.createElement('div');
      t.className = 'cr-actions';
      t.style.justifyContent = 'center';
      t.appendChild(window.CardRender.providerToggle());
      hero.appendChild(t);
    }

    beats.forEach((beat, i) => {
      const section = buildCarousel(beat, i);
      container.appendChild(section);
    });

  } catch (err) {
    console.error('Beats boot error:', err);
    container.innerHTML = `<div class="beats-error">Error loading beats: ${escHtml(err.message)}</div>`;
  }
}

/* ============================================================
   BOOTSTRAP
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  setNavActive();
  initHamburger();
  initBeatsPage();
});
