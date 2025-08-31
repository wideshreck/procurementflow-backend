import { IsString, IsNotEmpty, IsOptional, IsUUID, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryColor } from '@prisma/client';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Kategori adı' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Kategori açıklaması' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Kategori rengi',
    enum: CategoryColor,
    default: CategoryColor.BLUE
  })
  @IsEnum(CategoryColor)
  @IsOptional()
  color?: CategoryColor = CategoryColor.BLUE;

  @ApiProperty({
    description: 'Lucide React icon adı',
    example: 'Package'
  })
  @IsString()
  @IsNotEmpty()
  icon: string;

  @ApiPropertyOptional({
    description: 'Kategori aktif mi?',
    default: true
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @ApiPropertyOptional({ description: 'Üst kategori ID\'si' })
  @IsUUID()
  @IsOptional()
  ParentCategoryID?: string;

  @ApiPropertyOptional({ description: 'CSV yüklemesi için üst kategori adı' })
  @IsString()
  @IsOptional()
  parentName?: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: 'Kategori adı' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Kategori açıklaması' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Kategori rengi',
    enum: CategoryColor
  })
  @IsEnum(CategoryColor)
  @IsOptional()
  color?: CategoryColor;

  @ApiPropertyOptional({
    description: 'Lucide React icon adı',
    example: 'Package'
  })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: 'Kategori aktif mi?' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Üst kategori ID\'si' })
  @IsUUID()
  @IsOptional()
  ParentCategoryID?: string;
}

export class CategoryResponseDto {
  @ApiProperty()
  CategoryID: string;

  @ApiProperty()
  categoryCode: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description?: string | null;

  @ApiProperty({ enum: CategoryColor })
  color: CategoryColor;

  @ApiProperty()
  icon: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional({ type: String, nullable: true })
  ParentCategoryID?: string | null;

  @ApiPropertyOptional({ nullable: true })
  parent?: {
    CategoryID: string;
    name: string;
  } | null;

  @ApiPropertyOptional()
  children?: CategoryResponseDto[];

  @ApiProperty()
  companyId: string;

  @ApiProperty({ description: 'Bu kategorideki ürün sayısı' })
  productCount?: number;

  @ApiProperty({ description: 'Bu kategorideki hizmet sayısı' })
  serviceCount?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
