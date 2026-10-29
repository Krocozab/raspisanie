// Мини-сервер без зависимостей: node serve.mjs [порт]
// Нужен только для того, чтобы открыть приложение в браузере и на телефоне.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.argv[2]) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const rel = normalize(decoded).replace(/^([/\\])+/, '');
  if (rel.startsWith('..') || rel.includes('..' + sep)) return null;
  return join(ROOT, rel);
}

const server = createServer(async (req, res) => {
  try {
    let target = safePath(req.url || '/');
    if (!target) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    let info = await stat(target).catch(() => null);
    if (info && info.isDirectory()) {
      target = join(target, 'index.html');
      info = await stat(target).catch(() => null);
    }
    if (!info || !info.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Не найдено');
      return;
    }

    const body = await readFile(target);
    res.writeHead(200, {
      'content-type': MIME[extname(target).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }).end('Ошибка сервера');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const lan = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal) lan.push(net.address);
    }
  }
  console.log('');
  console.log('  Расписание запущено');
  console.log('  На компьютере:  http://localhost:' + PORT);
  for (const ip of lan) {
    console.log('  На телефоне:    http://' + ip + ':' + PORT + '   (телефон в той же Wi-Fi)');
  }
  console.log('');
  console.log('  Остановить: Ctrl + C');
  console.log('');
});
