import { createZodDto } from 'nestjs-zod';
import { WorkflowSchema } from './create-workflow.dto';

// Update DTO allows partial updates of the workflow fields.
export class UpdateWorkflowDto extends createZodDto(
  WorkflowSchema.partial()
) {}

