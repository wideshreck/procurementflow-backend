import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RFxAIService, AIFieldSuggestion, AIContentGeneration } from '../rfx/services/rfx-ai.service';

class GenerateContentDto {
  fieldLabel: string;
  fieldDescription?: string;
  rfxType: 'RFQ' | 'RFP' | 'RFI';
  category: string;
  companyContext?: string;
}

class SuggestFieldsDto {
  sectionTitle: string;
  existingFields: string[];
  rfxType: 'RFQ' | 'RFP' | 'RFI';
  category: string;
  industry?: string;
}

class ImproveContentDto {
  currentContent: string;
  fieldLabel: string;
  rfxType: 'RFQ' | 'RFP' | 'RFI';
  improvements?: string[];
}

class GenerateTemplateDto {
  rfxType: 'RFQ' | 'RFP' | 'RFI';
  category: string;
  description: string;
  specificRequirements?: string[];
}

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AIController {
  constructor(private readonly aiService: RFxAIService) {}

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
    return this.aiService.generateFieldContent(
      dto.fieldLabel,
      dto.fieldDescription || '',
      {
        rfxType: dto.rfxType,
        category: dto.category,
        companyContext: dto.companyContext,
      },
    );
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
    return this.aiService.suggestFields(
      dto.sectionTitle,
      dto.existingFields,
      {
        rfxType: dto.rfxType,
        category: dto.category,
        industry: dto.industry,
      },
    );
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
    return this.aiService.improveContent(
      dto.currentContent,
      dto.fieldLabel,
      {
        rfxType: dto.rfxType,
        improvements: dto.improvements,
      },
    );
  }

  @Post('generate-template')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate complete RFX template with AI' })
  @ApiResponse({
    status: 200,
    description: 'Template generated successfully',
  })
  async generateTemplate(@Body() dto: GenerateTemplateDto): Promise<any> {
    return this.aiService.generateTemplate({
      rfxType: dto.rfxType,
      category: dto.category,
      description: dto.description,
      specificRequirements: dto.specificRequirements,
    });
  }
}