import { Module } from '@nestjs/common';
import { WebsocketModule } from '../websocket/websocket.module';
import { RegisteredObjectsController } from './registered-objects.controller';
import { RegisteredObjectsService } from './registered-objects.service';

@Module({
  imports: [WebsocketModule],
  controllers: [RegisteredObjectsController],
  providers: [RegisteredObjectsService],
  exports: [RegisteredObjectsService],
})
export class RegisteredObjectsModule {}
