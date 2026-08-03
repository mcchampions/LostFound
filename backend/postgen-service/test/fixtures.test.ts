import { describe, expect, it } from 'vitest';
import { buildFixtureInput, loadTitleFixtures } from '../src/fixtures.js';
import { BUILTIN_TEMPLATES, type BuiltinTemplate } from '../src/types.js';

describe('title fixtures', () => {
  for (const template of BUILTIN_TEMPLATES) {
    it(`${template} fixtures are loadable`, async () => {
      const fixtures = await loadTitleFixtures(template);
      expect(fixtures.length).toBeGreaterThan(0);
      expect(fixtures.every((item) => item.name && item.title)).toBe(true);
    });
  }

  it('builds valid render inputs for every template fixture', async () => {
    for (const template of BUILTIN_TEMPLATES as BuiltinTemplate[]) {
      const fixtures = await loadTitleFixtures(template);
      for (const fixture of fixtures) {
        const input = buildFixtureInput(template, fixture);
        expect(input.title).toBe(fixture.title);
      }
    }
  });
});
