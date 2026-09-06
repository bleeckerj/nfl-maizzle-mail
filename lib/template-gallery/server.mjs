import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

export function createGalleryServer(root, cache) {
  const assets = new Map([
    ['/', ['index.html', 'text/html']], ['/index.html', ['index.html', 'text/html']],
    ['/app.js', ['app.js', 'text/javascript']], ['/style.css', ['style.css', 'text/css']],
  ]);
  return http.createServer((request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    let file; let type; let preview = false;
    if (assets.has(pathname)) {
      const [name, mime] = assets.get(pathname);
      file = path.join(root, 'gallery', name); type = mime;
    } else if (pathname === '/manifest.json') {
      file = path.join(cache, 'manifest.json'); type = 'application/json';
    } else if (/^\/previews\/[a-z0-9][a-z0-9-]*\/(preview|reference)\.html$/.test(pathname)) {
      file = path.join(cache, pathname.slice('/previews/'.length)); type = 'text/html'; preview = true;
    }
    if (!file || !fs.existsSync(file) || !fs.realpathSync(file).startsWith(`${fs.realpathSync(preview || pathname === '/manifest.json' ? cache : path.join(root, 'gallery'))}${path.sep}`)) {
      response.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found'); return;
    }
    response.setHeader('Content-Type', `${type}; charset=utf-8`);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', preview
      ? "sandbox; default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline' https: http:; font-src https: http: data:; base-uri 'none'; form-action 'none'"
      : "default-src 'self'; script-src 'self'; style-src 'self'; frame-src 'self'; connect-src 'self'; base-uri 'none'; object-src 'none'");
    if (request.method === 'HEAD') { response.end(); return; }
    const stream = fs.createReadStream(file);
    stream.on('error', () => response.destroy());
    stream.pipe(response);
  });
}
