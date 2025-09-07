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
}

interface NodeExecutionResult {
  status: 'completed' | 'waiting' | 'failed';
  output?: any;
  nextNodeId?: string | string[];
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
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, isActive: true },
      include: { nodes: true },
    });

    if (!workflow) {
      throw new NotFoundException('İş akışı bulunamadı veya aktif değil');
    }

    const startNode = workflow.nodes.find(
      n => n.type === WorkflowNodeType.PROCUREMENT_REQUEST,
    );

    if (!startNode) {
      throw new BadRequestException('İş akışında başlangıç node\'u bulunamadı');
    }

    const instance = await this.prisma.workflowInstance.create({
      data: {
        workflowId,
        procurementRequestId,
        status: WorkflowStatus.IN_PROGRESS,
        currentNodeId: startNode.nodeId,
        currentState: { variables: {} },
        history: [],
      },
    });

    const context: ExecutionContext = {
      instanceId: instance.id,
      workflowId: instance.workflowId,
      procurementRequestId: instance.procurementRequestId,
      variables: new Map<string, any>(),
    };

    await this.executeNode(instance.id, startNode.nodeId, context);

    return instance.id;
  }

  private async executeNode(
    instanceId: string,
    nodeId: string,
    context: ExecutionContext,
  ): Promise<void> {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: { workflow: { include: { nodes: true, edges: true } } },
    });

    if (!instance) {
      this.logger.error(`İş akışı örneği bulunamadı: ${instanceId}`);
      return;
    }

    const node = instance.workflow.nodes.find(n => n.nodeId === nodeId);
    if (!node) {
      this.logger.error(`Node bulunamadı: ${nodeId}`);
      return;
    }
    
    const execution = await this.prisma.workflowExecution.create({
      data: {
        workflowId: instance.workflowId,
        nodeId: node.nodeId,
        instanceId,
        status: ExecutionStatus.IN_PROGRESS,
      },
    });

    try {
      const result = await this.executeNodeByType(node, instance, context);

      if (result.status === 'completed' && result.output) {
        Object.entries(result.output).forEach(([key, value]) => {
          context.variables.set(`${node.nodeId}::${key}`, value);
        });
      }

      await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: result.status === 'completed' ? ExecutionStatus.COMPLETED : ExecutionStatus.PENDING,
          completedAt: new Date(),
          output: result.output || Prisma.JsonNull,
        },
      });

      await this.prisma.workflowInstance.update({
        where: { id: instanceId },
        data: {
          currentState: { variables: Object.fromEntries(context.variables) },
          history: { push: { nodeId, executedAt: new Date(), result: result.output } },
        },
      });

      if (result.status === 'completed') {
        if (result.nextNodeId) {
          const nextNodeIds = Array.isArray(result.nextNodeId) ? result.nextNodeId : [result.nextNodeId];
          for (const nextId of nextNodeIds) {
            await this.executeNode(nextId, nextId, context);
          }
        } else {
           const isEndNode = node.type === 'APPROVE' || node.type === 'REJECT';
           if(isEndNode) {
            await this.completeWorkflow(instanceId, node.type as WorkflowNodeType);
           }
        }
      }
    } catch (error) {
      await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: ExecutionStatus.FAILED,
          completedAt: new Date(),
          error: error.message,
        },
      });
    }
  }

  private async executeNodeByType(
    node: any,
    instance: any,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    switch (node.type as WorkflowNodeType) {
      case WorkflowNodeType.PROCUREMENT_REQUEST:
        return this.executeProcurementRequest(node, instance);
      case WorkflowNodeType.PERSON_APPROVAL:
      case WorkflowNodeType.DEPARTMENT_APPROVAL:
        return this.executeApproval(node, instance);
      case WorkflowNodeType.CONDITION_IF:
        return this.executeConditionIf(node, instance, context);
      case WorkflowNodeType.CONDITION_SWITCH:
        return this.executeConditionSwitch(node, instance, context);
      case WorkflowNodeType.PARALLEL_FORK:
        return this.executeParallelFork(node, instance);
      case WorkflowNodeType.PARALLEL_JOIN:
        return this.executeParallelJoin(node, instance, context);
      case WorkflowNodeType.APPROVE:
      case WorkflowNodeType.REJECT:
        return { status: 'completed', output: { finalStatus: node.type } };
      default:
        throw new Error(`Unsupported node type: ${node.type}`);
    }
  }

  private async executeProcurementRequest(node: any, instance: any): Promise<NodeExecutionResult> {
    const pr = await this.prisma.procurementRequest.findUnique({
      where: { id: instance.procurementRequestId },
      include: { category: true, deliveryDetails: true },
    });
    if (!pr) throw new NotFoundException(`Procurement request not found: ${instance.procurementRequestId}`);
    const nextEdge = (instance.workflow.edges as any[]).find(e => e.sourceId === node.nodeId);
    return {
      status: 'completed',
      output: {
        totalPrice: pr.totalPrice,
        unitPrice: pr.unitPrice,
        quantity: pr.quantity,
        category: pr.category?.name,
        urgency: pr.deliveryDetails?.urgency,
      },
      nextNodeId: nextEdge?.targetId,
    };
  }

  private async executeApproval(node: any, instance: any): Promise<NodeExecutionResult> {
    let approverId = node.data?.approverId;
    if (node.type === WorkflowNodeType.DEPARTMENT_APPROVAL) {
      const department = await this.prisma.department.findUnique({ where: { id: node.data?.departmentId } });
      if (!department?.managerId) throw new Error(`Department or manager not found for ID: ${node.data?.departmentId}`);
      approverId = department.managerId;
    }
    if (!approverId) throw new Error(`Approver not found for node: ${node.nodeId}`);
    
    await this.prisma.workflowApproval.create({
      data: {
        instanceId: instance.id,
        nodeId: node.nodeId,
        workflowId: instance.workflowId,
        approverId,
        status: ApprovalStatus.PENDING,
      },
    });
    return { status: 'waiting' };
  }

  private async executeConditionIf(node: any, instance: any, context: ExecutionContext): Promise<NodeExecutionResult> {
    const { operator, value } = node.data;
    const incomingEdge = (instance.workflow.edges as any[]).find(e => e.targetId === node.nodeId);
    const inputValue = context.variables.get(`${incomingEdge.sourceId}::${incomingEdge.sourceHandle}`);
    
    if (typeof inputValue !== 'number') throw new Error('Condition (IF) input must be a number.');

    let conditionMet = false;
    switch (operator) {
      case '>': conditionMet = inputValue > value; break;
      case '<': conditionMet = inputValue < value; break;
      case '=': conditionMet = inputValue === value; break;
      case '>=': conditionMet = inputValue >= value; break;
      case '<=': conditionMet = inputValue <= value; break;
      case '!=': conditionMet = inputValue !== value; break;
    }
    
    const sourceHandle = conditionMet ? 'yes' : 'no';
    const nextEdge = (instance.workflow.edges as any[]).find(e => e.sourceId === node.nodeId && e.sourceHandle === sourceHandle);
    return { status: 'completed', output: { result: conditionMet }, nextNodeId: nextEdge?.targetId };
  }

  private async executeConditionSwitch(node: any, instance: any, context: ExecutionContext): Promise<NodeExecutionResult> {
    const { cases } = node.data;
    const incomingEdge = (instance.workflow.edges as any[]).find(e => e.targetId === node.nodeId);
    const inputValue = context.variables.get(`${incomingEdge.sourceId}::${incomingEdge.sourceHandle}`);

    if (typeof inputValue !== 'string') throw new Error('Condition (SWITCH) input must be a string.');

    const caseIndex = cases.findIndex(c => c.value === inputValue);
    const sourceHandle = caseIndex !== -1 ? `case-${caseIndex}` : 'default';
    const nextEdge = (instance.workflow.edges as any[]).find(e => e.sourceId === node.nodeId && e.sourceHandle === sourceHandle);
    return { status: 'completed', output: { selectedCase: sourceHandle }, nextNodeId: nextEdge?.targetId };
  }

  private async executeParallelFork(node: any, instance: any): Promise<NodeExecutionResult> {
    const outgoingEdges = (instance.workflow.edges as any[]).filter(e => e.sourceId === node.nodeId);
    return { status: 'completed', nextNodeId: outgoingEdges.map(e => e.targetId) };
  }

  private async executeParallelJoin(node: any, instance: any, context: ExecutionContext): Promise<NodeExecutionResult> {
    const { strategy } = node.data;
    const incomingEdges = (instance.workflow.edges as any[]).filter(e => e.targetId === node.nodeId);
    const sourceNodeIds = incomingEdges.map(e => e.sourceId);

    const executions = await this.prisma.workflowExecution.findMany({
      where: { instanceId: instance.id, nodeId: { in: sourceNodeIds } },
    });

    if (executions.length < sourceNodeIds.length) {
      return { status: 'waiting' };
    }

    const results = sourceNodeIds.map(id => {
      // Assuming the output key is 'approved' or 'rejected' for boolean results
      return context.variables.get(`${id}::approved`) || context.variables.get(`${id}::result`) || false;
    });

    let proceed = false;
    if (strategy === 'ALL') {
      proceed = results.every(r => r === true);
    } else if (strategy === 'ANY') {
      proceed = results.some(r => r === true);
    }

    const nextEdge = (instance.workflow.edges as any[]).find(e => e.sourceId === node.nodeId);
    return { status: 'completed', output: { proceed }, nextNodeId: proceed ? nextEdge?.targetId : undefined };
  }

  private async completeWorkflow(instanceId: string, finalNodeType: WorkflowNodeType) {
    const status = finalNodeType === WorkflowNodeType.APPROVE ? WorkflowStatus.COMPLETED : WorkflowStatus.REJECTED;
    await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: { status, completedAt: new Date(), currentNodeId: null },
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
      where: { instanceId, nodeId, approverId, status: ApprovalStatus.PENDING },
    });
    if (!approval) throw new NotFoundException('Onay talebi bulunamadı veya zaten yanıtlanmış');

    await this.prisma.workflowApproval.update({
      where: { id: approval.id },
      data: {
        decision,
        comments,
        respondedAt: new Date(),
        status: decision === ApprovalDecision.APPROVE ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
      },
    });

    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: { workflow: { include: { nodes: true, edges: true } } },
    });
    
    if (!instance) throw new NotFoundException(`Workflow instance not found: ${instanceId}`);

    const currentState = instance.currentState as any;
    const context: ExecutionContext = {
      instanceId,
      workflowId: instance.workflowId,
      procurementRequestId: instance.procurementRequestId,
      variables: new Map(Object.entries(currentState.variables || {})),
    };

    const approved = decision === ApprovalDecision.APPROVE;
    context.variables.set(`${nodeId}::approved`, approved);
    context.variables.set(`${nodeId}::rejected`, !approved);

    const sourceHandle = approved ? 'approved' : 'rejected';
    const nextEdge = (instance.workflow.edges as any[]).find(e => e.sourceId === nodeId && e.sourceHandle === sourceHandle);

    if (nextEdge) {
      await this.executeNode(instance.id, nextEdge.targetId, context);
    } else {
      // If no path, check if it's a join
      const joinEdge = (instance.workflow.edges as any[]).find(e => e.sourceId === nodeId);
      const joinNode = (instance.workflow.nodes as any[]).find(n => n.nodeId === joinEdge?.targetId && n.type === 'PARALLEL_JOIN');
      if(joinNode) {
        await this.executeNode(instance.id, joinNode.nodeId, context);
      }
    }
  }
}
