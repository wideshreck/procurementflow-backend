import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources';
import { AIProvider, AIProviderParams } from '../interfaces/ai-provider.interface';
import { ChatbotResponse } from '../../../dto/chatbot.dto';
import { Env } from '../../../../../config/environment';

@Injectable()
export class OpenAIProvider implements AIProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly openai: OpenAI;
  private readonly defaultModel: string;
  private readonly searchModel: string;

  constructor(private readonly configService: ConfigService<Env, true>) {
    const apiKey = this.configService.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured in the environment.');
    }

    this.openai = new OpenAI({
      apiKey,
    });

    this.defaultModel = this.configService.get('OPENAI_MODEL') || 'gpt-4o';
    this.searchModel = this.configService.get('OPENAI_SEARCH_MODEL') || 'gpt-4o-search-preview';
  }

  async generateResponse(params: AIProviderParams): Promise<ChatbotResponse> {
    const { systemPrompt, history, message, tools, webSearch } = params;

    this.logger.debug(`OpenAI generateResponse called with webSearch: ${webSearch}, type: ${typeof webSearch}`);
    
    try {
      const messages: ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `${systemPrompt}

CRITICAL SAFETY RULES:
1. You MUST stay strictly focused on procurement and purchasing tasks only
2. Reject any non-procurement related questions politely
3. Always maintain professional tone and language
4. Never provide information outside procurement context
5. Focus exclusively on helping with the current procurement request
6. Do not engage in general conversation or off-topic discussions
7. Always respond in the language used by the user (Turkish or English)`,
        },
        ...history.map((msg) => ({
          role: msg.role === 'assistant' ? 'assistant' as const : 'user' as const,
          content: msg.content,
        })),
        {
          role: 'user',
          content: message,
        },
      ];

      const model = webSearch ? this.searchModel : (params.model || this.defaultModel);
      this.logger.debug(`Selected model: ${model}, webSearch was: ${webSearch}`);
      
      // Base parameters that all models support
      const completionParams: OpenAI.Chat.ChatCompletionCreateParams = {
        model,
        messages,
        max_tokens: 4096,
      };

      // Add additional parameters only for non-search models
      // gpt-4o-search-preview doesn't support temperature, top_p, frequency_penalty, presence_penalty, response_format
      if (!webSearch) {
        Object.assign(completionParams, {
          temperature: 0.3,
          response_format: tools?.length ? undefined : { type: 'json_object' }
        });
      }

      if (tools && tools.length > 0) {
        completionParams.tools = this.convertToOpenAITools(tools);
        completionParams.tool_choice = 'auto';
      }

      const response = await this.retry(() => 
        this.openai.chat.completions.create(completionParams)
      );

      const responseContent = response.choices[0]?.message?.content;
      
      if (!responseContent) {
        throw new Error('Empty response from OpenAI');
      }

      this.logger.debug(`Raw response from OpenAI: ${responseContent}`);

      let responseObject: ChatbotResponse;
      
      try {
        const jsonMatch = responseContent.match(/```json\n([\s\S]*?)\n```/);
        const jsonContent = jsonMatch ? jsonMatch[1] : responseContent;
        responseObject = JSON.parse(jsonContent);
      } catch (parseError) {
        this.logger.error('Failed to parse OpenAI response as JSON', parseError);
        throw new Error('Invalid JSON response from OpenAI');
      }

      if (!responseObject.MODE) {
        this.logger.error(`Invalid response from OpenAI: MODE is missing. Response: ${JSON.stringify(responseObject)}`);
        throw new Error('Invalid response from OpenAI: MODE is missing.');
      }

      this.logger.log('Successfully generated response from OpenAI');
      return responseObject;
    } catch (error) {
      this.logger.error(`Error generating response from OpenAI: ${error.message}`, error.stack);
      throw new Error(`Failed to get a valid response from OpenAI: ${error.message}`);
    }
  }

  private convertToOpenAITools(tools: any[]): ChatCompletionTool[] {
    return tools.map(tool => {
      if (tool.functionDeclarations) {
        return {
          type: 'function',
          function: {
            name: tool.functionDeclarations[0].name,
            description: tool.functionDeclarations[0].description,
            parameters: tool.functionDeclarations[0].parameters as any,
          },
        };
      }
      return tool;
    });
  }

  private async retry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 2000,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0 && (error.status === 503 || error.status === 429)) {
        this.logger.warn(
          `OpenAI API returned ${error.status}. Retrying in ${delay / 1000}s... (${retries - 1} retries left)`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.retry(fn, retries - 1, delay * 1.5);
      }
      throw error;
    }
  }

  isAvailable(): boolean {
    const currentProvider = this.configService.get('AI_PROVIDER');
    const hasApiKey = !!this.configService.get('OPENAI_API_KEY');
    return currentProvider === 'openai' && hasApiKey;
  }

  getName(): string {
    return 'OpenAI';
  }
}