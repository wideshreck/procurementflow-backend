import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';

@Injectable()
export class WorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  create(createWorkflowDto: CreateWorkflowDto, companyId: string) {
    return this.prisma.workflow.create({
      data: {
        ...createWorkflowDto,
        companyId,
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

  update(id: string, updateWorkflowDto: UpdateWorkflowDto) {
    return this.prisma.workflow.update({
      where: { id },
      data: updateWorkflowDto,
    });
  }

  remove(id: string) {
    return this.prisma.workflow.delete({
      where: { id },
    });
  }
}
