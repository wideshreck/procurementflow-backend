import { IsString, IsNotEmpty, IsOptional, IsArray, IsIn } from 'class-validator';
import { ALL_PERMISSIONS } from '../../../common/permissions';

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

  @IsArray()
  @IsString({ each: true })
  @IsIn(ALL_PERMISSIONS, { each: true })
  @IsNotEmpty()
  permissions: string[];

  @IsString()
  @IsNotEmpty()
  companyId: string;
}
