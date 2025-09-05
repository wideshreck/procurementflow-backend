import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

class TechnicalSpecificationDto {
  @IsString()
  @IsNotEmpty()
  spec_key: string;

  @IsString()
  @IsNotEmpty()
  spec_value: string;

  @IsString()
  @IsNotEmpty()
  requirement_level: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

class DeliveryDetailsDto {
  @IsString()
  @IsNotEmpty()
  delivery_location: string;

  @IsString() // Changed from @IsDateString() to accept DD-MM-YYYY format
  @IsNotEmpty()
  due_date: string;

  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  @IsNotEmpty()
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @IsString()
  @IsOptional()
  additional_notes?: string;
}

class AuditTrailDto {
  @IsString()
  @IsNotEmpty()
  action: string;

  @IsString()
  @IsNotEmpty()
  isDone: string;
}

export class CreateProcurementRequestDto {
  @IsString()
  @IsNotEmpty()
  item_title: string;

  @IsString()
  @IsNotEmpty()
  category_id: string; // Kategori ID (cat-1, cat-1-1, vb.)

  @IsInt()
  @IsNotEmpty()
  quantity: number;

  @IsString()
  @IsNotEmpty()
  uom: string;

  @IsString()
  @IsNotEmpty()
  simple_definition: string;

  @IsString()
  @IsNotEmpty()
  procurement_type: string;

  @IsString()
  @IsNotEmpty()
  justification: string;

  @IsString()
  @IsOptional()
  purchase_frequency?: string;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsInt()
  @IsNotEmpty()
  unitPrice: number;

  @IsInt()
  @IsNotEmpty()
  totalPrice: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TechnicalSpecificationDto)
  technical_specifications: TechnicalSpecificationDto[];

  @ValidateNested()
  @Type(() => DeliveryDetailsDto)
  delivery_details: DeliveryDetailsDto;

  @IsEnum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
  @IsNotEmpty()
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AuditTrailDto)
  audit_trail: AuditTrailDto[];
}
