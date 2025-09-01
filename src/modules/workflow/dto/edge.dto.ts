import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const EdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  sourceHandle: z.string().optional(),
  target: z.string(),
  targetHandle: z.string().optional(),
});

export class EdgeDto extends createZodDto(EdgeSchema) {}
