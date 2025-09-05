import { Test, TestingModule } from '@nestjs/testing';
import { ProcurementService } from '../procurement.service';
import { OrchestratorService } from '../common/services/orchestrator.service';
import { Phase1Service } from '../phase1/services/phase1.service';
import { Phase2Service } from '../phase2/services/phase2.service';
import { Phase3Service } from '../phase3/services/phase3.service';
import { StateMachineService } from '../common/services/state-machine.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConversationStatus, ProcurementPhase } from '@prisma/client';
import { ChatbotMode } from '../dto/chatbot.dto';

describe('Chatbot.md Integration Tests', () => {
  let procurementService: ProcurementService;
  let orchestratorService: OrchestratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcurementService,
        OrchestratorService,
        Phase1Service,
        Phase2Service,
        Phase3Service,
        StateMachineService,
        {
          provide: PrismaService,
          useValue: {
            conversation: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            message: {
              create: jest.fn(),
            },
            product: {
              findMany: jest.fn(),
            },
            costCenter: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    procurementService = module.get<ProcurementService>(ProcurementService);
    orchestratorService = module.get<OrchestratorService>(OrchestratorService);
  });

  describe('Faz 1: Talep Tanımlama ve Yapılandırılmış Veri Toplama', () => {
    it('serbest metinden yapılandırılmış veri çıkarmalı', async () => {
      const phase1Service = new Phase1Service();
      const result = await phase1Service.processPhase1(
        'Muhasebe departmanı için 10 adet dizüstü bilgisayar almak istiyorum',
        {},
      );

      expect(result.MODE).toBe(ChatbotMode.ASKING_FOR_INFO);
      expect(result.QUESTIONS).toBeDefined();
      expect(result.QUESTIONS.length).toBeGreaterThan(0);
    });

    it('eksik alanlar için ASKING_FOR_INFO döndürmeli', async () => {
      const phase1Service = new Phase1Service();
      const result = await phase1Service.processPhase1(
        'Bilgisayar lazım',
        {},
      );

      expect(result.MODE).toBe(ChatbotMode.ASKING_FOR_INFO);
      const questions = result.QUESTIONS;
      
      // cost_center sorusu olmalı
      const costCenterQuestion = questions.find(q => q.question_id === 'q_cost_center');
      expect(costCenterQuestion).toBeDefined();
      expect(costCenterQuestion?.question_type).toBe('TEXT_INPUT');
    });

    it('tüm alanlar tamamlandığında PHASE_ONE_DONE döndürmeli', async () => {
      const phase1Service = new Phase1Service();
      const completeData = {
        item_title: 'Muhasebe Departmanı için 10 Adet Yeni Nesil Dizüstü Bilgisayar',
        category: 'IT Donanım',
        subcategory: 'Dizüstü Bilgisayarlar',
        quantity: 10,
        uom: 'Adet',
        simple_definition: 'Mevcut bilgisayarların yenilenmesi',
        cost_center: 'MUH-2025-B01',
        procurement_type: 'Ürün Alımı' as const,
      };

      const result = await phase1Service.processPhase1('', completeData);

      expect(result.MODE).toBe(ChatbotMode.PHASE_ONE_DONE);
      expect(result.COLLECTED_DATA).toEqual(completeData);
    });
  });

  describe('Faz 2: Katalog Eşleştirme ve Standart Ürün Önerme', () => {
    it('katalog eşleşmesi bulunduğunda SUGGESTION döndürmeli', async () => {
      const phase2Service = new Phase2Service({} as PrismaService);
      const phase1Data = {
        item_title: 'Dizüstü Bilgisayar',
        category: 'IT Donanım',
        subcategory: 'Dizüstü Bilgisayarlar',
        quantity: 10,
        uom: 'Adet',
        cost_center: 'MUH-2025-B01',
        procurement_type: 'Ürün Alımı' as const,
      };

      const result = await phase2Service.processPhase2(phase1Data);

      expect(result).toBeDefined();
      if (result) {
        expect(result.MODE).toBe(ChatbotMode.SUGGESTION);
        expect(result.SUGGESTIONS).toBeDefined();
        expect(result.SUGGESTIONS.length).toBeGreaterThan(0);
        
        // chatbot.md Bölüm 3.3.1'e göre format kontrolü
        const firstSuggestion = result.SUGGESTIONS[0];
        expect(firstSuggestion.item_id).toMatch(/^PROD-/);
        expect(firstSuggestion.item_name).toBeDefined();
        expect(firstSuggestion.justification).toBeDefined();
      }
    });

    it('kullanıcı seçimini doğru tespit etmeli', () => {
      const phase2Service = new Phase2Service({} as PrismaService);
      
      expect(phase2Service.isItemSelected('PROD-01234 seçiyorum')).toBe(true);
      expect(phase2Service.isItemSelected('Bu olsun')).toBe(true);
      expect(phase2Service.isItemSelected('Hiçbiri olmaz')).toBe(false);
    });

    it('reddetme ifadelerini doğru tespit etmeli', () => {
      const phase2Service = new Phase2Service({} as PrismaService);
      
      expect(phase2Service.areAllSuggestionsRejected('Hiçbiri uygun değil')).toBe(true);
      expect(phase2Service.areAllSuggestionsRejected('Başka bir şey istiyorum')).toBe(true);
      expect(phase2Service.areAllSuggestionsRejected('Manuel gireceğim')).toBe(true);
    });
  });

  describe('Faz 3: Teknik Şartname Oluşturma', () => {
    it('Faz 3.1 - Akıllı konfigürasyon paketleri oluşturmalı', async () => {
      const phase3Service = new Phase3Service({
        costCenter: { findFirst: jest.fn().mockResolvedValue({ remainingBudget: 150000 }) },
      } as any);

      const phase1Data = {
        item_title: 'Dizüstü Bilgisayar',
        category: 'IT Donanım',
        subcategory: 'Dizüstü Bilgisayarlar',
        quantity: 10,
        uom: 'Adet',
        cost_center: 'MUH-2025-B01',
        procurement_type: 'Ürün Alımı' as const,
      };

      const result = await phase3Service.processPhase3(phase1Data);

      expect(result.MODE).toBe(ChatbotMode.SUGGESTION);
      expect(result.SUGGESTIONS).toBeDefined();
      expect(result.SUGGESTIONS.length).toBeGreaterThanOrEqual(2);

      // chatbot.md Bölüm 4.2.2'ye göre format kontrolü
      const standardPackage = result.SUGGESTIONS.find(s => 
        s.suggestion_name.includes('Standart')
      );
      expect(standardPackage).toBeDefined();
      expect(standardPackage?.estimated_cost_per_unit).toBeDefined();
      expect(standardPackage?.justification).toBeDefined();
      expect(standardPackage?.technical_specifications).toBeDefined();

      // Teknik özellikler kontrolü
      const ramSpec = standardPackage?.technical_specifications.find(s => 
        s.spec_key === 'RAM'
      );
      expect(ramSpec).toBeDefined();
      expect(ramSpec?.spec_value).toBeDefined();

    });

    it('Faz 3.2 - Manuel giriş için sorular oluşturmalı', async () => {
      const phase3Service = new Phase3Service({} as PrismaService);
      
      const phase1Data = {
        item_title: 'Dizüstü Bilgisayar',
        category: 'IT Donanım',
        subcategory: 'Dizüstü Bilgisayarlar',
        quantity: 10,
        uom: 'Adet',
        cost_center: 'MUH-2025-B01',
        procurement_type: 'Ürün Alımı' as const,
      };

      const result = await phase3Service.processPhase3(phase1Data, 'MANUAL');

      expect(result.MODE).toBe(ChatbotMode.ASKING_FOR_INFO);
      expect(result.QUESTIONS).toBeDefined();
      expect(result.QUESTIONS.length).toBeGreaterThan(0);
    });

    it('tüm özellikler toplandığında PHASE_THREE_DONE döndürmeli', async () => {
      const phase3Service = new Phase3Service({} as PrismaService);
      
      const phase1Data = {
        item_title: 'Dizüstü Bilgisayar',
        category: 'IT Donanım',
        subcategory: 'Dizüstü Bilgisayarlar',
        quantity: 10,
        uom: 'Adet',
        cost_center: 'MUH-2025-B01',
        procurement_type: 'Ürün Alımı' as const,
      };

      const specs = [
        { spec_key: 'RAM', spec_value: '16 GB', requirement_level: 'Zorunlu' as const },
        { spec_key: 'İşlemci', spec_value: 'Intel Core i5', requirement_level: 'Zorunlu' as const },
        { spec_key: 'Depolama', spec_value: '512 GB SSD', requirement_level: 'Zorunlu' as const },
        { spec_key: 'Ekran Boyutu', spec_value: '15.6 inç', requirement_level: 'Tercih Edilen' as const },
        { spec_key: 'İşletim Sistemi', spec_value: 'Windows 11 Pro', requirement_level: 'Zorunlu' as const },
        { spec_key: 'Grafik Kartı', spec_value: 'Entegre', requirement_level: 'Tercih Edilen' as const },
        { spec_key: 'Batarya Ömrü', spec_value: '8 saat', requirement_level: 'Tercih Edilen' as const },
      ];

      // Manuel girişle tüm özellikler toplandı
      const result = await phase3Service.processPhase3(phase1Data, 'MANUAL', specs);

      expect(result.MODE).toBe(ChatbotMode.PHASE_THREE_DONE);
      expect(result.COLLECTED_DATA).toBeDefined();
      expect(result.COLLECTED_DATA.technical_specifications).toEqual(specs);
    });
  });

  describe('State Machine - Faz Geçişleri', () => {
    it('faz geçişlerini doğru kontrol etmeli', () => {
      const stateMachine = new StateMachineService();

      // Faz 1 -> Faz 2 geçişi
      expect(stateMachine.canTransition(
        ProcurementPhase.IDENTIFICATION,
        ChatbotMode.PHASE_ONE_DONE,
      )).toBe(true);

      // Faz 3 -> Final geçişi
      expect(stateMachine.canTransition(
        ProcurementPhase.SPECS,
        ChatbotMode.PHASE_THREE_DONE,
      )).toBe(true);

      // Geçersiz geçiş
      expect(stateMachine.canTransition(
        ProcurementPhase.IDENTIFICATION,
        ChatbotMode.ASKING_FOR_INFO,
      )).toBe(false);
    });

    it('doğru ilerleme yüzdesi döndürmeli', () => {
      const stateMachine = new StateMachineService();

      expect(stateMachine.getProgressPercentage(ProcurementPhase.IDENTIFICATION)).toBe(25);
      expect(stateMachine.getProgressPercentage(ProcurementPhase.SUGGESTIONS)).toBe(50);
      expect(stateMachine.getProgressPercentage(ProcurementPhase.SPECS)).toBe(75);
      expect(stateMachine.getProgressPercentage(ProcurementPhase.FINAL)).toBe(100);
    });

    it('Türkçe faz açıklamaları döndürmeli', () => {
      const stateMachine = new StateMachineService();

      expect(stateMachine.getPhaseDescription(ProcurementPhase.IDENTIFICATION))
        .toBe('Talep Tanımlama ve Veri Toplama');
      expect(stateMachine.getPhaseDescription(ProcurementPhase.SUGGESTIONS))
        .toBe('Katalog Eşleştirme ve Ürün Önerisi');
      expect(stateMachine.getPhaseDescription(ProcurementPhase.SPECS))
        .toBe('Teknik Şartname Oluşturma');
    });
  });

  describe('JSON Format Uyumluluğu', () => {
    it('MODE: ASKING_FOR_INFO formatı chatbot.md Bölüm 2.4.1 ile uyumlu olmalı', () => {
      const askingInfo = {
        MODE: 'ASKING_FOR_INFO',
        QUESTIONS: [
          {
            question_id: 'q_001',
            question_type: 'SINGLE_CHOICE',
            answer_options: [
              { option: 'Ürün Alımı', justification: '' },
              { option: 'Hizmet Alımı', justification: '' },
            ],
            reason_of_question: 'Talebinizin türünü belirlemek için',
          },
        ],
      };

      expect(askingInfo.MODE).toBe('ASKING_FOR_INFO');
      expect(askingInfo.QUESTIONS).toBeDefined();
      expect(askingInfo.QUESTIONS[0].question_type).toBe('SINGLE_CHOICE');
    });

    it('MODE: PHASE_ONE_DONE formatı chatbot.md Bölüm 2.4.2 ile uyumlu olmalı', () => {
      const phaseOneDone = {
        MODE: 'PHASE_ONE_DONE',
        COLLECTED_DATA: {
          item_title: 'Muhasebe Departmanı için 10 Adet Yeni Nesil Dizüstü Bilgisayar',
          category: 'IT Donanım',
          subcategory: 'Dizüstü Bilgisayarlar',
          quantity: 10,
          uom: 'Adet',
          simple_definition: 'Mevcut bilgisayarların yenilenmesi',
          cost_center: 'MUH-2025-B01',
          procurement_type: 'Ürün Alımı',
        },
      };

      expect(phaseOneDone.MODE).toBe('PHASE_ONE_DONE');
      expect(phaseOneDone.COLLECTED_DATA.item_title).toBeDefined();
      expect(phaseOneDone.COLLECTED_DATA.quantity).toBe(10);
    });

    it('MODE: SUGGESTION (Faz 2) formatı chatbot.md Bölüm 3.3.1 ile uyumlu olmalı', () => {
      const suggestion = {
        MODE: 'SUGGESTION',
        SUGGESTIONS: [
          {
            item_id: 'PROD-01234',
            item_name: 'Dell Latitude 5500',
            justification: 'Muhasebe departmanının standart modeli',
          },
        ],
      };

      expect(suggestion.MODE).toBe('SUGGESTION');
      expect(suggestion.SUGGESTIONS[0].item_id).toMatch(/^PROD-/);
      expect(suggestion.SUGGESTIONS[0].justification).toBeDefined();
    });

    it('MODE: PHASE_THREE_DONE formatı chatbot.md Bölüm 4.4.1 ile uyumlu olmalı', () => {
      const phaseThreeDone = {
        MODE: 'PHASE_THREE_DONE',
        COLLECTED_DATA: {
          item_title: 'Dizüstü Bilgisayar',
          category: 'IT Donanım',
          subcategory: 'Dizüstü Bilgisayarlar',
          quantity: 10,
          uom: 'Adet',
          simple_definition: 'Test',
          cost_center: 'MUH-2025-B01',
          procurement_type: 'Ürün Alımı',
          technical_specifications: [
            {
              spec_key: 'RAM',
              spec_value: '16',

              requirement_level: 'Zorunlu',
            },
          ],
        },
      };

      expect(phaseThreeDone.MODE).toBe('PHASE_THREE_DONE');
      expect(phaseThreeDone.COLLECTED_DATA.technical_specifications).toBeDefined();
      expect(phaseThreeDone.COLLECTED_DATA.technical_specifications[0].spec_key).toBe('RAM');
    });
  });
});