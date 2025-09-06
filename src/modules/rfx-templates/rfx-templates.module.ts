import { Module } from '@nestjs/common';
import { RFxTemplatesService } from './rfx-templates.service';
import { RFxTemplatesController } from './rfx-templates.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [AIModule],
  controllers: [RFxTemplatesController],
  providers: [RFxTemplatesService, PrismaService],
  exports: [RFxTemplatesService],
})
export class RFxTemplatesModule {}