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
import { LocationsService } from './locations.service';
import { CreateLocationDto, UpdateLocationDto, LocationResponseDto } from './dto/location.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('locations')
@ApiBearerAuth()
@Controller('locations')
@UseGuards(JwtAuthGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @Permissions('locations:create')
  @ApiOperation({ summary: 'Yeni lokasyon oluştur' })
  @ApiResponse({ status: 201, description: 'Lokasyon başarıyla oluşturuldu', type: LocationResponseDto })
  @ApiResponse({ status: 400, description: 'Geçersiz veri' })
  @ApiResponse({ status: 409, description: 'Bu isimde bir lokasyon zaten mevcut' })
  create(@Body() createLocationDto: CreateLocationDto, @Request() req): Promise<LocationResponseDto> {
    return this.locationsService.create(createLocationDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Tüm lokasyonları listele' })
  @ApiResponse({ status: 200, description: 'Lokasyon listesi', type: [LocationResponseDto] })
  findAll(@Request() req): Promise<LocationResponseDto[]> {
    return this.locationsService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Belirli bir lokasyonu getir' })
  @ApiParam({ name: 'id', description: 'Lokasyon ID' })
  @ApiResponse({ status: 200, description: 'Lokasyon detayları', type: LocationResponseDto })
  @ApiResponse({ status: 404, description: 'Lokasyon bulunamadı' })
  findOne(@Param('id') id: string, @Request() req): Promise<LocationResponseDto> {
    return this.locationsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @Permissions('locations:update')
  @ApiOperation({ summary: 'Lokasyon bilgilerini güncelle' })
  @ApiParam({ name: 'id', description: 'Lokasyon ID' })
  @ApiResponse({ status: 200, description: 'Lokasyon başarıyla güncellendi', type: LocationResponseDto })
  @ApiResponse({ status: 404, description: 'Lokasyon bulunamadı' })
  @ApiResponse({ status: 409, description: 'Bu isimde bir lokasyon zaten mevcut' })
  update(
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateLocationDto,
    @Request() req,
  ): Promise<LocationResponseDto> {
    return this.locationsService.update(id, updateLocationDto, req.user.id);
  }

  @Delete(':id')
  @Permissions('locations:delete')
  @ApiOperation({ summary: 'Lokasyonu sil' })
  @ApiParam({ name: 'id', description: 'Lokasyon ID' })
  @ApiResponse({ status: 200, description: 'Lokasyon başarıyla silindi' })
  @ApiResponse({ status: 404, description: 'Lokasyon bulunamadı' })
  @ApiResponse({ status: 409, description: 'Bu lokasyona bağlı departmanlar var' })
  remove(@Param('id') id: string, @Request() req): Promise<void> {
    return this.locationsService.remove(id, req.user.id);
  }
}
