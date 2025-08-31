import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto, CategoryResponseDto } from './dto/category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Yeni kategori oluştur' })
  @ApiResponse({ status: 201, description: 'Kategori başarıyla oluşturuldu', type: CategoryResponseDto })
  @ApiResponse({ status: 400, description: 'Geçersiz veri' })
  @ApiResponse({ status: 409, description: 'Bu seviyede aynı isimde bir kategori zaten mevcut' })
  create(@Body() createCategoryDto: CreateCategoryDto, @Request() req): Promise<CategoryResponseDto> {
    return this.categoriesService.create(createCategoryDto, req.user.id);
  }

  @Post('bulk')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Toplu kategori oluştur' })
  @ApiResponse({ status: 201, description: 'Kategoriler başarıyla oluşturuldu' })
  bulkCreate(@Body() createCategoryDtos: CreateCategoryDto[], @Request() req): Promise<{ count: number }> {
    return this.categoriesService.bulkCreate(createCategoryDtos, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Tüm kategorileri listele' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean, description: 'Pasif kategorileri de göster' })
  @ApiQuery({ name: 'format', required: false, enum: ['flat', 'hierarchical'], description: 'Dönüş formatı' })
  @ApiResponse({ status: 200, description: 'Kategori listesi', type: [CategoryResponseDto] })
  findAll(
    @Request() req,
    @Query('includeInactive') includeInactive?: boolean,
    @Query('format') format?: 'flat' | 'hierarchical',
  ): Promise<CategoryResponseDto[]> {
    return this.categoriesService.findAll(req.user.id, includeInactive, format);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Belirli bir kategoriyi getir' })
  @ApiParam({ name: 'id', description: 'Kategori ID' })
  @ApiResponse({ status: 200, description: 'Kategori detayları', type: CategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Kategori bulunamadı' })
  findOne(@Param('id') id: string, @Request() req): Promise<CategoryResponseDto> {
    return this.categoriesService.findOne(id, req.user.id);
  }

  @Get(':id/details')
  @ApiOperation({ summary: 'Belirli bir kategorinin detaylı raporunu getir' })
  @ApiParam({ name: 'id', description: 'Kategori ID' })
  @ApiResponse({ status: 200, description: 'Kategori rapor detayları' })
  @ApiResponse({ status: 404, description: 'Kategori bulunamadı' })
  findOneWithDetails(@Param('id') id: string, @Request() req): Promise<any> {
    return this.categoriesService.findOneWithDetails(id, req.user.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Kategori bilgilerini güncelle' })
  @ApiParam({ name: 'id', description: 'Kategori ID' })
  @ApiResponse({ status: 200, description: 'Kategori başarıyla güncellendi', type: CategoryResponseDto })
  @ApiResponse({ status: 400, description: 'Geçersiz veri veya döngüsel bağımlılık' })
  @ApiResponse({ status: 404, description: 'Kategori bulunamadı' })
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Request() req,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.update(id, updateCategoryDto, req.user.id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Kategoriyi sil' })
  @ApiParam({ name: 'id', description: 'Kategori ID' })
  @ApiResponse({ status: 200, description: 'Kategori başarıyla silindi' })
  @ApiResponse({ status: 404, description: 'Kategori bulunamadı' })
  @ApiResponse({ status: 409, description: 'Bu kategoriye bağlı alt kategoriler veya ürün/hizmetler var' })
  remove(@Param('id') id: string, @Request() req): Promise<void> {
    return this.categoriesService.remove(id, req.user.id);
  }

  @Delete('all/by-company')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tüm kategorileri sil' })
  @ApiResponse({ status: 200, description: 'Tüm kategoriler başarıyla silindi' })
  removeAll(@Request() req): Promise<{ count: number }> {
    return this.categoriesService.removeAll(req.user.id);
  }
}
