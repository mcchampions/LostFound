import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, readFile, mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const postgenPkg = require.resolve('postgen2/package.json');
const postgenDir = postgenPkg.replace(/\/package\.json$/, '').replace(/\\package\.json$/, '');

const execFileAsync = promisify(execFile);
const PORT = process.env.PORT || 3000;
const CLI = join(postgenDir, 'dist/cli.js');
const FONT_REG = join(postgenDir, 'fonts/custom/LXGWWenKaiLite-Regular.ttf');
const FONT_BOLD = join(postgenDir, 'fonts/custom/LXGWMarkerGothic-Regular.ttf');
const WORK_DIR = process.env.WORK_DIR || '/tmp/postgen-work';

const ALLOWED_TEMPLATES = new Set(['xhs-note', 'xhs-note-green', 'xhs-quote-blue', 'xhs-date-note']);
const ALLOWED_THEMES = new Set(['cream', 'blue', 'green']);

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/render') {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let body = '';
  for await (const chunk of req) body += chunk;

  let params;
  try { params = JSON.parse(body); }
  catch {
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON' }));
    return;
  }

  const { title, subtitle, template = 'xhs-note', theme = 'cream' } = params;
  if (!title || typeof title !== 'string') {
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'title required' }));
    return;
  }
  if (!ALLOWED_TEMPLATES.has(template)) {
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'unsupported template' }));
    return;
  }
  if (theme && !ALLOWED_THEMES.has(theme)) {
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'unsupported theme' }));
    return;
  }

  await mkdir(WORK_DIR, { recursive: true });
  const id = randomUUID().replace(/-/g, '');
  const jsonPath = join(WORK_DIR, `${id}.json`);
  const pngPath = join(WORK_DIR, `${id}.png`);

  const data = { title };
  if (subtitle) data.subtitle = subtitle;
  if (theme) data.theme = theme;

  try {
    await writeFile(jsonPath, JSON.stringify(data));
    await execFileAsync('node', [
      CLI, 'render',
      '--template', template,
      '--data', jsonPath,
      '--out', pngPath,
      '--font', FONT_REG,
      '--fontBold', FONT_BOLD,
      '--title-layout-mode', 'rule',
    ], { timeout: 30000, maxBuffer: 5 * 1024 * 1024 });

    const png = await readFile(pngPath);
    res.writeHead(200, { 'content-type': 'image/png' });
    res.end(png);
  } catch (err) {
    console.error('render failed:', err.message);
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'render failed', detail: err.message }));
  } finally {
    try { await unlink(jsonPath); } catch {}
    try { await unlink(pngPath); } catch {}
  }
});

server.listen(PORT, () => {
  console.log(`postgen server listening on :${PORT}`);
  console.log(`postgen2 dir: ${postgenDir}`);
});
