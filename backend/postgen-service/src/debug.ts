import path from 'node:path';
import fs from 'node:fs/promises';
import type { BuiltinTemplate, RenderInput } from './types.js';
import { getTemplate } from './templates/registry.js';
import { getTemplateTitleLayoutProfile } from './templates/title-engine.js';
import { debugLayoutTitle, layoutTitle, type TitleLayoutSpec } from './templates/text-layout.js';

export interface TitleDebugProfile {
  template: BuiltinTemplate;
  title: string;
  titleLength: number;
  spec: TitleLayoutSpec;
}

export interface TitleDebugResult {
  profile: TitleDebugProfile;
  result: ReturnType<typeof layoutTitle>;
}

export interface TitleDebugSummary {
  lineCount: number;
  fontSize: number;
  lineHeight: number;
  lineWidths: number[];
  firstLineRatio: number;
  lastLineRatio: number;
  blockHeight: number;
  exceededMaxLines: boolean;
}

function resolveTheme(input: RenderInput, fallback: string) {
  return String(input.theme ?? fallback);
}

export function getTitleDebugProfile(template: BuiltinTemplate, input: RenderInput): TitleDebugProfile {
  const title = String(input.title ?? '').trim();
  const profile = getTemplateTitleLayoutProfile(template, input);

  return {
    template,
    title,
    titleLength: title.length,
    spec: profile.spec,
  };
}

export async function loadTemplateInput(dataPath: string, template: BuiltinTemplate): Promise<RenderInput> {
  const raw = await fs.readFile(path.resolve(dataPath), 'utf8');
  const json = JSON.parse(raw);
  return getTemplate(template).schema.parse(json);
}

function summarizeLayout(result: ReturnType<typeof layoutTitle>): TitleDebugSummary {
  const maxWidth = Math.max(...result.lineWidths, 0);
  const firstWidth = result.lineWidths[0] ?? maxWidth;
  const lastWidth = result.lineWidths[result.lineWidths.length - 1] ?? maxWidth;

  return {
    lineCount: result.lines.length,
    fontSize: result.fontSize,
    lineHeight: result.lineHeight,
    lineWidths: result.lineWidths,
    firstLineRatio: maxWidth > 0 ? Number((firstWidth / maxWidth).toFixed(3)) : 1,
    lastLineRatio: maxWidth > 0 ? Number((lastWidth / maxWidth).toFixed(3)) : 1,
    blockHeight: Number((result.lines.length * result.fontSize * result.lineHeight).toFixed(3)),
    exceededMaxLines: result.exceededMaxLines,
  };
}

function normalizeInlineTitle(title: string) {
  return String(title ?? '').replace(/\\n/g, '\n').trim();
}

export function inspectTitleLayout(template: BuiltinTemplate, input: RenderInput, candidateLimit = 5) {
  const profile = getTitleDebugProfile(template, input);
  const result = layoutTitle(profile.title, {
    ...profile.spec,
    debug: true,
    debugCandidateLimit: candidateLimit,
  });

  return {
    profile,
    summary: summarizeLayout(result),
    result,
  } satisfies TitleDebugResult & { summary: TitleDebugSummary };
}

export function inspectTitleLayoutByTitle(template: BuiltinTemplate, title: string, candidateLimit = 5) {
  return inspectTitleLayout(template, { title: normalizeInlineTitle(title) }, candidateLimit);
}

export function inspectTitleLayoutDebug(template: BuiltinTemplate, input: RenderInput, candidateLimit = 5) {
  const profile = getTitleDebugProfile(template, input);
  const debug = debugLayoutTitle(profile.title, {
    ...profile.spec,
    debugCandidateLimit: candidateLimit,
  });
  const result = layoutTitle(profile.title, profile.spec);

  return {
    profile,
    summary: summarizeLayout(result),
    debug,
    theme: template === 'xhs-note' ? resolveTheme(input, 'cream') : undefined,
  };
}
