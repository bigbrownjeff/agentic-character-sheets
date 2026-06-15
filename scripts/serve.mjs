#!/usr/bin/env node
// Tiny zero-dep static file server for site/
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'site');
const PORT = 4500;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
};

createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  const file = join(ROOT, urlPath);
  try {
    const stat = statSync(file);
    if (stat.isDirectory()) {
      const idx = join(file, 'index.html');
      const body = readFileSync(idx);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(body);
      return;
    }
    const body = readFileSync(file);
    const ct = MIME[extname(file)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': ct });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
}).listen(PORT, () => {
  console.log(`Serving site/ at http://localhost:${PORT}`);
});
