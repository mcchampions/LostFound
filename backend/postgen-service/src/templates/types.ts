import type { z } from 'zod';
import type { ReactNode } from 'react';
import type { TemplateName, RenderInput } from '../types.js';

export interface TemplateDefinition {
  name: TemplateName;
  description: string;
  defaultWidth: number;
  defaultHeight: number;
  examplePath: string;
  preferredFontRegularPath?: string;
  preferredFontBoldPath?: string;
  schema: z.ZodType<RenderInput>;
  render: (input: RenderInput) => ReactNode;
}
