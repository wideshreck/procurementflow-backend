import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { NodeSchema } from './node.dto';
import { WorkflowEdgeSchema } from './workflow-edge.dto';

const CreateWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  departmentId: z.string().optional(),
  nodes: z.array(NodeSchema),
  edges: z.array(WorkflowEdgeSchema),
  isActive: z.boolean().default(true),
});

export class CreateWorkflowDto extends createZodDto(CreateWorkflowSchema) {}
