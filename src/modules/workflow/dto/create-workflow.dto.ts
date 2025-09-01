import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Schema for workflow creation. Nodes and edges are represented as
// arrays of arbitrary objects because their structure is handled on
// the client side.
export const WorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  nodes: z.array(z.any()).nonempty(),
  edges: z.array(z.any()).nonempty(),
});

export class CreateWorkflowDto extends createZodDto(WorkflowSchema) {}
