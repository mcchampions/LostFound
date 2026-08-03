export const BUILTIN_TEMPLATES = ['xhs-note', 'xhs-note-green', 'xhs-quote-blue', 'apple-notes-handwrite', 'xhs-date-note'] as const;
export type TemplateName = (typeof BUILTIN_TEMPLATES)[number];
export type BuiltinTemplate = TemplateName;

export type ThemeName = 'black' | 'white' | 'yellow' | 'mint' | 'cream' | 'blue';

export type TitleLayoutMode = 'rule' | 'llm';

export interface RenderInput {
  title: string;
  subtitle?: string;
  bullets?: string[];
  footer?: string;
  theme?: ThemeName;
  icon?: string;
  label?: string;
  day?: string;
  serial?: string;
  titleLayoutMode?: TitleLayoutMode;
  __resolvedTitleLayout?: {
    lines: string[];
    fontSize: number;
    lineHeight: number;
    lineWidths: number[];
    exceededMaxLines: boolean;
  };
}

export interface RenderOptions {
  width: number;
  height: number;
  template: BuiltinTemplate;
  outPath: string;
  dataPath?: string;
  fontRegularPath: string;
  fontBoldPath?: string;
}
