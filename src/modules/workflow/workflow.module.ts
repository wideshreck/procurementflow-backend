import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { WorkflowValidatorService } from './services/workflow-validator.service';
import { WorkflowExecutionService } from './services/workflow-execution.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WorkflowController],
  providers: [
    WorkflowService,
    WorkflowValidatorService,
    WorkflowExecutionService,
  ],
  exports: [WorkflowService, WorkflowExecutionService],
})
export class WorkflowModule {}
