import { IsString, IsNotEmpty, IsOptional, IsUUID, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCostCenterDto {
  @ApiProperty({ description: 'Maliyet merkezi adı' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Maliyet merkezi açıklaması' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Tanımlanmış bütçe', example: 100000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budget: number;

  @ApiProperty({ description: 'Bütçe sahibi kullanıcı ID\'si' })
  @IsUUID()
  @IsNotEmpty()
  budgetOwnerId: string;

  @ApiProperty({ description: 'Bağlı olduğu departman ID\'si' })
  @IsUUID()
  @IsNotEmpty()
  departmentId: string;
}

export class UpdateCostCenterDto {
  @ApiPropertyOptional({ description: 'Maliyet merkezi adı' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Maliyet merkezi açıklaması' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Tanımlanmış bütçe', example: 100000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  budget?: number;

  @ApiPropertyOptional({ description: 'Harcanan bütçe', example: 50000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  spentBudget?: number;

  @ApiPropertyOptional({ description: 'Kalan bütçe', example: 50000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  remainingBudget?: number;

  @ApiPropertyOptional({ description: 'Bütçe sahibi kullanıcı ID\'si' })
  @IsUUID()
  @IsOptional()
  budgetOwnerId?: string;

  @ApiPropertyOptional({ description: 'Departman ID\'si' })
  @IsUUID()
  @IsOptional()
  departmentId?: string;
}

export class CostCenterResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ description: 'Tanımlanmış bütçe' })
  budget: number;

  @ApiProperty({ description: 'Kalan bütçe' })
  remainingBudget: number;

  @ApiProperty({ description: 'Harcanan bütçe' })
  spentBudget: number;

  @ApiProperty()
  budgetOwnerId: string;

  @ApiProperty()
  budgetOwner: {
    id: string;
    fullName: string;
    email: string;
  };

  @ApiProperty()
  departmentId: string;

  @ApiProperty()
  department: {
    id: string;
    name: string;
    location: {
      id: string;
      name: string;
    };
  };

  @ApiProperty()
  companyId: string;

  @ApiProperty({ description: 'Bütçe kullanım yüzdesi' })
  budgetUtilization: number;

  @ApiProperty({ description: 'Bütçe durumu', enum: ['under', 'near', 'over'] })
  budgetStatus: 'under' | 'near' | 'over';

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
