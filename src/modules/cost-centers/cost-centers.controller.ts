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
  Res,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { CostCentersService } from './cost-centers.service';
import { CreateCostCenterDto, UpdateCostCenterDto, CostCenterResponseDto } from './dto/cost-center.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as Papa from 'papaparse';

@ApiTags('cost-centers')
@ApiBearerAuth()
@Controller('cost-centers')
@UseGuards(JwtAuthGuard)
export class CostCentersController {
  constructor(private readonly costCentersService: CostCentersService) {}

  @Post()
  @Permissions('cost-centers:create')
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
  @Permissions('cost-centers:update')
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
  @Permissions('cost-centers:delete')
  @ApiOperation({ summary: 'Maliyet merkezini sil' })
  @ApiParam({ name: 'id', description: 'Maliyet merkezi ID' })
  @ApiResponse({ status: 200, description: 'Maliyet merkezi başarıyla silindi' })
  @ApiResponse({ status: 404, description: 'Maliyet merkezi bulunamadı' })
  @ApiResponse({ status: 409, description: 'Bu maliyet merkezinde harcama yapılmış, silinemez' })
  remove(@Param('id') id: string, @Request() req): Promise<void> {
    return this.costCentersService.remove(id, req.user.id);
  }

  @Get('template/download')
  @ApiOperation({ summary: 'CSV şablonunu indir' })
  @ApiResponse({ status: 200, description: 'CSV şablon dosyası' })
  async downloadTemplate(@Res() res: FastifyReply) {
    const template = [
      {
        name: 'Yazılım Geliştirme Bütçesi',
        description: 'Yazılım departmanı için yıllık bütçe',
        budget: '500000',
        budgetOwnerEmail: 'john.doe@company.com',
        departmentName: 'Yazılım Geliştirme',
      },
      {
        name: 'Pazarlama Bütçesi',
        description: 'Pazarlama departmanı için yıllık bütçe',
        budget: '300000',
        budgetOwnerEmail: 'jane.smith@company.com',
        departmentName: 'Pazarlama',
      },
      {
        name: 'İnsan Kaynakları Bütçesi',
        description: 'İK departmanı için yıllık bütçe',
        budget: '200000',
        budgetOwnerEmail: 'hr.manager@company.com',
        departmentName: 'İnsan Kaynakları',
      },
    ];

    const csv = Papa.unparse(template, {
      header: true,
      delimiter: ',',
    });

    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.header('Content-Disposition', 'attachment; filename="maliyet-merkezi-sablonu.csv"');
    return res.send('\uFEFF' + csv); // Add BOM for Excel UTF-8 support
  }

  @Post('import')
  @Permissions('cost-centers:create')
  @ApiOperation({ summary: 'CSV dosyasından maliyet merkezlerini içe aktar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async importCsv(@Req() req: FastifyRequest & { user: any }) {
    const data = await req.file();
    
    if (!data) {
      throw new BadRequestException('CSV dosyası gerekli');
    }

    if (!data.filename.endsWith('.csv')) {
      throw new BadRequestException('Sadece CSV dosyaları kabul edilir');
    }

    // Read file buffer
    const buffer = await data.toBuffer();
    const file = {
      buffer,
      originalname: data.filename,
      mimetype: data.mimetype,
    };

    return this.costCentersService.importFromCsv(file as any, req.user.id);
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Maliyet merkezlerini CSV olarak dışa aktar' })
  @ApiResponse({ status: 200, description: 'CSV dosyası' })
  async exportCsv(@Request() req, @Res() res: FastifyReply) {
    const costCenters = await this.costCentersService.findAll(req.user.id);
    
    const data = costCenters.map(cc => ({
      name: cc.name,
      description: cc.description || '',
      budget: cc.budget.toString(),
      remainingBudget: cc.remainingBudget.toString(),
      spentBudget: cc.spentBudget.toString(),
      budgetOwnerEmail: cc.budgetOwner.email,
      budgetOwnerName: cc.budgetOwner.fullName,
      departmentName: cc.department.name,
      locationName: cc.department.location?.name || '',
    }));

    const csv = Papa.unparse(data, {
      header: true,
      delimiter: ',',
    });

    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.header('Content-Disposition', 'attachment; filename="maliyet-merkezleri.csv"');
    return res.send('\uFEFF' + csv); // Add BOM for Excel UTF-8 support
  }
}
