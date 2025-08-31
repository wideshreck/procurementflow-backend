import { Test, TestingModule } from '@nestjs/testing';
import { Phase1Service } from '../services/phase1.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';
import { ProcurementType } from '../dto/phase1.dto';

describe('Phase1Service', () => {
  let service: Phase1Service;
  let prismaService: PrismaService;
  let geminiService: GeminiService;

  const mockPrismaService = {
    conversation: {
      update: jest.fn(),
    },
  };

  const mockGeminiService = {
    generateResponse: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Phase1Service,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: GeminiService,
          useValue: mockGeminiService,
        },
      ],
    }).compile();

    service = module.get<Phase1Service>(Phase1Service);
    prismaService = module.get<PrismaService>(PrismaService);
    geminiService = module.get<GeminiService>(GeminiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startPhase1', () => {
    it('should complete phase 1 when AI provides all data', async () => {
      const mockAIResponse = {
        MODE: 'PHASE_ONE_DONE',
        COLLECTED_DATA: {
          item_title: 'Test Bilgisayar',
          category: 'IT Donanım',
          subcategory: 'Dizüstü Bilgisayarlar',
          quantity: 5,
          uom: 'Adet',
          simple_definition: 'Test için bilgisayar alımı',
          cost_center: 'IT-2025-B01',
          procurement_type: ProcurementType.PRODUCT
        }
      };

      mockGeminiService.generateResponse.mockResolvedValue(mockAIResponse);
      mockPrismaService.conversation.update.mockResolvedValue({});

      const result = await service.startPhase1('conv-123', '5 adet bilgisayar');

      expect(result.MODE).toBe('PHASE_ONE_DONE');
      if (result.COLLECTED_DATA) {
        expect(result.COLLECTED_DATA.item_title).toBe('Test Bilgisayar');
      }
    });

    it('should ask quantity question when AI requests more info', async () => {
      const mockAIResponse = {
        MODE: 'ASKING_FOR_INFO',
        QUESTIONS: [
          {
            question_id: 'q_quantity',
            question_type: 'TEXT_INPUT',
            answer_options: [],
            reason_of_question: 'Kaç adet ürün/hizmet talep ediyorsunuz?'
          }
        ]
      };

      mockGeminiService.generateResponse.mockResolvedValue(mockAIResponse);

      const result = await service.startPhase1('conv-123', 'bilgisayar');

      expect(result.MODE).toBe('ASKING_FOR_INFO');
      expect(result.QUESTIONS).toBeDefined();
      if (result.QUESTIONS) {
        expect(result.QUESTIONS[0].question_id).toBe('q_quantity');
      }
    });

    it('should use fallback when AI fails', async () => {
      mockGeminiService.generateResponse.mockRejectedValue(new Error('AI Error'));

      const result = await service.startPhase1('conv-123', '5 adet bilgisayar');

      // Fallback should complete phase 1 since all data is available
      expect(result.MODE).toBe('PHASE_ONE_DONE');
      if (result.COLLECTED_DATA) {
        expect(result.COLLECTED_DATA.quantity).toBe(5);
        expect(result.COLLECTED_DATA.category).toBe('IT Donanım');
      }
    });
  });

  describe('processUserResponse', () => {
    it('should complete phase 1 when AI processes quantity answer', async () => {
      const currentData = {
        category: 'IT Donanım',
        subcategory: 'Dizüstü Bilgisayarlar',
        cost_center: 'IT-2025-B01',
        procurement_type: ProcurementType.PRODUCT
      };

      const mockAIResponse = {
        MODE: 'PHASE_ONE_DONE',
        COLLECTED_DATA: {
          item_title: '5 Adet Dizüstü Bilgisayar',
          category: 'IT Donanım',
          subcategory: 'Dizüstü Bilgisayarlar',
          quantity: 5,
          uom: 'Adet',
          simple_definition: 'IT departmanı ihtiyaçları için bilgisayar alımı',
          cost_center: 'IT-2025-B01',
          procurement_type: ProcurementType.PRODUCT
        }
      };

      mockGeminiService.generateResponse.mockResolvedValue(mockAIResponse);
      mockPrismaService.conversation.update.mockResolvedValue({});

      const result = await service.processUserResponse(
        'conv-123',
        'q_quantity',
        '5',
        currentData
      );

      expect(result.MODE).toBe('PHASE_ONE_DONE');
      if (result.COLLECTED_DATA) {
        expect(result.COLLECTED_DATA.quantity).toBe(5);
      }
    });

    it('should ask another question when AI still needs more info', async () => {
      const currentData = {
        category: 'IT Donanım'
      };

      const mockAIResponse = {
        MODE: 'ASKING_FOR_INFO',
        QUESTIONS: [
          {
            question_id: 'q_quantity',
            question_type: 'TEXT_INPUT',
            answer_options: [],
            reason_of_question: 'Kaç adet ürün/hizmet talep ediyorsunuz?'
          }
        ]
      };

      mockGeminiService.generateResponse.mockResolvedValue(mockAIResponse);

      const result = await service.processUserResponse(
        'conv-123',
        'q_category',
        'IT Donanım',
        currentData
      );

      expect(result.MODE).toBe('ASKING_FOR_INFO');
      expect(result.QUESTIONS).toBeDefined();
    });
  });

  describe('fallback data extraction', () => {
    it('should ask quantity question when quantity is missing', async () => {
      mockGeminiService.generateResponse.mockRejectedValue(new Error('AI Error'));

      const result = await service.startPhase1('conv-123', 'bilgisayar');

      expect(result.MODE).toBe('ASKING_FOR_INFO');
      expect(result.QUESTIONS).toBeDefined();
      if (result.QUESTIONS) {
        expect(result.QUESTIONS[0].question_id).toBe('q_quantity');
      }
    });

    it('should complete phase 1 when all data is available', async () => {
      mockGeminiService.generateResponse.mockRejectedValue(new Error('AI Error'));

      const result = await service.startPhase1('conv-123', '5 adet muhasebe için yazıcı');

      expect(result.MODE).toBe('PHASE_ONE_DONE');
      if (result.COLLECTED_DATA) {
        expect(result.COLLECTED_DATA.quantity).toBe(5);
        expect(result.COLLECTED_DATA.category).toBe('IT Donanım');
        expect(result.COLLECTED_DATA.cost_center).toBe('MUH-2025-B01');
      }
    });
  });

  describe('question creation', () => {
    it('should create quantity question', async () => {
      const question = service['createQuantityQuestion']();
      
      expect(question.question_type).toBe('TEXT_INPUT');
      expect(question.question_id).toBe('q_quantity');
      expect(question.reason_of_question).toContain('Kaç adet');
    });
  });

  describe('data completion', () => {
    it('should complete missing data with AI-like logic', async () => {
      const extractedData = {
        quantity: 3
      };

      const completedData = service['completeMissingData'](extractedData, 'muhasebe için yazıcı');
      
      expect(completedData.category).toBe('IT Donanım');
      expect(completedData.subcategory).toBe('Yazıcılar');
      expect(completedData.cost_center).toBe('MUH-2025-B01');
      expect(completedData.procurement_type).toBe(ProcurementType.PRODUCT);
      expect(completedData.uom).toBe('Adet');
    });
  });

  describe('prompt info', () => {
    it('should return prompt information', () => {
      const promptInfo = service.getPromptInfo();
      
      expect(promptInfo.systemPrompt).toBeDefined();
      expect(promptInfo.systemPrompt).toContain('AI KENDİSİ BELİRLEYECEK');
    });
  });
});
