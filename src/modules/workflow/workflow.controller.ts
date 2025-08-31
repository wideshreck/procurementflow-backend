import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post()
  create(@Body() createWorkflowDto: CreateWorkflowDto, @Req() req) {
    const companyId = req.user.companyId;
    return this.workflowService.create(createWorkflowDto, companyId);
  }

  @Get()
  findAll(@Req() req) {
    const companyId = req.user.companyId;
    return this.workflowService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workflowService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWorkflowDto: UpdateWorkflowDto) {
    // TODO: Add validation to ensure user can only update workflows in their own company
    return this.workflowService.update(id, updateWorkflowDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    // TODO: Add validation to ensure user can only delete workflows in their own company
    return this.workflowService.remove(id);
  }
}
