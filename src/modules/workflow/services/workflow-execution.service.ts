import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  WorkflowStatus,
  WorkflowNodeType,
  ExecutionStatus,
  ApprovalStatus,
  ApprovalDecision,
  Prisma,
} from '@prisma/client';

interface ExecutionContext {
  instanceId: string;
  workflowId: string;
  procurementRequestId: string;
  variables: Map<string, any>;
  currentNodeId?: string;
}

interface NodeExecutionResult {
  status: 'completed' | 'waiting' | 'failed';
  output?: any;
  nextNodeId?: string;
  error?: string;
}

@Injectable()
export class WorkflowExecutionService {
  private readonly logger = new Logger(WorkflowExecutionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async startWorkflow(
    workflowId: string,
    procurementRequestId: string,
  ): Promise<string> {
    // Check if workflow exists and is active
    const workflow = await this.prisma.workflow.findFirst({
      where: {
        id: workflowId,
        isActive: true,
      },
      include: {
        nodes: true,
        edges: true,
      },
    });

    if (!workflow) {
      throw new NotFoundException('İş akışı bulunamadı veya aktif değil');
    }

    // Check if instance already exists
    const existingInstance = await this.prisma.workflowInstance.findUnique({
      where: { procurementRequestId },
    });

    if (existingInstance) {
      throw new BadRequestException('Bu talep için zaten bir iş akışı örneği mevcut');
    }

    // Find start node (PROCUREMENT_REQUEST)
    const startNode = workflow.nodes.find(
      n => n.type === WorkflowNodeType.PROCUREMENT_REQUEST
    );

    if (!startNode) {
      throw new BadRequestException('İş akışında başlangıç node\'u bulunamadı');
    }

    // Create workflow instance
    const instance = await this.prisma.workflowInstance.create({
      data: {
        workflowId,
        procurementRequestId,
        status: WorkflowStatus.IN_PROGRESS,
        currentNodeId: startNode.nodeId,
        currentState: {},
        history: [],
      },
    });

    // Start execution
    await this.executeNode(instance.id, startNode.nodeId);

    return instance.id;
  }

  async executeNode(instanceId: string, nodeId: string): Promise<NodeExecutionResult> {
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
            deliveryDetails: true,
            category: true,
          },
        },
      },
    });

    if (!instance) {
      throw new NotFoundException('İş akışı örneği bulunamadı');
    }

    const node = instance.workflow.nodes.find(n => n.nodeId === nodeId);
    if (!node) {
      throw new NotFoundException(`Node bulunamadı: ${nodeId}`);
    }

    // Create execution record
    const execution = await this.prisma.workflowExecution.create({
      data: {
        workflowId: instance.workflowId,
        nodeId: node.nodeId,
        instanceId,
        status: ExecutionStatus.IN_PROGRESS,
      },
    });

    try {
      const result = await this.executeNodeByType(node, instance);

      // Update execution record
      await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: result.status === 'completed' 
            ? ExecutionStatus.COMPLETED 
            : ExecutionStatus.PENDING,
          completedAt: result.status === 'completed' ? new Date() : null,
          output: result.output || Prisma.JsonNull,
        },
      });

      // Update instance state
      if (result.nextNodeId) {
        await this.prisma.workflowInstance.update({
          where: { id: instanceId },
          data: {
            currentNodeId: result.nextNodeId,
            history: {
              push: {
                nodeId,
                executedAt: new Date(),
                result: result.output,
              },
            },
          },
        });

        // Continue execution if not waiting
        if (result.status === 'completed') {
          return await this.executeNode(instanceId, result.nextNodeId);
        }
      } else if (result.status === 'completed') {
        // Workflow completed
        await this.completeWorkflow(instanceId, node.type);
      }

      return result;
    } catch (error) {
      // Update execution with error
      await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: ExecutionStatus.FAILED,
          completedAt: new Date(),
          error: error.message,
        },
      });

      throw error;
    }
  }

  private async executeNodeByType(
    node: any,
    instance: any,
  ): Promise<NodeExecutionResult> {
    switch (node.type) {
      case WorkflowNodeType.PROCUREMENT_REQUEST:
        return this.executeProcurementRequest(node, instance);
      
      case WorkflowNodeType.PERSON_APPROVAL:
        return this.executePersonApproval(node, instance);
      
      case WorkflowNodeType.DEPARTMENT_APPROVAL:
        return this.executeDepartmentApproval(node, instance);
      
      case WorkflowNodeType.CONDITION_IF:
        return this.executeConditionIf(node, instance);
      
      case WorkflowNodeType.CONDITION_SWITCH:
        return this.executeConditionSwitch(node, instance);
      
      case WorkflowNodeType.PARALLEL_FORK:
        return this.executeParallelFork(node, instance);
      
      case WorkflowNodeType.PARALLEL_JOIN:
        return this.executeParallelJoin(node, instance);
      
      case WorkflowNodeType.EMAIL_NOTIFICATION:
        return this.executeEmailNotification(node, instance);
      
      case WorkflowNodeType.APPROVE:
        return this.executeApprove(node, instance);
      
      case WorkflowNodeType.REJECT:
        return this.executeReject(node, instance);
      
      default:
        throw new BadRequestException(`Desteklenmeyen node tipi: ${node.type}`);
    }
  }

  private async executeProcurementRequest(
    node: any,
    instance: any,
  ): Promise<NodeExecutionResult> {
    const pr = instance.procurementRequest;
    
    // Extract PR data for workflow
    const output = {
      totalPrice: pr.totalPrice,
      unitPrice: pr.unitPrice,
      quantity: pr.quantity,
      category: pr.category?.name,
      urgency: pr.deliveryDetails?.urgency,
      departmentId: node.data?.departmentId,
    };

    // Find next node
    const nextEdge = instance.workflow.edges.find(
      (e: any) => e.sourceId === node.nodeId
    );

    return {
      status: 'completed',
      output,
      nextNodeId: nextEdge?.targetId,
    };
  }

  private async executePersonApproval(
    node: any,
    instance: any,
  ): Promise<NodeExecutionResult> {
    const approverId = node.data?.approverId;
    
    if (!approverId) {
      throw new BadRequestException('Onaylayıcı belirtilmemiş');
    }

    // Create approval request
    await this.prisma.workflowApproval.create({
      data: {
        instanceId: instance.id,
        nodeId: node.nodeId,
        workflowId: instance.workflowId,
        approverId,
        status: ApprovalStatus.PENDING,
      },
    });

    // Send notification (implement notification service)
    this.logger.log(`Onay talebi gönderildi: ${approverId}`);

    return {
      status: 'waiting',
      output: { waitingFor: 'approval', approverId },
    };
  }

  private async executeDepartmentApproval(
    node: any,
    instance: any,
  ): Promise<NodeExecutionResult> {
    const departmentId = node.data?.departmentId;
    
    if (!departmentId) {
      throw new BadRequestException('Departman belirtilmemiş');
    }

    // Find department manager
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      throw new NotFoundException('Departman bulunamadı');
    }

    // Create approval request for manager
    await this.prisma.workflowApproval.create({
      data: {
        instanceId: instance.id,
        nodeId: node.nodeId,
        workflowId: instance.workflowId,
        approverId: department.managerId,
        status: ApprovalStatus.PENDING,
      },
    });

    return {
      status: 'waiting',
      output: { waitingFor: 'departmentApproval', departmentId },
    };
  }

  private async executeConditionIf(
    node: any,
    instance: any,
  ): Promise<NodeExecutionResult> {
    const { field, operator, value } = node.data || {};
    const pr = instance.procurementRequest;
    
    let fieldValue: any;
    switch (field) {
      case 'totalPrice':
        fieldValue = Number(pr.totalPrice);
        break;
      case 'unitPrice':
        fieldValue = Number(pr.unitPrice);
        break;
      case 'quantity':
        fieldValue = pr.quantity;
        break;
      case 'urgency':
        fieldValue = pr.deliveryDetails?.urgency;
        break;
      default:
        throw new BadRequestException(`Geçersiz alan: ${field}`);
    }

    let conditionMet = false;
    const numValue = Number(value);

    switch (operator) {
      case '>':
        conditionMet = fieldValue > numValue;
        break;
      case '<':
        conditionMet = fieldValue < numValue;
        break;
      case '=':
        conditionMet = fieldValue === value;
        break;
      case '!=':
        conditionMet = fieldValue !== value;
        break;
      case '>=':
        conditionMet = fieldValue >= numValue;
        break;
      case '<=':
        conditionMet = fieldValue <= numValue;
        break;
    }

    // Find appropriate edge based on condition result
    const sourceHandle = conditionMet ? 'yes' : 'no';
    const nextEdge = instance.workflow.edges.find(
      (e: any) => e.sourceId === node.nodeId && e.sourceHandle === sourceHandle
    );

    return {
      status: 'completed',
      output: { conditionMet, field, operator, value, fieldValue },
      nextNodeId: nextEdge?.targetId,
    };
  }

  private async executeConditionSwitch(
    node: any,
    instance: any,
  ): Promise<NodeExecutionResult> {
    const { field, cases } = node.data || {};
    const pr = instance.procurementRequest;
    
    let fieldValue: any;
    switch (field) {
      case 'category':
        fieldValue = pr.category?.name;
        break;
      case 'urgency':
        fieldValue = pr.deliveryDetails?.urgency;
        break;
      case 'department':
        fieldValue = node.data?.departmentId;
        break;
      default:
        throw new BadRequestException(`Geçersiz alan: ${field}`);
    }

    // Find matching case
    const caseIndex = cases?.findIndex((c: any) => c.value === fieldValue) ?? -1;
    const sourceHandle = caseIndex >= 0 ? `case-${caseIndex}` : 'default';
    
    const nextEdge = instance.workflow.edges.find(
      (e: any) => e.sourceId === node.nodeId && e.sourceHandle === sourceHandle
    );

    return {
      status: 'completed',
      output: { field, value: fieldValue, matchedCase: sourceHandle },
      nextNodeId: nextEdge?.targetId,
    };
  }

  private async executeParallelFork(
    node: any,
    instance: any,
  ): Promise<NodeExecutionResult> {
    const branchCount = node.data?.branchCount || 2;
    
    // Find all outgoing edges
    const outgoingEdges = instance.workflow.edges.filter(
      (e: any) => e.sourceId === node.nodeId
    );

    // Execute all branches
    const branchPromises = outgoingEdges.map((edge: any) => 
      this.executeNode(instance.id, edge.targetId)
    );

    // Don't wait for branches to complete
    Promise.all(branchPromises).catch(error => {
      this.logger.error(`Paralel dal hatası: ${error.message}`);
    });

    return {
      status: 'completed',
      output: { branchCount, branches: outgoingEdges.map((e: any) => e.targetId) },
    };
  }

  private async executeParallelJoin(
    node: any,
    instance: any,
  ): Promise<NodeExecutionResult> {
    const joinStrategy = node.data?.joinStrategy || 'ALL_APPROVE';
    
    // Check all incoming nodes' execution status
    const incomingEdges = instance.workflow.edges.filter(
      (e: any) => e.targetId === node.nodeId
    );

    const executions = await this.prisma.workflowExecution.findMany({
      where: {
        instanceId: instance.id,
        nodeId: {
          in: incomingEdges.map((e: any) => e.sourceId),
        },
      },
    });

    const allCompleted = executions.every(
      e => e.status === ExecutionStatus.COMPLETED
    );

    if (!allCompleted) {
      return {
        status: 'waiting',
        output: { waitingFor: 'parallelBranches' },
      };
    }

    // Check approval decisions based on strategy
    let proceed = false;
    const approvals = await this.prisma.workflowApproval.findMany({
      where: {
        instanceId: instance.id,
        nodeId: {
          in: incomingEdges.map((e: any) => e.sourceId),
        },
      },
    });

    switch (joinStrategy) {
      case 'ALL_APPROVE':
        proceed = approvals.every(a => a.decision === ApprovalDecision.APPROVE);
        break;
      case 'ANY_APPROVE':
        proceed = approvals.some(a => a.decision === ApprovalDecision.APPROVE);
        break;
      case 'ONE_APPROVE':
        proceed = approvals.filter(a => a.decision === ApprovalDecision.APPROVE).length >= 1;
        break;
    }

    const nextEdge = instance.workflow.edges.find(
      (e: any) => e.sourceId === node.nodeId
    );

    return {
      status: 'completed',
      output: { joinStrategy, proceed, approvalCount: approvals.length },
      nextNodeId: proceed ? nextEdge?.targetId : undefined,
    };
  }

  private async executeEmailNotification(
    node: any,
    instance: any,
  ): Promise<NodeExecutionResult> {
    const { to, subject, template } = node.data || {};
    
    // TODO: Implement email service
    this.logger.log(`E-posta gönderildi: ${to} - ${subject}`);

    const nextEdge = instance.workflow.edges.find(
      (e: any) => e.sourceId === node.nodeId
    );

    return {
      status: 'completed',
      output: { emailSent: true, to, subject },
      nextNodeId: nextEdge?.targetId,
    };
  }

  private async executeApprove(
    node: any,
    instance: any,
  ): Promise<NodeExecutionResult> {
    await this.prisma.procurementRequest.update({
      where: { id: instance.procurementRequestId },
      data: {
        status: 'APPROVED',
        auditTrail: {
          push: {
            action: 'WORKFLOW_APPROVED',
            timestamp: new Date(),
            workflowId: instance.workflowId,
          },
        },
      },
    });

    return {
      status: 'completed',
      output: { approved: true, message: node.data?.message },
    };
  }

  private async executeReject(
    node: any,
    instance: any,
  ): Promise<NodeExecutionResult> {
    await this.prisma.procurementRequest.update({
      where: { id: instance.procurementRequestId },
      data: {
        status: 'REJECTED',
        auditTrail: {
          push: {
            action: 'WORKFLOW_REJECTED',
            timestamp: new Date(),
            workflowId: instance.workflowId,
            reason: node.data?.reason,
          },
        },
      },
    });

    return {
      status: 'completed',
      output: { rejected: true, reason: node.data?.reason },
    };
  }

  private async completeWorkflow(instanceId: string, finalNodeType: WorkflowNodeType) {
    const status = finalNodeType === WorkflowNodeType.APPROVE 
      ? WorkflowStatus.COMPLETED 
      : WorkflowStatus.REJECTED;

    await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status,
        completedAt: new Date(),
        currentNodeId: null,
      },
    });
  }

  async handleApprovalResponse(
    instanceId: string,
    nodeId: string,
    approverId: string,
    decision: ApprovalDecision,
    comments?: string,
  ): Promise<void> {
    const approval = await this.prisma.workflowApproval.findFirst({
      where: {
        instanceId,
        nodeId,
        approverId,
        status: ApprovalStatus.PENDING,
      },
    });

    if (!approval) {
      throw new NotFoundException('Onay talebi bulunamadı veya zaten yanıtlanmış');
    }

    // Update approval
    await this.prisma.workflowApproval.update({
      where: { id: approval.id },
      data: {
        status: ApprovalStatus.APPROVED,
        decision,
        comments,
        respondedAt: new Date(),
      },
    });

    // Find next node based on decision
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        workflow: {
          include: { edges: true },
        },
      },
    });

    if (!instance) {
      throw new NotFoundException('İş akışı örneği bulunamadı');
    }

    const sourceHandle = decision === ApprovalDecision.APPROVE ? 'approved' : 'rejected';
    const nextEdge = instance.workflow.edges.find(
      (e: any) => e.sourceId === nodeId && e.sourceHandle === sourceHandle
    );

    if (nextEdge) {
      await this.executeNode(instanceId, nextEdge.targetId);
    }
  }
}