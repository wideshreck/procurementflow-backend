import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const UpdateUserCustomRoleSchema = z.object({
  customRoleId: z.string().cuid('Invalid Custom Role ID'),
});

export class UpdateUserCustomRoleDto extends createZodDto(
  UpdateUserCustomRoleSchema,
) {}
