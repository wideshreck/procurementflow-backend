import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLocationDto {
  @ApiProperty({ description: 'Lokasyon adı' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Lokasyon açıklaması' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Lokasyon adresi' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'İletişim kurulacak kişinin ID\'si' })
  @IsUUID()
  @IsNotEmpty()
  contactId: string;
}

export class UpdateLocationDto {
  @ApiPropertyOptional({ description: 'Lokasyon adı' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Lokasyon açıklaması' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Lokasyon adresi' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'İletişim kurulacak kişinin ID\'si' })
  @IsUUID()
  @IsOptional()
  contactId?: string;
}

export class LocationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description: string | null;

  @ApiProperty()
  address: string;

  @ApiProperty()
  contactId: string;

  @ApiProperty()
  contact: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null; // Also allow null for phone
  };

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}