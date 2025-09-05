import { IsString, IsNotEmpty, IsOptional, IsJSON } from 'class-validator';

export class CreateCustomRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsJSON()
  @IsNotEmpty()
  permissions: string;

  @IsString()
  @IsNotEmpty()
  companyId: string;
}
