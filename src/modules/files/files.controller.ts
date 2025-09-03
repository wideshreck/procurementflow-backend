import {
  Controller,
  Post,
  Get,
  Param,
  Delete,
  Req,
  UseGuards,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { join } from 'path';

@ApiTags('files')
@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadFile(@Req() request: FastifyRequest) {
    const data = await request.file();

    if (!data) {
      throw new BadRequestException('No file uploaded');
    }

    const buffer = await data.toBuffer();
    const file = {
      originalname: data.filename,
      mimetype: data.mimetype,
      buffer: buffer,
      size: buffer.length,
    };
    return this.filesService.uploadFile(file as Express.Multer.File);
  }

  @Get(':fileName')
  async serveFile(@Param('fileName') fileName: string, @Res() reply: FastifyReply) {
    const filePath = join(process.cwd(), 'uploads', fileName);
    return reply.sendFile(fileName, filePath);
  }

  @Delete(':fileName')
  async deleteFile(@Param('fileName') fileName: string) {
    return this.filesService.deleteFile(fileName);
  }
}
