import { Module } from '@nestjs/common';
import { WebsocketModule } from '../websocket/websocket.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AppRolesController } from './app-roles.controller';
import { AppRolesService } from './app-roles.service';

@Module({
  imports: [WebsocketModule, NotificationsModule],
  controllers: [AppRolesController],
  providers: [AppRolesService],
  exports: [AppRolesService],
})
export class AppRolesModule {}
