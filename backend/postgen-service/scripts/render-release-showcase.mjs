import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const rootDir = process.cwd();
const outDir = path.resolve(process.env.RELEASE_SHOWCASE_OUT_DIR || 'release-showcase');

const fallbackSansFont = {
  regular: 'fonts/custom/LXGWWenKaiLite-Regular.ttf',
  bold: 'fonts/custom/LXGWWenKaiLite-Regular.ttf',
};

const templates = [
  {
    key: 'xhs-note',
    title: 'xhs-note',
    template: 'xhs-note',
    data: 'website/data/xhs-note.json',
    fileName: 'xhs-note.png',
    preserveTitleBreaks: true,
  },
  {
    key: 'xhs-note-green',
    title: 'xhs-note-green',
    template: 'xhs-note-green',
    data: 'website/data/xhs-note-green.json',
    fileName: 'xhs-note-green.png',
    preserveTitleBreaks: true,
  },
  {
    key: 'xhs-quote-blue',
    title: 'xhs-quote-blue',
    template: 'xhs-quote-blue',
    data: 'website/data/xhs-quote-blue.json',
    fileName: 'xhs-quote-blue.png',
    preserveTitleBreaks: true,
  },
  {
    key: 'apple-notes-handwrite',
    title: 'apple-notes-handwrite',
    template: 'apple-notes-handwrite',
    data: 'examples/apple-notes-handwrite.json',
    fileName: 'apple-notes-handwrite.png',
    fontRegular: 'fonts/custom/LXGWMarkerGothic-Regular.ttf',
    preserveTitleBreaks: true,
  },
  {
    key: 'xhs-date-note',
    title: 'xhs-date-note',
    template: 'xhs-date-note',
    data: 'examples/xhs-date-note.json',
    fileName: 'xhs-date-note.png',
    fontRegular: 'fonts/custom/LXGWMarkerGothic-Regular.ttf',
    preserveTitleBreaks: true,
  },
];

async function buildReleaseInput(item) {
  const sourcePath = path.resolve(rootDir, item.data);
  const raw = await fs.readFile(sourcePath, 'utf8');
  const parsed = JSON.parse(raw);

  if (item.preserveTitleBreaks && typeof parsed.title === 'string') {
    parsed.titleLayoutMode = 'rule';
    parsed.__resolvedTitleLayout = {
      lines: parsed.title.split(/\r?\n/).map((line) => String(line ?? '').trim()).filter(Boolean),
      fontSize: null,
      lineHeight: null,
      lineWidths: [],
      truncated: false,
    };
  }

  const hash = crypto.createHash('sha1').update(item.key).digest('hex').slice(0, 8);
  const tempPath = path.join(outDir, `${item.key}.${hash}.render-input.json`);
  await fs.writeFile(tempPath, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
  return tempPath;
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const defaultFonts = {
    regular: path.resolve(rootDir, fallbackSansFont.regular),
    bold: path.resolve(rootDir, fallbackSansFont.bold),
  };

  for (const item of templates) {
    const outPath = path.join(outDir, item.fileName);
    const renderDataPath = await buildReleaseInput(item);
    const fontRegular = item.fontRegular ? path.resolve(rootDir, item.fontRegular) : defaultFonts.regular;
    const fontBold = item.fontBold ? path.resolve(rootDir, item.fontBold) : defaultFonts.bold;
    const args = [
      'dist/cli.js',
      'render',
      '--template',
      item.template,
      '--data',
      renderDataPath,
      '--out',
      outPath,
      '--font',
      fontRegular,
    ];

    if (fontBold) {
      args.push('--fontBold', fontBold);
    }

    await execFileAsync('node', args, { cwd: rootDir });
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    gitRef: process.env.GITHUB_REF ?? null,
    gitSha: process.env.GITHUB_SHA ?? null,
    repository: process.env.GITHUB_REPOSITORY ?? null,
    templates: templates.map((item) => ({
      key: item.key,
      title: item.title,
      template: item.template,
      fileName: item.fileName,
      data: item.data,
    })),
  };

  await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  process.stdout.write(JSON.stringify({ outDir, templates: manifest.templates }, null, 2) + '\n');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
