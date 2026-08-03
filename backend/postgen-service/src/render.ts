import fs from 'node:fs/promises';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import type { BuiltinTemplate, RenderInput } from './types.js';
import { getTemplate } from './templates/registry.js';
import { resolveTemplateTitleLayoutAsync } from './templates/title-layout-service.js';

const TWEMOJI_ASSET_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg';

export async function loadInput(dataPath: string, template: BuiltinTemplate): Promise<RenderInput> {
  const raw = await fs.readFile(dataPath, 'utf8');
  const json = JSON.parse(raw);
  const def = getTemplate(template);
  return def.schema.parse(json);
}

async function loadFont(fontPath: string) {
  const buf = await fs.readFile(fontPath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function toCodepoints(segment: string) {
  return Array.from(segment)
    .map((char) => char.codePointAt(0)?.toString(16))
    .filter(Boolean)
    .join('-');
}

async function fetchAsDataUrl(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch asset: ${url} (${res.status})`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const contentType = res.headers.get('content-type') || 'image/svg+xml';
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return `data:${contentType};base64,${base64}`;
}

export async function renderToPng(params: {
  template: BuiltinTemplate;
  input: RenderInput;
  width: number;
  height: number;
  outPath: string;
  fontRegularPath: string;
  fontBoldPath?: string;
}) {
  const regularData = await loadFont(params.fontRegularPath);
  const boldData = params.fontBoldPath ? await loadFont(params.fontBoldPath) : undefined;

  const titleLayout = await resolveTemplateTitleLayoutAsync(params.template, params.input);
  const renderInput = {
    ...params.input,
    __resolvedTitleLayout: titleLayout,
  } as RenderInput & { __resolvedTitleLayout?: Awaited<ReturnType<typeof resolveTemplateTitleLayoutAsync>> };

  const element = getTemplate(params.template).render(renderInput);

  const svg = await satori(element as any, {
    width: params.width,
    height: params.height,
    fonts: [
      { name: 'XFont', data: regularData, weight: 400 as any, style: 'normal' as any },
      ...(boldData ? [{ name: 'XFont', data: boldData, weight: 800 as any, style: 'normal' as any }] : []),
    ],
    loadAdditionalAsset: async (code: string, segment: string) => {
      if (code === 'emoji') {
        const codepoints = toCodepoints(segment);
        if (!codepoints) return '';

        try {
          return await fetchAsDataUrl(`${TWEMOJI_ASSET_BASE}/${codepoints}.svg`);
        } catch {
          return '';
        }
      }

      return '';
    },
  });

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'original',
    },
    font: {
      loadSystemFonts: false,
    },
  });

  const pngData = resvg.render().asPng();

  await fs.mkdir(path.dirname(params.outPath), { recursive: true });
  await fs.writeFile(params.outPath, pngData);

  return { svg, outPath: params.outPath };
}
