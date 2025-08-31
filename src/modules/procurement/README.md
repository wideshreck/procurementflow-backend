# RFQ/RFP Procurement Automation Module

## Overview
This module implements a sophisticated procurement automation system based on the chatbot.md specifications. It guides users through a structured RFQ/RFP process using a phase-based approach with intelligent decision-making and AI-powered suggestions.

## Architecture

### Phase-Based Process Flow

The procurement process is divided into 4 main phases:

#### Phase 1: Request Definition & Structured Data Collection
- **Purpose**: Transform free-text procurement requests into structured data
- **Service**: `Phase1Service`
- **Data Collected**:
  - Item title (10-255 characters)
  - Category & Subcategory
  - Quantity & Unit of measure
  - Cost center
  - Procurement type (Product/Service)
  - Simple definition (optional, max 500 chars)

#### Phase 2: Catalog Matching & Standard Product Suggestion
- **Purpose**: Find existing catalog items to promote standardization
- **Service**: `Phase2Service`
- **Features**:
  - Searches internal catalog database
  - Uses AI with web search for market products
  - Presents suggestions with justifications
  - Allows rejection to proceed to custom specifications

#### Phase 3: Technical Specification Creation
- **Purpose**: Create detailed technical specifications
- **Service**: `Phase3Service`
- **Sub-phases**:
  - **3.1**: Intelligent configuration suggestions based on budget
  - **3.2**: Manual specification entry with guided questions
- **Output**: Complete technical specifications with measurable requirements

#### Phase 4: Supplier Research & RFQ Creation
- **Purpose**: Find suppliers and generate RFQ document
- **Service**: `Phase4Service`
- **Features**:
  - AI-powered supplier search with web capabilities
  - Internal approved supplier database integration
  - Automatic RFQ document generation
  - Configurable deadlines and payment terms

### State Machine

The `ProcurementStateMachine` manages phase transitions and validates responses:

```typescript
IDENTIFICATION → SUGGESTIONS → SPECS → SUPPLIER_PRODUCT_SUGGESTIONS → FINAL
```

Each transition has specific conditions and validations to ensure data integrity.

## Module Structure

```
src/modules/procurement/
├── phases/
│   ├── phase1.service.ts    # Request definition logic
│   ├── phase2.service.ts    # Catalog matching logic
│   ├── phase3.service.ts    # Technical specs logic
│   └── phase4.service.ts    # Supplier & RFQ logic
├── state-machine/
│   └── procurement.state-machine.ts  # State management
├── dto/
│   └── procurement.dto.ts   # Data schemas & validation
├── gemini/
│   └── gemini.service.ts    # AI integration
├── prompts/
│   ├── phase1.ts            # Phase 1 AI prompts
│   ├── phase2.ts            # Phase 2 AI prompts
│   ├── phase3.ts            # Phase 3 AI prompts
│   └── phase4.ts            # Phase 4 AI prompts
├── tests/
│   └── procurement.integration.spec.ts
├── procurement.service.ts    # Main orchestration service
├── procurement.controller.ts # HTTP endpoints
└── procurement.module.ts     # Module configuration
```

## Response Modes

The system uses standardized response modes for frontend communication:

- **ASKING_FOR_INFO**: Requests information from user with structured questions
- **SUGGESTION**: Presents options (catalog items, configurations, suppliers)
- **PHASE_X_DONE**: Phase completion with collected data
- **ERROR**: Error handling with user-friendly messages
- **INFO**: Informational messages

## Data Flow

1. **User Input** → Controller → Main Service
2. **Main Service** → Phase Service (based on current phase)
3. **Phase Service** → AI Service (if needed) → Response
4. **State Machine** → Validates response & determines transition
5. **Database** → Saves conversation state & messages
6. **Response** → Frontend with mode, data, and progress

## API Endpoints

### POST /api/procurement/chat
Process user messages in the procurement flow.

**Request Body**:
```json
{
  "userId": "string",
  "message": "string",
  "cancel": false
}
```

**Response**:
```json
{
  "reply": {
    "MODE": "ASKING_FOR_INFO | SUGGESTION | PHASE_X_DONE | ERROR | INFO",
    "...": "mode-specific data"
  },
  "conversationId": "string",
  "phase": "IDENTIFICATION | SUGGESTIONS | SPECS | SUPPLIER_PRODUCT_SUGGESTIONS | FINAL",
  "status": "ACTIVE | COMPLETED | CANCELLED",
  "progress": 20,
  "phaseDescription": "Talep Tanımlama ve Veri Toplama"
}
```

## Database Schema

### Conversation Model
- Tracks conversation state and phase
- Stores collected data as JSON
- Links to messages and RFQs

### RFQ Model
- Stores final RFQ documents
- Includes specifications, suppliers, deadlines
- Links back to originating conversation

## Configuration

### Environment Variables
```env
DATABASE_URL=postgresql://...
GEMINI_API_KEY=your-api-key
```

### Module Dependencies
- NestJS framework
- Prisma ORM
- Google Gemini AI
- Zod for validation

## Testing

Run integration tests:
```bash
npm run test:e2e -- procurement.integration.spec.ts
```

## Usage Example

```typescript
// Start a procurement request
POST /api/procurement/chat
{
  "userId": "user-123",
  "message": "Muhasebe departmanı için 10 adet dizüstü bilgisayar almak istiyorum"
}

// Response guides through phases
{
  "reply": {
    "MODE": "ASKING_FOR_INFO",
    "QUESTIONS": [...]
  },
  "phase": "IDENTIFICATION",
  "progress": 20
}

// Continue conversation until completion
// System automatically transitions between phases
```

## Key Features

1. **Intelligent Phase Transitions**: Automatic progression when phase requirements are met
2. **Budget Integration**: Validates against cost center budgets
3. **Multi-language Support**: Turkish-focused with extensibility
4. **Web Search Integration**: Real-time market data for products and suppliers
5. **Audit Trail**: Complete conversation history for compliance
6. **Error Recovery**: Graceful handling of failures with user guidance

## Future Enhancements

- [ ] Multi-company support
- [ ] Approval workflow integration
- [ ] Supplier portal for bid submission
- [ ] Analytics dashboard
- [ ] Email notifications
- [ ] Document attachment support
- [ ] Price comparison engine
- [ ] Contract management integration

## Maintenance

### Adding New Categories
Update category lists in:
- `phase1.service.ts`
- Database seed data

### Modifying Phase Logic
Each phase service is independent. Modify the specific phase service and update state machine transitions if needed.

### Customizing AI Prompts
Edit prompt files in `prompts/` directory to adjust AI behavior.

## Support

For issues or questions, please contact the development team or create an issue in the repository.