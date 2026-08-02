import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, readFile, mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import React from 'react';
import satori from 'satori';
import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';

const require = createRequire(import.meta.url);
const postgenPkg = require.resolve('postgen2/package.json');
const postgenDir = postgenPkg.replace(/\/package\.json$/, '').replace(/\\package\.json$/, '');

const execFileAsync = promisify(execFile);
const PORT = process.env.PORT || 3000;
const CLI = join(postgenDir, 'dist/cli.js');
const FONT_REG = join(postgenDir, 'fonts/custom/LXGWWenKaiLite-Regular.ttf');
const FONT_BOLD = join(postgenDir, 'fonts/custom/LXGWMarkerGothic-Regular.ttf');
const WORK_DIR = process.env.WORK_DIR || '/tmp/postgen-work';
const TEMPLATE_WIDTH = 1080;
const TEMPLATE_HEIGHT = 1440;
const OUTPUT_WIDTH = 1280;
const OUTPUT_HEIGHT = 720;
const VISUAL_WIDTH = 760;
const MAX_CONTENT_LENGTH = 144;
const MAX_REQUEST_SIZE = 64 * 1024;
const TITLE_MAX_LINES = 4;
// 每个模板标题单行可容纳的宽度单位（CJK=1，ASCII≈0.55），按标题区宽度与
// 初始字号保守计算；手动换行不会被标题引擎自动缩放，超宽会横向溢出
const TITLE_LINE_UNITS = {
  'xhs-note': 8,
  'xhs-note-green': 10,
  'xhs-quote-blue': 7,
  'xhs-date-note': 9,
};
const fontDataPromise = Promise.all([
  readFile(FONT_REG),
  readFile(FONT_BOLD),
]);

const ALLOWED_TEMPLATES = new Set(['xhs-note', 'xhs-note-green', 'xhs-quote-blue', 'xhs-date-note']);
const ALLOWED_THEMES = new Set(['cream', 'blue', 'green']);

function truncateContent(value) {
  const normalized = String(value ?? '').replace(/\r\n?/g, '\n').trim();
  const characters = Array.from(normalized);
  return characters.length > MAX_CONTENT_LENGTH
    ? `${characters.slice(0, MAX_CONTENT_LENGTH - 1).join('')}\u2026`
    : normalized;
}

function charWidthUnits(ch) {
  return /^[\u0000-\u00ff]$/.test(ch) ? 0.55 : 1;
}

/**
 * 渲染前重排标题：保留手动换行，但把过长的行按模板宽度单位重新折行，
 * 最多 TITLE_MAX_LINES 行，超出的部分截断并以省略号结尾，
 * 避免标题超宽溢出封面左半部分。
 */
function wrapTitle(value, template) {
  const maxUnits = TITLE_LINE_UNITS[template] ?? 8;
  const normalized = String(value ?? '').trim().replace(/\r\n?/g, '\n');
  if (!normalized) {
    return '';
  }
  const lines = [];
  let truncated = false;
  for (const rawLine of normalized.split('\n')) {
    if (lines.length >= TITLE_MAX_LINES) {
      truncated = true;
      break;
    }
    let current = '';
    let units = 0;
    for (const ch of Array.from(rawLine)) {
      const unit = charWidthUnits(ch);
      if (current && units + unit > maxUnits) {
        lines.push(current);
        current = ch;
        units = unit;
        if (lines.length >= TITLE_MAX_LINES) {
          truncated = true;
          current = '';
          break;
        }
      } else {
        current += ch;
        units += unit;
      }
    }
    if (current && lines.length < TITLE_MAX_LINES) {
      lines.push(current);
    }
  }
  if (truncated && lines.length > 0) {
    lines[lines.length - 1] = lines[lines.length - 1].replace(/.$/u, '…');
  }
  return lines.join('\n');
}

function wrapContent(value, maxWidth = 11) {
  const lines = [];
  let line = '';
  let width = 0;

  for (const character of Array.from(value)) {
    const characterWidth = /^[\u0000-\u00ff]$/.test(character) ? 0.55 : 1;
    if (line && width + characterWidth > maxWidth) {
      lines.push(line);
      line = '';
      width = 0;
    }
    line += character;
    width += characterWidth;
  }
  if (line) lines.push(line);
  return lines;
}

function truncateMetadata(value, maxLength = 36) {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  const characters = Array.from(normalized);
  return characters.length > maxLength
    ? `${characters.slice(0, maxLength - 1).join('')}…`
    : normalized;
}

function resolvePalette(template, theme) {
  if (template === 'xhs-note-green') {
    return { background: '#EAF8F0', accent: '#118455', muted: '#5B786B' };
  }
  if (template === 'xhs-quote-blue') {
    return { background: '#EAF4F9', accent: '#77B9DA', muted: '#587481' };
  }
  if (template === 'xhs-date-note') {
    return { background: '#F5F4F0', accent: '#F0A25F', muted: '#77736C' };
  }
  if (theme === 'blue') {
    return { background: '#EDF5FA', accent: '#2A9FE8', muted: '#5D7786' };
  }
  return { background: '#F7F2E8', accent: '#E0B54B', muted: '#756D5D' };
}

async function composeHorizontalCover(png, metadata, template, theme) {
  const [fontRegular, fontBold] = await fontDataPromise;
  const palette = resolvePalette(template, theme);
  const metadataRows = [
    { label: '类别', value: truncateMetadata(metadata.category) || '未填写' },
    { label: '地点', value: truncateMetadata(metadata.location) || '未填写' },
    { label: '日期', value: truncateMetadata(metadata.date) || '未填写' },
  ];
  const visual = await sharp(png)
    .resize(VISUAL_WIDTH, OUTPUT_HEIGHT, {
      fit: 'cover',
      position: 'centre',
    })
    .png()
    .toBuffer();
  const element = React.createElement(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        fontFamily: 'XFont',
        color: '#202020',
      },
    },
    React.createElement(
      'div',
      {
        style: {
          position: 'absolute',
          left: VISUAL_WIDTH,
          top: 0,
          width: OUTPUT_WIDTH - VISUAL_WIDTH,
          height: OUTPUT_HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          padding: '58px 52px 46px',
          background: palette.background,
        },
      },
      React.createElement('div', {
        style: {
          display: 'flex',
          width: 76,
          height: 8,
          marginBottom: 34,
          borderRadius: 99,
          background: palette.accent,
        },
      }),
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            fontSize: 24,
            fontWeight: 800,
            marginBottom: 24,
            color: palette.muted,
          },
        },
        '补充信息',
      ),
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: 26,
          },
        },
        ...metadataRows.map((row) => React.createElement(
          'div',
          {
            key: row.label,
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: 7,
            },
          },
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                fontSize: 21,
                fontWeight: 800,
                color: palette.muted,
              },
            },
            `${row.label}：`,
          ),
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                fontSize: 30,
                lineHeight: 1.25,
                fontWeight: 400,
              },
            },
            ...wrapContent(row.value, 12).slice(0, 2).map((line, index) => React.createElement(
              'div',
              {
                key: index,
                style: {
                  display: 'flex',
                  whiteSpace: 'nowrap',
                  flexWrap: 'nowrap',
                },
              },
              line,
            )),
          ),
        )),
      ),
      React.createElement('div', { style: { display: 'flex', flex: 1 } }),
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            paddingTop: 20,
            borderTop: `2px solid ${palette.accent}`,
            fontSize: 20,
            fontWeight: 800,
            color: palette.muted,
          },
        },
        'LOST & FOUND',
      ),
    ),
  );

  const svg = await satori(element, {
    width: OUTPUT_WIDTH,
    height: OUTPUT_HEIGHT,
    fonts: [
      { name: 'XFont', data: fontRegular, weight: 400, style: 'normal' },
      { name: 'XFont', data: fontBold, weight: 800, style: 'normal' },
    ],
  });
  const overlay = new Resvg(svg, {
    fitTo: { mode: 'original' },
    font: { loadSystemFonts: false },
  }).render().asPng();

  return sharp({
    create: {
      width: OUTPUT_WIDTH,
      height: OUTPUT_HEIGHT,
      channels: 4,
      background: palette.background,
    },
  })
    .composite([
      { input: visual, left: 0, top: 0 },
      { input: overlay, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/render') {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > MAX_REQUEST_SIZE) {
      res.writeHead(413, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Request body too large' }));
      return;
    }
  }

  let params;
  try { params = JSON.parse(body); }
  catch {
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON' }));
    return;
  }

  const {
    title,
    content,
    category,
    location,
    date,
    template = 'xhs-note',
    theme = 'cream',
  } = params;
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

  const data = { title: wrapTitle(title, template) };
  if (!data.title) {
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'title required' }));
    return;
  }
  const renderedContent = truncateContent(content);
  if (renderedContent) data.subtitle = renderedContent;
  if (theme) data.theme = theme;

  try {
    await writeFile(jsonPath, JSON.stringify(data));
    await execFileAsync('node', [
      CLI, 'render',
      '--template', template,
      '--data', jsonPath,
      '--out', pngPath,
      '--width', String(TEMPLATE_WIDTH),
      '--height', String(TEMPLATE_HEIGHT),
      '--font', FONT_REG,
      '--fontBold', FONT_BOLD,
      '--title-layout-mode', 'rule',
    ], { timeout: 30000, maxBuffer: 5 * 1024 * 1024 });

    const png = await composeHorizontalCover(
      await readFile(pngPath),
      { category, location, date },
      template,
      theme,
    );
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
