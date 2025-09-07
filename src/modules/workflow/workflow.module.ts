import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { WorkflowValidatorService } from './services/workflow-validator.service';
import { WorkflowExecutionService } from './services/workflow-execution.service';

@Module({
  controllers: [WorkflowController],
  providers: [
    WorkflowService,
    WorkflowValidatorService,
    WorkflowExecutionService,
  ],
  exports: [WorkflowService],
})
export class WorkflowModule {}
