#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs/promises';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { BUILTIN_TEMPLATES, type BuiltinTemplate } from './types.js';
import { loadInput, renderToPng } from './render.js';
import { getTemplate, templateList } from './templates/registry.js';
import { config, getLlmConfig, getOutputImageDir, makeBatchOutputDir, resetConfigItem, setLlmConfigItem, setOutputImageDir } from './config.js';
import { inspectTitleLayout, inspectTitleLayoutByTitle, loadTemplateInput } from './debug.js';
import { buildFixtureInput, loadTitleFixtures } from './fixtures.js';
import { resolveTemplateTitleLayoutAsync } from './templates/title-layout-service.js';

const DEFAULT_BATCH_TARGETS = ['xhs-note:cream', 'xhs-note:blue', 'xhs-note-green', 'xhs-quote-blue', 'apple-notes-handwrite', 'xhs-date-note'] as const;

type RenderTarget = {
  template: BuiltinTemplate;
  theme?: string;
  suffix: string;
};

function defaultFontGuess() {
  return [
    '/System/Library/Fonts/PingFang.ttc',
    '/System/Library/Fonts/Supplemental/PingFang.ttc',
    '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
  ];
}

async function firstExisting(paths: string[]) {
  for (const p of paths) {
    try {
      await fs.access(p);
      return p;
    } catch {}
  }
  return undefined;
}

function tsCompact() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function resolveOutPath(template: BuiltinTemplate, out?: string, stableName?: boolean) {
  if (out) return path.resolve(String(out));
  const filename = stableName ? `${template}.png` : `${template}-${tsCompact()}.png`;
  return path.join(getOutputImageDir(), filename);
}

function parseTarget(raw: string): RenderTarget {
  const [templateRaw, themeRaw] = raw.split(':');
  if (!templateRaw || !BUILTIN_TEMPLATES.includes(templateRaw as BuiltinTemplate)) {
    throw new Error(`Invalid render target: ${raw}`);
  }

  const template = templateRaw as BuiltinTemplate;
  const theme = themeRaw?.trim() || undefined;
  const suffix = theme ? `${template}-${theme}` : template;

  return { template, theme, suffix };
}

async function resolveFontRegularPath(args: any) {
  const fontRegularPath =
    (args.font ? path.resolve(String(args.font)) : undefined) ??
    (await firstExisting(defaultFontGuess())) ??
    '';

  if (!fontRegularPath) {
    throw new Error('No font found. Please pass --font /path/to/font.ttf');
  }

  return fontRegularPath;
}

const TITLE_MANUAL_BREAK_HELP = [
  '手动换行：在 JSON 的 title 里直接写换行符（推荐），CLI 会按你给的行来渲染。',
  '例："title": "第一行\\n第二行\\n第三行"',
  '如果 title 里没有换行，则自动排版。',
].join(' ');

await yargs(hideBin(process.argv))
  .scriptName('postgen')
  .epilogue(TITLE_MANUAL_BREAK_HELP)
  .command(
    'render',
    '根据 JSON 数据渲染 PNG（title 支持手动换行）',
    (cmd: any) =>
      cmd
        .option('template', {
          type: 'string',
          choices: [...BUILTIN_TEMPLATES],
          demandOption: true,
          describe: '模板名称',
        })
        .option('data', {
          type: 'string',
          demandOption: true,
          describe: '输入 JSON 路径。title 支持手动换行；在 JSON 中直接写 "第一行\\n第二行" 即可',
        })
        .option('out', {
          type: 'string',
          describe: '输出 PNG 路径；不传则输出到默认目录',
        })
        .option('stable-name', {
          type: 'boolean',
          default: false,
          describe: '使用稳定文件名 <template>.png，而不是带时间戳',
        })
        .option('width', {
          type: 'number',
          describe: '输出宽度；默认使用模板默认值',
        })
        .option('height', {
          type: 'number',
          describe: '输出高度；默认使用模板默认值',
        })
        .option('font', {
          type: 'string',
          describe: '常规字体路径 (ttf/otf/ttc)',
        })
        .option('fontBold', {
          type: 'string',
          describe: '粗体字体路径',
        })
        .option('title-layout-mode', {
          type: 'string',
          choices: ['rule', 'llm'],
          default: 'rule',
          describe: '标题排版模式。若 title 已手动写了换行，优先按手动换行渲染；否则再按所选模式自动拆分',
        }),
    async (args: any) => {
      const template = args.template as BuiltinTemplate;
      const def = getTemplate(template);
      const dataPath = path.resolve(String(args.data));
      const outPath = resolveOutPath(template, args.out, args.stableName);
      const width = Number(args.width ?? def.defaultWidth);
      const height = Number(args.height ?? def.defaultHeight);
      const fontRegularPath = await resolveFontRegularPath(args);

      const input = await loadInput(dataPath, template);
      input.titleLayoutMode = args.titleLayoutMode as 'rule' | 'llm';
      await renderToPng({
        template,
        input,
        width,
        height,
        outPath,
        fontRegularPath,
        fontBoldPath: args.fontBold ? path.resolve(String(args.fontBold)) : undefined,
      });

      process.stdout.write(outPath + '\n');
    }
  )
  .command(
    'render-many',
    '用同一份数据批量渲染多张 PNG（title 支持手动换行）',
    (cmd: any) =>
      cmd
        .option('data', {
          type: 'string',
          demandOption: true,
          describe: '输入 JSON 路径。title 支持手动换行；同一份数据会被所有目标模板复用',
        })
        .option('targets', {
          type: 'string',
          describe: '逗号分隔的目标列表，如 xhs-note:cream,xhs-note:blue,xhs-note-green,xhs-quote-blue',
        })
        .option('dir', {
          type: 'string',
          describe: '输出目录；不传则在默认目录下创建新的批次子目录',
        })
        .option('label', {
          type: 'string',
          default: 'batch',
          describe: '批次目录名前缀',
        })
        .option('font', {
          type: 'string',
          describe: '常规字体路径 (ttf/otf/ttc)',
        })
        .option('fontBold', {
          type: 'string',
          describe: '粗体字体路径',
        })
        .option('title-layout-mode', {
          type: 'string',
          choices: ['rule', 'llm'],
          default: 'rule',
          describe: '标题排版模式。若 title 已手动写了换行，优先按手动换行渲染；否则再按所选模式自动拆分',
        }),
    async (args: any) => {
      const dataPath = path.resolve(String(args.data));
      const fontRegularPath = await resolveFontRegularPath(args);
      const targets = String(args.targets || DEFAULT_BATCH_TARGETS.join(','))
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map(parseTarget);

      const baseDir = args.dir ? path.resolve(String(args.dir)) : getOutputImageDir();
      const outDir = args.dir ? baseDir : makeBatchOutputDir(baseDir, String(args.label || 'batch'));
      await fs.mkdir(outDir, { recursive: true });

      const raw = await fs.readFile(dataPath, 'utf8');
      const baseJson = JSON.parse(raw);
      const results: Array<{ template: string; theme?: string; outPath: string }> = [];

      for (const target of targets) {
        const def = getTemplate(target.template);
        const input = def.schema.parse({
          ...baseJson,
          ...(target.theme ? { theme: target.theme } : {}),
        });
        const outPath = path.join(outDir, `${target.suffix}.png`);
        input.titleLayoutMode = args.titleLayoutMode as 'rule' | 'llm';

        await renderToPng({
          template: target.template,
          input,
          width: def.defaultWidth,
          height: def.defaultHeight,
          outPath,
          fontRegularPath,
          fontBoldPath: args.fontBold ? path.resolve(String(args.fontBold)) : undefined,
        });

        results.push({ template: target.template, theme: target.theme, outPath });
      }

      process.stdout.write(
        JSON.stringify(
          {
            outDir,
            results,
          },
          null,
          2
        ) + '\n'
      );
    }
  )
  .command(
    'debug-title',
    '查看标题排版结果；可直接验证手动换行是否按预期生效',
    (cmd: any) =>
      cmd
        .option('template', {
          type: 'string',
          choices: [...BUILTIN_TEMPLATES],
          demandOption: true,
          describe: '模板名称',
        })
        .option('data', {
          type: 'string',
          describe: '输入 JSON 路径',
        })
        .option('title', {
          type: 'string',
          describe: '直接传标题文本；支持用 \\n 表示换行，可用来快速确认最终分行',
        })
        .option('limit', {
          type: 'number',
          default: 5,
          describe: '输出前 N 个候选解',
        }),
    async (args: any) => {
      const template = args.template as BuiltinTemplate;
      const hasData = Boolean(args.data);
      const hasTitle = Boolean(args.title);

      if (hasData === hasTitle) {
        throw new Error('debug-title requires exactly one of --data or --title');
      }

      const inspected = hasTitle
        ? inspectTitleLayoutByTitle(template, String(args.title), Number(args.limit ?? 5))
        : inspectTitleLayout(template, await loadTemplateInput(String(args.data), template), Number(args.limit ?? 5));

      process.stdout.write(JSON.stringify(inspected, null, 2) + '\n');
    }
  )
  .command(
    'render-fixtures',
    '按模板批量渲染标题测试样本，包含手动换行 case，输出到以模板名分组的目录',
    (cmd: any) =>
      cmd
        .option('templates', {
          type: 'string',
          describe: '逗号分隔模板名；不传则渲染全部模板',
        })
        .option('dir', {
          type: 'string',
          describe: '输出目录；不传则输出到默认目录下的 fixture 批次目录',
        })
        .option('label', {
          type: 'string',
          default: 'fixtures',
          describe: '批次目录名前缀',
        })
        .option('font', {
          type: 'string',
          describe: '常规字体路径 (ttf/otf/ttc)',
        })
        .option('fontBold', {
          type: 'string',
          describe: '粗体字体路径',
        })
        .option('title-layout-mode', {
          type: 'string',
          choices: ['rule', 'llm'],
          default: 'rule',
          describe: '标题排版模式。若 fixture title 已手动写了换行，优先按手动换行渲染；否则再按所选模式自动拆分',
        }),
    async (args: any) => {
      const fontRegularPath = await resolveFontRegularPath(args);
      const templates = String(args.templates || BUILTIN_TEMPLATES.join(','))
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean) as BuiltinTemplate[];

      const baseDir = args.dir ? path.resolve(String(args.dir)) : getOutputImageDir();
      const outDir = args.dir ? baseDir : makeBatchOutputDir(baseDir, String(args.label || 'fixtures'));
      await fs.mkdir(outDir, { recursive: true });

      const results: Array<{ template: string; name: string; outPath: string }> = [];

      for (const template of templates) {
        if (!BUILTIN_TEMPLATES.includes(template)) {
          throw new Error(`Invalid template: ${template}`);
        }

        const templateDir = path.join(outDir, template);
        await fs.mkdir(templateDir, { recursive: true });
        const fixtures = await loadTitleFixtures(template);
        const def = getTemplate(template);

        for (const fixture of fixtures) {
          const input = def.schema.parse(buildFixtureInput(template, fixture));
          input.titleLayoutMode = args.titleLayoutMode as 'rule' | 'llm';
          const outPath = path.join(templateDir, `${fixture.name}.png`);

          await renderToPng({
            template,
            input,
            width: def.defaultWidth,
            height: def.defaultHeight,
            outPath,
            fontRegularPath,
            fontBoldPath: args.fontBold ? path.resolve(String(args.fontBold)) : undefined,
          });

          results.push({ template, name: fixture.name, outPath });
        }
      }

      process.stdout.write(JSON.stringify({ outDir, count: results.length, results }, null, 2) + '\n');
    }
  )
  .command(
    'template',
    '模板相关命令',
    (cmd: any) =>
      cmd
        .option('action', {
          type: 'string',
          choices: ['list', 'show', 'init'],
          demandOption: true,
          describe: '模板动作',
        })
        .option('name', {
          type: 'string',
          choices: [...BUILTIN_TEMPLATES],
          describe: '模板名称（show/init 必填）',
        })
        .option('json', {
          type: 'boolean',
          default: false,
          describe: 'list 时以 JSON 输出',
        })
        .option('out', {
          type: 'string',
          describe: 'init 时输出 JSON 路径；不传则打印到 stdout',
        }),
    async (args: any) => {
      const action = String(args.action);

      if (action === 'list') {
        if (args.json) {
          process.stdout.write(
            JSON.stringify(
              templateList.map((item) => ({
                name: item.name,
                description: item.description,
                defaultWidth: item.defaultWidth,
                defaultHeight: item.defaultHeight,
                examplePath: item.examplePath,
              })),
              null,
              2
            ) + '\n'
          );
          return;
        }

        for (const item of templateList) {
          process.stdout.write(`${item.name}\t${item.description}\n`);
        }
        return;
      }

      if (!args.name) {
        throw new Error('template show/init requires --name <template>');
      }

      const def = getTemplate(args.name as BuiltinTemplate);

      if (action === 'show') {
        process.stdout.write(
          [
            `name: ${def.name}`,
            `description: ${def.description}`,
            `size: ${def.defaultWidth}x${def.defaultHeight}`,
            `example: ${def.examplePath}`,
            `schema: template-specific`,
          ].join('\n') + '\n'
        );
        return;
      }

      if (action === 'init') {
        const examplePath = path.resolve(def.examplePath);
        const content = await fs.readFile(examplePath, 'utf8');

        if (args.out) {
          const outPath = path.resolve(String(args.out));
          await fs.mkdir(path.dirname(outPath), { recursive: true });
          await fs.writeFile(outPath, content, 'utf8');
          process.stdout.write(outPath + '\n');
          return;
        }

        process.stdout.write(content + '\n');
        return;
      }
    }
  )
  .command(
    'config <action> [key] [value]',
    '查看或设置本地配置',
    (cmd: any) =>
      cmd
        .positional('action', {
          type: 'string',
          choices: ['get', 'set', 'list', 'reset'],
          describe: '配置动作',
        })
        .positional('key', {
          type: 'string',
          describe: '配置键名',
        })
        .positional('value', {
          type: 'string',
          describe: '配置值',
        }),
    async (args: any) => {
      const action = String(args.action);
      const key = args.key ? String(args.key) : undefined;

      if (action === 'list') {
        process.stdout.write(
          JSON.stringify(
            {
              'output.imageDir': getOutputImageDir(),
              'llm.enabled': Boolean(getLlmConfig()),
              'llm.baseUrl': config.get('llm.baseUrl') ?? '',
              'llm.model': config.get('llm.model') ?? '',
              'llm.timeoutMs': config.get('llm.timeoutMs') ?? '',
            },
            null,
            2
          ) + '\n'
        );
        return;
      }

      if (!key) {
        throw new Error('config get/set/reset requires <key>');
      }

      if (action === 'get') {
        process.stdout.write(String(config.get(key as 'output.imageDir') ?? '') + '\n');
        return;
      }

      if (action === 'set') {
        if (!args.value) {
          throw new Error('config set requires <value>');
        }

        if (key === 'output.imageDir') {
          const resolved = setOutputImageDir(String(args.value));
          process.stdout.write(resolved + '\n');
          return;
        }

        if (key === 'llm.apiKey' || key === 'llm.baseUrl' || key === 'llm.model' || key === 'llm.timeoutMs') {
          const resolved = setLlmConfigItem(key, String(args.value));
          process.stdout.write(String(resolved) + '\n');
          return;
        }

        throw new Error(`Unsupported config key: ${key}`);
      }

      if (action === 'reset') {
        if (key === 'output.imageDir' || key === 'llm.apiKey' || key === 'llm.baseUrl' || key === 'llm.model' || key === 'llm.timeoutMs') {
          const resetValue = resetConfigItem(key as any);
          process.stdout.write(String(resetValue) + '\n');
          return;
        }

        throw new Error(`Unsupported config key: ${key}`);
      }
    }
  )
  .demandCommand(1)
  .strict()
  .help()
  .parse();
