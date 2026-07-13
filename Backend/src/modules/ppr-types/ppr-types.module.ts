import { Module } from '@nestjs/common';
import { WebsocketModule } from '../websocket/websocket.module';
import { PprTypesController } from './ppr-types.controller';
import { PprTypesService } from './ppr-types.service';

@Module({
  imports: [WebsocketModule],
  controllers: [PprTypesController],
  providers: [PprTypesService],
  exports: [PprTypesService],
})
export class PprTypesModule {}
