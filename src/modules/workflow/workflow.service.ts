import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkflowValidatorService } from './services/workflow-validator.service';
import { WorkflowExecutionService } from './services/workflow-execution.service';
import { WorkflowNodeType, ApprovalDecision, WorkflowStatus } from '@prisma/client';

@Injectable()
export class WorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: WorkflowValidatorService,
    private readonly execution: WorkflowExecutionService,
  ) {}

  async create(createWorkflowDto: CreateWorkflowDto, companyId: string, userId: string) {
    const { nodes, edges, ...rest } = createWorkflowDto;
    
    // Validate workflow
    const validationResult = this.validator.validateWorkflow(nodes, edges);
    
    if (!validationResult.isValid) {
      throw new BadRequestException({
        message: 'İş akışı doğrulama hatası',
        errors: validationResult.errors,
        warnings: validationResult.warnings,
      });
    }
    
    // Create workflow with related nodes and edges
    const workflow = await this.prisma.workflow.create({
      data: {
        ...rest,
        companyId,
        createdBy: userId,
        version: 1,
        nodes: {
          create: nodes.map(node => ({
            nodeId: node.id,
            type: this.mapNodeType(node.type),
            label: node.data?.label || node.type,
            position: node.position,
            data: node.data || {},
          })),
        },
        edges: {
          create: edges.map(edge => ({
            edgeId: edge.id,
            sourceId: edge.source,
            targetId: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            label: (edge as any).label,
            dataType: (edge as any).dataType || 'ANY',
          })),
        },
      },
      include: {
        nodes: true,
        edges: true,
        department: true,
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
    
    return workflow;
  }

  async findAll(companyId: string) {
    return this.prisma.workflow.findMany({
      where: { 
        companyId,
        isActive: true,
      },
      include: {
        department: true,
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            instances: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: {
        nodes: true,
        edges: true,
        department: true,
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        instances: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            procurementRequest: true,
          },
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException('İş akışı bulunamadı');
    }

    return workflow;
  }

  async update(id: string, updateWorkflowDto: UpdateWorkflowDto) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
    });

    if (!workflow) {
      throw new NotFoundException('İş akışı bulunamadı');
    }

    const { nodes, edges, ...rest } = updateWorkflowDto;

    // If nodes and edges are provided, validate them
    if (nodes && edges) {
      const validationResult = this.validator.validateWorkflow(nodes, edges);
      
      if (!validationResult.isValid) {
        throw new BadRequestException({
          message: 'İş akışı doğrulama hatası',
          errors: validationResult.errors,
          warnings: validationResult.warnings,
        });
      }

      // Delete existing nodes and edges
      await this.prisma.workflowNode.deleteMany({
        where: { workflowId: id },
      });

      await this.prisma.workflowEdge.deleteMany({
        where: { workflowId: id },
      });
    }

    // Update workflow
    return this.prisma.workflow.update({
      where: { id },
      data: {
        ...rest,
        version: { increment: 1 },
        nodes: nodes ? {
          create: nodes.map(node => ({
            nodeId: node.id,
            type: this.mapNodeType(node.type),
            label: node.data?.label || node.type,
            position: node.position,
            data: node.data || {},
          })),
        } : undefined,
        edges: edges ? {
          deleteMany: {},
          create: edges.map(edge => ({
            edgeId: edge.id,
            sourceId: edge.source,
            targetId: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            label: (edge as any).label,
            dataType: (edge as any).dataType || 'ANY',
          })),
        } : undefined,
      },
      include: {
        nodes: true,
        edges: true,
        department: true,
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            instances: true,
          },
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException('İş akışı bulunamadı');
    }

    if (workflow._count.instances > 0) {
      throw new BadRequestException('Aktif örnekleri olan iş akışı silinemez');
    }

    // Soft delete - just mark as inactive
    return this.prisma.workflow.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }

  async clone(id: string, name: string, userId: string) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: {
        nodes: true,
        edges: true,
      },
    });

    if (!workflow) {
      throw new NotFoundException('İş akışı bulunamadı');
    }

    // Create a clone
    return this.prisma.workflow.create({
      data: {
        name,
        description: workflow.description,
        companyId: workflow.companyId,
        departmentId: workflow.departmentId,
        createdBy: userId,
        version: 1,
        nodes: {
          create: workflow.nodes.map(node => ({
            nodeId: node.nodeId,
            type: node.type,
            label: node.label,
            position: node.position as any,
            data: node.data as any,
          })),
        },
        edges: {
          create: workflow.edges.map(edge => ({
            edgeId: edge.edgeId,
            sourceId: edge.sourceId,
            targetId: edge.targetId,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            label: edge.label,
            dataType: edge.dataType,
          })),
        },
      },
      include: {
        nodes: true,
        edges: true,
      },
    });
  }

  // Workflow execution methods
  async startWorkflow(workflowId: string, procurementRequestId: string) {
    return this.execution.startWorkflow(workflowId, procurementRequestId);
  }

  async handleApproval(
    instanceId: string,
    nodeId: string,
    userId: string,
    decision: ApprovalDecision,
    comments?: string,
  ) {
    return this.execution.handleApprovalResponse(
      instanceId,
      nodeId,
      userId,
      decision,
      comments,
    );
  }

  async getWorkflowInstances(workflowId: string) {
    return this.prisma.workflowInstance.findMany({
      where: { workflowId },
      include: {
        procurementRequest: {
          include: {
            category: true,
            deliveryDetails: true,
          },
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getInstanceDetails(instanceId: string) {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        workflow: {
          include: {
            nodes: true,
            edges: true,
          },
        },
        procurementRequest: {
          include: {
            category: true,
            deliveryDetails: true,
            technicalSpecifications: true,
          },
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            node: true,
          },
        },
      },
    });

    if (!instance) {
      throw new NotFoundException('İş akışı örneği bulunamadı');
    }

    // Get execution history
    const executions = await this.prisma.workflowExecution.findMany({
      where: { instanceId },
      include: {
        node: true,
      },
      orderBy: {
        startedAt: 'asc',
      },
    });

    return {
      ...instance,
      executions,
    };
  }

  async getPendingApprovals(userId: string) {
    return this.prisma.workflowApproval.findMany({
      where: {
        approverId: userId,
        status: 'PENDING',
      },
      include: {
        instance: {
          include: {
            workflow: true,
            procurementRequest: {
              include: {
                category: true,
                deliveryDetails: true,
              },
            },
          },
        },
        node: true,
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });
  }

  async getStatistics(companyId: string) {
    const [
      totalWorkflows,
      activeWorkflows,
      totalInstances,
      completedInstances,
      pendingApprovals,
    ] = await Promise.all([
      this.prisma.workflow.count({
        where: { companyId },
      }),
      this.prisma.workflow.count({
        where: { companyId, isActive: true },
      }),
      this.prisma.workflowInstance.count({
        where: {
          workflow: { companyId },
        },
      }),
      this.prisma.workflowInstance.count({
        where: {
          workflow: { companyId },
          status: WorkflowStatus.COMPLETED,
        },
      }),
      this.prisma.workflowApproval.count({
        where: {
          instance: {
            workflow: { companyId },
          },
          status: 'PENDING',
        },
      }),
    ]);

    return {
      totalWorkflows,
      activeWorkflows,
      totalInstances,
      completedInstances,
      pendingApprovals,
      completionRate: totalInstances > 0 
        ? Math.round((completedInstances / totalInstances) * 100) 
        : 0,
    };
  }

  private mapNodeType(type: string): WorkflowNodeType {
    const typeMap: Record<string, WorkflowNodeType> = {
      'procurement-request': WorkflowNodeType.PROCUREMENT_REQUEST,
      'purchaseRequest': WorkflowNodeType.PROCUREMENT_REQUEST,
      'PROCUREMENT_REQUEST': WorkflowNodeType.PROCUREMENT_REQUEST,
      'purchaseRequestApprove': WorkflowNodeType.APPROVE,
      'APPROVE': WorkflowNodeType.APPROVE,
      'purchaseRequestReject': WorkflowNodeType.REJECT,
      'REJECT': WorkflowNodeType.REJECT,
      'condition-if-else': WorkflowNodeType.CONDITION_IF,
      'condition': WorkflowNodeType.CONDITION_IF,
      'CONDITION_IF': WorkflowNodeType.CONDITION_IF,
      'condition-case': WorkflowNodeType.CONDITION_SWITCH,
      'CONDITION_SWITCH': WorkflowNodeType.CONDITION_SWITCH,
      'parallel-fork': WorkflowNodeType.PARALLEL_FORK,
      'PARALLEL_FORK': WorkflowNodeType.PARALLEL_FORK,
      'parallel-join': WorkflowNodeType.PARALLEL_JOIN,
      'PARALLEL_JOIN': WorkflowNodeType.PARALLEL_JOIN,
      'personApproval': WorkflowNodeType.PERSON_APPROVAL,
      'PERSON_APPROVAL': WorkflowNodeType.PERSON_APPROVAL,
      'departmentApproval': WorkflowNodeType.DEPARTMENT_APPROVAL,
      'DEPARTMENT_APPROVAL': WorkflowNodeType.DEPARTMENT_APPROVAL,
      'email': WorkflowNodeType.EMAIL_NOTIFICATION,
      'EMAIL_NOTIFICATION': WorkflowNodeType.EMAIL_NOTIFICATION,
      'form': WorkflowNodeType.FORM,
      'FORM': WorkflowNodeType.FORM,
    };

    const mappedType = typeMap[type];
    if (!mappedType) {
      throw new BadRequestException(`Desteklenmeyen node tipi: ${type}`);
    }

    return mappedType;
  }

  getNodeOutputPorts(node: any): string[] {
    return this.validator.getNodeOutputPorts(node.type, node.data);
  }

  getNodeInputPorts(node: any): string[] {
    return this.validator.getNodeInputPorts(node.type, node.data);
  }
}