import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowService } from '../workflow.service';
import { WorkflowValidatorService } from '../services/workflow-validator.service';
import { WorkflowExecutionService } from '../services/workflow-execution.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { WorkflowNodeType, EdgeDataType } from '@prisma/client';

describe('Workflow Scenarios - Dokümantasyon Örnekleri', () => {
  let workflowService: WorkflowService;
  let validatorService: WorkflowValidatorService;
  let executionService: WorkflowExecutionService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        WorkflowValidatorService,
        WorkflowExecutionService,
        {
          provide: PrismaService,
          useValue: {
            workflow: { create: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn() },
            workflowInstance: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
            workflowExecution: { create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
            workflowApproval: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
            procurementRequest: { findUnique: jest.fn() },
            department: { findUnique: jest.fn() },
          },
        },
      ],
    }).compile();

    workflowService = module.get<WorkflowService>(WorkflowService);
    validatorService = module.get<WorkflowValidatorService>(WorkflowValidatorService);
    executionService = module.get<WorkflowExecutionService>(WorkflowExecutionService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('Senaryo 1: Tutar Bazlı Onay', () => {
    it('Tutar > 10000 için departman onayı gerekli workflow oluşturulabilmeli', () => {
      const workflowDto = {
        name: 'Tutar Bazlı Onay İş Akışı',
        description: 'Tutar 10000 TL üzerindeyse departman onayı gerekli',
        nodes: [
          {
            id: 'procurement-1',
            type: WorkflowNodeType.PROCUREMENT_REQUEST,
            label: 'Alım İsteği',
            position: { x: 100, y: 100 },
            data: {},
          },
          {
            id: 'condition-1',
            type: WorkflowNodeType.CONDITION_IF,
            label: 'Tutar Kontrolü',
            position: { x: 300, y: 100 },
            data: {
              operator: '>',
              value: 10000,
            },
          },
          {
            id: 'dept-approval-1',
            type: WorkflowNodeType.DEPARTMENT_APPROVAL,
            label: 'Departman Onayı',
            position: { x: 500, y: 50 },
            data: {
              departmentId: 'dept-123',
            },
          },
          {
            id: 'approve-1',
            type: WorkflowNodeType.APPROVE,
            label: 'Onayla',
            position: { x: 700, y: 100 },
            data: {},
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'procurement-1',
            target: 'condition-1',
            sourceHandle: 'totalPrice',
            targetHandle: 'default',
            dataType: EdgeDataType.NUMBER,
          },
          {
            id: 'edge-2',
            source: 'condition-1',
            target: 'dept-approval-1',
            sourceHandle: 'yes',
            targetHandle: 'default',
            dataType: EdgeDataType.BOOLEAN,
          },
          {
            id: 'edge-3',
            source: 'condition-1',
            target: 'approve-1',
            sourceHandle: 'no',
            targetHandle: 'default',
            dataType: EdgeDataType.BOOLEAN,
          },
          {
            id: 'edge-4',
            source: 'dept-approval-1',
            target: 'approve-1',
            sourceHandle: 'approved',
            targetHandle: 'default',
            dataType: EdgeDataType.BOOLEAN,
          },
        ],
        isActive: true,
      };

      // Validation test
      expect(() => {
        validatorService.validate(workflowDto);
      }).not.toThrow();
    });
  });

  describe('Senaryo 2: Paralel Onay', () => {
    it('Paralel kişi ve departman onayı workflow oluşturulabilmeli', () => {
      const workflowDto = {
        name: 'Paralel Onay İş Akışı',
        description: 'Hem kişi hem de departman onayı gerekli',
        nodes: [
          {
            id: 'procurement-1',
            type: WorkflowNodeType.PROCUREMENT_REQUEST,
            label: 'Alım İsteği',
            position: { x: 100, y: 150 },
            data: {},
          },
          {
            id: 'parallel-fork-1',
            type: WorkflowNodeType.PARALLEL_FORK,
            label: 'Paralel Ayır',
            position: { x: 300, y: 150 },
            data: {},
          },
          {
            id: 'person-approval-1',
            type: WorkflowNodeType.PERSON_APPROVAL,
            label: 'Kişi Onayı',
            position: { x: 500, y: 100 },
            data: {
              approverId: 'user-123',
            },
          },
          {
            id: 'dept-approval-1',
            type: WorkflowNodeType.DEPARTMENT_APPROVAL,
            label: 'Departman Onayı',
            position: { x: 500, y: 200 },
            data: {
              departmentId: 'dept-123',
            },
          },
          {
            id: 'parallel-join-1',
            type: WorkflowNodeType.PARALLEL_JOIN,
            label: 'Paralel Birleştir',
            position: { x: 700, y: 150 },
            data: {
              strategy: 'ALL', // Hepsi onaylamalı
            },
          },
          {
            id: 'approve-1',
            type: WorkflowNodeType.APPROVE,
            label: 'Onayla',
            position: { x: 900, y: 150 },
            data: {},
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'procurement-1',
            target: 'parallel-fork-1',
            sourceHandle: 'totalPrice',
            targetHandle: 'default',
            dataType: EdgeDataType.ANY,
          },
          {
            id: 'edge-2',
            source: 'parallel-fork-1',
            target: 'person-approval-1',
            sourceHandle: 'branch-0',
            targetHandle: 'default',
            dataType: EdgeDataType.ANY,
          },
          {
            id: 'edge-3',
            source: 'parallel-fork-1',
            target: 'dept-approval-1',
            sourceHandle: 'branch-1',
            targetHandle: 'default',
            dataType: EdgeDataType.ANY,
          },
          {
            id: 'edge-4',
            source: 'person-approval-1',
            target: 'parallel-join-1',
            sourceHandle: 'approved',
            targetHandle: 'input-0',
            dataType: EdgeDataType.BOOLEAN,
          },
          {
            id: 'edge-5',
            source: 'dept-approval-1',
            target: 'parallel-join-1',
            sourceHandle: 'approved',
            targetHandle: 'input-1',
            dataType: EdgeDataType.BOOLEAN,
          },
          {
            id: 'edge-6',
            source: 'parallel-join-1',
            target: 'approve-1',
            sourceHandle: 'default',
            targetHandle: 'default',
            dataType: EdgeDataType.BOOLEAN,
          },
        ],
        isActive: true,
      };

      // Validation test
      expect(() => {
        validatorService.validate(workflowDto);
      }).not.toThrow();
    });
  });

  describe('Senaryo 3: Switch-Case Aciliyet Kontrolü', () => {
    it('Aciliyet seviyesine göre farklı onay yolları', () => {
      const workflowDto = {
        name: 'Aciliyet Bazlı İş Akışı',
        description: 'Aciliyet seviyesine göre farklı onay süreçleri',
        nodes: [
          {
            id: 'procurement-1',
            type: WorkflowNodeType.PROCUREMENT_REQUEST,
            label: 'Alım İsteği',
            position: { x: 100, y: 200 },
            data: {},
          },
          {
            id: 'switch-1',
            type: WorkflowNodeType.CONDITION_SWITCH,
            label: 'Aciliyet Kontrolü',
            position: { x: 300, y: 200 },
            data: {
              cases: ['URGENT', 'HIGH', 'MEDIUM', 'LOW'],
            },
          },
          {
            id: 'approve-urgent',
            type: WorkflowNodeType.APPROVE,
            label: 'Acil Onay',
            position: { x: 500, y: 100 },
            data: {},
          },
          {
            id: 'dept-approval-high',
            type: WorkflowNodeType.DEPARTMENT_APPROVAL,
            label: 'Yüksek Öncelik Onayı',
            position: { x: 500, y: 150 },
            data: {
              departmentId: 'dept-123',
            },
          },
          {
            id: 'person-approval-medium',
            type: WorkflowNodeType.PERSON_APPROVAL,
            label: 'Orta Öncelik Onayı',
            position: { x: 500, y: 200 },
            data: {
              approverId: 'user-123',
            },
          },
          {
            id: 'approve-low',
            type: WorkflowNodeType.APPROVE,
            label: 'Düşük Öncelik Onay',
            position: { x: 500, y: 250 },
            data: {},
          },
          {
            id: 'approve-final',
            type: WorkflowNodeType.APPROVE,
            label: 'Final Onay',
            position: { x: 700, y: 175 },
            data: {},
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'procurement-1',
            target: 'switch-1',
            sourceHandle: 'urgency',
            targetHandle: 'default',
            dataType: EdgeDataType.STRING,
          },
          {
            id: 'edge-2',
            source: 'switch-1',
            target: 'approve-urgent',
            sourceHandle: 'case-0', // URGENT
            targetHandle: 'default',
            dataType: EdgeDataType.BOOLEAN,
          },
          {
            id: 'edge-3',
            source: 'switch-1',
            target: 'dept-approval-high',
            sourceHandle: 'case-1', // HIGH
            targetHandle: 'default',
            dataType: EdgeDataType.BOOLEAN,
          },
          {
            id: 'edge-4',
            source: 'switch-1',
            target: 'person-approval-medium',
            sourceHandle: 'case-2', // MEDIUM
            targetHandle: 'default',
            dataType: EdgeDataType.BOOLEAN,
          },
          {
            id: 'edge-5',
            source: 'switch-1',
            target: 'approve-low',
            sourceHandle: 'case-3', // LOW
            targetHandle: 'default',
            dataType: EdgeDataType.BOOLEAN,
          },
          {
            id: 'edge-6',
            source: 'dept-approval-high',
            target: 'approve-final',
            sourceHandle: 'approved',
            targetHandle: 'default',
            dataType: EdgeDataType.BOOLEAN,
          },
          {
            id: 'edge-7',
            source: 'person-approval-medium',
            target: 'approve-final',
            sourceHandle: 'approved',
            targetHandle: 'default',
            dataType: EdgeDataType.BOOLEAN,
          },
        ],
        isActive: true,
      };

      // Validation test
      expect(() => {
        validatorService.validate(workflowDto);
      }).not.toThrow();
    });
  });

  describe('Validation Kuralları Testleri', () => {
    it('PROCUREMENT_REQUEST node olmadan workflow oluşturulamaz', () => {
      const invalidWorkflowDto = {
        name: 'Geçersiz İş Akışı',
        nodes: [
          {
            id: 'approve-1',
            type: WorkflowNodeType.APPROVE,
            label: 'Onayla',
            position: { x: 100, y: 100 },
            data: {},
          },
        ],
        edges: [],
        isActive: true,
      };

      expect(() => {
        validatorService.validate(invalidWorkflowDto);
      }).toThrow('İş akışı bir "Alım İsteği" node\'u ile başlamalıdır.');
    });

    it('APPROVE veya REJECT node olmadan workflow oluşturulamaz', () => {
      const invalidWorkflowDto = {
        name: 'Geçersiz İş Akışı',
        nodes: [
          {
            id: 'procurement-1',
            type: WorkflowNodeType.PROCUREMENT_REQUEST,
            label: 'Alım İsteği',
            position: { x: 100, y: 100 },
            data: {},
          },
          {
            id: 'condition-1',
            type: WorkflowNodeType.CONDITION_IF,
            label: 'Koşul',
            position: { x: 300, y: 100 },
            data: { operator: '>', value: 1000 },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'procurement-1',
            target: 'condition-1',
            sourceHandle: 'totalPrice',
            targetHandle: 'default',
            dataType: EdgeDataType.NUMBER,
          },
        ],
        isActive: true,
      };

      expect(() => {
        validatorService.validate(invalidWorkflowDto);
      }).toThrow('İş akışı "Onayla" veya "Reddet" node\'u ile sonlanmalıdır.');
    });

    it('Giriş bağlantısı olmayan node (PROCUREMENT_REQUEST hariç) geçersizdir', () => {
      const invalidWorkflowDto = {
        name: 'Geçersiz İş Akışı',
        nodes: [
          {
            id: 'procurement-1',
            type: WorkflowNodeType.PROCUREMENT_REQUEST,
            label: 'Alım İsteği',
            position: { x: 100, y: 100 },
            data: {},
          },
          {
            id: 'condition-1',
            type: WorkflowNodeType.CONDITION_IF,
            label: 'Koşul',
            position: { x: 300, y: 100 },
            data: { operator: '>', value: 1000 },
          },
          {
            id: 'approve-1',
            type: WorkflowNodeType.APPROVE,
            label: 'Onayla',
            position: { x: 500, y: 100 },
            data: {},
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'procurement-1',
            target: 'condition-1',
            sourceHandle: 'totalPrice',
            targetHandle: 'default',
            dataType: EdgeDataType.NUMBER,
          },
          // approve-1 node'una giriş bağlantısı yok
        ],
        isActive: true,
      };

      expect(() => {
        validatorService.validate(invalidWorkflowDto);
      }).toThrow('"Onayla" node\'unun girişi boş bırakılamaz.');
    });
  });
});
