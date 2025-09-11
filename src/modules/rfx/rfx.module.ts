import { Module } from '@nestjs/common';
import { RFxAIService } from './services/rfx-ai.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [RFxAIService],
  exports: [RFxAIService],
})
export class RFxModule {}