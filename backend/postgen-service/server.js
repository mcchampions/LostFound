import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, readFile, mkdir, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import React from 'react';
import satori from 'satori';
import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';
import opentype from '@shuding/opentype.js';

// 本目录即 postgen2 修改版源码：模板在 src/templates/，构建产物在 dist/。
// 修改模板后执行 npm run build 重新生成 dist/。
const postgenDir = dirname(fileURLToPath(import.meta.url));

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
const MAX_REQUEST_SIZE = 64 * 1024;
const fontDataPromise = Promise.all([
  readFile(FONT_REG),
  readFile(FONT_BOLD),
]);

const ALLOWED_TEMPLATES = new Set(['xhs-note', 'xhs-note-green', 'xhs-quote-blue', 'xhs-date-note']);
// 标题最多保留 3 行
const TITLE_MAX_LINES = 3;
// 各模板 3 行标题容量（含省略号，用户给定：经典/绿色/日期 39、蓝色 48）。
// 实际截断位置以 postgen2 引擎布局为准（引擎可能比该上限再少 1 字，例如绿色 38）。
const TITLE_CAPACITY = {
  'xhs-note': 39,
  'xhs-note-green': 39,
  'xhs-quote-blue': 48,
  'xhs-date-note': 39,
};

// postgen2 标题引擎（用于预测标题行数/字号，进而计算正文可用高度）
const titleEngineModule = await import(
  pathToFileURL(join(postgenDir, 'dist/templates/title-engine.js')).href
);
const textLayoutModule = await import(
  pathToFileURL(join(postgenDir, 'dist/templates/text-layout.js')).href
);
const { getTemplateTitleLayoutProfile } = titleEngineModule;
const { layoutTitle } = textLayoutModule;

// 各模板标题区几何（来自 postgen2 title-engine 规格）
const TITLE_SPECS = {
  'xhs-note': { width: 760, fontSize: 96, letterSpacing: -3.5, maxLines: 5, minFontSize: 58 },
  'xhs-note-green': { width: 760, fontSize: 76, letterSpacing: -2.2, maxLines: 4, minFontSize: 60 },
  'xhs-quote-blue': { width: 760, fontSize: 104, letterSpacing: -6, maxLines: 4, minFontSize: 52 },
  'xhs-date-note': { width: 910, fontSize: 98, letterSpacing: -1, maxLines: 4, minFontSize: 68 },
};
// 正文(subtitle)统一规格：width 760, fontSize 46
const SUBTITLE_WIDTH = 760;
const SUBTITLE_FONT_SIZE = 46;

/**
 * 各模板正文可显示行数：除蓝色引用外统一 6 行；
 * 蓝色引用按几何计算（标题 1/2/3 行 -> 5/4/4，用户确认正确）。
 */
const CONTENT_LINE_BUDGET = {
  'xhs-note': 6,
  'xhs-note-green': 6,
  'xhs-date-note': 6,
  'xhs-quote-blue': { 1: 5, 2: 4, 3: 4 },
};

function contentBudgetFor(template, titleLineCount) {
  const budget = CONTENT_LINE_BUDGET[template] ?? CONTENT_LINE_BUDGET['xhs-note'];
  if (typeof budget === 'number') {
    return budget;
  }
  const n = Math.max(1, titleLineCount);
  if (n <= 3) {
    return budget[n] ?? 4;
  }
  return Math.max(4, (budget[3] ?? 4) - (n - 3));
}

/** 用 postgen2 引擎预测标题折行后的行数，查表得到正文行数预算。 */
function computeContentLineBudget(title, template) {
  const engineSpec = getTemplateTitleLayoutProfile(template, {}).spec;
  const result = layoutTitle(title, engineSpec);
  return contentBudgetFor(template, result.lines.length);
}

let parsedFonts = null;

function toArrayBuffer(buf) {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

async function getFonts() {
  if (!parsedFonts) {
    const [regular, bold] = await fontDataPromise;
    parsedFonts = {
      regular: opentype.parse(toArrayBuffer(regular)),
      bold: opentype.parse(toArrayBuffer(bold)),
    };
  }
  return parsedFonts;
}

/** 使用真实字体字形宽度测量文本（含字间距）。
 *  与 satori 一致：按单个字符累加 advance，不做字符间 kerning 修正。 */
function measureWidth(font, text, fontSize, letterSpacing) {
  const chars = Array.from(String(text));
  if (!chars.length) {
    return 0;
  }
  let width = 0;
  for (const ch of chars) {
    width += font.getAdvanceWidth(ch, fontSize);
  }
  return width + letterSpacing * chars.length;
}

/** 按真实字宽把单行折成不超过 maxWidth 的若干行。 */
function breakLineToFit(font, line, fontSize, letterSpacing, maxWidth) {
  const chars = Array.from(line);
  const out = [];
  let current = '';
  for (const ch of chars) {
    const next = current + ch;
    if (current && measureWidth(font, next, fontSize, letterSpacing) > maxWidth) {
      out.push(current);
      current = ch;
    } else {
      current = next;
    }
  }
  if (current) {
    out.push(current);
  }
  return out;
}

/** 截断一行并在末尾加省略号：逐字回退直到「内容+…」的真实宽度不超过 maxWidth。 */
function appendEllipsis(font, line, fontSize, letterSpacing, maxWidth) {
  const chars = Array.from(line);
  for (let cut = chars.length; cut > 0; cut--) {
    const candidate = chars.slice(0, cut).join('') + '…';
    if (measureWidth(font, candidate, fontSize, letterSpacing) <= maxWidth) {
      return candidate;
    }
  }
  return '…';
}

/**
 * 标题适配：基于真实字体宽度实时计算折行与截断位置。
 * - 无手动换行：原样透传，交给 postgen2 原生引擎自动折行/缩放字号；
 * - 有手动换行：按模板初始字号（manual 路径不缩放）用真实字宽折行；
 * - 超出行数时删除多余字符并以省略号结尾（省略号宽度一并计入）。
 */
async function fitTitle(value, template) {
  const spec = TITLE_SPECS[template] ?? TITLE_SPECS['xhs-note'];
  const normalized = String(value ?? '').trim().replace(/\r\n?/g, '\n');
  if (!normalized) {
    return '';
  }
  const fonts = await getFonts();
  const font = fonts.bold;
  if (!normalized.includes('\n')) {
    // 引擎渲染不超过 3 行：原样透传；超过 3 行：按 3 行容量截断。
    // 容量按引擎真实布局计算：从「容量-1 字 + …」开始逐字回退，
    // 直到引擎最终布局不超过 3 行（绿色笔记引擎实测 38 字含省略号，比上限少 1）。
    const engineSpec = getTemplateTitleLayoutProfile(template, {}).spec;
    const fitsThreeLines = (text) => {
      const result = layoutTitle(text, engineSpec);
      return result.lines.length <= TITLE_MAX_LINES && !result.exceededMaxLines;
    };
    if (fitsThreeLines(normalized)) {
      return normalized;
    }
    const chars = Array.from(normalized);
    const capacity = TITLE_CAPACITY[template] ?? 39;
    let keep = Math.max(1, capacity - 1);
    while (keep > 1 && !fitsThreeLines(chars.slice(0, keep).join('') + '…')) {
      keep -= 1;
    }
    return chars.slice(0, keep).join('') + '…';
  }

  const lines = [];
  let truncated = false;
  for (const rawLine of normalized.split('\n')) {
    if (lines.length >= TITLE_MAX_LINES) {
      truncated = true;
      break;
    }
    for (const wrapped of breakLineToFit(
      font, rawLine, spec.fontSize, spec.letterSpacing, spec.width)) {
      if (lines.length >= TITLE_MAX_LINES) {
        truncated = true;
        break;
      }
      lines.push(wrapped);
    }
  }
  if (truncated && lines.length) {
    lines[lines.length - 1] = appendEllipsis(
      font, lines[lines.length - 1], spec.fontSize, spec.letterSpacing, spec.width);
  }
  return lines.join('\n');
}

/**
 * 正文(subtitle)适配：以真实字宽在 760px 宽、46px 字号下折行，
 * 最多 lineBudget 行（由标题布局动态计算），超出删除字符并以省略号结尾。
 */
async function fitContent(value, lineBudget) {
  const normalized = String(value ?? '').trim().replace(/\r\n?/g, '\n');
  if (!normalized) {
    return '';
  }
  const fonts = await getFonts();
  const font = fonts.regular;
  const width = SUBTITLE_WIDTH; // 与模板 subtitle 容器宽度一致
  const lines = [];
  let truncated = false;
  for (const rawLine of normalized.split('\n')) {
    if (lines.length >= lineBudget) {
      truncated = true;
      break;
    }
    for (const wrapped of breakLineToFit(font, rawLine, SUBTITLE_FONT_SIZE, 0, width)) {
      if (lines.length >= lineBudget) {
        truncated = true;
        break;
      }
      lines.push(wrapped);
    }
  }
  if (truncated && lines.length) {
    lines[lines.length - 1] = appendEllipsis(
      font, lines[lines.length - 1], SUBTITLE_FONT_SIZE, 0, width);
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

function resolvePalette(template) {
  if (template === 'xhs-note-green') {
    return { background: '#EAF8F0', accent: '#118455', muted: '#5B786B' };
  }
  if (template === 'xhs-quote-blue') {
    return { background: '#EAF4F9', accent: '#77B9DA', muted: '#587481' };
  }
  if (template === 'xhs-date-note') {
    return { background: '#F5F4F0', accent: '#F0A25F', muted: '#77736C' };
  }
  return { background: '#F7F2E8', accent: '#E0B54B', muted: '#756D5D' };
}

async function composeHorizontalCover(png, metadata, template) {
  const [fontRegular, fontBold] = await fontDataPromise;
  const palette = resolvePalette(template);
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
  await mkdir(WORK_DIR, { recursive: true });
  const id = randomUUID().replace(/-/g, '');
  const jsonPath = join(WORK_DIR, `${id}.json`);
  const pngPath = join(WORK_DIR, `${id}.png`);

  const data = { title: await fitTitle(title, template) };
  if (!data.title) {
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'title required' }));
    return;
  }
  const renderedContent = await fitContent(
    content, computeContentLineBudget(data.title, template));
  if (renderedContent) data.subtitle = renderedContent;

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
