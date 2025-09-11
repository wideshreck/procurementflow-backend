import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIController } from './ai.controller';
import { RFxAIService } from './rfx-ai.service';
import { AIProviderFactory } from './providers/ai-provider.factory';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';

@Module({
  imports: [ConfigModule],
  controllers: [AIController],
  providers: [
    AIProviderFactory,
    OpenAIProvider,
    GeminiProvider,
    RFxAIService,
  ],
  exports: [RFxAIService, AIProviderFactory],
})
export class RFxAIModule {}