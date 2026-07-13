import { Module } from '@nestjs/common';
import { WebsocketModule } from '../websocket/websocket.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PprCalendarController } from './ppr-calendar.controller';
import { PprCalendarService } from './ppr-calendar.service';

@Module({
  imports: [WebsocketModule, NotificationsModule],
  controllers: [PprCalendarController],
  providers: [PprCalendarService],
  exports: [PprCalendarService],
})
export class PprCalendarModule {}
