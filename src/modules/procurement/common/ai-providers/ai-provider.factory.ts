import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProvider, AIProviderType } from './interfaces/ai-provider.interface';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { Env } from '../../../../config/environment';

@Injectable()
export class AIProviderFactory {
  private providers: Map<AIProviderType, AIProvider> = new Map();
  private defaultProvider: AIProviderType;

  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly openAIProvider: OpenAIProvider,
    private readonly geminiProvider: GeminiProvider,
  ) {
    this.providers.set(AIProviderType.OPENAI, openAIProvider);
    this.providers.set(AIProviderType.GEMINI, geminiProvider);
    
    this.defaultProvider = this.configService.get('AI_PROVIDER') as AIProviderType || AIProviderType.OPENAI;
  }

  getProvider(type?: AIProviderType): AIProvider {
    const providerType = type || this.defaultProvider;
    const provider = this.providers.get(providerType);
    
    if (!provider) {
      throw new Error(`AI Provider ${providerType} not found`);
    }
    
    if (!provider.isAvailable()) {
      throw new Error(`AI Provider ${providerType} is not available. Please check configuration.`);
    }
    
    return provider;
  }

  getAvailableProviders(): AIProviderType[] {
    const available: AIProviderType[] = [];
    for (const [type, provider] of this.providers) {
      if (provider.isAvailable()) {
        available.push(type);
      }
    }
    return available;
  }
}