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

    const newSrc = `./cards/beats/${beatId}-${styleKey}-${i + 1}.png`;

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
      // Re-render carousel images for new style; auto-illustrate the current card
      if (window.CardRender) {
        slides.forEach((sl, idx) => renderBeatSlide(sl, idx, key));
        ensureArt(current, key);
      } else { applyStyleToSlides(slides, cards, beat.id, key); }
    });
    styleButtons[key] = btn;
    styleToggleBar.appendChild(btn);
  });

  section.appendChild(styleToggleBar);

  // Save-as-image control (renders the current slide for the current style)
  if (window.CardRender) {
    const saveBar = document.createElement('div');
    saveBar.className = 'cr-actions';
    saveBar.appendChild(window.CardRender.saveButton('⬇ Save this card',
      () => window.CardRender.beatCanvas(beat, current, currentStyle),
      beat.id + '-' + (current + 1) + '.png'));
    const illoBtn = document.createElement('button');
    illoBtn.type = 'button'; illoBtn.className = 'cr-save-btn ghost'; illoBtn.textContent = '✨ Reroll art';
    illoBtn.addEventListener('click', () => {
      illoBtn.disabled = true; illoBtn.textContent = '✨ illustrating…';
      window.CardRender.fetchArt(window.CardRender.beatPrompt(beat, current, currentStyle)).then((img) => {
        if (img) { artCache[current + '|' + currentStyle] = img; renderBeatSlide(slides[current], current, currentStyle, img); illoBtn.textContent = '✨ Reroll art'; }
        else { illoBtn.textContent = 'AI art not enabled'; }
        illoBtn.disabled = false;
      });
    });
    saveBar.appendChild(illoBtn);
    section.appendChild(saveBar);
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

    // Image path: ./cards/beats/<beat.id>-<style>-<n>.png (1-indexed, default style A)
    const imgSrc = `./cards/beats/${beat.id}-A-${i + 1}.png`;

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
    ensureArt(current, currentStyle);
  }

  // Auto-illustrate the given card for the given style; cache so we never
  // regenerate the same card+style twice (navigation/toggles reuse).
  const artCache = {};
  function ensureArt(i, styleKey) {
    if (!window.CardRender) return;
    const key = i + '|' + styleKey;
    const cached = artCache[key];
    if (cached === 'pending' || cached === 'failed') return;
    if (cached) { renderBeatSlide(slides[i], i, styleKey, cached); return; }
    artCache[key] = 'pending';
    window.CardRender.fetchArt(window.CardRender.beatPrompt(beat, i, styleKey)).then((img) => {
      if (img) {
        artCache[key] = img;
        if (currentStyle === styleKey) renderBeatSlide(slides[i], i, styleKey, img);
      } else {
        artCache[key] = 'failed';
      }
    });
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
  ensureArt(current, currentStyle);

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
