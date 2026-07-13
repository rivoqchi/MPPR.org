import { Module } from '@nestjs/common';
import { WebsocketModule } from '../websocket/websocket.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ApplicationWorkflowController } from './application-workflow.controller';
import { ApplicationWorkflowService } from './application-workflow.service';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

@Module({
  imports: [WebsocketModule, NotificationsModule],
  controllers: [ApplicationsController, ApplicationWorkflowController],
  providers: [ApplicationsService, ApplicationWorkflowService],
  exports: [ApplicationsService, ApplicationWorkflowService],
})
export class ApplicationsModule {}
