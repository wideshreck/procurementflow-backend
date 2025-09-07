import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowService } from './workflow.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowValidatorService } from './services/workflow-validator.service';
import { WorkflowExecutionService } from './services/workflow-execution.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('WorkflowService', () => {
  let service: WorkflowService;
  let prismaService: PrismaService;
  let validatorService: WorkflowValidatorService;
  let executionService: WorkflowExecutionService;

  const mockPrismaService = {
    workflow: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    workflowNode: {
      deleteMany: jest.fn(),
    },
    workflowEdge: {
      deleteMany: jest.fn(),
    },
    workflowInstance: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    workflowExecution: {
      findMany: jest.fn(),
    },
    workflowApproval: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockValidatorService = {
    validateWorkflow: jest.fn(),
    getNodeOutputPorts: jest.fn(),
    getNodeInputPorts: jest.fn(),
  };

  const mockExecutionService = {
    startWorkflow: jest.fn(),
    handleApprovalResponse: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WorkflowValidatorService, useValue: mockValidatorService },
        { provide: WorkflowExecutionService, useValue: mockExecutionService },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
    prismaService = module.get<PrismaService>(PrismaService);
    validatorService = module.get<WorkflowValidatorService>(WorkflowValidatorService);
    executionService = module.get<WorkflowExecutionService>(WorkflowExecutionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createWorkflowDto = {
      name: 'Test Workflow',
      description: 'Test description',
      nodes: [
        {
          id: 'node1',
          type: 'PROCUREMENT_REQUEST',
          position: { x: 100, y: 100 },
          data: {},
        },
        {
          id: 'node2',
          type: 'APPROVE',
          position: { x: 300, y: 100 },
          data: {},
        },
      ],
      edges: [
        {
          id: 'edge1',
          source: 'node1',
          target: 'node2',
        },
      ],
      isActive: true,
    };

    it('should create a workflow successfully', async () => {
      mockValidatorService.validateWorkflow.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      const expectedWorkflow = {
        id: 'workflow1',
        ...createWorkflowDto,
        companyId: 'company1',
        createdBy: 'user1',
        version: 1,
        nodes: [],
        edges: [],
      };

      mockPrismaService.workflow.create.mockResolvedValue(expectedWorkflow);

      const result = await service.create(createWorkflowDto, 'company1', 'user1');

      expect(mockValidatorService.validateWorkflow).toHaveBeenCalledWith(
        createWorkflowDto.nodes,
        createWorkflowDto.edges,
      );
      expect(mockPrismaService.workflow.create).toHaveBeenCalled();
      expect(result).toEqual(expectedWorkflow);
    });

    it('should throw BadRequestException for invalid workflow', async () => {
      mockValidatorService.validateWorkflow.mockReturnValue({
        isValid: false,
        errors: ['İş akışı bir "Alım İsteği" node\'u ile başlamalıdır'],
        warnings: [],
      });

      await expect(
        service.create(createWorkflowDto, 'company1', 'user1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return a workflow if found', async () => {
      const workflow = {
        id: 'workflow1',
        name: 'Test Workflow',
        nodes: [],
        edges: [],
      };

      mockPrismaService.workflow.findUnique.mockResolvedValue(workflow);

      const result = await service.findOne('workflow1');

      expect(mockPrismaService.workflow.findUnique).toHaveBeenCalledWith({
        where: { id: 'workflow1' },
        include: expect.any(Object),
      });
      expect(result).toEqual(workflow);
    });

    it('should throw NotFoundException if workflow not found', async () => {
      mockPrismaService.workflow.findUnique.mockResolvedValue(null);

      await expect(service.findOne('workflow1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a workflow without instances', async () => {
      const workflow = {
        id: 'workflow1',
        _count: { instances: 0 },
      };

      mockPrismaService.workflow.findUnique.mockResolvedValue(workflow);
      mockPrismaService.workflow.update.mockResolvedValue({
        ...workflow,
        isActive: false,
      });

      const result = await service.remove('workflow1');

      expect(mockPrismaService.workflow.update).toHaveBeenCalledWith({
        where: { id: 'workflow1' },
        data: { isActive: false },
      });
      expect(result.isActive).toBe(false);
    });

    it('should throw BadRequestException for workflow with active instances', async () => {
      const workflow = {
        id: 'workflow1',
        _count: { instances: 5 },
      };

      mockPrismaService.workflow.findUnique.mockResolvedValue(workflow);

      await expect(service.remove('workflow1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('startWorkflow', () => {
    it('should start a workflow execution', async () => {
      const instanceId = 'instance1';
      mockExecutionService.startWorkflow.mockResolvedValue(instanceId);

      const result = await service.startWorkflow('workflow1', 'request1');

      expect(mockExecutionService.startWorkflow).toHaveBeenCalledWith(
        'workflow1',
        'request1',
      );
      expect(result).toBe(instanceId);
    });
  });

  describe('getStatistics', () => {
    it('should return workflow statistics', async () => {
      mockPrismaService.workflow.count.mockResolvedValueOnce(10); // total
      mockPrismaService.workflow.count.mockResolvedValueOnce(8); // active
      mockPrismaService.workflowInstance.count.mockResolvedValueOnce(100); // total instances
      mockPrismaService.workflowInstance.count.mockResolvedValueOnce(75); // completed
      mockPrismaService.workflowApproval.count.mockResolvedValueOnce(5); // pending

      const result = await service.getStatistics('company1');

      expect(result).toEqual({
        totalWorkflows: 10,
        activeWorkflows: 8,
        totalInstances: 100,
        completedInstances: 75,
        pendingApprovals: 5,
        completionRate: 75,
      });
    });
  });
});
