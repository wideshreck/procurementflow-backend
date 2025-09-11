import { IsString, IsEnum, IsOptional, IsArray, MinLength, MaxLength, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RFxType } from '@prisma/client';

export class GenerateContentDto {
  @ApiProperty({ description: 'Field label for content generation' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fieldLabel: string;

  @ApiPropertyOptional({ description: 'Additional field description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  fieldDescription?: string;

  @ApiProperty({ enum: RFxType, description: 'Type of RFx document' })
  @IsEnum(RFxType)
  rfxType: RFxType;

  @ApiProperty({ description: 'Category of the RFx' })
  @IsNotEmpty()
  @IsString()
  category: string;

  @ApiPropertyOptional({ description: 'Company-specific context' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  companyContext?: string;
}

export class SuggestFieldsDto {
  @ApiProperty({ description: 'Section title' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  sectionTitle: string;

  @ApiProperty({ description: 'Existing fields in the section', type: [String] })
  @IsArray()
  @IsString({ each: true })
  existingFields: string[];

  @ApiProperty({ enum: RFxType, description: 'Type of RFx document' })
  @IsEnum(RFxType)
  rfxType: RFxType;

  @ApiProperty({ description: 'Category of the RFx' })
  @IsNotEmpty()
  @IsString()
  category: string;

  @ApiPropertyOptional({ description: 'Industry context' })
  @IsOptional()
  @IsString()
  industry?: string;
}

export class ImproveContentDto {
  @ApiProperty({ description: 'Current content to improve' })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  currentContent: string;

  @ApiProperty({ description: 'Field label' })
  @IsNotEmpty()
  @IsString()
  fieldLabel: string;

  @ApiProperty({ enum: RFxType, description: 'Type of RFx document' })
  @IsEnum(RFxType)
  rfxType: RFxType;

  @ApiPropertyOptional({ 
    description: 'Specific improvements to apply',
    type: [String],
    example: ['clarity', 'detail', 'structure']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  improvements?: string[];
}

export class GenerateTemplateDto {
  @ApiProperty({ enum: RFxType, description: 'Type of RFx template' })
  @IsEnum(RFxType)
  rfxType: RFxType;

  @ApiProperty({ description: 'Category of the template' })
  @IsNotEmpty()
  @IsString()
  category: string;

  @ApiProperty({ description: 'Template description' })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description: string;

  @ApiPropertyOptional({ 
    description: 'Specific requirements for the template',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specificRequirements?: string[];
}