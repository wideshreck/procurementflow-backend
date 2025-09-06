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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RFxTemplatesService } from './rfx-templates.service';
import { CreateRFxTemplateDto } from './dto/create-rfx-template.dto';
import { UpdateRFxTemplateDto } from './dto/update-rfx-template.dto';
import { CreateRFxDocumentDto } from './dto/create-rfx-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RFxType, RFxStatus } from '@prisma/client';

@Controller('rfx')
@UseGuards(JwtAuthGuard)
export class RFxTemplatesController {
  constructor(private readonly rfxTemplatesService: RFxTemplatesService) {}

  // ==================== Template Endpoints ====================

  @Post('templates')
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(
    @Request() req,
    @Body() createDto: CreateRFxTemplateDto,
  ) {
    return this.rfxTemplatesService.createTemplate(
      req.user.companyId,
      req.user.id,
      createDto,
    );
  }

  @Get('templates')
  async findAllTemplates(
    @Request() req,
    @Query('type') type?: RFxType,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.rfxTemplatesService.findAllTemplates(req.user.companyId, {
      type,
      isActive: isActive === undefined ? undefined : isActive === 'true',
      search,
    });
  }

  @Get('templates/:id')
  async findTemplateById(
    @Request() req,
    @Param('id') id: string,
  ) {
    return this.rfxTemplatesService.findTemplateById(id, req.user.companyId);
  }

  @Patch('templates/:id')
  async updateTemplate(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateRFxTemplateDto,
  ) {
    return this.rfxTemplatesService.updateTemplate(
      id,
      req.user.companyId,
      req.user.id,
      updateDto,
    );
  }

  @Delete('templates/:id')
  async deleteTemplate(
    @Request() req,
    @Param('id') id: string,
  ) {
    return this.rfxTemplatesService.deleteTemplate(id, req.user.companyId);
  }

  @Post('templates/generate')
  async generateTemplate(
    @Request() req,
    @Body() body: {
      type: RFxType;
      procurementRequestId?: string;
      categoryId?: string;
      requirements?: string;
    },
  ) {
    return this.rfxTemplatesService.generateTemplate(
      req.user.companyId,
      req.user.id,
      body,
    );
  }

  // ==================== Document Endpoints ====================

  @Post('documents')
  @HttpCode(HttpStatus.CREATED)
  async createDocument(
    @Request() req,
    @Body() createDto: CreateRFxDocumentDto,
  ) {
    return this.rfxTemplatesService.createRFxDocument(
      req.user.companyId,
      req.user.id,
      createDto,
    );
  }

  @Get('documents')
  async findAllDocuments(
    @Request() req,
    @Query('type') type?: RFxType,
    @Query('status') status?: RFxStatus,
    @Query('search') search?: string,
  ) {
    return this.rfxTemplatesService.findAllRFxDocuments(req.user.companyId, {
      type,
      status,
      search,
    });
  }

  @Get('documents/:id')
  async findDocumentById(
    @Request() req,
    @Param('id') id: string,
  ) {
    return this.rfxTemplatesService.findRFxDocumentById(id, req.user.companyId);
  }

  @Post('documents/:id/publish')
  async publishDocument(
    @Request() req,
    @Param('id') id: string,
  ) {
    return this.rfxTemplatesService.publishRFxDocument(
      id,
      req.user.companyId,
      req.user.id,
    );
  }

  @Post('documents/:id/invite')
  async inviteSuppliers(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { supplierIds: string[] },
  ) {
    // Verify document belongs to company
    await this.rfxTemplatesService.findRFxDocumentById(id, req.user.companyId);
    
    return this.rfxTemplatesService.inviteSuppliersToRFx(
      id,
      body.supplierIds,
    );
  }

  // ==================== Analytics Endpoints ====================

  @Get('analytics/summary')
  async getAnalyticsSummary(@Request() req) {
    const companyId = req.user.companyId;
    
    // This would be implemented in the service
    // For now, returning a placeholder
    return {
      totalTemplates: 0,
      totalDocuments: 0,
      activeRFxs: 0,
      pendingBids: 0,
      averageResponseRate: 0,
      topSuppliers: [],
    };
  }
}