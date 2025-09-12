import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({
    description: 'Departmanın adı',
    maxLength: 255,
    example: 'İnsan Kaynakları',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Departmanın açıklaması',
    maxLength: 500,
    example: 'Şirket personelinin işe alım, eğitim ve gelişim süreçlerini yöneten departman',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Departmanın bulunduğu lokasyonun IDsi',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsUUID()
  locationId: string;

  @ApiPropertyOptional({
    description: 'Varsa üst departmanın IDsi',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Departman yöneticisinin IDsi',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsOptional()
  @IsUUID()
  managerId?: string;
}

export class UpdateDepartmentDto {
  @ApiPropertyOptional({
    description: 'Departmanın yeni adı',
    maxLength: 255,
    example: 'İnsan Kaynakları ve Eğitim',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Departmanın yeni açıklaması',
    maxLength: 500,
    example: 'Şirket personelinin işe alım, eğitim ve gelişim süreçlerini yöneten departman',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Varsa yeni üst departmanın IDsi',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional({
    description: 'Yeni departman yöneticisinin IDsi',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsOptional()
  @IsUUID()
  managerId?: string | null;

  @ApiPropertyOptional({
    description: 'Yeni lokasyon IDsi',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsOptional()
  @IsUUID()
  locationId?: string;
}

export class DepartmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  locationId: string;

  @ApiPropertyOptional()
  parentId?: string | null;

  @ApiPropertyOptional()
  managerId?: string | null;

  @ApiProperty()
  companyId: string;

  @ApiProperty({ type: () => [DepartmentResponseDto] })
  children: DepartmentResponseDto[];

  @ApiPropertyOptional()
  location?: {
    id: string;
    name: string;
    address?: string;
  } | null;

  @ApiPropertyOptional()
  manager?: {
    id: string;
    fullName: string;
    email: string;
  } | null;

  @ApiPropertyOptional()
  parent?: {
    id: string;
    name: string;
  } | null;

  @ApiPropertyOptional()
  employeeCount?: number;

  @ApiPropertyOptional()
  costCenterCount?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
