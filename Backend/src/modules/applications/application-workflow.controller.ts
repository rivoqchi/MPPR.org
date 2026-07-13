import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/types';
import { ApplicationWorkflowService } from './application-workflow.service';
import {
  CreateWorkflowMessageDto,
  UpdateWorkflowStatusDto,
} from './dto/application-workflow.dto';

@ApiTags('applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('applications/:applicationId/workflow')
export class ApplicationWorkflowController {
  constructor(private readonly applicationWorkflowService: ApplicationWorkflowService) {}

  @Get()
  @ApiOperation({ summary: 'Get application workflow chat and status' })
  getWorkflow(
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applicationWorkflowService.getWorkflow(applicationId, user);
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send workflow chat message' })
  createMessage(
    @Param('applicationId') applicationId: string,
    @Body() dto: CreateWorkflowMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applicationWorkflowService.createMessage(applicationId, dto, user);
  }

  @Patch('status')
  @ApiOperation({ summary: 'Update application workflow status' })
  updateStatus(
    @Param('applicationId') applicationId: string,
    @Body() dto: UpdateWorkflowStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applicationWorkflowService.updateStatus(applicationId, dto, user);
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Submitter confirms application after all units responded' })
  confirmWorkflow(
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applicationWorkflowService.confirmWorkflow(applicationId, user);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Submitter cancels application after all units responded' })
  cancelWorkflow(
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applicationWorkflowService.cancelWorkflow(applicationId, user);
  }
}
