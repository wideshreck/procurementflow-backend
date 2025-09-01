import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { NodeSchema } from './node.dto';
import { EdgeSchema } from './edge.dto';

const CreateWorkflowSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
});

export class CreateWorkflowDto extends createZodDto(CreateWorkflowSchema) {}
