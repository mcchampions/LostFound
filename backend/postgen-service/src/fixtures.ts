import fs from 'node:fs/promises';
import path from 'node:path';
import type { BuiltinTemplate, RenderInput } from './types.js';

export interface TitleFixture extends Partial<RenderInput> {
  name: string;
  title: string;
}

export async function loadTitleFixtures(template: BuiltinTemplate): Promise<TitleFixture[]> {
  const filePath = path.resolve('examples/title-fixtures', `${template}.json`);
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as TitleFixture[];
}

export function buildFixtureInput(template: BuiltinTemplate, fixture: TitleFixture): RenderInput {
  switch (template) {
    case 'xhs-note':
      return {
        title: fixture.title,
        subtitle: fixture.subtitle ?? '动态标题样本，用来观察字号、换行和整体密度是否稳定。',
        bullets: fixture.bullets ?? ['自动断句', '动态字号', '模板回归'],
        footer: fixture.footer,
        icon: fixture.icon ?? '💻',
        label: fixture.label ?? 'Text Note',
        theme: fixture.theme ?? 'cream',
      };
    case 'xhs-note-green':
      return {
        title: fixture.title,
        label: fixture.label ?? 'Text Note',
        day: fixture.day ?? 'Wednesday',
        serial: fixture.serial,
        theme: fixture.theme,
      };
    case 'xhs-quote-blue':
      return {
        title: fixture.title,
        subtitle: fixture.subtitle ?? '标题测试样本，用来观察不同长度下的行数、节奏和尾行比例。',
        footer: fixture.footer ?? 'postgen · title fixture',
        label: fixture.label ?? '@weixiao',
        theme: fixture.theme,
      };
    case 'apple-notes-handwrite':
      return {
        title: fixture.title,
        icon: fixture.icon ?? '😯',
        theme: fixture.theme,
      };
    case 'xhs-date-note':
      return {
        title: fixture.title,
        theme: fixture.theme,
      };
  }
}
