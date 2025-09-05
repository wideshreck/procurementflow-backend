# 🤖 AI Provider Migration Documentation

## 📋 Executive Summary

Successfully migrated the ProcurementFlow backend from Google Gemini to OpenAI GPT-4o with a modular, provider-agnostic architecture that allows seamless switching between AI providers.

## 🎯 Migration Objectives

1. **Primary Goal:** Replace Gemini with OpenAI GPT-4o as the default AI provider
2. **Secondary Goal:** Create a modular system for easy AI provider switching
3. **Future-Proofing:** Enable A/B testing and multi-provider strategies

## 🏗️ Architecture Overview

### Directory Structure
```
src/modules/procurement/common/ai-providers/
├── interfaces/
│   └── ai-provider.interface.ts    # Provider contract definition
├── providers/
│   ├── openai.provider.ts         # OpenAI GPT-4o implementation
│   └── gemini.provider.ts         # Google Gemini implementation (disabled)
├── ai-provider.factory.ts         # Provider selection logic
├── ai.service.ts                  # Unified AI service interface
└── ai-providers.module.ts         # NestJS module configuration
```

### Core Components

#### 1. AIProvider Interface
```typescript
interface AIProvider {
  generateResponse(params: AIProviderParams): Promise<ChatbotResponse>
  isAvailable(): boolean
  getName(): string
}
```

#### 2. Provider Factory Pattern
- Dynamically selects AI provider based on configuration
- Supports fallback mechanisms
- Enables runtime provider switching

#### 3. Unified AI Service
- Single entry point for all AI operations
- Abstracts provider-specific implementations
- Maintains consistent API across the application

## 🔧 Configuration

### Environment Variables

```bash
# AI Provider Selection
AI_PROVIDER=openai              # Options: openai, gemini

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-...      # Your OpenAI API key
OPENAI_MODEL=gpt-4o             # Model for general operations
OPENAI_SEARCH_MODEL=gpt-4o      # Model for web search (Phase 2-3)

# Gemini Configuration (Optional)
GEMINI_ENABLED=false            # Set to true to enable Gemini
GEMINI_API_KEY=AIza...          # Your Gemini API key
```

## 🚀 Implementation Details

### Phase Services Migration

All procurement phases (1-4) have been updated:

| Phase | Service | AI Usage | Web Search |
|-------|---------|----------|------------|
| Phase 1 | `phase1.service.ts` | Basic prompting | ❌ |
| Phase 2 | `phase2.service.ts` | Product research | ✅ |
| Phase 3 | `phase3.service.ts` | Technical specs | ✅ |
| Phase 4 | `phase4.service.ts` | Delivery details | ❌ |

### Key Features

1. **Provider Agnostic:** Services use `AIService` instead of provider-specific implementations
2. **Retry Mechanism:** Automatic retry with exponential backoff for 429/503 errors
3. **Error Handling:** Graceful degradation with fallback providers
4. **Response Formatting:** Consistent JSON response structure across providers

## 📊 Comparison Matrix

| Feature | OpenAI (GPT-4o) | Gemini 2.5 Pro |
|---------|-----------------|----------------|
| Response Quality | Excellent | Very Good |
| Speed | Fast | Fast |
| Web Search | Native support | Google Search API |
| Cost | $0.01/1K tokens | $0.00125/1K tokens |
| Rate Limits | 10,000 RPM | 360 RPM |
| Context Window | 128K tokens | 2M tokens |

## 🔄 Migration Steps Performed

1. **Package Installation**
   ```bash
   npm install openai
   ```

2. **Interface Creation**
   - Defined `AIProvider` interface
   - Created `AIProviderParams` type
   - Established `ChatbotResponse` contract

3. **Provider Implementation**
   - Implemented `OpenAIProvider` with GPT-4o
   - Adapted `GeminiProvider` to new interface
   - Added proper error handling and retry logic

4. **Factory Pattern Setup**
   - Created `AIProviderFactory` for dynamic selection
   - Implemented provider availability checks
   - Added fallback mechanism

5. **Service Updates**
   - Replaced `GeminiService` with `AIService` in all phases
   - Updated `ProcurementModule` imports
   - Modified `ProcurementService` for consistency

6. **Configuration Updates**
   - Added new environment variables
   - Updated `environment.ts` schema
   - Set OpenAI as default provider

## 🧪 Testing

### Quick Test Commands

```bash
# Test Phase 1 (Information Collection)
curl -X POST http://localhost:3000/api/procurement/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message": "Laptop satın almak istiyorum"}'

# Test Phase 2 (Product Research with Web Search)
curl -X POST http://localhost:3000/api/procurement/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message": "MacBook Pro M3 fiyatları"}'
```

### Provider Switching

To switch between providers:

1. **OpenAI to Gemini:**
   ```bash
   AI_PROVIDER=gemini
   GEMINI_ENABLED=true
   ```

2. **Gemini to OpenAI:**
   ```bash
   AI_PROVIDER=openai
   GEMINI_ENABLED=false
   ```

3. Restart the application

## 🎯 Benefits Achieved

1. **Vendor Independence:** No lock-in to specific AI provider
2. **Cost Optimization:** Can switch based on pricing changes
3. **Performance Tuning:** Different models for different phases
4. **Reliability:** Automatic fallback on provider failures
5. **Scalability:** Easy to add new AI providers

## 🔮 Future Enhancements

### Short Term
- [ ] Implement Claude AI provider
- [ ] Add provider-specific prompt optimization
- [ ] Create provider performance metrics dashboard
- [ ] Implement cost tracking per provider

### Long Term
- [ ] Multi-provider strategies (different AI for different tasks)
- [ ] Fine-tuned model support
- [ ] Local LLM integration (Llama, Mistral)
- [ ] Provider load balancing
- [ ] A/B testing framework

## 📝 Adding New AI Providers

To add a new AI provider (e.g., Claude):

1. **Create Provider Class**
   ```typescript
   // providers/claude.provider.ts
   export class ClaudeProvider implements AIProvider {
     async generateResponse(params): Promise<ChatbotResponse> {
       // Implementation
     }
     isAvailable(): boolean { return true }
     getName(): string { return 'Claude' }
   }
   ```

2. **Register in Factory**
   ```typescript
   // ai-provider.factory.ts
   this.providers.set(AIProviderType.CLAUDE, claudeProvider)
   ```

3. **Update Configuration**
   ```typescript
   // environment.ts
   AI_PROVIDER: z.enum(['openai', 'gemini', 'claude'])
   ```

4. **Add Environment Variables**
   ```bash
   AI_PROVIDER=claude
   CLAUDE_API_KEY=your_key
   ```

## 🐛 Troubleshooting

### Common Issues

1. **"AI Provider not found" Error**
   - Check `AI_PROVIDER` value in `.env`
   - Ensure provider is registered in factory

2. **"API Key not configured" Error**
   - Verify `OPENAI_API_KEY` is set
   - Check key validity

3. **Rate Limit Errors**
   - Retry mechanism handles automatically
   - Consider upgrading API tier if persistent

4. **Response Format Issues**
   - Ensure prompt includes JSON format instructions
   - Check provider-specific response parsing

## 📚 Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Google Gemini API](https://ai.google.dev/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [Factory Pattern Guide](https://refactoring.guru/design-patterns/factory-method)

## 👥 Contact

For questions or issues related to this migration:
- Create an issue in the repository
- Contact the development team

---

**Last Updated:** December 5, 2024  
**Version:** 1.0.0  
**Status:** ✅ Production Ready