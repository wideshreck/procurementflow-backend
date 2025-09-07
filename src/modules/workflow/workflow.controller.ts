import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Req, 
  UseGuards,
  Query,
} from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ApprovalDecision } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post()
  create(@Body() createWorkflowDto: CreateWorkflowDto, @Req() req) {
    const companyId = req.user.companyId;
    const userId = req.user.id;
    return this.workflowService.create(createWorkflowDto, companyId, userId);
  }

  @Get()
  findAll(@Req() req) {
    const companyId = req.user.companyId;
    return this.workflowService.findAll(companyId);
  }

  @Get('statistics')
  getStatistics(@Req() req) {
    const companyId = req.user.companyId;
    return this.workflowService.getStatistics(companyId);
  }

  @Get('pending-approvals')
  getPendingApprovals(@Req() req) {
    const userId = req.user.id;
    return this.workflowService.getPendingApprovals(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workflowService.findOne(id);
  }

  @Get(':id/instances')
  getWorkflowInstances(@Param('id') id: string) {
    return this.workflowService.getWorkflowInstances(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWorkflowDto: UpdateWorkflowDto) {
    return this.workflowService.update(id, updateWorkflowDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.workflowService.remove(id);
  }

  @Post(':id/clone')
  clone(
    @Param('id') id: string,
    @Body('name') name: string,
    @Req() req,
  ) {
    const userId = req.user.id;
    return this.workflowService.clone(id, name, userId);
  }

  @Post(':id/start')
  startWorkflow(
    @Param('id') workflowId: string,
    @Body('procurementRequestId') procurementRequestId: string,
  ) {
    return this.workflowService.startWorkflow(workflowId, procurementRequestId);
  }

  @Get('instances/:instanceId')
  getInstanceDetails(@Param('instanceId') instanceId: string) {
    return this.workflowService.getInstanceDetails(instanceId);
  }

  @Post('instances/:instanceId/approve')
  handleApproval(
    @Param('instanceId') instanceId: string,
    @Body() body: {
      nodeId: string;
      decision: ApprovalDecision;
      comments?: string;
    },
    @Req() req,
  ) {
    const userId = req.user.id;
    return this.workflowService.handleApproval(
      instanceId,
      body.nodeId,
      userId,
      body.decision,
      body.comments,
    );
  }
}