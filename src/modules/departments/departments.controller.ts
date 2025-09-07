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
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto, DepartmentResponseDto } from './dto/department.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('departments')
@ApiBearerAuth()
@Controller('departments')
@UseGuards(JwtAuthGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @Permissions('departments:create')
  @ApiOperation({ summary: 'Yeni departman oluştur' })
  @ApiResponse({ status: 201, description: 'Departman başarıyla oluşturuldu', type: DepartmentResponseDto })
  @ApiResponse({ status: 400, description: 'Geçersiz veri' })
  @ApiResponse({ status: 409, description: 'Bu lokasyonda aynı isimde bir departman zaten mevcut' })
  create(@Body() createDepartmentDto: CreateDepartmentDto, @Request() req): Promise<DepartmentResponseDto> {
    return this.departmentsService.create(createDepartmentDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Tüm departmanları listele (hiyerarşik)' })
  @ApiResponse({ status: 200, description: 'Departman listesi', type: [DepartmentResponseDto] })
  findAll(
    @Request() req,
    @Query('searchTerm') searchTerm?: string,
    @Query('location') location?: string,
  ): Promise<DepartmentResponseDto[]> {
    return this.departmentsService.findAll(req.user.id, { searchTerm, location });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Belirli bir departmanı getir' })
  @ApiParam({ name: 'id', description: 'Departman ID' })
  @ApiResponse({ status: 200, description: 'Departman detayları', type: DepartmentResponseDto })
  @ApiResponse({ status: 404, description: 'Departman bulunamadı' })
  findOne(@Param('id') id: string, @Request() req): Promise<DepartmentResponseDto> {
    return this.departmentsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @Permissions('departments:update')
  @ApiOperation({ summary: 'Departman bilgilerini güncelle' })
  @ApiParam({ name: 'id', description: 'Departman ID' })
  @ApiResponse({ status: 200, description: 'Departman başarıyla güncellendi', type: DepartmentResponseDto })
  @ApiResponse({ status: 400, description: 'Geçersiz veri veya döngüsel bağımlılık' })
  @ApiResponse({ status: 404, description: 'Departman bulunamadı' })
  update(
    @Param('id') id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
    @Request() req,
  ): Promise<DepartmentResponseDto> {
    return this.departmentsService.update(id, updateDepartmentDto, req.user.id);
  }

  @Delete(':id')
  @Permissions('departments:delete')
  @ApiOperation({ summary: 'Departmanı sil' })
  @ApiParam({ name: 'id', description: 'Departman ID' })
  @ApiResponse({ status: 200, description: 'Departman başarıyla silindi' })
  @ApiResponse({ status: 404, description: 'Departman bulunamadı' })
  @ApiResponse({ status: 409, description: 'Bu departmana bağlı alt departmanlar veya maliyet merkezleri var' })
  remove(@Param('id') id: string, @Request() req): Promise<void> {
    return this.departmentsService.remove(id, req.user.id);
  }
}
