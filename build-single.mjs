// Собирает автономную версию приложения в один HTML-файл.
// node build-single.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const css = read('styles.css');
const app = read('app.js');
const data = read('schedule.js');

let html = read('index.html');

html = html
  .replace(/<link rel="manifest"[^>]*>\s*/i, '')
  .replace(/<link rel="apple-touch-icon"[^>]*>\s*/i, '')
  .replace(/<link rel="icon"[^>]*>\s*/i, '')
  .replace(
    /<link rel="stylesheet" href="styles\.css">/i,
    '<style>\n' + css + '\n</style>'
  )
  .replace(
    /<script src="schedule\.js"><\/script>/i,
    '<script>\n' + data + '\n</script>'
  )
  .replace(
    /<script src="app\.js"><\/script>/i,
    '<script>\n' + app + '\n</script>'
  );

// свг-иконка прямо в data-uri, чтобы у вкладки была картинка
const svg = read(path.join('icons', 'icon.svg'))
  .replace(/\s+/g, ' ')
  .trim();
const svgUri = 'data:image/svg+xml,' + encodeURIComponent(svg);
html = html.replace(
  '</title>',
  '</title>\n  <link rel="icon" href="' + svgUri + '">'
);

const out = path.join(ROOT, 'raspisanie-standalone.html');
fs.writeFileSync(out, html, 'utf8');
console.log('готово:', out, (Buffer.byteLength(html) / 1024).toFixed(1) + ' КБ');
