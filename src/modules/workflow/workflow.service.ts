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
    // 1. Validate the entire workflow structure and data
    this.validator.validate(createWorkflowDto);

    const { nodes, edges, ...rest } = createWorkflowDto;

    // 2. Create workflow with related nodes and edges
    const workflow = await this.prisma.workflow.create({
      data: {
        ...rest,
        companyId,
        createdBy: userId,
        version: 1,
        nodes: {
          create: nodes.map((node) => ({
            nodeId: node.id,
            type: node.type as WorkflowNodeType, // Type is already validated by DTO
            label: node.label || node.type,
            position: node.position,
            data: node.data || {},
          })),
        },
        edges: {
          create: edges.map((edge) => ({
            edgeId: edge.id,
            sourceId: edge.source,
            targetId: edge.target,
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
    const existingWorkflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: { nodes: true, edges: true },
    });

    if (!existingWorkflow) {
      throw new NotFoundException('İş akışı bulunamadı');
    }

    const { nodes, edges, ...rest } = updateWorkflowDto;

    // If nodes and edges are part of the update, validate the new structure
    if (nodes && edges) {
      this.validator.validate({
        // Construct a DTO-like object for validation
        name: rest.name || existingWorkflow.name,
        description: rest.description || existingWorkflow.description || undefined,
        departmentId: rest.departmentId || existingWorkflow.departmentId || undefined,
        isActive: rest.isActive !== undefined ? rest.isActive : existingWorkflow.isActive,
        nodes,
        edges,
      });

      // Delete existing nodes and edges to replace them
      await this.prisma.workflowEdge.deleteMany({ where: { workflowId: id } });
      await this.prisma.workflowNode.deleteMany({ where: { workflowId: id } });
    }

    // Update workflow
    return this.prisma.workflow.update({
      where: { id },
      data: {
        ...rest,
        version: { increment: 1 },
        nodes: nodes
          ? {
              create: nodes.map((node) => ({
                nodeId: node.id,
                type: node.type as WorkflowNodeType,
                label: node.label || node.type,
                position: node.position,
                data: node.data || {},
              })),
            }
          : undefined,
        edges: edges
          ? {
              create: edges.map((edge) => ({
                edgeId: edge.id,
                sourceId: edge.source,
                targetId: edge.target,
                sourceHandle: edge.sourceHandle,
                targetHandle: edge.targetHandle,
                label: edge.label,
                dataType: edge.dataType,
              })),
            }
          : undefined,
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

}
