import type { BuiltinTemplate, RenderInput } from '../types.js';
import {
  layoutTitle,
  tokenizeMixedText,
  type TitleLayoutDebugCandidate,
  type TitleLayoutResult,
  type TitleLayoutSpec,
} from './text-layout.js';
import { getTemplateTitleLayoutProfile } from './title-engine.js';
import { suggestTitleBreakCandidatesWithLlm } from './title-lm.js';

interface LlmEvaluatedCandidate {
  lines: string[];
  result: TitleLayoutResult;
  score: number;
  reasons: string[];
}

function estimateBlockHeight(result: TitleLayoutResult) {
  return result.lines.length * result.fontSize * result.lineHeight;
}

function widthUtilization(result: TitleLayoutResult, spec: TitleLayoutSpec) {
  const maxWidth = Math.max(...result.lineWidths, 0);
  return spec.box.width > 0 ? maxWidth / spec.box.width : 0;
}

function heightUtilization(result: TitleLayoutResult, spec: TitleLayoutSpec) {
  const blockHeight = estimateBlockHeight(result);
  return spec.box.height > 0 ? blockHeight / spec.box.height : 0;
}

function widthVariance(widths: number[]) {
  if (widths.length <= 1) return 0;
  const maxWidth = Math.max(...widths, 0);
  const minWidth = Math.min(...widths, maxWidth);
  if (maxWidth <= 0) return 0;
  return (maxWidth - minWidth) / maxWidth;
}

function longestLineTokens(result: TitleLayoutResult) {
  return Math.max(...result.lines.map((line) => tokenizeMixedText(line).length), 0);
}

function getPreferredLineRange(template: BuiltinTemplate, title: string, spec: TitleLayoutSpec) {
  const tokenCount = tokenizeMixedText(title).length;

  if (template === 'xhs-note-green') {
    if (tokenCount >= 14) return { min: 3, max: Math.min(4, spec.maxLines) };
    if (tokenCount >= 9) return { min: 2, max: Math.min(3, spec.maxLines) };
  }

  if (template === 'xhs-note') {
    if (tokenCount >= 18) return { min: 3, max: Math.min(4, spec.maxLines) };
    if (tokenCount >= 11) return { min: 2, max: Math.min(3, spec.maxLines) };
  }

  if (template === 'xhs-quote-blue') {
    if (tokenCount >= 12) return { min: 3, max: Math.min(4, spec.maxLines) };
  }

  return { min: Math.max(1, Math.min(spec.preferredLines, spec.maxLines)), max: spec.maxLines };
}

function evaluateLlmCandidate(template: BuiltinTemplate, title: string, spec: TitleLayoutSpec, lines: string[]): LlmEvaluatedCandidate | null {
  const normalized = lines.map((line) => String(line ?? '').trim()).filter(Boolean);
  if (normalized.length < 2 || normalized.length > spec.maxLines) return null;
  if (normalized.join('') !== String(title ?? '').replace(/\s+/g, ' ').trim()) return null;

  const result = layoutTitle(normalized.join('\n'), spec);
  const reasons: string[] = [];
  let score = 0;

  if (result.exceededMaxLines) {
    reasons.push('exceeded-max-lines');
    score += 200;
  }

  const preferred = getPreferredLineRange(template, title, spec);
  if (result.lines.length < preferred.min) {
    reasons.push('too-few-lines');
    score += 80 + (preferred.min - result.lines.length) * 30;
  }
  if (result.lines.length > preferred.max) {
    reasons.push('too-many-lines');
    score += 40 + (result.lines.length - preferred.max) * 18;
  }

  const wUtil = widthUtilization(result, spec);
  const hUtil = heightUtilization(result, spec);
  const variance = widthVariance(result.lineWidths);
  const maxLineTokens = longestLineTokens(result);

  if (wUtil > 0.9) {
    reasons.push('too-wide');
    score += (wUtil - 0.9) * 240;
  }
  if (wUtil < 0.45) {
    reasons.push('too-narrow');
    score += (0.45 - wUtil) * 120;
  }
  if (hUtil < 0.34) {
    reasons.push('height-underused');
    score += (0.34 - hUtil) * 180;
  }
  if (variance < 0.08) {
    reasons.push('too-uniform');
    score += (0.08 - variance) * 80;
  }
  if (maxLineTokens >= 13 && result.lines.length <= 2) {
    reasons.push('dense-two-line-layout');
    score += 70;
  }

  if (template === 'xhs-note-green') {
    if (result.lines.length <= 2 && wUtil > 0.78) {
      reasons.push('green-template-needs-more-lines');
      score += 90;
    }
    if (hUtil < 0.4) {
      reasons.push('green-template-height-underused');
      score += (0.4 - hUtil) * 160;
    }
  }

  return { lines: normalized, result, score, reasons };
}

function shouldRejectCandidate(evaluated: LlmEvaluatedCandidate) {
  return evaluated.reasons.includes('too-wide') || evaluated.reasons.includes('green-template-needs-more-lines');
}

function normalizeTitlePreservingManualBreaks(text: string) {
  return String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(/[\t ]+/g, ' ').trim())
    .filter((line, index, arr) => line.length > 0 || (arr.length === 1 && index === 0))
    .join('\n')
    .trim();
}

function flattenTitleLines(text: string) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

export async function resolveTemplateTitleLayoutAsync(template: BuiltinTemplate, input: RenderInput): Promise<TitleLayoutResult> {
  const title = normalizeTitlePreservingManualBreaks(input.title ?? '');
  const flattenedTitle = flattenTitleLines(title);
  const profile = getTemplateTitleLayoutProfile(template, input);
  const mode = input.titleLayoutMode ?? 'rule';
  const hasManualBreaks = /\r?\n/.test(title);

  if (mode === 'llm') {
    const candidates = await suggestTitleBreakCandidatesWithLlm(template, title, profile.spec);
    const evaluated = candidates
      .map((lines) => evaluateLlmCandidate(template, flattenedTitle, profile.spec, lines))
      .filter((item): item is LlmEvaluatedCandidate => Boolean(item))
      .sort((a, b) => a.score - b.score);

    const best = evaluated[0];
    if (best && !shouldRejectCandidate(best)) {
      return {
        ...best.result,
        debug: {
          chosen: undefined,
          topCandidates: evaluated.slice(0, 5).map((item) => ({
            lines: item.result.lines,
            fontSize: item.result.fontSize,
            lineHeight: item.result.lineHeight,
            lineWidths: item.result.lineWidths,
            blockHeight: estimateBlockHeight(item.result),
            lineCount: item.result.lines.length,
            maxWidth: Math.max(...item.result.lineWidths, 0),
            firstRatio:
              Math.max(...item.result.lineWidths, 0) > 0
                ? (item.result.lineWidths[0] ?? 0) / Math.max(...item.result.lineWidths, 1)
                : 1,
            tailRatio:
              Math.max(...item.result.lineWidths, 0) > 0
                ? (item.result.lineWidths[item.result.lineWidths.length - 1] ?? 0) / Math.max(...item.result.lineWidths, 1)
                : 1,
            widthVariance: widthVariance(item.result.lineWidths),
            score: Number(item.score.toFixed(3)),
          })) as TitleLayoutDebugCandidate[],
        },
      };
    }
  }

  if (hasManualBreaks) {
    return layoutTitle(title, profile.spec);
  }

  return layoutTitle(flattenedTitle, profile.spec);
}
