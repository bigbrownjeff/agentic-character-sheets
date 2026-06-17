#!/usr/bin/env node
/*
 * render-moment.mjs — stitch one story's beat clips into a polished social "moment".
 *
 * Runs in CI (.github/workflows/render-moment.yml), fed a JSON payload the site sends
 * when a user clicks "Finish this story -> video". Downloads the beat clips from R2,
 * burns each beat's caption, concatenates, writes + voices a narration (George via
 * ElevenLabs, else Gemini TTS), lays a genre music bed, and uploads <outKey> back to R2.
 *
 *   RENDER_PAYLOAD=/path/to/payload.json node local/tools/render-moment.mjs
 *
 * payload: { outKey, title, tone?, style?, genre?, clipKeys:[...], beats:[{caption,scene}] }
 * Env: GEMINI_API_KEY, ELEVENLABS_API_KEY (optional), CLOUDFLARE_* (for wrangler put).
 * Zero npm deps (Node 20+); needs ffmpeg + npx wrangler on PATH (CI has both).
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const R2 = process.env.MEDIA_BASE || 'https://pub-92102a1a4a2e4137b3e39df163badf14.r2.dev';
const BUCKET = process.env.R2_BUCKET || 'agentic-character-sheets-media';
const KEY = process.env.GEMINI_API_KEY, XI = process.env.ELEVENLABS_API_KEY;
const FONT = process.env.CAPTION_FONT || '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const CLIP = 4;

const payloadPath = process.env.RENDER_PAYLOAD || process.argv[2];
if (!payloadPath || !existsSync(payloadPath)) { console.error('No RENDER_PAYLOAD'); process.exit(1); }
const P = JSON.parse(readFileSync(payloadPath, 'utf8'));
const outKey = String(P.outKey || '').replace(/[^a-zA-Z0-9._/-]/g, '');
const clipKeys = (P.clipKeys || []).map(String);
const beats = P.beats || [];
if (!outKey || !clipKeys.length) { console.error('payload needs outKey + clipKeys'); process.exit(1); }

const TMP = '/tmp/render-moment'; rmSync(TMP, { recursive: true, force: true }); mkdirSync(TMP, { recursive: true });
const VIDLEN = clipKeys.length * CLIP;

function wrap(s, w = 32) {
  const words = String(s || '').split(/\s+/); const lines = []; let cur = '';
  for (const word of words) { if ((cur + ' ' + word).trim().length > w) { if (cur) lines.push(cur); cur = word; } else cur = (cur + ' ' + word).trim(); }
  if (cur) lines.push(cur); return lines.join('\n');
}

/* 1) download each clip, burn its caption, normalize to a uniform 9:16 codec */
const parts = [];
clipKeys.forEach((k, i) => {
  const src = `${TMP}/c${i}.mp4`;
  try { execFileSync('curl', ['-sfL', '-o', src, `${R2}/${k}`]); } catch { console.error('missing clip', k); return; }
  if (!existsSync(src)) { console.error('missing clip', k); return; }
  const out = `${TMP}/n${i}.mp4`;
  const cap = (beats[i] && beats[i].caption) || '';
  let vf = 'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280';
  if (cap) {
    const capFile = `${TMP}/cap${i}.txt`; writeFileSync(capFile, wrap(cap));
    vf += `,drawtext=fontfile=${FONT}:textfile=${capFile}:fontcolor=white:fontsize=42:line_spacing=10:box=1:boxcolor=black@0.6:boxborderw=22:x=(w-text_w)/2:y=h-text_h-70`;
  }
  execFileSync('ffmpeg', ['-y', '-i', src, '-vf', vf, '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '24', out], { stdio: 'ignore' });
  parts.push(out); console.log('clip', i + 1, 'ready', cap ? '(captioned)' : '');
});
if (!parts.length) { console.error('no clips downloaded'); process.exit(1); }
const listFile = `${TMP}/concat.txt`; writeFileSync(listFile, parts.map((f) => `file '${f}'`).join('\n'));
const silent = `${TMP}/silent.mp4`;
execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', silent], { stdio: 'ignore' });
const REALLEN = parts.length * CLIP;

/* 2) voiceover written for the EAR from the beats, then George (or Gemini) reads it */
const GBASE = 'https://generativelanguage.googleapis.com/v1beta';
async function gen(model, body) {
  const r = await fetch(`${GBASE}/models/${model}:generateContent?key=${KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${model} ${r.status}: ${(await r.text()).slice(0, 140)}`);
  return r.json();
}
const tone = P.tone || 'cinematic';
let narr = null, narrPcm = false, narrFmt = null, script = '';
if (KEY) {
  try {
    const caps = beats.map((b, i) => `${i + 1}. ${b.caption || b.scene || ''}`).join('  ');
    const w = parts.length * 10;
    const j = await gen('gemini-2.5-flash', { contents: [{ parts: [{ text: `Write a ${w - 8} to ${w + 6} word documentary VOICEOVER for a ${REALLEN}-second film titled "${P.title || 'A Story'}". Tone: ${tone}. Beats in order: ${caps}. Write for the EAR: flowing spoken cadence, vivid concrete images, build to one strong closing line. Output ONLY the spoken words, no labels, no quotes.` }] }], generationConfig: { temperature: 0.9 } });
    script = (j.candidates[0].content.parts || []).map((p) => p.text || '').join('').trim().replace(/\s+/g, ' ');
  } catch (e) { console.error('script:', e.message); }
}
if (script) {
  console.log('VO:', script.slice(0, 110));
  if (XI) {
    try {
      const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb', { method: 'POST', headers: { 'xi-api-key': XI, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: script, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.3 } }) });
      if (r.ok) { narr = `${TMP}/narr.mp3`; writeFileSync(narr, Buffer.from(await r.arrayBuffer())); console.log('voice: ElevenLabs George'); } else console.error('TTS', r.status, (await r.text()).slice(0, 100));
    } catch (e) { console.error('TTS', e.message); }
  }
  if (!narr && KEY) {
    try {
      const j = await gen('gemini-2.5-flash-preview-tts', { contents: [{ parts: [{ text: `Read as a warm film narrator, unhurried: ${script}` }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } } } });
      const a = (j.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData)?.inlineData;
      if (a) { narr = `${TMP}/narr.pcm`; writeFileSync(narr, Buffer.from(a.data, 'base64')); narrPcm = true; narrFmt = { rate: (/rate=(\d+)/.exec(a.mimeType || '') || [])[1] || '24000', ch: '1' }; console.log('voice: Gemini Charon'); }
    } catch (e) { console.error('TTS2', e.message); }
  }
}

/* 3) genre music bed (ElevenLabs Music; Lyria fallback) */
const GENRE = { americana: 'slow americana, warm lap steel and acoustic guitar, dusty and nostalgic', techno: 'minimal techno, pulsing synth bass, hypnotic', orchestral: 'cinematic orchestral, low strings and warm brass, emotional', ambient: 'ambient drone, soft pads, spacious', trailer: 'epic trailer score, big drums and rising strings, tension then release', noir: 'noir jazz, smoky upright bass and brushed drums', folk: 'gentle folk, fingerpicked guitar, tender', synthwave: 'retro synthwave, warm analog pads and arpeggios', horror: 'horror underscore, dissonant strings and low drones' };
const musicDesc = (GENRE[(P.genre || '').toLowerCase()] || `cinematic film underscore, mood ${tone}`) + '. Instrumental, slow, leaves headroom for a narrator, no vocals.';
let music = null, musicPcm = false, musicFmt = null;
if (XI) {
  try {
    const r = await fetch('https://api.elevenlabs.io/v1/music', { method: 'POST', headers: { 'xi-api-key': XI, 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: musicDesc, music_length_ms: Math.min(REALLEN * 1000, 30000) }) });
    if (r.ok) { music = `${TMP}/music.mp3`; writeFileSync(music, Buffer.from(await r.arrayBuffer())); console.log('music: ElevenLabs', P.genre || 'auto'); } else console.error('music', r.status);
  } catch (e) { console.error('music', e.message); }
}
if (!music && KEY) {
  try {
    const j = await gen('lyria-3-clip-preview', { contents: [{ parts: [{ text: 'Instrumental ' + musicDesc }] }], generationConfig: { responseModalities: ['AUDIO'] } });
    const a = (j.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData)?.inlineData;
    if (a) { musicPcm = /L16|pcm/i.test(a.mimeType || ''); music = `${TMP}/music.${musicPcm ? 'pcm' : 'mp3'}`; writeFileSync(music, Buffer.from(a.data, 'base64')); musicFmt = { rate: (/rate=(\d+)/.exec(a.mimeType || '') || [])[1] || '48000', ch: '2' }; console.log('music: Lyria'); }
  } catch (e) { console.error('music2', e.message); }
}

/* 4) mix + mux */
let final = silent;
if (narr || music) {
  const inputs = [], filters = [], labels = []; let k = 0;
  if (music) { if (musicPcm) inputs.push('-f', 's16le', '-ar', musicFmt.rate, '-ac', musicFmt.ch, '-i', music); else inputs.push('-i', music); filters.push(`[${k}:a]volume=0.20,afade=t=out:st=${Math.max(0, REALLEN - 2)}:d=2[m]`); labels.push('[m]'); k++; }
  if (narr) { if (narrPcm) inputs.push('-f', 's16le', '-ar', narrFmt.rate, '-ac', narrFmt.ch, '-i', narr); else inputs.push('-i', narr); filters.push(`[${k}:a]adelay=600|600,volume=1.7[n]`); labels.push('[n]'); k++; }
  const wav = `${TMP}/audio.wav`;
  filters.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0:duration=longest[mix]`);
  execFileSync('ffmpeg', ['-y', ...inputs, '-filter_complex', filters.join(';'), '-map', '[mix]', '-t', String(REALLEN), wav], { stdio: 'ignore' });
  final = `${TMP}/full.mp4`;
  execFileSync('ffmpeg', ['-y', '-i', silent, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', final], { stdio: 'ignore' });
}

/* 5) upload to R2 — via the authed Function (CI has no R2-scoped token), else wrangler (local OAuth). */
const upUrl = process.env.RENDER_UPLOAD_URL, upTok = process.env.RENDER_UPLOAD_TOKEN;
if (upUrl && upTok) {
  execFileSync('curl', ['--fail-with-body', '-sS', '-X', 'PUT', `${upUrl}?key=${encodeURIComponent(outKey)}`, '-H', `x-render-token: ${upTok}`, '-H', 'Content-Type: video/mp4', '--data-binary', `@${final}`, '-w', 'upload http=%{http_code}\n'], { stdio: 'inherit' });
} else {
  execFileSync('npx', ['--yes', 'wrangler', 'r2', 'object', 'put', `${BUCKET}/${outKey}`, '--file', final, '--remote'], { stdio: 'inherit' });
}
const mb = (readFileSync(final).length / 1048576).toFixed(1);
console.log(`DONE -> ${R2}/${outKey} (${parts.length} clips, ${narr ? 'voiced' : 'silent'}${music ? '+music' : ''}, ${mb} MB)`);
