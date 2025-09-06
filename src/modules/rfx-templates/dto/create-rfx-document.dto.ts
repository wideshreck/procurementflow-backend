import { IsString, IsOptional, IsEnum, IsDateString, IsNumber, IsObject, IsArray, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RFxType } from '@prisma/client';

export class CreateRFxDocumentDto {
  @IsString()
  title: string;

  @IsEnum(RFxType)
  type: RFxType;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  procurementRequestId?: string;

  @IsDateString()
  submissionDeadline: string;

  @IsOptional()
  @IsDateString()
  questionDeadline?: string;

  @IsOptional()
  @IsObject()
  introductionSection?: any;

  @IsObject()
  scopeSection: any;

  @IsObject()
  qualityStandards: any;

  @IsObject()
  paymentTerms: any;

  @IsObject()
  evaluationCriteria: any;

  @IsOptional()
  @IsObject()
  termsAndConditions?: any;

  @IsObject()
  submissionGuidelines: any;

  @IsOptional()
  @IsArray()
  additionalSections?: any[];

  @IsOptional()
  @IsObject()
  collectedData?: any;

  @IsOptional()
  @IsObject()
  technicalSpecs?: any;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedBudget?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  invitedSupplierIds?: string[];
}