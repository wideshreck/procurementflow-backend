import { IsString, IsNumber, IsOptional, IsNotEmpty, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCostCenterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  budget: number;

  @IsUUID()
  @IsNotEmpty()
  budgetOwnerId: string;

  @IsUUID()
  @IsNotEmpty()
  departmentId: string;
}