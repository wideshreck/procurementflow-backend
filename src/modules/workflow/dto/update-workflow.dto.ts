import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { NodeSchema } from './node.dto';
import { WorkflowEdgeSchema } from './workflow-edge.dto';

const UpdateWorkflowSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  departmentId: z.string().optional(),
  isActive: z.boolean().optional(),
  nodes: z.array(NodeSchema).optional(),
  edges: z.array(WorkflowEdgeSchema).optional(),
});

export class UpdateWorkflowDto extends createZodDto(UpdateWorkflowSchema) {}
