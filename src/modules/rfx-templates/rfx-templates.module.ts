import { Module } from '@nestjs/common';
import { RFxTemplatesService } from './rfx-templates.service';
import { RFxTemplatesController } from './rfx-templates.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { RFxModule } from '../rfx/rfx.module';

@Module({
  imports: [RFxModule],
  controllers: [RFxTemplatesController],
  providers: [RFxTemplatesService, PrismaService],
  exports: [RFxTemplatesService],
})
export class RFxTemplatesModule {}