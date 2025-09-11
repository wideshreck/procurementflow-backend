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
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt.guard';
import { RFxType } from '@prisma/client';

interface AuthRequest {
  user: {
    userId: string;
    companyId: string;
  };
}

@Controller('rfx/templates')
@UseGuards(JwtAuthGuard)
export class RFxTemplatesController {
  constructor(private readonly rfxTemplatesService: RFxTemplatesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(
    @Request() req: AuthRequest,
    @Body() createDto: CreateRFxTemplateDto,
  ) {
    return this.rfxTemplatesService.createTemplate(
      req.user.companyId,
      req.user.userId,
      createDto,
    );
  }

  @Get()
  async findAllTemplates(
    @Request() req: AuthRequest,
    @Query('type') type?: RFxType,
    @Query('search') search?: string,
  ) {
    return this.rfxTemplatesService.findAllTemplates(req.user.companyId, {
      type,
      search,
    });
  }

  @Get(':id')
  async findTemplateById(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.rfxTemplatesService.findTemplateById(id, req.user.companyId);
  }

  @Patch(':id')
  async updateTemplate(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() updateDto: UpdateRFxTemplateDto,
  ) {
    return this.rfxTemplatesService.updateTemplate(
      id,
      req.user.companyId,
      req.user.userId,
      updateDto,
    );
  }

  @Delete(':id')
  async deleteTemplate(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.rfxTemplatesService.deleteTemplate(id, req.user.companyId);
  }

  @Post('generate')
  async generateTemplate(
    @Request() req: AuthRequest,
    @Body() body: {
      type: RFxType;
      procurementRequestId?: string;
      categoryId?: string;
      requirements?: string;
    },
  ) {
    return this.rfxTemplatesService.generateTemplateWithAI(
      req.user.companyId,
      req.user.userId,
      body,
    );
  }
}