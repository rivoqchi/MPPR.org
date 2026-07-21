import { Module } from '@nestjs/common';
import { WebsocketModule } from '../websocket/websocket.module';
import { GuideVideosController } from './guide-videos.controller';
import { GuideVideosService } from './guide-videos.service';

@Module({
  imports: [WebsocketModule],
  controllers: [GuideVideosController],
  providers: [GuideVideosService],
  exports: [GuideVideosService],
})
export class GuideVideosModule {}
