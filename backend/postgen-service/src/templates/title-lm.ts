import type { BuiltinTemplate } from '../types.js';
import { getLlmConfig } from '../config.js';
import type { TitleLayoutSpec } from './text-layout.js';

export interface LlmTitleBreakOptions {
  timeoutMs?: number;
}

interface LlmTitleBreakResponse {
  candidates?: Array<{
    lines?: unknown[];
    rationale?: string;
  }>;
}

function normalizeTitle(text: string) {
  return String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(/[\t ]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

function sanitizeCandidateLines(lines: unknown[] | undefined, clean: string, spec: TitleLayoutSpec): string[] | null {
  const normalized = Array.isArray(lines) ? lines.map((item) => String(item ?? '').trim()).filter(Boolean) : [];
  if (normalized.length < 2 || normalized.length > spec.maxLines) return null;
  const flattened = clean.replace(/\s+/g, ' ').replace(/\r?\n/g, '').trim();
  if (normalized.join('') !== flattened) return null;
  return normalized;
}

export async function suggestTitleBreakCandidatesWithLlm(
  template: BuiltinTemplate,
  title: string,
  spec: TitleLayoutSpec,
  options: LlmTitleBreakOptions = {}
): Promise<string[][]> {
  const config = getLlmConfig();
  if (!config) return [];

  const clean = normalizeTitle(title);
  if (!clean) return [];

  const timeoutMs = options.timeoutMs ?? config.timeoutMs;

  const system = [
    '你是中文海报标题排版助手。',
    '任务：为图片标题生成 3 组候选断行方案，用于后续渲染评分。',
    '重点：这不是普通断句，而是视觉排版。',
    '规则：',
    '1. 保留原文字符顺序，不得改写、增删、替换任何字符。',
    '2. 英文词、数字串、emoji 必须保持完整，不能拆开。',
    '3. 优先使用 3-4 行；标题很短时才用 2 行。不要默认 2 行。',
    '4. 每行要有语义边界，也要考虑视觉均衡；不要某一行明显过长。',
    '5. 不要让最后一行只有一个字、一个词或一个 token。',
    '6. 不要输出解释文字，只输出 JSON。',
    '7. 输出格式必须是 {"candidates":[{"lines":[...],"rationale":"..."}, ...]}。',
    '8. 只返回 3 个候选方案，按你认为从优到次优排序。',
  ].join('\n');

  const user = JSON.stringify(
    {
      template,
      title: clean,
      constraints: {
        boxWidth: spec.box.width,
        boxHeight: spec.box.height,
        maxLines: spec.maxLines,
        preferredLines: spec.preferredLines,
        avoidSingleCharLastLine: spec.avoidSingleCharLastLine !== false,
        keepWords: spec.keepWords !== false,
      },
      hints:
        template === 'xhs-note-green'
          ? '这个模板标题区域较高，长标题优先拆成 3-4 行，避免两行横向铺满。'
          : template === 'xhs-quote-blue'
            ? '这个模板适合有节奏的 2-4 行，最后一行不宜过长。'
            : '这个模板适合视觉均衡的 2-4 行，长标题不要只拆成两行。',
    },
    null,
    2
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) return [];

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = String(data?.choices?.[0]?.message?.content || '').trim();
    if (!raw) return [];

    let parsed: LlmTitleBreakResponse | null = null;
    try {
      parsed = JSON.parse(raw) as LlmTitleBreakResponse;
    } catch {
      return [];
    }

    const candidates = Array.isArray(parsed?.candidates) ? parsed.candidates : [];
    const seen = new Set<string>();
    const results: string[][] = [];

    for (const candidate of candidates) {
      const normalized = sanitizeCandidateLines(candidate?.lines, clean, spec);
      if (!normalized) continue;
      const key = normalized.join('\n');
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(normalized);
    }

    return results;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
