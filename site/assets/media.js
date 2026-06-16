/*
 * media.js — single browser source for the R2 media base URL.
 *
 * Card/cover/beat images (and beat videos, future audio) live in Cloudflare R2,
 * not git. The site loads them from MEDIA_BASE; image tags fall back to a drawn
 * Canvas card on 404. Mirror of site/data/media.json `base` (which the Node
 * `media-sync` script reads) — change BOTH together to repoint to a custom
 * domain (e.g. https://media.jeffpinto.com).
 *
 * Loaded before the page scripts. If it ever fails to load, the image-path
 * helpers fall back to `.` (the old relative ./cards/ path), so nothing breaks.
 */
window.MEDIA_BASE = 'https://pub-92102a1a4a2e4137b3e39df163badf14.r2.dev';
window.mediaUrl = function (path) {
  return (window.MEDIA_BASE || '.') + '/' + String(path).replace(/^\.?\//, '');
};
