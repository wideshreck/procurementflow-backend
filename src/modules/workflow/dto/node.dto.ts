import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const NodeSchema = z.object({
  id: z.string(),
  type: z.enum(['procurement-request', 'condition-if-else', 'condition-case', 'parallel-fork', 'parallel-join', 'form', 'email']),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.any(),
});

export class NodeDto extends createZodDto(NodeSchema) {}
