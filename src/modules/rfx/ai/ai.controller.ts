import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpStatus,
  HttpCode,
  Get,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt.guard';
import { RFxAIService, AIFieldSuggestion, AIContentGeneration } from './rfx-ai.service';
import {
  GenerateContentDto,
  SuggestFieldsDto,
  ImproveContentDto,
  GenerateTemplateDto,
} from './dto/ai-request.dto';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rfx/ai')
export class AIController {
  private readonly logger = new Logger(AIController.name);

  constructor(private readonly aiService: RFxAIService) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check AI service health and availability' })
  @ApiResponse({
    status: 200,
    description: 'AI service status',
  })
  async checkHealth(): Promise<{ available: boolean; provider: string }> {
    const available = await this.aiService.checkAvailability();
    const provider = this.aiService.getCurrentProviderName();
    
    return {
      available,
      provider,
    };
  }

  @Post('generate-content')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate AI content for RFX field' })
  @ApiResponse({
    status: 200,
    description: 'Content generated successfully',
  })
  async generateContent(
    @Body() dto: GenerateContentDto,
  ): Promise<AIContentGeneration> {
    try {
      return await this.aiService.generateFieldContent(
        dto.fieldLabel,
        dto.fieldDescription || '',
        {
          rfxType: dto.rfxType,
          category: dto.category,
          companyContext: dto.companyContext,
        },
      );
    } catch (error) {
      this.logger.error('Failed to generate content:', error);
      // Return fallback content instead of throwing error
      return {
        content: `[${dto.fieldLabel} için içerik giriniz]`,
        confidence: 0,
        suggestions: ['AI servisi geçici olarak kullanılamıyor. Manuel içerik giriniz.'],
      };
    }
  }

  @Post('suggest-fields')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suggest additional fields for RFX section' })
  @ApiResponse({
    status: 200,
    description: 'Field suggestions generated successfully',
  })
  async suggestFields(
    @Body() dto: SuggestFieldsDto,
  ): Promise<AIFieldSuggestion[]> {
    try {
      return await this.aiService.suggestFields(
        dto.sectionTitle,
        dto.existingFields,
        {
          rfxType: dto.rfxType,
          category: dto.category,
          industry: dto.industry,
        },
      );
    } catch (error) {
      this.logger.error('Failed to suggest fields:', error);
      // Return default suggestions instead of throwing error
      return [
        {
          label: 'Ek Gereksinimler',
          description: 'Bu bölüm için özel gereksinimler',
          isRequired: false,
          reasoning: 'AI servisi geçici olarak kullanılamıyor',
        },
      ];
    }
  }

  @Post('improve-content')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Improve existing RFX content' })
  @ApiResponse({
    status: 200,
    description: 'Content improved successfully',
  })
  async improveContent(
    @Body() dto: ImproveContentDto,
  ): Promise<AIContentGeneration> {
    try {
      return await this.aiService.improveContent(
        dto.currentContent,
        dto.fieldLabel,
        {
          rfxType: dto.rfxType,
          improvements: dto.improvements,
        },
      );
    } catch (error) {
      this.logger.error('Failed to improve content:', error);
      // Return original content instead of throwing error
      return {
        content: dto.currentContent,
        confidence: 0,
        suggestions: ['İçerik iyileştirme servisi geçici olarak kullanılamıyor'],
      };
    }
  }

  @Post('generate-template')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate complete RFX template with AI' })
  @ApiResponse({
    status: 200,
    description: 'Template generated successfully',
  })
  async generateTemplate(@Body() dto: GenerateTemplateDto): Promise<any> {
    try {
      return await this.aiService.generateTemplate({
        rfxType: dto.rfxType,
        category: dto.category,
        description: dto.description,
        specificRequirements: dto.specificRequirements,
      });
    } catch (error) {
      this.logger.error('Failed to generate template:', error);
      // Return basic template instead of throwing error
      return {
        name: `Varsayılan ${dto.rfxType} Şablonu`,
        description: `${dto.rfxType} için varsayılan şablon - ${dto.category}`,
        sections: [
          {
            title: 'Temel Bilgiler',
            fields: [
              { label: 'Doküman Başlığı', isRequired: true },
              { label: 'Proje Tanımı', isRequired: true },
              { label: 'Kategori', isRequired: true },
            ],
          },
        ],
      };
    }
  }
}