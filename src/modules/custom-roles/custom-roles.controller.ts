import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CustomRolesService } from './custom-roles.service';
import { CreateCustomRoleDto } from './dto/create-custom-role.dto';
import { UpdateCustomRoleDto } from './dto/update-custom-role.dto';

@Controller('custom-roles')
export class CustomRolesController {
  constructor(private readonly customRolesService: CustomRolesService) {}

  @Post()
  create(@Body() createCustomRoleDto: CreateCustomRoleDto) {
    return this.customRolesService.create(createCustomRoleDto);
  }

  @Get()
  findAll(@Query('companyId') companyId: string) {
    return this.customRolesService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customRolesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCustomRoleDto: UpdateCustomRoleDto) {
    return this.customRolesService.update(id, updateCustomRoleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customRolesService.remove(id);
  }
}
