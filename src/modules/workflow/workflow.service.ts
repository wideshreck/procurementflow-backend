import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { NodeDto } from './dto/node.dto';
import { EdgeDto } from './dto/edge.dto';
import { z } from 'zod';

const ProcurementRequestNodeDataSchema = z.object({
  requesterDepartment: z.string(),
});

const ConditionIfElseNodeDataSchema = z.object({
  operator: z.enum(['>', '<', '=', '>=', '<=']),
  value: z.number(),
});

const ConditionCaseNodeDataSchema = z.object({
  cases: z.array(z.string()),
});

const ParallelForkNodeDataSchema = z.object({
  branchCount: z.number().min(2).max(10),
});

const ParallelJoinNodeDataSchema = z.object({
  joinPolicy: z.enum(['ALL_APPROVE', 'ANY_APPROVE', 'FIRST_DECIDES']),
});

const FormNodeDataSchema = z.object({
  person: z.string(),
  questions: z.array(z.string()),
});

const EmailNodeDataSchema = z.object({
  recipient: z.string(),
  subject: z.string(),
  message: z.string(),
});

@Injectable()
export class WorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  private validateWorkflow(nodes: NodeDto[], edges: EdgeDto[]) {
    // 1. Start node required
    const startNode = nodes.find((node) => node.type === 'purchaseRequest');
    if (!startNode) {
      throw new BadRequestException('Workflow must have a "purchaseRequest" start node.');
    }

    // 2. Node data validation
    for (const node of nodes) {
      try {
        switch (node.type) {
          case 'purchaseRequest':
            ProcurementRequestNodeDataSchema.parse(node.data);
            break;
          case 'condition-if-else':
            ConditionIfElseNodeDataSchema.parse(node.data);
            break;
          case 'condition-case':
            ConditionCaseNodeDataSchema.parse(node.data);
            break;
          case 'parallel-fork':
            ParallelForkNodeDataSchema.parse(node.data);
            break;
          case 'parallel-join':
            ParallelJoinNodeDataSchema.parse(node.data);
            break;
          case 'form':
            FormNodeDataSchema.parse(node.data);
            break;
          case 'email':
            EmailNodeDataSchema.parse(node.data);
            break;
        }
      } catch (error) {
        throw new BadRequestException(`Invalid data for node ${node.id} of type ${node.type}: ${error.message}`);
      }
    }

  }

  private getExpectedOutputHandles(node: NodeDto): string[] {
    switch (node.type) {
      case 'purchaseRequest':
        return ['totalCost', 'unitCost', 'quantity', 'urgency', 'deadline', 'category'];
      case 'condition-if-else':
        return ['yes', 'no'];
      case 'condition-case':
        return (node.data.cases || []).map((c, i) => `case-${i}`);
      case 'parallel-fork':
        return Array.from({ length: node.data.branchCount || 2 }, (_, i) => `branch-${i}`);
      default:
        return [];
    }
  }

  create(createWorkflowDto: CreateWorkflowDto, companyId: string) {
    const { nodes, edges, ...rest } = createWorkflowDto;
    this.validateWorkflow(nodes, edges);
    return this.prisma.workflow.create({
      data: {
        ...rest,
        companyId,
        nodes: nodes as any,
        edges: edges as any,
      },
    });
  }

  findAll(companyId: string) {
    return this.prisma.workflow.findMany({
      where: { companyId },
    });
  }

  findOne(id: string) {
    return this.prisma.workflow.findUnique({
      where: { id },
    });
  }

  async update(id: string, updateWorkflowDto: UpdateWorkflowDto) {
    const { nodes, edges, ...rest } = updateWorkflowDto;
    
    if (nodes && edges) {
      this.validateWorkflow(nodes, edges);
    } else {
      const workflow = await this.prisma.workflow.findUnique({ where: { id } });
      if (!workflow) {
        throw new BadRequestException('Workflow not found');
      }
      const currentNodes = (workflow as any).nodes as unknown as NodeDto[];
      const currentEdges = (workflow as any).edges as unknown as EdgeDto[];
      this.validateWorkflow(nodes || currentNodes, edges || currentEdges);
    }

    return this.prisma.workflow.update({
      where: { id },
      data: {
        ...rest,
        ...(nodes && { nodes: nodes as any }),
        ...(edges && { edges: edges as any }),
      },
    });
  }

  remove(id: string) {
    return this.prisma.workflow.delete({
      where: { id },
    });
  }
}
