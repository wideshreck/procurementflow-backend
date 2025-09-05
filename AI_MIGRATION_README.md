# AI Provider Migration & System Improvements

## Overview
This document details the complete migration from Google Gemini to OpenAI GPT-4o for the procurement module, along with the implementation of a modular, provider-agnostic AI architecture.

## Key Achievements
- ✅ Created modular AI provider architecture with factory pattern
- ✅ Migrated from Gemini to OpenAI GPT-4o
- ✅ Added purchase frequency field to Phase 1
- ✅ Fixed authentication errors in chat endpoint
- ✅ Ensured manual procurement form compatibility with Phase 4
- ✅ Implemented retry mechanisms for API resilience
- ✅ Successfully tested complete procurement flow (Phase 1-4)

## Architecture Overview

### AI Provider System
```
┌─────────────────────────────────────────────────┐
│                  AIService                       │
│         (Unified AI Operations Service)          │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│            AIProviderFactory                     │
│      (Dynamic Provider Selection)                │
└─────────────────┬───────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌──────────────┐    ┌──────────────┐
│ OpenAIProvider│    │GeminiProvider│
│   (Active)    │    │  (Disabled)  │
└──────────────┘    └──────────────┘
```

## Modified Files & Descriptions

### 1. AI Provider Infrastructure (New Files)

#### `src/modules/procurement/common/ai-providers/interfaces/ai-provider.interface.ts`
- **Purpose**: Defines the contract for all AI providers
- **Key Features**:
  - AIProvider interface with generateResponse, isAvailable, getName methods
  - AIProviderParams type for standardized input
  - AIProviderType enum for provider identification
  - Supports both chat and search modes

#### `src/modules/procurement/common/ai-providers/providers/openai.provider.ts`
- **Purpose**: OpenAI GPT-4o implementation
- **Key Features**:
  - Uses GPT-4o model (configurable via env)
  - Retry mechanism with exponential backoff for 503/429 errors
  - JSON response formatting
  - Proper error handling and logging
  - System and user message support

#### `src/modules/procurement/common/ai-providers/providers/gemini.provider.ts`
- **Purpose**: Google Gemini provider (kept for future use)
- **Key Features**:
  - Uses gemini-2.5-pro model
  - Disabled via GEMINI_ENABLED=false flag
  - Maintains compatibility with interface
  - Can be re-enabled easily

#### `src/modules/procurement/common/ai-providers/ai-provider.factory.ts`
- **Purpose**: Factory pattern for provider selection
- **Key Features**:
  - Dynamic provider instantiation
  - Fallback mechanism support
  - Configuration-based selection
  - Provider availability checking

#### `src/modules/procurement/common/ai-providers/ai.service.ts`
- **Purpose**: Unified service for all AI operations
- **Key Features**:
  - Abstracts provider complexity
  - Handles provider selection
  - Fallback to alternative providers
  - Consistent error handling

#### `src/modules/procurement/common/ai-providers/ai-providers.module.ts`
- **Purpose**: NestJS module for AI providers
- **Key Features**:
  - Exports AIService for other modules
  - Configures provider dependencies
  - Module-level provider registration

### 2. Phase Service Updates

#### `src/modules/procurement/phase1/services/phase1.service.ts`
- **Changes**:
  - Replaced GeminiService with AIService
  - Updated import statements
  - Maintained all existing functionality
  - No breaking changes to API

#### `src/modules/procurement/phase2/services/phase2.service.ts`
- **Changes**:
  - Updated to use AIService
  - Added web search capability support
  - Enhanced catalog matching logic
  - Improved error handling

#### `src/modules/procurement/phase3/services/phase3.service.ts`
- **Changes**:
  - Migrated to AIService
  - Enhanced specification generation
  - Better JSON parsing
  - Improved validation

#### `src/modules/procurement/phase4/services/phase4.service.ts`
- **Changes**:
  - Updated to use AIService
  - Enhanced delivery details collection
  - Improved data merging logic
  - Better conversation completion handling

### 3. Data Models & DTOs

#### `src/modules/procurement/phase1/dto/phase1.dto.ts`
- **Changes**:
  - Added PurchaseFrequency enum (Once, Weekly, Monthly, etc.)
  - Added purchase_frequency field to Phase1DataDto
  - Made field optional with @IsOptional() decorator
  - Added @IsEnum() validation

#### `src/modules/procurement/dto/create-procurement-request.dto.ts`
- **Changes**:
  - Added purchase_frequency field
  - Made it optional for backward compatibility
  - Added proper type annotations

#### `prisma/schema.prisma`
- **Changes**:
  - Added purchaseFrequency field to ProcurementRequest model
  - Fixed duplicate field definitions (company, suppliers)
  - Removed duplicate enum definitions
  - Cleaned up schema validation errors

#### `prisma/migrations/20250905170959_add_purchase_frequency/migration.sql`
- **Purpose**: Database migration for purchase frequency
- **Changes**:
  - Added purchaseFrequency column to ProcurementRequest table
  - Column is nullable for backward compatibility

### 4. Prompts & Business Logic

#### `src/modules/procurement/phase1/prompts/phase1.prompt.ts`
- **Changes**:
  - Added purchase_frequency to required fields
  - Added "Satın Alma Sıklığı" to questions
  - Made it mandatory (always ask even if not mentioned)
  - Added frequency options in prompt

#### `src/modules/procurement/phase2/prompts/phase2.prompt.ts`
- **Changes**:
  - Updated for OpenAI compatibility
  - Enhanced JSON formatting instructions
  - Better structured responses

#### `src/modules/procurement/phase3/prompts/phase3.prompt.ts`
- **Changes**:
  - Improved specification generation
  - Better requirement level handling
  - Enhanced Turkish language support

#### `src/modules/procurement/phase4/prompts/phase4.prompt.ts`
- **Changes**:
  - Updated delivery details collection
  - Better date formatting
  - Improved urgency level handling

### 5. Service Layer Updates

#### `src/modules/procurement/procurement.service.ts`
- **Changes**:
  - Replaced GeminiService with AIService
  - Added purchase_frequency to create method
  - Updated price estimation to use AIService
  - Enhanced error handling

#### `src/modules/procurement/common/services/orchestrator.service.ts`
- **Changes**:
  - Added START_NEW_CONVERSATION command support
  - Added "YENİ" and "NEW" shortcuts
  - Improved conversation state management
  - Better phase transition handling
  - Enhanced error logging

### 6. Module Configuration

#### `src/modules/procurement/procurement.module.ts`
- **Changes**:
  - Removed GeminiModule import
  - Added AIProvidersModule import
  - Updated provider registration
  - Maintained all existing exports

### 7. Configuration Files

#### `.env`
- **Changes**:
  ```env
  AI_PROVIDER=openai                    # Added
  OPENAI_API_KEY=sk-proj-...           # Added
  OPENAI_MODEL=gpt-4o                  # Added
  OPENAI_SEARCH_MODEL=gpt-4o           # Added
  GEMINI_ENABLED=false                 # Added
  ```

#### `src/config/environment.ts`
- **Changes**:
  - Added AI_PROVIDER validation
  - Added OPENAI_MODEL validation
  - Added OPENAI_SEARCH_MODEL validation
  - Added GEMINI_ENABLED flag
  - Enhanced configuration schema

### 8. Testing & Validation

#### Test Results
- ✅ Phase 1: Successfully collects all required information including purchase frequency
- ✅ Phase 2: Properly searches and suggests products
- ✅ Phase 3: Generates technical specifications correctly
- ✅ Phase 4: Collects delivery details and completes procurement
- ✅ Authentication: JWT tokens working correctly
- ✅ Conversation Management: Proper state transitions

## API Endpoints

### Chat Endpoint
```http
POST /api/procurement/chat
Authorization: Bearer {token}
Content-Type: application/json

{
  "message": "Laptop satın almak istiyorum",
  "conversationId": "optional-conversation-id"
}
```

### Create Procurement Request
```http
POST /api/procurement
Authorization: Bearer {token}
Content-Type: application/json

{
  "item_title": "Dell Latitude Laptop",
  "category_id": "IT-EQUIPMENT",
  "quantity": 5,
  "uom": "adet",
  "purchase_frequency": "Once",
  // ... other fields
}
```

## Environment Variables

```env
# AI Provider Configuration
AI_PROVIDER=openai              # Options: openai, gemini
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-4o            # Default model
OPENAI_SEARCH_MODEL=gpt-4o     # Model for web search
GEMINI_ENABLED=false           # Enable/disable Gemini
GEMINI_API_KEY=your-gemini-key # If Gemini is needed
```

## How to Switch AI Providers

1. **To use OpenAI (current)**:
   ```env
   AI_PROVIDER=openai
   GEMINI_ENABLED=false
   ```

2. **To use Gemini**:
   ```env
   AI_PROVIDER=gemini
   GEMINI_ENABLED=true
   ```

3. **To add a new provider**:
   - Create a new provider class implementing AIProvider interface
   - Register in AIProviderFactory
   - Add configuration to environment.ts
   - Update .env with necessary API keys

## Testing the System

### 1. Start the Backend
```bash
npm run start:dev
```

### 2. Get Authentication Token
```bash
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@procurementflow.com",
    "password": "your-password"
  }'
```

### 3. Test Chat Flow
```bash
# Start new conversation
curl -X POST http://localhost:3000/api/procurement/chat \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Laptop satın almak istiyorum"
  }'

# Continue conversation
curl -X POST http://localhost:3000/api/procurement/chat \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "5 adet, Dell marka",
    "conversationId": "conversation-id-from-response"
  }'
```

## Retry Mechanism

The OpenAI provider includes automatic retry with exponential backoff:

- **Retry on**: 503 (Service Unavailable), 429 (Rate Limit)
- **Max retries**: 3
- **Backoff**: 1s, 2s, 4s
- **Automatic fallback**: If OpenAI fails, system can fallback to Gemini (if enabled)

## Data Flow

1. **User Message** → Orchestrator Service
2. **Orchestrator** → Determines current phase
3. **Phase Service** → Calls AIService
4. **AIService** → Selects provider via Factory
5. **Provider** → Generates response
6. **Response** → Formatted and returned to user

## Security Considerations

- API keys stored in environment variables
- JWT authentication required for all endpoints
- Rate limiting implemented
- Input validation on all DTOs
- SQL injection protection via Prisma ORM

## Performance Optimizations

- Connection pooling for database
- Retry mechanisms for API calls
- Efficient conversation state management
- Lazy loading of AI providers
- Response caching where appropriate

## Troubleshooting

### Common Issues

1. **Authentication Error (401)**
   - Solution: Generate new JWT token
   - Check token expiration

2. **Provider Not Available**
   - Check API key configuration
   - Verify network connectivity
   - Check provider service status

3. **JSON Parsing Errors**
   - AI responses are validated
   - Fallback to text extraction
   - Error logging for debugging

4. **Database Connection Issues**
   - Check DATABASE_URL
   - Verify connection limit
   - Check pool timeout settings

## Future Enhancements

- [ ] Add Claude AI provider
- [ ] Implement response caching
- [ ] Add provider health checks
- [ ] Create provider usage analytics
- [ ] Add A/B testing capability
- [ ] Implement cost tracking per provider

## Support

For issues or questions:
- Check logs in development mode
- Review error messages in responses
- Verify environment configuration
- Check provider API status

## License

Proprietary - ProcurementFlow System

---

**Last Updated**: January 5, 2025
**Version**: 2.0.0
**Author**: Development Team