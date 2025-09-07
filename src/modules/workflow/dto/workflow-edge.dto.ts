import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const WorkflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  label: z.string().optional(),
  dataType: z.enum(['NUMBER', 'STRING', 'BOOLEAN', 'ANY']).optional().default('ANY'),
});

export class WorkflowEdgeDto extends createZodDto(WorkflowEdgeSchema) {}