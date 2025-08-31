import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({ description: 'Departman adı' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Departman açıklaması' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Üst departman ID\'si (varsa)', type: String, nullable: true })
  @IsUUID()
  @IsOptional()
  parentId?: string | null;

  @ApiProperty({ description: 'Departman yöneticisi ID\'si' })
  @IsUUID()
  @IsNotEmpty()
  managerId: string;

  @ApiProperty({ description: 'Departmanın bulunduğu lokasyon ID\'si' })
  @IsUUID()
  @IsNotEmpty()
  locationId: string;
}

export class UpdateDepartmentDto {
  @ApiPropertyOptional({ description: 'Departman adı' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Departman açıklaması' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Üst departman ID\'si' })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Departman yöneticisi ID\'si' })
  @IsUUID()
  @IsOptional()
  managerId?: string;

  @ApiPropertyOptional({ description: 'Lokasyon ID\'si' })
  @IsUUID()
  @IsOptional()
  locationId?: string;
}

export class DepartmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  parentId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  parent?: {
    id: string;
    name: string;
  } | null;

  @ApiProperty()
  managerId: string;

  @ApiProperty()
  manager: {
    id: string;
    fullName: string;
    email: string;
  };

  @ApiProperty()
  locationId: string;

  @ApiProperty()
  location: {
    id: string;
    name: string;
    address: string;
  };

  @ApiProperty()
  companyId: string;

  @ApiPropertyOptional({ type: () => [DepartmentResponseDto] })
  children?: DepartmentResponseDto[];

  @ApiPropertyOptional()
  costCenters?: {
    id: string;
    name: string;
    budget: number | any; // Decimal'i number'a çevirdiğimiz için any olabilir
    remainingBudget: number | any;
  }[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
