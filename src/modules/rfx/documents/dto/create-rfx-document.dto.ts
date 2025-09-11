import { IsString, IsOptional, IsEnum, IsDateString, IsNumber, IsObject, IsArray, IsInt, Min } from 'class-validator';
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

  // Filled template data sections
  @IsOptional()
  @IsObject()
  basicInfoData?: Record<string, any>;

  @IsOptional()
  @IsObject()
  introductionData?: Record<string, any>;

  @IsOptional()
  @IsObject()
  scheduleData?: Record<string, any>;

  @IsOptional()
  @IsObject()
  technicalData?: Record<string, any>;

  @IsOptional()
  @IsObject()
  commercialData?: Record<string, any>;

  @IsOptional()
  @IsObject()
  evaluationData?: Record<string, any>;

  @IsOptional()
  @IsArray()
  customSectionsData?: Record<string, any>[];

  // Additional fields
  @IsOptional()
  @IsObject()
  collectedData?: Record<string, any>;

  @IsOptional()
  @IsObject()
  technicalSpecs?: Record<string, any>;

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
  invitedSupplierIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}