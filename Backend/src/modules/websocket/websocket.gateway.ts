import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server, Socket } from 'socket.io';
import {
  JwtPayload,
  RealtimeEntityAction,
  RealtimeEntityName,
} from '../../common/types';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';

const ONLINE_USERS_SET_KEY = 'presence:users:online';

interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      id: string;
      phone: string;
      roleId: string;
    };
  };
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
  path: process.env.WS_PATH || '/socket.io',
})
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(WebsocketGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  private getUserConnectionKey(userId: string) {
    return `presence:user:${userId}:connections`;
  }

  afterInit(server: Server) {
    const pubClient = this.redisService.getClient();
    const subClient = this.redisService.createDuplicateClient();
    server.adapter(createAdapter(pubClient, subClient));
    this.logger.log('Socket.io Redis adapter initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ||
        (client.handshake.query?.token as string | undefined);

      if (!token) {
        this.logger.warn(`Connection rejected: missing token (${client.id})`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, phone: true, roleId: true, isActive: true },
      });

      if (!user || !user.isActive) {
        client.disconnect();
        return;
      }

      client.data.user = {
        id: user.id,
        phone: user.phone,
        roleId: user.roleId,
      };

      await client.join(`user:${user.id}`);
      await client.join(`role:${user.roleId}`);

      const redis = this.redisService.getClient();
      const connectionCount = await redis.incr(this.getUserConnectionKey(user.id));

      if (connectionCount === 1) {
        await redis.sadd(ONLINE_USERS_SET_KEY, user.id);
        this.server.emit('user:status_changed', {
          userId: user.id,
          isOnline: true,
          lastSeenAt: null,
        });
      }

      this.logger.log(`Client connected: ${user.phone} (${client.id})`);
    } catch {
      this.logger.warn(`Connection rejected: invalid token (${client.id})`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data?.user;

    if (user) {
      void (async () => {
        try {
          const redis = this.redisService.getClient();
          const connectionKey = this.getUserConnectionKey(user.id);
          const remainingConnections = await redis.decr(connectionKey);

          if (remainingConnections <= 0) {
            await redis.del(connectionKey);
            await redis.srem(ONLINE_USERS_SET_KEY, user.id);

            const updatedUser = await this.prisma.user.update({
              where: { id: user.id },
              data: { lastSeenAt: new Date() },
              select: { lastSeenAt: true },
            });

            this.server.emit('user:status_changed', {
              userId: user.id,
              isOnline: false,
              lastSeenAt: updatedUser.lastSeenAt?.toISOString() ?? null,
            });
          }

          this.logger.log(`Client disconnected: ${user.phone} (${client.id})`);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(`Failed to update disconnect presence: ${message}`);
        }
      })();
    }
  }

  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  emitToRole(roleId: string, event: string, data: unknown) {
    this.server.to(`role:${roleId}`).emit(event, data);
  }

  emitEntityChange(
    entity: RealtimeEntityName,
    action: RealtimeEntityAction,
    data?: unknown,
  ) {
    this.server.emit('entity:change', { entity, action, data });
  }
}
