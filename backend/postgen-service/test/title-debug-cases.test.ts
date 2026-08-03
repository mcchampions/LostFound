import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getTitleDebugProfile } from '../src/debug.js';
import { loadTitleFixtures } from '../src/fixtures.js';
import { layoutTitle, tokenizeMixedText } from '../src/templates/text-layout.js';
import { BUILTIN_TEMPLATES, type BuiltinTemplate } from '../src/types.js';

type DebugCase = {
  name: string;
  template: 'xhs-note' | 'xhs-note-green' | 'xhs-quote-blue';
  title: string;
  expect: {
    exactLines?: string[];
    maxLines?: number;
    minFontSize?: number;
    maxFontSize?: number;
    minFirstLineRatio?: number;
    minLastLineTokenCount?: number;
    containsWholeWord?: string;
  };
};

const casesPath = path.resolve('examples/title-debug-cases.json');
const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8')) as DebugCase[];

function runCase(testCase: DebugCase) {
  const profile = getTitleDebugProfile(testCase.template, { title: testCase.title });
  return layoutTitle(testCase.title, profile.spec);
}

describe('title debug cases', () => {
  for (const testCase of cases) {
    it(testCase.name, () => {
      const result = runCase(testCase);
      const rule = testCase.expect;

      if (rule.exactLines) {
        expect(result.lines).toEqual(rule.exactLines);
      }

      if (rule.maxLines !== undefined) {
        expect(result.lines.length).toBeLessThanOrEqual(rule.maxLines);
      }

      if (rule.minFontSize !== undefined) {
        expect(result.fontSize).toBeGreaterThanOrEqual(rule.minFontSize);
      }

      if (rule.maxFontSize !== undefined) {
        expect(result.fontSize).toBeLessThanOrEqual(rule.maxFontSize);
      }

      if (rule.minFirstLineRatio !== undefined && result.lineWidths.length > 1) {
        const first = result.lineWidths[0] ?? 0;
        const max = Math.max(...result.lineWidths, 1);
        expect(first / max).toBeGreaterThanOrEqual(rule.minFirstLineRatio);
      }

      if (rule.minLastLineTokenCount !== undefined) {
        const lastLine = result.lines[result.lines.length - 1] ?? '';
        expect(tokenizeMixedText(lastLine).length).toBeGreaterThanOrEqual(rule.minLastLineTokenCount);
      }

      if (rule.containsWholeWord) {
        expect(result.lines.some((line) => line.includes(rule.containsWholeWord!))).toBe(true);
      }
    });
  }
});

describe('title fixtures semantic coverage', () => {
  for (const template of BUILTIN_TEMPLATES as BuiltinTemplate[]) {
    it(`${template} fixtures keep meaningful wording`, async () => {
      const fixtures = await loadTitleFixtures(template);
      expect(fixtures.length).toBeGreaterThanOrEqual(10);
      expect(fixtures.some((item) => /OpenClaw|Claude Code|Tesla|Prompt|Workflow|UI|Debug/i.test(item.title))).toBe(true);
      expect(fixtures.some((item) => /🦊|🦞/.test(item.title))).toBe(true);
      expect(fixtures.some((item) => /\n/.test(item.title))).toBe(true);
    });
  }
});
