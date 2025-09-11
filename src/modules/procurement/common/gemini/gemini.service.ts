import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerativeModel,
  Tool,
  FunctionDeclarationSchema,
} from '@google/generative-ai';
import { Env } from '../../../../config/environment';
import { ChatbotResponse } from '../../dto/chatbot.dto';
/* Not used */
export interface GenerateResponseParams {
  systemPrompt: string;
  history: { role: 'user' | 'model'; parts: { text: string }[] }[];
  message: string;
  tools?: Tool[];
  webSearch?: boolean;
}

// Define a custom type for the Google Search tool
export type GoogleSearchTool = Tool | { googleSearch: Record<string, never> };

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: GenerativeModel;

  constructor(private readonly configService: ConfigService<Env, true>) {
    const apiKey = this.configService.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in the environment.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Initialize the specified Gemini 2.5 Pro model directly.
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-pro', // Using the latest powerful model as requested.
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

  /**
   * Generates a structured JSON response from the Gemini model.
   * This service is now generic and accepts prompts and tools dynamically.
   * @param params - The parameters for the generation request.
   * @returns A structured ChatbotResponse object.
   */
  private async retry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 2000,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0 && error.message.includes('503')) {
        this.logger.warn(
          `Gemini API returned 503. Retrying in ${delay / 1000}s... (${
            retries - 1
          } retries left)`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.retry(fn, retries - 1, delay);
      }
      throw error;
    }
  }

  async generateResponse(
    params: GenerateResponseParams,
  ): Promise<ChatbotResponse> {
    const { systemPrompt, history, message, tools, webSearch } = params;

    let modelInstance = this.model;
    const chatTools: GoogleSearchTool[] = tools ? [...tools] : [];

    if (webSearch) {
      chatTools.push({ googleSearch: {} });
    }

    const generationConfig: any = {
      temperature: 0.3,
    };

    // Conditionally set responseMimeType only when no tools are used.
    if (chatTools.length === 0) {
      generationConfig.responseMimeType = 'application/json';
    }

    const chat = modelInstance.startChat({
      history,
      tools: chatTools.length > 0 ? (chatTools as any[]) : undefined,
      generationConfig,
    });

    const fullPrompt = `${systemPrompt}\n\nUser Message: "${message}"`;

    try {
      const result = await this.retry(() => chat.sendMessage(fullPrompt));
      let responseText = result.response.text();
      this.logger.debug(`Raw response from Gemini: ${responseText}`);

      // Attempt to extract JSON from markdown code blocks
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        responseText = jsonMatch[1];
        this.logger.debug(`Extracted JSON from markdown: ${responseText}`);
      }

      const responseObject = JSON.parse(responseText);

      if (!responseObject.MODE) {
        this.logger.error(
          `Invalid JSON response from Gemini: MODE is missing. Response: ${JSON.stringify(
            responseObject,
          )}`,
        );
        throw new Error('Invalid JSON response from Gemini: MODE is missing.');
      }

      this.logger.log(`Successfully generated response.`);
      return responseObject as ChatbotResponse;
    } catch (error) {
      this.logger.error(
        `Error generating response: ${error.message}`,
        error.stack,
      );
      this.logger.error(`Full prompt sent to Gemini: ${fullPrompt}`);
      throw new Error('Failed to get a valid response from the AI model.');
    }
  }
}
