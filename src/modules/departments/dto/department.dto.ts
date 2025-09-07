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
    description: 'Varsa yeni üst departmanın IDsi',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}

export class DepartmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  locationId: string;

  @ApiPropertyOptional()
  parentId?: string | null;

  @ApiProperty({ type: () => [DepartmentResponseDto] })
  children: DepartmentResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
