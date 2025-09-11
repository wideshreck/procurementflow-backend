import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RFxTemplatesModule } from './templates/rfx-templates.module';
import { RFxDocumentsModule } from './documents/rfx-documents.module';
import { RFxAIModule } from './ai/rfx-ai.module';

@Module({
  imports: [ConfigModule, RFxTemplatesModule, RFxDocumentsModule, RFxAIModule],
  exports: [RFxTemplatesModule, RFxDocumentsModule, RFxAIModule],
})
export class RFxModule {}