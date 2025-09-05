import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerativeModel,
} from '@google/generative-ai';
import { AIProvider, AIProviderParams } from '../interfaces/ai-provider.interface';
import { ChatbotResponse } from '../../../dto/chatbot.dto';
import { Env } from '../../../../../config/environment';

@Injectable()
export class GeminiProvider implements AIProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: GenerativeModel;
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService<Env, true>) {
    const apiKey = this.configService.get('GEMINI_API_KEY');
    // Gemini is enabled if it's selected as the AI provider and API key exists
    const currentProvider = this.configService.get('AI_PROVIDER');
    this.isEnabled = currentProvider === 'gemini' && !!apiKey;
    
    if (this.isEnabled) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-pro',  // Use stable model version
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
      });
    }
  }

  private isPriceEstimation = false;
  
  async generateResponse(params: AIProviderParams): Promise<ChatbotResponse> {
    if (!this.isEnabled) {
      throw new Error('Gemini provider is not enabled');
    }

    const { systemPrompt, history, message, tools, webSearch } = params;
    
    // Check if this is a price estimation request
    this.isPriceEstimation = systemPrompt.includes('pricing expert') || systemPrompt.includes('estimate');

    const chatTools: any[] = tools ? [...tools] : [];
    if (webSearch) {
      chatTools.push({ googleSearch: {} });
    }

    const generationConfig: any = {
      temperature: 0.3,
    };

    if (chatTools.length === 0) {
      generationConfig.responseMimeType = 'application/json';
    }

    const geminiHistory = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: msg.content }],
    }));

    const chat = this.model.startChat({
      history: geminiHistory,
      tools: chatTools.length > 0 ? chatTools : undefined,
      generationConfig,
    });

    const fullPrompt = `${systemPrompt}\n\nUser Message: "${message}"`;

    try {
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gemini API request timeout after 30 seconds')), 30000)
      );
      
      const resultPromise = this.retry(() => chat.sendMessage(fullPrompt));
      const result = await Promise.race([resultPromise, timeoutPromise]) as any;
      
      let responseText = result.response.text();
      this.logger.debug(`Raw response from Gemini: ${responseText}`);

      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        responseText = jsonMatch[1];
        this.logger.debug(`Extracted JSON from markdown: ${responseText}`);
      }

      const responseObject = JSON.parse(responseText);

      // For price estimation, we don't need MODE field
      if (this.isPriceEstimation) {
        this.logger.log('Price estimation response from Gemini:', responseObject);
        return responseObject;
      }

      if (!responseObject.MODE) {
        this.logger.error(
          `Invalid JSON response from Gemini: MODE is missing. Response: ${JSON.stringify(responseObject)}`,
        );
        throw new Error('Invalid JSON response from Gemini: MODE is missing.');
      }

      this.logger.log('Successfully generated response from Gemini');
      return responseObject as ChatbotResponse;
    } catch (error) {
      this.logger.error(`Error generating response from Gemini: ${error.message}`, error.stack);
      throw new Error('Failed to get a valid response from Gemini');
    }
  }

  private async retry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 2000,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      // Retry on network errors or 503 errors
      const shouldRetry = retries > 0 && (
        error.message.includes('503') ||
        error.message.includes('fetch failed') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ENOTFOUND')
      );
      
      if (shouldRetry) {
        this.logger.warn(
          `Gemini API error: ${error.message}. Retrying in ${delay / 1000}s... (${retries - 1} retries left)`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.retry(fn, retries - 1, delay * 1.5); // Exponential backoff
      }
      throw error;
    }
  }

  isAvailable(): boolean {
    return this.isEnabled;
  }

  getName(): string {
    return 'Gemini';
  }
}