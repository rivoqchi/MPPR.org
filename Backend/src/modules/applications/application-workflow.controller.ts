import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/types';
import { ApplicationWorkflowService } from './application-workflow.service';
import {
  CreateWorkflowMessageDto,
  ForwardWorkflowDto,
  ReleaseWorkflowDto,
  UpdateWorkflowMessageDto,
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

  @Post('accept')
  @ApiOperation({ summary: 'Accept assigned application' })
  accept(
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applicationWorkflowService.acceptAssignment(applicationId, user);
  }

  @Post('forward')
  @ApiOperation({ summary: 'Forward application to another user' })
  forward(
    @Param('applicationId') applicationId: string,
    @Body() dto: ForwardWorkflowDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applicationWorkflowService.forwardAssignment(applicationId, dto, user);
  }

  @Post('reply')
  @ApiOperation({ summary: 'Send a single reply for current assignment' })
  reply(
    @Param('applicationId') applicationId: string,
    @Body() dto: CreateWorkflowMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applicationWorkflowService.replyAssignment(applicationId, dto, user);
  }

  @Patch('messages/:messageId')
  @ApiOperation({ summary: 'Edit own reply message' })
  updateMessage(
    @Param('applicationId') applicationId: string,
    @Param('messageId') messageId: string,
    @Body() dto: UpdateWorkflowMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applicationWorkflowService.updateReplyMessage(
      applicationId,
      messageId,
      dto,
      user,
    );
  }

  @Post('release')
  @ApiOperation({ summary: 'Release supervision / close application' })
  release(
    @Param('applicationId') applicationId: string,
    @Body() dto: ReleaseWorkflowDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applicationWorkflowService.releaseSupervision(applicationId, dto, user);
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send workflow reply (alias)' })
  createMessage(
    @Param('applicationId') applicationId: string,
    @Body() dto: CreateWorkflowMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applicationWorkflowService.createMessage(applicationId, dto, user);
  }

  @Patch('status')
  @ApiOperation({ summary: 'Update application workflow status (legacy)' })
  updateStatus(
    @Param('applicationId') applicationId: string,
    @Body() dto: UpdateWorkflowStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applicationWorkflowService.updateStatus(applicationId, dto, user);
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Submitter releases/confirms application' })
  confirmWorkflow(
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applicationWorkflowService.confirmWorkflow(applicationId, user);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Submitter cancels application' })
  cancelWorkflow(
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applicationWorkflowService.cancelWorkflow(applicationId, user);
  }
}
