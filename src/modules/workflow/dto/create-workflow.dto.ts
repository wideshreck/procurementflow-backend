import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateWorkflowDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsNotEmpty()
  nodes: any[];

  @IsArray()
  @IsNotEmpty()
  edges: any[];
}
