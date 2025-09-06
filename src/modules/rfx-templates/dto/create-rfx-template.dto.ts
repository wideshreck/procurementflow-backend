import { IsString, IsOptional, IsBoolean, IsEnum, IsArray, IsObject, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RFxType } from '@prisma/client';

class SectionDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bulletPoints?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

class QualityStandardDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  certificationRequired?: string;

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;
}

class PaymentTermDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  percentage?: number;

  @IsOptional()
  @IsString()
  milestone?: string;
}

class EvaluationCriteriaDto {
  @IsString()
  criteria: string;

  @IsString()
  description: string;

  @IsInt()
  @Min(0)
  weight: number;

  @IsOptional()
  @IsString()
  scoringMethod?: string;
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
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => SectionDto)
  introductionSection?: SectionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SectionDto)
  scopeSection?: SectionDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QualityStandardDto)
  qualityStandards?: QualityStandardDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentTermDto)
  paymentTerms?: PaymentTermDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvaluationCriteriaDto)
  evaluationCriteria?: EvaluationCriteriaDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => SectionDto)
  termsAndConditions?: SectionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SectionDto)
  submissionGuidelines?: SectionDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  additionalSections?: SectionDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}