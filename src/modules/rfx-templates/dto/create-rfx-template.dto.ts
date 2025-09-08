import { IsString, IsOptional, IsBoolean, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RFxType } from '@prisma/client';

class TemplateFieldDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  label: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  isEditable?: boolean;
}

class TemplateSectionDto {
  @IsString()
  title: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateFieldDto)
  fields: TemplateFieldDto[];

  @IsOptional()
  @IsBoolean()
  isEditable?: boolean;
}

export class CreateRFxTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(RFxType)
  type: RFxType;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ValidateNested()
  @Type(() => TemplateSectionDto)
  basicInfo: TemplateSectionDto;

  @ValidateNested()
  @Type(() => TemplateSectionDto)
  introductionAndSummary: TemplateSectionDto;

  @ValidateNested()
  @Type(() => TemplateSectionDto)
  scheduleAndProcedures: TemplateSectionDto;

  @ValidateNested()
  @Type(() => TemplateSectionDto)
  technicalRequirements: TemplateSectionDto;

  @ValidateNested()
  @Type(() => TemplateSectionDto)
  commercialTerms: TemplateSectionDto;

  @ValidateNested()
  @Type(() => TemplateSectionDto)
  evaluationCriteria: TemplateSectionDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateSectionDto)
  customSections?: TemplateSectionDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}