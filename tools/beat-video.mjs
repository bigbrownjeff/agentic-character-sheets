#!/usr/bin/env node
/*
 * beat-video.mjs: the Phase-3 REEL STITCH layer for docs/REELS.md.
 *
 *   node tools/beat-video.mjs --beat forge
 *   node tools/beat-video.mjs --spec tools/reels/labyrinth.reel.json --out /path/final.mp4
 *
 * Takes a REEL SPEC (a beat key, an ordered list of per-card clips, per-clip kinetic-caption
 * chunks, a cold-open hook, an audio mode, and a CTA) and stitches the raw per-card i2v clips
 * (rendered separately, living OUTSIDE git under ~/Projects/_renders/...) into ONE finished
 * 9:16 vertical reel, using nothing but ffmpeg + rsvg-convert + the macOS `say` command.
 * Zero API spend.
 *
 * The finished reel, per REELS.md sections 4-5:
 *   - a 1.5s COLD-OPEN flash of the climax frame + the silent-scroll hook text (section 4);
 *   - the clip sequence with HARD CUTS and per-card KINETIC CAPTIONS (2-4 word chunks, section 4);
 *   - a loop-friendly settle into a 1.75s CTA END-CARD ("Chapter N" + comment-bait, section 4);
 *   - audio per the beat's mode: `scratch-vo` (macOS `say`, clearly a scratch track), `bed`
 *     (a locally-synthesized rising ffmpeg tone bed, royalty-free), or `silent`.
 *
 * Text is rendered as styled SVG -> transparent PNG (rsvg-convert) and composited with ffmpeg
 * `overlay`, because the stock Homebrew ffmpeg is built WITHOUT `drawtext` (no libfreetype).
 * This is also higher-quality: full control of stroke, shadow, and layout for mobile legibility.
 *
 * DETERMINISTIC: output naming comes only from --out (or a fixed default derived from the beat
 * key). No Date.now / timestamps leak into any output name. Re-running yields the same file.
 *
 * Needs: ffmpeg, ffprobe, rsvg-convert, and (for scratch-vo) `say`. Zero npm deps (Node 20+).
 * Nothing here calls a paid API, uploads, or deploys: that is a later, explicit Jeff step.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');

// ---- args -----------------------------------------------------------------
const args = process.argv.slice(2);
const flag = (k) => args.includes('--' + k);
const getArg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

const specPath = getArg('spec') || (getArg('beat') ? join(REPO, 'tools', 'reels', `${getArg('beat')}.reel.json`) : null);
if (!specPath) { console.error('Pass --beat <key> or --spec <path>. e.g. --beat forge'); process.exit(1); }
if (!existsSync(specPath)) { console.error('Spec not found: ' + specPath); process.exit(1); }
const spec = JSON.parse(readFileSync(specPath, 'utf8'));

// Where the raw per-card clips live (OUTSIDE git; machine-local render tree). Overridable.
const CLIPS_DIR = resolve(
  getArg('clips-dir') ||
  process.env.REELS_CLIPS_DIR ||
  join(homedir(), 'Projects', '_renders', 'agentic-character-sheets', 'reels-pilot', 'clips'),
);
const OUT = resolve(getArg('out') || join(CLIPS_DIR, '..', 'final', `${spec.beat}-reel-v1.mp4`));
const WORK = resolve(getArg('work') || join(homedir(), '.cache', 'acs-reels', spec.beat));
const KEEP = flag('keep');

// ---- style bible (section 4 kinetic captions; readable on mobile) ---------
const W = 1080, H = 1920, FPS = 30;
const COLD = 1.5, CTA_DUR = 1.75;       // cold-open + CTA end-card lengths (section 4)
const CHUNK_MIN = 0.6, CHUNK_MAX = 0.9; // hold 2-4 word chunks ~600-900ms

rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });
mkdirSync(dirname(OUT), { recursive: true });

function ff(a, label) {
  try { execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...a], { stdio: ['ignore', 'ignore', 'inherit'] }); }
  catch (e) { console.error(`ffmpeg failed at: ${label}`); throw e; }
}
function probeDuration(f) {
  return parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', f]).toString().trim());
}

// ---- text layers: SVG -> transparent PNG (rsvg-convert) --------------------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
let pngN = 0;
// Render `lines` centered horizontally, the block centered on `cy`. Returns a full-frame PNG path.
function textLayer(lines, { size = 64, cy = Math.round(H * 0.72), fill = '#ffffff', stroke = 9, weight = 'bold', family = 'Arial', tracking = 0 } = {}) {
  const arr = Array.isArray(lines) ? lines : [lines];
  const lh = Math.round(size * 1.16);
  const top = cy - ((arr.length - 1) * lh) / 2;
  const tspans = arr.map((ln, i) =>
    `<text x="${W / 2}" y="${top + i * lh}" fill="${fill}" stroke="black" stroke-width="${stroke}" paint-order="stroke" stroke-linejoin="round"${tracking ? ` letter-spacing="${tracking}"` : ''}>${esc(ln)}</text>`
  ).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs><filter id="ds" x="-30%" y="-30%" width="160%" height="160%">` +
    `<feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="black" flood-opacity="0.75"/></filter></defs>` +
    `<g font-family="${family}" font-weight="${weight}" font-size="${size}" text-anchor="middle" dominant-baseline="middle" filter="url(#ds)">${tspans}</g></svg>`;
  const svgFile = join(WORK, `l${pngN}.svg`);
  const pngFile = join(WORK, `l${pngN}.png`);
  pngN++;
  writeFileSync(svgFile, svg);
  execFileSync('rsvg-convert', ['-w', String(W), '-h', String(H), '-o', pngFile, svgFile]);
  return pngFile;
}

// ---- 1. COLD-OPEN: 1.5s climax-flash + hook text (section 4) ---------------
const coCard = Number.isInteger(spec.cold_open_card) ? spec.cold_open_card : 0;
const coClip = clipFile((spec.clips[coCard] || spec.clips[0]).file);
const coStill = join(WORK, 'coldopen.png');
ff(['-ss', '1.0', '-i', coClip, '-frames:v', '1', coStill], 'cold-open still');
const hookPng = textLayer(wrapLines(spec.hook_text || '', 20), { size: 76, cy: Math.round(H * 0.13), stroke: 11 });
const coOut = join(WORK, 'seg_cold.mp4');
{
  const fc =
    `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},` +
    `zoompan=z='min(zoom+0.0016,1.12)':d=${Math.round(COLD * FPS)}:s=${W}x${H}:fps=${FPS},` +
    `fade=t=in:st=0:d=0.18:color=white,setsar=1[bg];` +
    `[bg][1:v]overlay=0:0[o]`;
  // -frames:v off a single looped still: zoompan emits exactly this many frames from frame 0,
  // giving ONE continuous zoom (input -t would restart the zoom per input frame and run long).
  ff(['-loop', '1', '-i', coStill, '-loop', '1', '-i', hookPng,
    '-filter_complex', fc, '-map', '[o]', '-frames:v', String(Math.round(COLD * FPS)), '-r', String(FPS),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', coOut], 'cold-open render');
}

// ---- 2. CLIP SEQUENCE: hard cuts + kinetic captions (section 4) -------------
const segs = [coOut];
spec.clips.forEach((clip, i) => {
  const src = clipFile(clip.file);
  if (!existsSync(src)) { console.error('  MISSING clip: ' + src); process.exit(1); }
  const dur = Number(clip.duration) || 2.5;
  const start = Number(clip.start) || 0;
  const chunks = (clip.chunks && clip.chunks.length) ? clip.chunks : autoChunk(clip.caption || '');

  const inputs = ['-ss', String(start), '-t', String(dur), '-i', src];
  const fcParts = [`[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS},setsar=1[v0]`];
  let last = 'v0', idx = 1;
  if (chunks.length) {
    const per = clamp(dur / chunks.length, CHUNK_MIN, CHUNK_MAX);
    chunks.forEach((c, k) => {
      const png = textLayer(wrapLines(c, 16), { size: 66, cy: Math.round(H * 0.72), stroke: 10 });
      inputs.push('-loop', '1', '-t', String(dur), '-i', png);
      const a = Math.min(k * per, Math.max(0, dur - 0.05));
      const b = (k === chunks.length - 1) ? dur : Math.min((k + 1) * per, dur);
      const out = `v${idx}`;
      fcParts.push(`[${last}][${idx}:v]overlay=0:0:enable='between(t,${a.toFixed(3)},${b.toFixed(3)})'[${out}]`);
      last = out; idx++;
    });
  }
  const out = join(WORK, `seg_${String(i).padStart(2, '0')}.mp4`);
  ff([...inputs, '-filter_complex', fcParts.join(';'), '-map', `[${last}]`, '-an', '-t', String(dur),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', String(FPS), out], `clip ${i}`);
  segs.push(out);
  console.log(`  card ${i}: ${dur}s${start ? ` (from ${start}s: drift trim)` : ''}, ${chunks.length} caption chunk(s)`);
});

// ---- 3. CTA END-CARD: 1.75s, loop-friendly (section 4) ---------------------
const lastClip = clipFile(spec.clips[spec.clips.length - 1].file);
const ctaBg = join(WORK, 'cta_bg.png');
ff(['-sseof', '-0.2', '-i', lastClip, '-frames:v', '1', ctaBg], 'cta bg still');
const ctaLayers = [];
ctaLayers.push(textLayer(wrapLines(spec.chapter || '', 24), { size: 54, cy: Math.round(H * 0.17), family: 'Arial Black', stroke: 8 }));
ctaLayers.push(textLayer(wrapLines((spec.cta && spec.cta.line1) || '', 24), { size: 62, cy: Math.round(H * 0.44), stroke: 10 }));
ctaLayers.push(textLayer(wrapLines((spec.cta && spec.cta.line2) || '', 26), { size: 50, cy: Math.round(H * 0.56), stroke: 8 }));
ctaLayers.push(textLayer('the full saga is in bio', { size: 34, cy: Math.round(H * 0.82), fill: '#ffe6b0', stroke: 6 }));
const ctaOut = join(WORK, 'seg_cta.mp4');
{
  const inputs = ['-loop', '1', '-i', ctaBg];
  const fcParts = [
    `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},` +
    `boxblur=18:2,eq=brightness=-0.30:saturation=0.65,` +
    `zoompan=z='min(zoom+0.0010,1.06)':d=${Math.round(CTA_DUR * FPS)}:s=${W}x${H}:fps=${FPS},setsar=1[v0]`,
  ];
  let last = 'v0', idx = 1;
  ctaLayers.forEach((png) => {
    inputs.push('-loop', '1', '-i', png);
    fcParts.push(`[${last}][${idx}:v]overlay=0:0[c${idx}]`); last = `c${idx}`; idx++;
  });
  fcParts.push(`[${last}]fade=t=out:st=${(CTA_DUR - 0.3).toFixed(2)}:d=0.3[o]`);
  ff([...inputs, '-filter_complex', fcParts.join(';'), '-map', '[o]', '-frames:v', String(Math.round(CTA_DUR * FPS)), '-r', String(FPS),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', ctaOut], 'cta render');
  segs.push(ctaOut);
}

// ---- 4. CONCAT (uniform codec → clean hard-cut concat) ---------------------
const listFile = join(WORK, 'concat.txt');
writeFileSync(listFile, segs.map((f) => `file '${f}'`).join('\n'));
const silent = join(WORK, 'silent.mp4');
ff(['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', silent], 'concat');
const TOTAL = probeDuration(silent);

// ---- 5. AUDIO (section 4 modes; ffmpeg + `say` only) -----------------------
const audio = spec.audio || { mode: 'silent' };
const audioWav = buildAudio(audio, TOTAL, COLD);

// ---- 6. MUX ---------------------------------------------------------------
if (audioWav) ff(['-i', silent, '-i', audioWav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', OUT], 'mux');
else ff(['-i', silent, '-c', 'copy', OUT], 'copy silent');

const sizeMB = (statSync(OUT).size / 1048576).toFixed(1);
console.log(`\ndone -> ${OUT}`);
console.log(`       ${TOTAL.toFixed(2)}s · ${W}x${H} · ${segs.length} segments (cold-open + ${spec.clips.length} cards + CTA) · audio: ${audioWav ? audio.mode : 'silent'} · ${sizeMB} MB`);
if (audio.mode === 'scratch-vo') console.log(`       NOTE: audio is SCRATCH-VO (macOS \`say\`): a placeholder for a real VO decision by Jeff.`);
if (!KEEP) rmSync(WORK, { recursive: true, force: true });

// =========================================================================
// helpers
// =========================================================================
function clipFile(name) { return join(CLIPS_DIR, name); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function wrapLines(s, w) {
  const words = String(s || '').split(/\s+/).filter(Boolean); const lines = []; let cur = '';
  for (const word of words) { if ((cur + ' ' + word).trim().length > w) { if (cur) lines.push(cur); cur = word; } else cur = (cur + ' ' + word).trim(); }
  if (cur) lines.push(cur); return lines.length ? lines : [''];
}
function autoChunk(caption) {
  const words = String(caption || '').replace(/[:;]/g, '').split(/\s+/).filter(Boolean);
  const out = []; for (let i = 0; i < words.length; i += 3) out.push(words.slice(i, i + 3).join(' '));
  return out;
}

// Build an exact-TOTAL-duration wav per the audio mode, or return null for silent.
function buildAudio(a, total, storyStart) {
  const mode = a.mode || 'silent';
  if (mode === 'silent') return null;

  if (mode === 'scratch-vo') {
    if (!a.voiceover) { console.error('  scratch-vo mode but no `voiceover` in spec: going silent.'); return null; }
    const aiff = join(WORK, 'vo.aiff');
    const voArgs = ['-o', aiff];
    if (a.voice) voArgs.push('-v', a.voice);
    if (a.rate) voArgs.push('-r', String(a.rate));
    voArgs.push(a.voiceover);
    try { execFileSync('say', voArgs, { stdio: 'ignore' }); }
    catch (e) { console.error('  `say` failed: going silent: ' + e.message); return null; }
    const voDur = probeDuration(aiff);
    const window = Math.max(4, total - storyStart - 1.6);
    const tempo = clamp(voDur / window, 0.9, 1.22);
    const out = join(WORK, 'audio.wav');
    const bedExpr = `0.05*sin(2*PI*t*98)+0.035*sin(2*PI*t*147)`;
    ff([
      '-i', aiff,
      '-f', 'lavfi', '-t', String(total), '-i', `aevalsrc=${bedExpr}:s=44100`,
      '-filter_complex',
      `[0:a]atempo=${tempo.toFixed(3)},adelay=${Math.round(storyStart * 1000)}|${Math.round(storyStart * 1000)},volume=1.55[vo];` +
      `[1:a]afade=t=in:st=0:d=1.2,afade=t=out:st=${(total - 1.4).toFixed(2)}:d=1.4,volume=0.5[bed];` +
      `[vo][bed]amix=inputs=2:normalize=0:duration=first[mix]`,
      '-map', '[mix]', '-t', String(total), out,
    ], 'scratch-vo mix');
    return out;
  }

  if (mode === 'bed') {
    // A locally-synthesized, royalty-free RISING tone bed (section 4 anime / silent-first).
    const climax = clamp(Number(a.climax_at) || total * 0.72, 2, total - 1);
    const out = join(WORK, 'audio.wav');
    const droneExpr = `0.13*sin(2*PI*t*(72+3.2*t))+0.09*sin(2*PI*t*(108+4.0*t))`;
    ff([
      '-f', 'lavfi', '-t', String(total), '-i', `aevalsrc=${droneExpr}:s=44100`,
      '-f', 'lavfi', '-t', String(total), '-i', `anoisesrc=c=pink:a=0.9:d=${total}`,
      '-filter_complex',
      `[0:a]afade=t=in:st=0:d=1.0,afade=t=out:st=${(total - 1.6).toFixed(2)}:d=1.6[drone];` +
      `[1:a]highpass=f=600,volume='0.04+0.11*min(t/${climax.toFixed(2)},1)*(1-0.5*gt(t,${climax.toFixed(2)}))':eval=frame,` +
      `afade=t=in:st=0:d=1.5,afade=t=out:st=${(total - 1.6).toFixed(2)}:d=1.6[riser];` +
      `[drone][riser]amix=inputs=2:normalize=0:duration=first,volume=0.9[mix]`,
      '-map', '[mix]', '-t', String(total), out,
    ], 'bed synth');
    return out;
  }

  console.error('  unknown audio mode "' + mode + '": going silent.');
  return null;
}
