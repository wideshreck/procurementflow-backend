import { PartialType } from '@nestjs/mapped-types';
import { CreateRFxTemplateDto } from './create-rfx-template.dto';
import { IsOptional, IsInt, Min } from 'class-validator';

export class UpdateRFxTemplateDto extends PartialType(CreateRFxTemplateDto) {
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}