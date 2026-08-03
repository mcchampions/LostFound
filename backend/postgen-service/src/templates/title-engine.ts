import { layoutTitle, type TitleLayoutResult, type TitleLayoutSpec } from './text-layout.js';
import type { BuiltinTemplate, RenderInput } from '../types.js';

export interface TemplateTitleLayoutProfile {
  template: BuiltinTemplate;
  spec: TitleLayoutSpec;
}

export function getTemplateTitleLayoutProfile(template: BuiltinTemplate, _input: RenderInput): TemplateTitleLayoutProfile {
  switch (template) {
    case 'xhs-note':
      return {
        template,
        spec: {
          box: { width: 760, height: 760 },
          fontSize: 96,
          minFontSize: 58,
          fontSizeStep: 2,
          lineHeight: 1.06,
          lineHeightStep: 0.02,
          letterSpacing: -3.5,
          maxLines: 5,
          preferredLines: 3,
          minLastLineRatio: 0.45,
          keepWords: true,
          avoidShortFirstLine: true,
          minFirstLineRatio: 0.46,
          avoidSingleCharLastLine: true,
        },
      };
    case 'xhs-note-green':
      return {
        template,
        spec: {
          box: { width: 760, height: 420 },
          fontSize: 76,
          minFontSize: 60,
          fontSizeStep: 2,
          lineHeight: 1.08,
          lineHeightStep: 0.02,
          letterSpacing: -2.2,
          maxLines: 4,
          preferredLines: 2,
          minLastLineRatio: 0.5,
          keepWords: true,
          avoidShortFirstLine: true,
          minFirstLineRatio: 0.44,
          avoidSingleCharLastLine: true,
        },
      };
    case 'xhs-quote-blue':
      return {
        template,
        spec: {
          box: { width: 760, height: 420 },
          fontSize: 104,
          minFontSize: 52,
          fontSizeStep: 2,
          lineHeight: 1.08,
          lineHeightStep: 0.02,
          letterSpacing: -6,
          maxLines: 4,
          preferredLines: 2,
          minLastLineRatio: 0.55,
          keepWords: true,
          avoidShortFirstLine: true,
          minFirstLineRatio: 0.5,
          avoidSingleCharLastLine: true,
        },
      };
    case 'apple-notes-handwrite':
      return {
        template,
        spec: {
          box: { width: 860, height: 360 },
          fontSize: 78,
          minFontSize: 58,
          fontSizeStep: 2,
          lineHeight: 1.04,
          lineHeightStep: 0.02,
          letterSpacing: -0.9,
          maxLines: 3,
          preferredLines: 2,
          minLastLineRatio: 0.5,
          keepWords: true,
          avoidShortFirstLine: true,
          minFirstLineRatio: 0.46,
          avoidSingleCharLastLine: true,
        },
      };
    case 'xhs-date-note':
      return {
        template,
        spec: {
          box: { width: 910, height: 480 },
          fontSize: 98,
          minFontSize: 68,
          fontSizeStep: 2,
          lineHeight: 1.1,
          lineHeightStep: 0.02,
          letterSpacing: -1,
          maxLines: 4,
          preferredLines: 3,
          minLastLineRatio: 0.56,
          keepWords: true,
          avoidShortFirstLine: true,
          minFirstLineRatio: 0.44,
          avoidSingleCharLastLine: true,
        },
      };
  }
}

export function resolveTemplateTitleLayout(template: BuiltinTemplate, input: RenderInput): TitleLayoutResult {
  const title = String(input.title ?? '').trim();
  const profile = getTemplateTitleLayoutProfile(template, input);
  return layoutTitle(title, profile.spec);
}
