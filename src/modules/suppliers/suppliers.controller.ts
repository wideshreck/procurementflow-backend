import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@Controller('suppliers')
@UseGuards(JwtAuthGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  create(@Body() createSupplierDto: Prisma.SupplierUncheckedCreateInput, @Request() req: any) {
    return this.suppliersService.create(createSupplierDto, req.user.id);
  }

  @Get()
  findAll(@Request() req: any) {
    const { search, status, supplierType, category, page = 1, limit = 10, sortBy = 'companyName', sortOrder = 'asc' } = req.query;
    
    return this.suppliersService.findAll({
      search,
      status,
      supplierType,
      category,
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder,
      companyId: req.user.companyId
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne({ id });
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSupplierDto: Prisma.SupplierUpdateInput,
    @Request() req: any
  ) {
    return this.suppliersService.update({
      where: { id },
      data: updateSupplierDto,
      userId: req.user.id // Pass the current user's ID from request
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.suppliersService.remove({ id });
  }

  @Post('bulk-delete')
  bulkDelete(@Body() body: { ids: string[] }, @Request() req: any) {
    return this.suppliersService.bulkDelete(body.ids, req.user.companyId);
  }

  @Get('export')
  export(@Request() req: any) {
    const { search, status, supplierType, category } = req.query;
    
    return this.suppliersService.export({
      search,
      status,
      supplierType,
      category,
      companyId: req.user.companyId
    });
  }
}
