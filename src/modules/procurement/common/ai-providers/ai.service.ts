import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProviderFactory } from './ai-provider.factory';
import { AIProviderParams, AIProviderType } from './interfaces/ai-provider.interface';
import { ChatbotResponse } from '../../dto/chatbot.dto';
import { Env } from '../../../../config/environment';

export interface GenerateResponseParams {
  systemPrompt: string;
  history: { role: 'user' | 'model'; parts: { text: string }[] }[];
  message: string;
  tools?: any[];
  webSearch?: boolean;
  providerType?: AIProviderType;
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly providerFactory: AIProviderFactory,
  ) {}

  async generateResponse(params: GenerateResponseParams): Promise<ChatbotResponse> {
    const { systemPrompt, history, message, tools, webSearch, providerType } = params;

    const convertedHistory = history.map(item => ({
      role: item.role === 'model' ? 'assistant' as const : 'user' as const,
      content: item.parts.map(part => part.text).join(' '),
    }));

    const aiProviderParams: AIProviderParams = {
      systemPrompt,
      history: convertedHistory,
      message,
      tools,
      webSearch,
    };

    try {
      const provider = this.providerFactory.getProvider(providerType);
      this.logger.log(`Using AI Provider: ${provider.getName()}`);
      
      return await provider.generateResponse(aiProviderParams);
    } catch (error) {
      this.logger.error(`AI Service error: ${error.message}`, error.stack);
      
      if (providerType) {
        throw error;
      }
      
      const availableProviders = this.providerFactory.getAvailableProviders();
      for (const fallbackType of availableProviders) {
        if (fallbackType !== providerType) {
          try {
            this.logger.warn(`Falling back to ${fallbackType} provider`);
            const fallbackProvider = this.providerFactory.getProvider(fallbackType);
            return await fallbackProvider.generateResponse(aiProviderParams);
          } catch (fallbackError) {
            this.logger.error(`Fallback provider ${fallbackType} also failed: ${fallbackError.message}`);
          }
        }
      }
      
      throw new Error('All AI providers failed to generate response');
    }
  }
}