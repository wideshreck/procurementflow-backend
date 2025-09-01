import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { NodeSchema } from './node.dto';
import { EdgeSchema } from './edge.dto';

const UpdateWorkflowSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  nodes: z.array(NodeSchema).optional(),
  edges: z.array(EdgeSchema).optional(),
});

export class UpdateWorkflowDto extends createZodDto(UpdateWorkflowSchema) {}
