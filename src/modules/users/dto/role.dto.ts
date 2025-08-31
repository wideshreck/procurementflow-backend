import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Align with Prisma enum Role
export const UpdateUserRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN']).describe('New role to assign'),
});

export class UpdateUserRoleDto extends createZodDto(UpdateUserRoleSchema) {}
