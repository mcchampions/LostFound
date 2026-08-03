import { describe, expect, it } from 'vitest';
import { getTemplateTitleLayoutProfile, resolveTemplateTitleLayout } from '../src/templates/title-engine.js';
import { BUILTIN_TEMPLATES } from '../src/types.js';
import { loadTitleFixtures } from '../src/fixtures.js';

describe('render safety constraints', () => {
  for (const template of BUILTIN_TEMPLATES) {
    it(`${template} fixture titles do not overflow layout box vertically`, async () => {
      const fixtures = await loadTitleFixtures(template);
      const profile = getTemplateTitleLayoutProfile(template, { title: '' });

      for (const fixture of fixtures) {
        const result = resolveTemplateTitleLayout(template, { title: fixture.title });
        const blockHeight = result.lines.length * result.fontSize * result.lineHeight;
        expect(blockHeight).toBeLessThanOrEqual(profile.spec.box.height);
      }
    });
  }
});
