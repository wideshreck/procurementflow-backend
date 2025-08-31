import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { EmailsService } from './emails.service';
import { CreateEmailInput } from './dto/create-email.input';
import { UpdateEmailInput } from './dto/update-email.input';

@Controller('emails')
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  @Post()
  create(@Body() createEmailInput: CreateEmailInput) {
    return this.emailsService.create(createEmailInput);
  }

  @Get()
  findAll(@Query('supplierId') supplierId: string) {
    return this.emailsService.findAll(supplierId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.emailsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEmailInput: UpdateEmailInput) {
    return this.emailsService.update(id, updateEmailInput);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.emailsService.remove(id);
  }
}
