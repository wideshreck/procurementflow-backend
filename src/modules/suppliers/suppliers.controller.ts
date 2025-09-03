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
  findAll() {
    return this.suppliersService.findAll({});
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
}
