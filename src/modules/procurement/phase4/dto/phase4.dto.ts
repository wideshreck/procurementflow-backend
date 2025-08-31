import { IsString, IsEnum, IsOptional, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Phase 4 için aciliyet seviyeleri
 */
export enum UrgencyLevel {
  LOW = 'DÜŞÜK',
  MEDIUM = 'ORTA',
  HIGH = 'YÜKSEK',
  URGENT = 'ACİL'
}

/**
 * Teslimat detayları DTO'su
 */
export class DeliveryDetailsDto {
  @IsNotEmpty()
  @IsString()
  delivery_location: string; // Teslimat lokasyonu

  @IsNotEmpty()
  @IsEnum(UrgencyLevel)
  urgency: UrgencyLevel; // Aciliyet seviyesi

  @IsNotEmpty()
  @IsString()
  due_date: string; // Teslim tarihi (DD-MM-YYYY format)


  @IsNotEmpty()
  @IsString()
  contact_person: string; // İletişim kurulacak kişi

  @IsOptional()
  @IsString()
  additional_notes?: string; // Ek notlar
}

/**
 * Phase 4'te toplanan verilerin DTO'su
 */
export class Phase4DataDto {
  @ValidateNested()
  @Type(() => DeliveryDetailsDto)
  delivery_details: DeliveryDetailsDto;
}

/**
 * Phase 4 toplanan verilerin tamamı
 */
export class Phase4CollectedDataDto {
  @ValidateNested()
  @Type(() => DeliveryDetailsDto)
  delivery_details: DeliveryDetailsDto;

  // Önceki fazlardan gelen veriler
  @IsOptional()
  @IsString()
  request_justification?: string;

  @IsOptional()
  @IsString()
  item_title?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  subcategory?: string;

  @IsOptional()
  quantity?: number;

  @IsOptional()
  @IsString()
  uom?: string;

  @IsOptional()
  @IsString()
  simple_definition?: string;

  @IsOptional()
  @IsString()
  cost_center?: string;

  @IsOptional()
  @IsString()
  procurement_type?: string;

  @IsOptional()
  @IsString()
  justification?: string;

  @IsOptional()
  technical_specifications?: Array<{
    spec_key: string;
    spec_value: string;
    requirement_level?: string;
    notes?: string;
  }>;
}

/**
 * Phase 4 AI sorusu DTO'su
 */
export class Phase4QuestionDto {
  @IsNotEmpty()
  @IsString()
  question_id: string;

  @IsNotEmpty()
  @IsString()
  question_type: string;

  @IsNotEmpty()
  @IsString()
  question_text: string;

  @IsOptional()
  answer_options?: Array<{
    option: string;
    justification?: string;
  }>;
}
