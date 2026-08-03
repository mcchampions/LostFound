import { describe, expect, it } from 'vitest';
import { resolveTemplateTitleLayout } from '../src/templates/title-engine.js';
import type { BuiltinTemplate } from '../src/types.js';
import { tokenizeMixedText } from '../src/templates/text-layout.js';

const templates: BuiltinTemplate[] = ['xhs-note', 'xhs-note-green', 'xhs-quote-blue'];

function genChinese(length: number) {
  return '排'.repeat(length);
}

describe('template title engine coverage', () => {
  for (const template of templates) {
    it(`${template} supports 1..50 chinese chars`, () => {
      for (let len = 1; len <= 50; len += 1) {
        const title = genChinese(len);
        const result = resolveTemplateTitleLayout(template, { title });

        expect(result.lines.join('')).toBe(title);
        expect(result.lines.length).toBeGreaterThanOrEqual(1);
        expect(result.fontSize).toBeGreaterThan(0);
        expect(result.exceededMaxLines).toBe(false);
      }
    });

    it(`${template} keeps every line width inside box for 1..50 chinese chars`, () => {
      for (let len = 1; len <= 50; len += 1) {
        const title = genChinese(len);
        const result = resolveTemplateTitleLayout(template, { title });
        const maxWidth = template === 'xhs-note' ? 760 : 760;
        expect(result.lineWidths.every((w) => w <= maxWidth)).toBe(true);
      }
    });
  }

  it('handles mixed chinese english emoji title across all templates', () => {
    const title = '当我给openclaw🦞接入特斯拉数据后，内容生产开始提速';

    for (const template of templates) {
      const result = resolveTemplateTitleLayout(template, { title });
      expect(result.lines.join('')).toBe(title);
      expect(result.fontSize).toBeGreaterThan(0);
      expect(tokenizeMixedText(result.lines[result.lines.length - 1] ?? '').length).toBeGreaterThan(1);
    }
  });

  it('handles manual line breaks across all templates', () => {
    const title = '停止追求\n信息密度\n开始追求\n记忆点';

    for (const template of templates) {
      const result = resolveTemplateTitleLayout(template, { title });
      expect(result.lines).toEqual(['停止追求', '信息密度', '开始追求', '记忆点']);
    }
  });
});
