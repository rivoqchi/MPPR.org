import { Injectable } from '@nestjs/common';
import {
  RealtimeEntityAction,
  RealtimeEntityName,
} from '../../common/types';
import { WebsocketGateway } from '../../modules/websocket/websocket.gateway';

@Injectable()
export class RealtimeService {
  constructor(private readonly websocketGateway: WebsocketGateway) {}

  emitEntityChange(
    entity: RealtimeEntityName,
    action: RealtimeEntityAction,
    data?: unknown,
  ) {
    this.websocketGateway.emitEntityChange(entity, action, data);
  }
}
