import type { TemplateName } from '../types.js';
import type { TemplateDefinition } from './types.js';
import { xhsNoteTemplate } from './xhs-note.js';
import { xhsNoteGreenTemplate } from './xhs-note-green.js';
import { xhsQuoteBlueTemplate } from './xhs-quote-blue.js';
import { appleNotesHandwriteTemplate } from './apple-notes-handwrite.js';
import { xhsDateNoteTemplate } from './xhs-date-note.js';

export const templateList = [xhsNoteTemplate, xhsNoteGreenTemplate, xhsQuoteBlueTemplate, appleNotesHandwriteTemplate, xhsDateNoteTemplate] as const;

export const templateRegistry: Record<TemplateName, TemplateDefinition> = Object.fromEntries(
  templateList.map((item) => [item.name, item])
) as Record<TemplateName, TemplateDefinition>;

export function getTemplate(name: TemplateName) {
  return templateRegistry[name];
}
