import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RFxDocumentsService } from './rfx-documents.service';
import { CreateRFxDocumentDto } from './dto/create-rfx-document.dto';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt.guard';
import { RFxType, RFxStatus } from '@prisma/client';

interface AuthRequest {
  user: {
    userId: string;
    companyId: string;
  };
}

@Controller('rfx/documents')
@UseGuards(JwtAuthGuard)
export class RFxDocumentsController {
  constructor(private readonly rfxDocumentsService: RFxDocumentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createDocument(
    @Request() req: AuthRequest,
    @Body() createDto: CreateRFxDocumentDto,
  ) {
    return this.rfxDocumentsService.createRFxDocument(
      req.user.companyId,
      req.user.userId,
      createDto,
    );
  }

  @Get()
  async findAllDocuments(
    @Request() req: AuthRequest,
    @Query('type') type?: RFxType,
    @Query('status') status?: RFxStatus,
    @Query('search') search?: string,
  ) {
    return this.rfxDocumentsService.findAllRFxDocuments(req.user.companyId, {
      type,
      status,
      search,
    });
  }

  @Get(':id')
  async findDocumentById(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.rfxDocumentsService.findRFxDocumentById(id, req.user.companyId);
  }

  @Post(':id/publish')
  async publishDocument(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.rfxDocumentsService.publishRFxDocument(
      id,
      req.user.companyId,
      req.user.userId,
    );
  }

  @Post(':id/invite')
  async inviteSuppliers(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: { supplierIds: string[] },
  ) {
    await this.rfxDocumentsService.findRFxDocumentById(id, req.user.companyId);
    
    return this.rfxDocumentsService.inviteSuppliers(
      id,
      body.supplierIds,
    );
  }

  @Get('suppliers/by-category/:categoryId')
  async getSuppliersByCategory(
    @Request() req: AuthRequest,
    @Param('categoryId') categoryId: string,
  ) {
    return this.rfxDocumentsService.getSuppliersByCategory(
      req.user.companyId,
      categoryId,
    );
  }
}