import { Module } from '@nestjs/common';
import { WebsocketModule } from '../websocket/websocket.module';
import { StructuralUnitsController } from './structural-units.controller';
import { StructuralUnitsService } from './structural-units.service';

@Module({
  imports: [WebsocketModule],
  controllers: [StructuralUnitsController],
  providers: [StructuralUnitsService],
  exports: [StructuralUnitsService],
})
export class StructuralUnitsModule {}
