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
} from '@nestjs/common';
import { CostCentersService } from './cost-centers.service';
import { CreateCostCenterDto, UpdateCostCenterDto, CostCenterResponseDto } from './dto/cost-center.dto';
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
} from '@nestjs/swagger';

@ApiTags('cost-centers')
@ApiBearerAuth()
@Controller('cost-centers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CostCentersController {
  constructor(private readonly costCentersService: CostCentersService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Yeni maliyet merkezi oluştur' })
  @ApiResponse({ status: 201, description: 'Maliyet merkezi başarıyla oluşturuldu', type: CostCenterResponseDto })
  @ApiResponse({ status: 400, description: 'Geçersiz veri' })
  @ApiResponse({ status: 409, description: 'Bu departmanda aynı isimde bir maliyet merkezi zaten mevcut' })
  create(@Body() createCostCenterDto: CreateCostCenterDto, @Request() req): Promise<CostCenterResponseDto> {
    return this.costCentersService.create(createCostCenterDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Tüm maliyet merkezlerini listele' })
  @ApiResponse({ status: 200, description: 'Maliyet merkezi listesi', type: [CostCenterResponseDto] })
  findAll(@Request() req): Promise<CostCenterResponseDto[]> {
    return this.costCentersService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Belirli bir maliyet merkezini getir' })
  @ApiParam({ name: 'id', description: 'Maliyet merkezi ID' })
  @ApiResponse({ status: 200, description: 'Maliyet merkezi detayları', type: CostCenterResponseDto })
  @ApiResponse({ status: 404, description: 'Maliyet merkezi bulunamadı' })
  findOne(@Param('id') id: string, @Request() req): Promise<CostCenterResponseDto> {
    return this.costCentersService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Maliyet merkezi bilgilerini güncelle' })
  @ApiParam({ name: 'id', description: 'Maliyet merkezi ID' })
  @ApiResponse({ status: 200, description: 'Maliyet merkezi başarıyla güncellendi', type: CostCenterResponseDto })
  @ApiResponse({ status: 400, description: 'Yeni bütçe, harcanan miktardan az olamaz' })
  @ApiResponse({ status: 404, description: 'Maliyet merkezi bulunamadı' })
  update(
    @Param('id') id: string,
    @Body() updateCostCenterDto: UpdateCostCenterDto,
    @Request() req,
  ): Promise<CostCenterResponseDto> {
    return this.costCentersService.update(id, updateCostCenterDto, req.user.id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Maliyet merkezini sil' })
  @ApiParam({ name: 'id', description: 'Maliyet merkezi ID' })
  @ApiResponse({ status: 200, description: 'Maliyet merkezi başarıyla silindi' })
  @ApiResponse({ status: 404, description: 'Maliyet merkezi bulunamadı' })
  @ApiResponse({ status: 409, description: 'Bu maliyet merkezinde harcama yapılmış, silinemez' })
  remove(@Param('id') id: string, @Request() req): Promise<void> {
    return this.costCentersService.remove(id, req.user.id);
  }
}