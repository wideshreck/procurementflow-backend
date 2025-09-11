import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RFxTemplatesService } from './rfx-templates.service';
import { RFxTemplatesController } from './rfx-templates.controller';
import { PrismaService } from '../../../prisma/prisma.service';
import { RFxAIModule } from '../ai/rfx-ai.module';

@Module({
  imports: [ConfigModule, RFxAIModule],
  controllers: [RFxTemplatesController],
  providers: [
    RFxTemplatesService,
    PrismaService,
  ],
  exports: [RFxTemplatesService],
})
export class RFxTemplatesModule {}