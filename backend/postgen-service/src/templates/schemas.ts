import { z } from 'zod';

export const commonSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  bullets: z.array(z.string()).optional(),
  footer: z.string().optional(),
  theme: z.enum(['black', 'white', 'yellow', 'mint', 'cream', 'blue']).optional(),
  icon: z.string().optional(),
  label: z.string().optional(),
  day: z.string().optional(),
  serial: z.string().optional(),
});
