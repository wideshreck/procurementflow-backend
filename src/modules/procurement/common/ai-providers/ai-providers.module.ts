import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIService } from './ai.service';
import { AIProviderFactory } from './ai-provider.factory';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    AIService,
    AIProviderFactory,
    OpenAIProvider,
    GeminiProvider,
  ],
  exports: [AIService],
})
export class AIProvidersModule {}