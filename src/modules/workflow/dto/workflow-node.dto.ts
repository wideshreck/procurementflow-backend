import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Base node data schemas
const BaseNodeDataSchema = z.object({
  label: z.string().optional(),
});

// Procurement Request Node
const ProcurementRequestDataSchema = BaseNodeDataSchema.extend({
  departmentId: z.string().optional(),
});

// Approval Node Data
const PersonApprovalDataSchema = BaseNodeDataSchema.extend({
  approverId: z.string(),
});

const DepartmentApprovalDataSchema = BaseNodeDataSchema.extend({
  departmentId: z.string(),
});

// Condition Node Data
const ConditionIfDataSchema = BaseNodeDataSchema.extend({
  field: z.enum(['totalPrice', 'unitPrice', 'quantity', 'urgency']),
  operator: z.enum(['>', '<', '=', '!=', '>=', '<=']),
  value: z.union([z.number(), z.string()]),
});

const ConditionSwitchDataSchema = BaseNodeDataSchema.extend({
  field: z.enum(['category', 'urgency', 'department']),
  cases: z.array(z.object({
    value: z.string(),
    label: z.string(),
  })),
});

// Parallel Node Data
const ParallelForkDataSchema = BaseNodeDataSchema.extend({
  branchCount: z.number().min(2).max(10),
});

const ParallelJoinDataSchema = BaseNodeDataSchema.extend({
  joinStrategy: z.enum(['ALL_APPROVE', 'ANY_APPROVE', 'ONE_APPROVE']),
  inputCount: z.number().min(2).max(10),
});

// Action Node Data
const EmailNotificationDataSchema = BaseNodeDataSchema.extend({
  to: z.string().email().or(z.enum(['REQUESTER', 'APPROVER', 'DEPARTMENT_MANAGER'])),
  subject: z.string(),
  template: z.string(),
});

const FormDataSchema = BaseNodeDataSchema.extend({
  formId: z.string(),
  assignTo: z.string(),
});

// End Node Data
const ApproveDataSchema = BaseNodeDataSchema.extend({
  message: z.string().optional(),
});

const RejectDataSchema = BaseNodeDataSchema.extend({
  reason: z.string(),
});

// Node data union
const NodeDataSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('PROCUREMENT_REQUEST'), data: ProcurementRequestDataSchema }),
  z.object({ type: z.literal('PERSON_APPROVAL'), data: PersonApprovalDataSchema }),
  z.object({ type: z.literal('DEPARTMENT_APPROVAL'), data: DepartmentApprovalDataSchema }),
  z.object({ type: z.literal('CONDITION_IF'), data: ConditionIfDataSchema }),
  z.object({ type: z.literal('CONDITION_SWITCH'), data: ConditionSwitchDataSchema }),
  z.object({ type: z.literal('PARALLEL_FORK'), data: ParallelForkDataSchema }),
  z.object({ type: z.literal('PARALLEL_JOIN'), data: ParallelJoinDataSchema }),
  z.object({ type: z.literal('EMAIL_NOTIFICATION'), data: EmailNotificationDataSchema }),
  z.object({ type: z.literal('FORM'), data: FormDataSchema }),
  z.object({ type: z.literal('APPROVE'), data: ApproveDataSchema }),
  z.object({ type: z.literal('REJECT'), data: RejectDataSchema }),
]);

// Complete WorkflowNode Schema
export const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: z.enum([
    'PROCUREMENT_REQUEST',
    'APPROVE',
    'REJECT',
    'CONDITION_IF',
    'CONDITION_SWITCH',
    'PARALLEL_FORK',
    'PARALLEL_JOIN',
    'PERSON_APPROVAL',
    'DEPARTMENT_APPROVAL',
    'EMAIL_NOTIFICATION',
    'FORM',
  ]),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.any().optional(), // Will be validated based on type
});

export class WorkflowNodeDto extends createZodDto(WorkflowNodeSchema) {}

// Export individual data schemas for use in validation
export {
  ProcurementRequestDataSchema,
  PersonApprovalDataSchema,
  DepartmentApprovalDataSchema,
  ConditionIfDataSchema,
  ConditionSwitchDataSchema,
  ParallelForkDataSchema,
  ParallelJoinDataSchema,
  EmailNotificationDataSchema,
  FormDataSchema,
  ApproveDataSchema,
  RejectDataSchema,
  NodeDataSchema,
};