import { Module } from '@nestjs/common';
import { RFxDocumentsController } from './rfx-documents.controller';
import { RFxDocumentsService } from './rfx-documents.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RFxDocumentsController],
  providers: [RFxDocumentsService],
  exports: [RFxDocumentsService],
})
export class RFxDocumentsModule {}