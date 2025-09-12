import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApprovalDecision } from '@prisma/client';

const ApprovalResponseSchema = z.object({
  decision: z.nativeEnum(ApprovalDecision),
  comments: z.string().optional(),
});

export class ApprovalResponseDto extends createZodDto(ApprovalResponseSchema) {}
