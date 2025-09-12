import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { WorkflowNodeType, ParallelJoinStrategy } from '@prisma/client';

// Base schema for all nodes, containing common properties
const BaseNodeSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(WorkflowNodeType),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  label: z.string(),
});

// --- Node-specific data schemas ---

// 1. Start/End Nodes
const ProcurementRequestNodeSchema = BaseNodeSchema.extend({
  type: z.literal(WorkflowNodeType.PROCUREMENT_REQUEST),
  data: z.object({
    // departmentId is associated with the workflow itself, not configured in the node data.
    // This node is primarily a starting point with defined outputs.
  }),
});

const ApproveNodeSchema = BaseNodeSchema.extend({
  type: z.literal(WorkflowNodeType.APPROVE),
  data: z.object({}), // No specific data needed
});

const RejectNodeSchema = BaseNodeSchema.extend({
  type: z.literal(WorkflowNodeType.REJECT),
  data: z.object({}), // No specific data needed
});

// 2. Control Flow Nodes
const ConditionIfNodeSchema = BaseNodeSchema.extend({
  type: z.literal(WorkflowNodeType.CONDITION_IF),
  data: z.object({
    operator: z.enum(['>', '<', '=', '>=', '<=', '!=']),
    value: z.number(),
  }),
});

const ConditionSwitchNodeSchema = BaseNodeSchema.extend({
  type: z.literal(WorkflowNodeType.CONDITION_SWITCH),
  data: z.object({
    // Cases are defined here. The outputs of the node will correspond to these cases.
    // e.g., ['Urgent', 'High', 'Medium', 'Low']
    cases: z.array(z.string().min(1, 'Case value cannot be empty')).min(1),
  }),
});

const ParallelForkNodeSchema = BaseNodeSchema.extend({
  type: z.literal(WorkflowNodeType.PARALLEL_FORK),
  data: z.object({}), // The number of parallel paths is determined by outgoing edges
});

const ParallelJoinNodeSchema = BaseNodeSchema.extend({
  type: z.literal(WorkflowNodeType.PARALLEL_JOIN),
  data: z.object({
    strategy: z.nativeEnum(ParallelJoinStrategy),
  }),
});

// 3. Approval Nodes
const PersonApprovalNodeSchema = BaseNodeSchema.extend({
  type: z.literal(WorkflowNodeType.PERSON_APPROVAL),
  data: z.object({
    approverId: z.string().cuid('Invalid user ID format').optional(),
  }),
});

const DepartmentApprovalNodeSchema = BaseNodeSchema.extend({
  type: z.literal(WorkflowNodeType.DEPARTMENT_APPROVAL),
  data: z.object({
    departmentId: z.string().cuid('Invalid department ID format').optional(),
  }),
});

// --- Unified Node Schema using Discriminated Union ---
// This provides full type-safety for the `data` field based on the `type` field.
export const NodeSchema = z.discriminatedUnion('type', [
  ProcurementRequestNodeSchema,
  ApproveNodeSchema,
  RejectNodeSchema,
  ConditionIfNodeSchema,
  ConditionSwitchNodeSchema,
  ParallelForkNodeSchema,
  ParallelJoinNodeSchema,
  PersonApprovalNodeSchema,
  DepartmentApprovalNodeSchema,
]);

// The discriminated union schema is the source of truth for node validation.
// We export it for use in services.
export type Node = z.infer<typeof NodeSchema>;

// For NestJS DTO compatibility, especially with class-validator,
// we create a simpler class. The deep validation is handled by the Zod schema.
export class NodeDto extends createZodDto(z.any()) {}

// Export individual schemas for potential use in services or validators
export const NodeSchemas = {
  [WorkflowNodeType.PROCUREMENT_REQUEST]: ProcurementRequestNodeSchema,
  [WorkflowNodeType.APPROVE]: ApproveNodeSchema,
  [WorkflowNodeType.REJECT]: RejectNodeSchema,
  [WorkflowNodeType.CONDITION_IF]: ConditionIfNodeSchema,
  [WorkflowNodeType.CONDITION_SWITCH]: ConditionSwitchNodeSchema,
  [WorkflowNodeType.PARALLEL_FORK]: ParallelForkNodeSchema,
  [WorkflowNodeType.PARALLEL_JOIN]: ParallelJoinNodeSchema,
  [WorkflowNodeType.PERSON_APPROVAL]: PersonApprovalNodeSchema,
  [WorkflowNodeType.DEPARTMENT_APPROVAL]: DepartmentApprovalNodeSchema,
};
