import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FastifyFileInterceptor } from '../../common/interceptors/fastify-file-interceptor';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ContractsService } from './contracts.service';
import { CreateContractInput } from './dto/create-contract.input';
import { UpdateContractInput } from './dto/update-contract.input';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @UseInterceptors(FastifyFileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/contracts',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
  }))
  create(@Body() createContractInput: CreateContractInput, @UploadedFile() file: Express.Multer.File) {
    return this.contractsService.create({
      ...createContractInput,
      filePath: file.path,
    });
  }

  @Get()
  findAll(@Query('supplierId') supplierId: string) {
    return this.contractsService.findAll(supplierId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contractsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateContractInput: UpdateContractInput) {
    return this.contractsService.update(id, updateContractInput);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contractsService.remove(id);
  }
}
