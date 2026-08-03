import * as budoux from 'budoux';

const punctuation = new Set(Array.from('，。！？；：、,.!?;:'));
const asciiWord = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const emojiRegex = /\p{Extended_Pictographic}/u;
const zhParser = budoux.loadDefaultSimplifiedChineseParser();

export interface TitleLayoutBox {
  width: number;
  height: number;
}

export interface TitleLayoutStyle {
  fontSize: number;
  letterSpacing: number;
  lineHeight: number;
}

export interface TitleLayoutSpec {
  box: TitleLayoutBox;
  fontSize: number;
  minFontSize: number;
  fontSizeStep: number;
  lineHeight: number;
  lineHeightStep?: number;
  letterSpacing: number;
  maxLines: number;
  preferredLines: number;
  minLastLineRatio?: number;
  keepWords?: boolean;
  avoidShortFirstLine?: boolean;
  minFirstLineRatio?: number;
  avoidSingleCharLastLine?: boolean;
  debug?: boolean;
  debugCandidateLimit?: number;
}

export interface TitleLayoutDebugCandidate {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  lineWidths: number[];
  blockHeight: number;
  lineCount: number;
  maxWidth: number;
  firstRatio: number;
  tailRatio: number;
  widthVariance: number;
  score: number;
}

export interface TitleLayoutResult {
  lines: string[];
  tokens: string[];
  fontSize: number;
  lineHeight: number;
  lineWidths: number[];
  exceededMaxLines: boolean;
  debug?: {
    chosen?: TitleLayoutDebugCandidate;
    topCandidates: TitleLayoutDebugCandidate[];
  };
}

interface Candidate {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  lineWidths: number[];
  blockHeight: number;
  score: number;
}

function normalizeLayoutText(text: string) {
  return (text ?? '').replace(/[\t ]+/g, '').trim();
}

export function tokenizeMixedText(text: string) {
  const clean = normalizeLayoutText(text);
  if (!clean) return [] as string[];

  const regex = /([A-Za-z0-9][A-Za-z0-9._-]*|\p{Extended_Pictographic}|[^A-Za-z0-9\s])/gu;
  return Array.from(clean.matchAll(regex), (m) => m[0]).filter(Boolean);
}

function splitOversizedSegment(segment: string, style: TitleLayoutStyle, boxWidth: number) {
  if (estimateSegmentWidth(segment, style) <= boxWidth) return [segment];

  const tokens = tokenizeMixedText(segment);
  if (tokens.length <= 1) return [segment];

  const pieces: string[] = [];
  let current = '';
  let width = 0;

  for (const token of tokens) {
    const tokenWidth = estimateSegmentWidth(token, style);
    if (!current) {
      current = token;
      width = tokenWidth;
      continue;
    }

    if (width + tokenWidth <= boxWidth) {
      current += token;
      width += tokenWidth;
      continue;
    }

    pieces.push(current);
    current = token;
    width = tokenWidth;
  }

  if (current) pieces.push(current);
  return pieces;
}

export function segmentTextForLayout(text: string, style?: TitleLayoutStyle, boxWidth?: number) {
  const clean = normalizeLayoutText(text);
  if (!clean) return [] as string[];

  const chunks = zhParser.parse(clean).filter(Boolean);
  const segments: string[] = [];

  for (const chunk of chunks) {
    if (isAsciiWord(chunk) || emojiRegex.test(chunk)) {
      segments.push(chunk);
      continue;
    }

    const tokens = tokenizeMixedText(chunk);
    if (tokens.length <= 1) {
      segments.push(chunk);
      continue;
    }

    const hasAscii = tokens.some((token) => isAsciiWord(token) || emojiRegex.test(token));
    if (hasAscii) {
      segments.push(...tokens);
      continue;
    }

    if (style && boxWidth) {
      segments.push(...splitOversizedSegment(chunk, style, boxWidth));
      continue;
    }

    segments.push(chunk);
  }

  return segments;
}

function splitByManualLines(text: string) {
  return (text ?? '')
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isAsciiWord(token: string) {
  return asciiWord.test(token);
}

function tokenUnits(token: string) {
  if (punctuation.has(token)) return 0.45;
  if (isAsciiWord(token)) return token.length * 0.56 + 0.35;
  if (emojiRegex.test(token)) return 1.25;
  return 1;
}

function estimateLineWidth(text: string, style: TitleLayoutStyle) {
  const tokens = tokenizeMixedText(text);
  const unitWidth = style.fontSize + style.letterSpacing;
  const totalUnits = tokens.reduce((sum, token) => sum + tokenUnits(token), 0);
  return totalUnits * unitWidth;
}

function estimateSegmentWidth(segment: string, style: TitleLayoutStyle) {
  return estimateLineWidth(segment, style);
}

function breakTokens(tokens: string[], style: TitleLayoutStyle, boxWidth: number, keepWords = true) {
  const lines: string[] = [];
  let current: string[] = [];
  let width = 0;

  for (const token of tokens) {
    const isPunc = punctuation.has(token);
    const isAscii = isAsciiWord(token);
    const tokenWidth = estimateLineWidth(token, style);

    if (!current.length) {
      current = [token];
      width = tokenWidth;
      continue;
    }

    const nextWidth = width + tokenWidth;
    if (nextWidth <= boxWidth || isPunc) {
      current.push(token);
      width = nextWidth;
      continue;
    }

    if (keepWords && isAscii && width <= boxWidth * 0.38) {
      current.push(token);
      width = nextWidth;
      continue;
    }

    lines.push(current.join(''));
    current = [token];
    width = tokenWidth;
  }

  if (current.length) lines.push(current.join(''));
  return rebalanceLines(lines, style, boxWidth, keepWords);
}

function canMoveLeadingToken(line: string, keepWords: boolean) {
  const tokens = tokenizeMixedText(line);
  if (tokens.length <= 1) return false;
  const first = tokens[0];
  if (!first || punctuation.has(first)) return false;
  if (keepWords && isAsciiWord(first)) return false;
  return true;
}

function moveLeadingToken(line: string) {
  const tokens = tokenizeMixedText(line);
  if (tokens.length <= 1) return null;
  const first = tokens[0];
  if (!first) return null;
  return {
    moved: first,
    rest: tokens.slice(1).join(''),
  };
}

function canMoveTrailingToken(line: string, keepWords: boolean) {
  const tokens = tokenizeMixedText(line);
  if (tokens.length <= 1) return false;
  const last = tokens[tokens.length - 1];
  if (!last || punctuation.has(last)) return false;
  if (keepWords && isAsciiWord(last)) return false;
  return true;
}

function moveTrailingToken(line: string) {
  const tokens = tokenizeMixedText(line);
  if (tokens.length <= 1) return null;
  const last = tokens[tokens.length - 1];
  if (!last) return null;
  return {
    rest: tokens.slice(0, -1).join(''),
    moved: last,
  };
}

function rebalanceLines(lines: string[], style: TitleLayoutStyle, boxWidth: number, keepWords: boolean) {
  if (lines.length <= 1) return lines;

  const balanced = [...lines];
  const targetVariance = balanced.length >= 4 ? 0.18 : balanced.length === 3 ? 0.14 : 0.1;

  let changed = true;
  let guard = 0;
  while (changed && guard < 64) {
    changed = false;
    guard += 1;

    for (let i = 0; i < balanced.length - 1; i += 1) {
      const current = balanced[i] ?? '';
      const next = balanced[i + 1] ?? '';
      const currentWidth = estimateLineWidth(current, style);
      const nextWidth = estimateLineWidth(next, style);
      const pairVariance = widthVariance([currentWidth, nextWidth]);
      const currentRatio = currentWidth / Math.max(currentWidth, nextWidth, 1);

      if (currentRatio < 0.46 && canMoveLeadingToken(next, keepWords)) {
        const shifted = moveLeadingToken(next);
        if (shifted) {
          const expandedCurrent = current + shifted.moved;
          const expandedWidth = estimateLineWidth(expandedCurrent, style);
          if (expandedWidth <= boxWidth) {
            balanced[i] = expandedCurrent;
            balanced[i + 1] = shifted.rest;
            changed = true;
            continue;
          }
        }
      }

      if (pairVariance < targetVariance) {
        if (canMoveTrailingToken(current, keepWords)) {
          const shifted = moveTrailingToken(current);
          if (shifted && shifted.rest) {
            const narrowedCurrentWidth = estimateLineWidth(shifted.rest, style);
            const expandedNext = shifted.moved + next;
            const expandedNextWidth = estimateLineWidth(expandedNext, style);
            const newVariance = widthVariance([narrowedCurrentWidth, expandedNextWidth]);
            if (narrowedCurrentWidth > 0 && expandedNextWidth <= boxWidth && newVariance > pairVariance) {
              balanced[i] = shifted.rest;
              balanced[i + 1] = expandedNext;
              changed = true;
              continue;
            }
          }
        }

        if (canMoveLeadingToken(next, keepWords)) {
          const shifted = moveLeadingToken(next);
          if (shifted) {
            const expandedCurrent = current + shifted.moved;
            const expandedWidth = estimateLineWidth(expandedCurrent, style);
            const reducedNextWidth = estimateLineWidth(shifted.rest, style);
            const newVariance = widthVariance([expandedWidth, reducedNextWidth]);
            if (expandedWidth <= boxWidth && reducedNextWidth > 0 && newVariance > pairVariance) {
              balanced[i] = expandedCurrent;
              balanced[i + 1] = shifted.rest;
              changed = true;
            }
          }
        }
      }
    }
  }

  for (let i = balanced.length - 1; i > 0; i -= 1) {
    const current = balanced[i] ?? '';
    const previous = balanced[i - 1] ?? '';
    if (!current || !previous) continue;
    if (!isLonelyTailLine(current)) continue;
    if (!canMoveLeadingToken(current, keepWords)) continue;

    const shifted = moveLeadingToken(current);
    if (!shifted) continue;

    const expandedPrevious = previous + shifted.moved;
    const expandedWidth = estimateLineWidth(expandedPrevious, style);
    if (expandedWidth > boxWidth) continue;

    balanced[i - 1] = expandedPrevious;
    balanced[i] = shifted.rest;
  }

  return balanced.filter(Boolean);
}

function measureBlockHeight(lineCount: number, style: TitleLayoutStyle) {
  if (lineCount <= 0) return 0;
  return lineCount * style.fontSize * style.lineHeight;
}

function isLonelyTailLine(line: string) {
  const compact = line.trim();
  if (!compact) return false;
  return tokenizeMixedText(compact).length <= 1;
}

function raggedness(widths: number[]) {
  if (widths.length <= 1) return 0;
  const avg = widths.reduce((a, b) => a + b, 0) / widths.length;
  return widths.reduce((sum, w) => sum + Math.abs(w - avg), 0);
}

function widthVariance(widths: number[]) {
  if (widths.length <= 1) return 0;
  const maxWidth = Math.max(...widths, 0);
  const minWidth = Math.min(...widths, maxWidth);
  if (maxWidth <= 0) return 0;
  return (maxWidth - minWidth) / maxWidth;
}

function scoreCandidate(lines: string[], widths: number[], spec: TitleLayoutSpec, style: TitleLayoutStyle, blockHeight: number) {
  const maxWidth = Math.max(...widths, 0);
  const minWidth = Math.min(...widths, maxWidth);
  const firstWidth = widths[0] ?? maxWidth;
  const lastWidth = widths[widths.length - 1] ?? maxWidth;
  const targetPenalty = Math.abs(lines.length - spec.preferredLines) * 18;
  const tailRatio = maxWidth > 0 ? lastWidth / maxWidth : 1;
  const minLastLineRatio = spec.minLastLineRatio ?? 0.42;
  const tailPenalty = tailRatio < minLastLineRatio ? (minLastLineRatio - tailRatio) * 80 : 0;
  const minFirstLineRatio = spec.minFirstLineRatio ?? 0.46;
  const firstRatio = maxWidth > 0 ? firstWidth / maxWidth : 1;
  const firstLinePenalty = spec.avoidShortFirstLine !== false && lines.length > 1 && firstRatio < minFirstLineRatio
    ? (minFirstLineRatio - firstRatio) * 52
    : 0;
  const lonelyTailPenalty = spec.avoidSingleCharLastLine !== false && lines.length > 1 && isLonelyTailLine(lines[lines.length - 1] ?? '')
    ? 45
    : 0;
  const raggedPenalty = raggedness(widths) / Math.max(style.fontSize, 1);
  const imbalancePenalty = (maxWidth - minWidth) / Math.max(style.fontSize, 1);
  const variance = widthVariance(widths);
  const widthUtilization = spec.box.width > 0 ? maxWidth / spec.box.width : 1;
  const widthPenalty = widthUtilization < 0.7 ? (0.7 - widthUtilization) * 42 : 0;
  const overUniformPenalty = lines.length >= 2 && variance < 0.12 ? (0.12 - variance) * 120 : 0;
  const overJaggedPenalty = lines.length >= 2 && variance > 0.42 ? (variance - 0.42) * 28 : 0;
  const heightUtilization = spec.box.height > 0 ? blockHeight / spec.box.height : 1;
  const heightPenalty = heightUtilization < 0.42 ? (0.42 - heightUtilization) * 14 : 0;
  const lineCountReward = lines.length === spec.preferredLines ? -10 : 0;
  const sizeReward = (spec.fontSize - style.fontSize) * 0.6 + Math.max(0, style.lineHeight - spec.lineHeight) * 10;
  return targetPenalty + tailPenalty + firstLinePenalty + lonelyTailPenalty + raggedPenalty + imbalancePenalty + widthPenalty + overUniformPenalty + overJaggedPenalty + heightPenalty + sizeReward + lineCountReward;
}

function toDebugCandidate(candidate: Candidate): TitleLayoutDebugCandidate {
  const maxWidth = Math.max(...candidate.lineWidths, 0);
  const firstWidth = candidate.lineWidths[0] ?? maxWidth;
  const lastWidth = candidate.lineWidths[candidate.lineWidths.length - 1] ?? maxWidth;
  return {
    lines: candidate.lines,
    fontSize: candidate.fontSize,
    lineHeight: candidate.lineHeight,
    lineWidths: candidate.lineWidths,
    blockHeight: candidate.blockHeight,
    lineCount: candidate.lines.length,
    maxWidth,
    firstRatio: maxWidth > 0 ? firstWidth / maxWidth : 1,
    tailRatio: maxWidth > 0 ? lastWidth / maxWidth : 1,
    widthVariance: widthVariance(candidate.lineWidths),
    score: Number(candidate.score.toFixed(3)),
  };
}

export function debugLayoutTitle(text: string, spec: TitleLayoutSpec) {
  return layoutTitle(text, {
    ...spec,
    debug: true,
  }).debug;
}

export function layoutTitle(text: string, spec: TitleLayoutSpec): TitleLayoutResult {
  const clean = (text ?? '').trim();
  if (!clean) {
    return {
      lines: [''],
      tokens: [],
      fontSize: spec.fontSize,
      lineHeight: spec.lineHeight,
      lineWidths: [0],
      exceededMaxLines: false,
    };
  }

  const manualLines = splitByManualLines(clean);
  const tokens = tokenizeMixedText(clean);

  if (manualLines.length > 1) {
    const widths = manualLines.map((line) => estimateLineWidth(line, {
      fontSize: spec.fontSize,
      letterSpacing: spec.letterSpacing,
      lineHeight: spec.lineHeight,
    }));
    return {
      lines: manualLines.slice(0, spec.maxLines),
      tokens,
      fontSize: spec.fontSize,
      lineHeight: spec.lineHeight,
      lineWidths: widths.slice(0, spec.maxLines),
      exceededMaxLines: manualLines.length > spec.maxLines,
    };
  }

  const candidates: Candidate[] = [];
  const lineHeightStep = spec.lineHeightStep ?? 0.02;
  const debugCandidateLimit = spec.debugCandidateLimit ?? 5;

  for (let fontSize = spec.fontSize; fontSize >= spec.minFontSize; fontSize -= spec.fontSizeStep) {
    for (let lineHeight = spec.lineHeight; lineHeight <= spec.lineHeight + 0.16; lineHeight += lineHeightStep) {
      const style = {
        fontSize,
        letterSpacing: spec.letterSpacing,
        lineHeight: Number(lineHeight.toFixed(2)),
      };

      const segments = segmentTextForLayout(clean, style, spec.box.width);
      const lines = breakTokens(segments, style, spec.box.width, spec.keepWords !== false);
      if (lines.length > spec.maxLines) continue;

      const blockHeight = measureBlockHeight(lines.length, style);
      if (blockHeight > spec.box.height) continue;

      const widths = lines.map((line) => estimateLineWidth(line, style));
      if (widths.some((w) => w > spec.box.width)) continue;

      candidates.push({
        lines,
        fontSize,
        lineHeight: style.lineHeight,
        lineWidths: widths,
        blockHeight,
        score: scoreCandidate(lines, widths, spec, style, blockHeight),
      });
    }
  }

  candidates.sort((a, b) => a.score - b.score || b.fontSize - a.fontSize);
  const best = candidates[0];

  if (best) {
    return {
      lines: best.lines,
      tokens,
      fontSize: best.fontSize,
      lineHeight: best.lineHeight,
      lineWidths: best.lineWidths,
      exceededMaxLines: false,
      debug: spec.debug
        ? {
            chosen: toDebugCandidate(best),
            topCandidates: candidates.slice(0, debugCandidateLimit).map(toDebugCandidate),
          }
        : undefined,
    };
  }

  const fallbackStyle = {
    fontSize: spec.minFontSize,
    letterSpacing: spec.letterSpacing,
    lineHeight: spec.lineHeight,
  };
  const fallbackSegments = segmentTextForLayout(clean, fallbackStyle, spec.box.width);
  const fallbackLines = breakTokens(fallbackSegments, fallbackStyle, spec.box.width, spec.keepWords !== false);

  const truncatedFallbackLines = fallbackLines.slice(0, spec.maxLines);
  const fallbackWidths = truncatedFallbackLines.map((line) => estimateLineWidth(line, fallbackStyle));

  return {
    lines: truncatedFallbackLines,
    tokens,
    fontSize: spec.minFontSize,
    lineHeight: spec.lineHeight,
    lineWidths: fallbackWidths,
    exceededMaxLines: fallbackLines.length > spec.maxLines,
    debug: spec.debug
      ? {
          chosen: undefined,
          topCandidates: [],
        }
      : undefined,
  };
}

export function splitTitleSmart(text: string, maxChars = 10, maxLines = 5) {
  return layoutTitle(text, {
    box: {
      width: maxChars * 100,
      height: maxLines * 120,
    },
    fontSize: 100,
    minFontSize: 100,
    fontSizeStep: 1,
    lineHeight: 1.1,
    letterSpacing: 0,
    maxLines,
    preferredLines: Math.min(maxLines, 3),
    keepWords: true,
  }).lines;
}
