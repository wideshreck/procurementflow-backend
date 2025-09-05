import { ChatbotResponse } from '../../../dto/chatbot.dto';

export interface AIProviderParams {
  systemPrompt: string;
  history: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  message: string;
  tools?: any[];
  webSearch?: boolean;
  model?: string;
}

export interface AIProvider {
  generateResponse(params: AIProviderParams): Promise<ChatbotResponse>;
  isAvailable(): boolean;
  getName(): string;
}

export enum AIProviderType {
  OPENAI = 'openai',
  GEMINI = 'gemini'
}

export interface AIProviderConfig {
  provider: AIProviderType;
  apiKey: string;
  model?: string;
  searchModel?: string;
}