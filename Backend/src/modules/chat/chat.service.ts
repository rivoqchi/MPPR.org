import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorCode } from '../../common/constants/error-codes';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { USER_PUBLIC_SELECT } from '../users/lib/user-select';
import {
  ChatAttachmentDto,
  CreateChatMessageDto,
  CreateConversationDto,
  ListChatMediaQueryDto,
  ListChatMessagesQueryDto,
  UpdateChatMessageDto,
} from './dto/chat.dto';

const ONLINE_USERS_SET_KEY = 'presence:users:online';

type AttachmentKind = 'image' | 'video' | 'file' | 'voice';

type StoredAttachment = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  kind: AttachmentKind;
  durationSec?: number;
};

function buildPairKey(userIdA: string, userIdB: string): string {
  return [userIdA, userIdB].sort().join(':');
}

function serializeDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async getOnlineUserIds(): Promise<Set<string>> {
    return new Set(await this.redisService.getClient().smembers(ONLINE_USERS_SET_KEY));
  }

  async listConversations(userId: string) {
    const participations = await this.prisma.chatParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: { select: USER_PUBLIC_SELECT },
              },
            },
          },
        },
      },
      orderBy: {
        conversation: { updatedAt: 'desc' },
      },
    });

    const onlineIds = await this.getOnlineUserIds();

    const items = await Promise.all(
      participations.map(async (participation) => {
        const peer = participation.conversation.participants.find((p) => p.userId !== userId);
        const lastMessageRaw = await this.prisma.chatMessage.findFirst({
          where: {
            conversationId: participation.conversationId,
            ...(participation.clearedAt ? { createdAt: { gt: participation.clearedAt } } : {}),
            hiddenFor: { none: { userId } },
          },
          orderBy: { createdAt: 'desc' },
          include: { replyTo: true },
        });
        const peerParticipation = participation.conversation.participants.find(
          (p) => p.userId !== userId,
        );
        const lastMessage = lastMessageRaw
          ? this.serializeMessage(
              lastMessageRaw,
              peerParticipation?.lastReadAt ?? null,
              lastMessageRaw.replyTo,
            )
          : null;

        const unreadCount = await this.countUnread(participation);

        return {
          id: participation.conversation.id,
          updatedAt: participation.conversation.updatedAt.toISOString(),
          clearedAt: serializeDate(participation.clearedAt),
          lastReadAt: serializeDate(participation.lastReadAt),
          muted: participation.muted,
          unreadCount,
          peer: peer
            ? {
                ...peer.user,
                lastSeenAt: serializeDate(peer.user.lastSeenAt),
                createdAt: peer.user.createdAt.toISOString(),
                updatedAt: peer.user.updatedAt.toISOString(),
                isOnline: onlineIds.has(peer.userId),
              }
            : null,
          lastMessage,
        };
      }),
    );

    return items;
  }

  async getOrCreateConversation(userId: string, dto: CreateConversationDto) {
    if (dto.peerUserId === userId) {
      throw new BadRequestException(ErrorCode.CHAT_CANNOT_MESSAGE_SELF);
    }

    const peer = await this.prisma.user.findFirst({
      where: { id: dto.peerUserId, isActive: true },
      select: USER_PUBLIC_SELECT,
    });

    if (!peer) {
      throw new NotFoundException(ErrorCode.CHAT_PEER_NOT_FOUND);
    }

    const pairKey = buildPairKey(userId, dto.peerUserId);

    let conversation = await this.prisma.chatConversation.findUnique({
      where: { pairKey },
      include: {
        participants: true,
      },
    });

    if (!conversation) {
      conversation = await this.prisma.chatConversation.create({
        data: {
          pairKey,
          participants: {
            create: [{ userId }, { userId: dto.peerUserId }],
          },
        },
        include: { participants: true },
      });
    }

    const onlineIds = await this.getOnlineUserIds();
    const myParticipation = conversation.participants.find((p) => p.userId === userId);
    const lastMessageRaw = await this.prisma.chatMessage.findFirst({
      where: {
        conversationId: conversation.id,
        ...(myParticipation?.clearedAt
          ? { createdAt: { gt: myParticipation.clearedAt } }
          : {}),
        hiddenFor: { none: { userId } },
      },
      orderBy: { createdAt: 'desc' },
      include: { replyTo: true },
    });

    const peerParticipation = conversation.participants.find((p) => p.userId !== userId);

    return {
      id: conversation.id,
      updatedAt: conversation.updatedAt.toISOString(),
      clearedAt: serializeDate(myParticipation?.clearedAt),
      lastReadAt: serializeDate(myParticipation?.lastReadAt),
      muted: myParticipation?.muted ?? false,
      unreadCount: myParticipation ? await this.countUnread(myParticipation) : 0,
      peer: {
        ...peer,
        lastSeenAt: serializeDate(peer.lastSeenAt),
        createdAt: peer.createdAt.toISOString(),
        updatedAt: peer.updatedAt.toISOString(),
        isOnline: onlineIds.has(peer.id),
      },
      lastMessage: lastMessageRaw
        ? this.serializeMessage(
            lastMessageRaw,
            peerParticipation?.lastReadAt ?? null,
            lastMessageRaw.replyTo,
          )
        : null,
    };
  }

  async listMessages(userId: string, conversationId: string, query: ListChatMessagesQueryDto) {
    const participation = await this.requireParticipation(conversationId, userId);
    const limit = Math.min(query.limit ?? 50, 100);

    const where: Prisma.ChatMessageWhereInput = {
      conversationId,
      ...(participation.clearedAt ? { createdAt: { gt: participation.clearedAt } } : {}),
      hiddenFor: { none: { userId } },
    };

    if (query.date) {
      const dayStart = new Date(`${query.date}T00:00:00.000Z`);
      const dayEnd = new Date(`${query.date}T23:59:59.999Z`);

      if (Number.isNaN(dayStart.getTime())) {
        throw new BadRequestException(ErrorCode.VALIDATION_FAILED);
      }

      where.createdAt = {
        ...(typeof where.createdAt === 'object' && where.createdAt !== null ? where.createdAt : {}),
        gte: dayStart,
        lte: dayEnd,
      };
    }

    if (query.before) {
      const before = new Date(query.before);
      where.createdAt = {
        ...(typeof where.createdAt === 'object' && where.createdAt !== null ? where.createdAt : {}),
        lt: before,
      };
    }

    if (query.after) {
      const after = new Date(query.after);
      where.createdAt = {
        ...(typeof where.createdAt === 'object' && where.createdAt !== null ? where.createdAt : {}),
        gt: after,
      };
    }

    const peerParticipation = await this.prisma.chatParticipant.findFirst({
      where: { conversationId, userId: { not: userId } },
    });

    const messages = await this.prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        replyTo: true,
      },
    });

    return messages
      .reverse()
      .map((message) =>
        this.serializeMessage(message, peerParticipation?.lastReadAt ?? null, message.replyTo),
      );
  }

  async createMessage(userId: string, conversationId: string, dto: CreateChatMessageDto) {
    const participation = await this.requireParticipation(conversationId, userId);
    const content = (dto.content ?? '').trim();
    const attachments = this.normalizeAttachments(dto.attachments);

    if (!content && attachments.length === 0) {
      throw new BadRequestException(ErrorCode.CHAT_MESSAGE_EMPTY);
    }

    if (dto.replyToId) {
      const reply = await this.prisma.chatMessage.findFirst({
        where: { id: dto.replyToId, conversationId },
      });

      if (!reply) {
        throw new NotFoundException(ErrorCode.CHAT_MESSAGE_NOT_FOUND);
      }
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        senderId: userId,
        content,
        attachments: attachments as unknown as Prisma.InputJsonValue,
        replyToId: dto.replyToId,
      },
      include: { replyTo: true },
    });

    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    await this.prisma.chatParticipant.update({
      where: { id: participation.id },
      data: { lastReadAt: message.createdAt },
    });

    const peer = await this.prisma.chatParticipant.findFirst({
      where: { conversationId, userId: { not: userId } },
    });

    const payload = this.serializeMessage(message, peer?.lastReadAt ?? null, message.replyTo);

    if (peer) {
      this.websocketGateway.emitToUser(peer.userId, 'chat:message', {
        conversationId,
        message: payload,
      });
      this.websocketGateway.emitToUser(peer.userId, 'chat:conversation_updated', {
        conversationId,
      });

      const sender = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });

      const preview =
        content ||
        (attachments[0]?.kind === 'voice'
          ? 'Voice message'
          : attachments[0]?.name || 'Attachment');

      await this.notificationsService.create({
        userId: peer.userId,
        type: 'chat_message',
        title: `${sender?.firstName ?? ''} ${sender?.lastName ?? ''}`.trim() || 'Chat',
        message: preview,
        linkPath: `/chat/${conversationId}`,
        metadata: { conversationId, messageId: message.id },
      });
    }

    this.websocketGateway.emitToUser(userId, 'chat:conversation_updated', { conversationId });

    return payload;
  }

  async updateMessage(
    userId: string,
    conversationId: string,
    messageId: string,
    dto: UpdateChatMessageDto,
  ) {
    await this.requireParticipation(conversationId, userId);

    const message = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, conversationId },
      include: { replyTo: true },
    });

    if (!message) {
      throw new NotFoundException(ErrorCode.CHAT_MESSAGE_NOT_FOUND);
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException(ErrorCode.CHAT_FORBIDDEN);
    }

    if (message.deletedAt) {
      throw new BadRequestException(ErrorCode.CHAT_FORBIDDEN);
    }

    const updated = await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        content: dto.content.trim(),
        editedAt: new Date(),
      },
      include: { replyTo: true },
    });

    const peer = await this.prisma.chatParticipant.findFirst({
      where: { conversationId, userId: { not: userId } },
    });

    const payload = this.serializeMessage(updated, peer?.lastReadAt ?? null, updated.replyTo);

    for (const targetUserId of [userId, peer?.userId].filter(Boolean) as string[]) {
      this.websocketGateway.emitToUser(targetUserId, 'chat:message_updated', {
        conversationId,
        message: payload,
      });
    }

    return payload;
  }

  async deleteMessage(
    userId: string,
    conversationId: string,
    messageId: string,
    scope: 'me' | 'everyone' = 'everyone',
  ) {
    await this.requireParticipation(conversationId, userId);

    const message = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, conversationId },
    });

    if (!message) {
      throw new NotFoundException(ErrorCode.CHAT_MESSAGE_NOT_FOUND);
    }

    if (scope === 'me') {
      await this.prisma.chatMessageHide.upsert({
        where: {
          messageId_userId: { messageId, userId },
        },
        create: { messageId, userId },
        update: {},
      });

      this.websocketGateway.emitToUser(userId, 'chat:message_deleted', {
        conversationId,
        messageId,
        scope: 'me',
      });

      return { ok: true };
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException(ErrorCode.CHAT_FORBIDDEN);
    }

    const updated = await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
        content: '',
        attachments: [] as unknown as Prisma.InputJsonValue,
      },
    });

    const peer = await this.prisma.chatParticipant.findFirst({
      where: { conversationId, userId: { not: userId } },
    });

    for (const targetUserId of [userId, peer?.userId].filter(Boolean) as string[]) {
      this.websocketGateway.emitToUser(targetUserId, 'chat:message_deleted', {
        conversationId,
        messageId: updated.id,
        scope: 'everyone',
        deletedAt: updated.deletedAt?.toISOString() ?? null,
      });
    }

    return { ok: true };
  }

  async markRead(userId: string, conversationId: string) {
    const participation = await this.requireParticipation(conversationId, userId);
    const now = new Date();

    await this.prisma.chatParticipant.update({
      where: { id: participation.id },
      data: { lastReadAt: now },
    });

    const peer = await this.prisma.chatParticipant.findFirst({
      where: { conversationId, userId: { not: userId } },
    });

    if (peer) {
      this.websocketGateway.emitToUser(peer.userId, 'chat:read', {
        conversationId,
        userId,
        lastReadAt: now.toISOString(),
      });
    }

    return { lastReadAt: now.toISOString() };
  }

  async clearConversation(userId: string, conversationId: string) {
    const participation = await this.requireParticipation(conversationId, userId);
    const now = new Date();

    await this.prisma.chatParticipant.update({
      where: { id: participation.id },
      data: { clearedAt: now, lastReadAt: now },
    });

    this.websocketGateway.emitToUser(userId, 'chat:conversation_updated', { conversationId });

    return { clearedAt: now.toISOString() };
  }

  async pingPeer(userId: string, conversationId: string) {
    await this.requireParticipation(conversationId, userId);

    const peer = await this.prisma.chatParticipant.findFirst({
      where: { conversationId, userId: { not: userId } },
      include: { user: { select: { id: true } } },
    });

    if (!peer) {
      throw new NotFoundException(ErrorCode.CHAT_PEER_NOT_FOUND);
    }

    const sender = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    const name = `${sender?.firstName ?? ''} ${sender?.lastName ?? ''}`.trim() || 'User';

    await this.notificationsService.create({
      userId: peer.userId,
      type: 'chat_ping',
      title: name,
      message: 'Chatga chaqirishdi',
      linkPath: `/chat/${conversationId}`,
      metadata: { conversationId },
    });

    return { ok: true };
  }

  async listMedia(userId: string, conversationId: string, query: ListChatMediaQueryDto) {
    const participation = await this.requireParticipation(conversationId, userId);
    const type = query.type ?? 'all';

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        conversationId,
        deletedAt: null,
        ...(participation.clearedAt ? { createdAt: { gt: participation.clearedAt } } : {}),
        hiddenFor: { none: { userId } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        createdAt: true,
        attachments: true,
      },
    });

    const items: Array<StoredAttachment & { messageId: string; createdAt: string }> = [];

    for (const message of messages) {
      const attachments = this.parseAttachments(message.attachments);

      for (const attachment of attachments) {
        if (type !== 'all' && attachment.kind !== type) {
          continue;
        }

        items.push({
          ...attachment,
          messageId: message.id,
          createdAt: message.createdAt.toISOString(),
        });
      }
    }

    return items;
  }

  async emitTyping(userId: string, conversationId: string, isTyping: boolean) {
    const participation = await this.prisma.chatParticipant.findFirst({
      where: { conversationId, userId },
    });

    if (!participation) {
      return;
    }

    const peer = await this.prisma.chatParticipant.findFirst({
      where: { conversationId, userId: { not: userId } },
    });

    if (!peer) {
      return;
    }

    this.websocketGateway.emitToUser(peer.userId, 'chat:typing', {
      conversationId,
      userId,
      isTyping,
    });
  }

  private async requireParticipation(conversationId: string, userId: string) {
    const participation = await this.prisma.chatParticipant.findFirst({
      where: { conversationId, userId },
    });

    if (!participation) {
      const conversation = await this.prisma.chatConversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) {
        throw new NotFoundException(ErrorCode.CHAT_CONVERSATION_NOT_FOUND);
      }

      throw new ForbiddenException(ErrorCode.CHAT_FORBIDDEN);
    }

    return participation;
  }

  private async countUnread(participation: {
    conversationId: string;
    userId: string;
    lastReadAt: Date | null;
    clearedAt: Date | null;
  }) {
    return this.prisma.chatMessage.count({
      where: {
        conversationId: participation.conversationId,
        senderId: { not: participation.userId },
        deletedAt: null,
        ...(participation.lastReadAt ? { createdAt: { gt: participation.lastReadAt } } : {}),
        ...(participation.clearedAt ? { createdAt: { gt: participation.clearedAt } } : {}),
        hiddenFor: { none: { userId: participation.userId } },
      },
    });
  }

  private normalizeAttachments(attachments?: ChatAttachmentDto[]): StoredAttachment[] {
    if (!attachments?.length) {
      return [];
    }

    return attachments.map((item) => ({
      id: item.id,
      name: item.name,
      size: item.size,
      mimeType: item.mimeType,
      kind: item.kind,
      ...(typeof item.durationSec === 'number' ? { durationSec: item.durationSec } : {}),
    }));
  }

  private parseAttachments(value: Prisma.JsonValue): StoredAttachment[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is StoredAttachment => {
      if (!item || typeof item !== 'object') {
        return false;
      }

      const record = item as Record<string, unknown>;
      return (
        typeof record.id === 'string' &&
        typeof record.name === 'string' &&
        typeof record.mimeType === 'string' &&
        typeof record.kind === 'string'
      );
    });
  }

  private serializeMessage(
    message: {
      id: string;
      conversationId: string;
      senderId: string;
      content: string;
      attachments: Prisma.JsonValue;
      replyToId: string | null;
      editedAt: Date | null;
      deletedAt: Date | null;
      createdAt: Date;
    },
    peerLastReadAt: Date | null,
    replyTo:
      | {
          id: string;
          senderId: string;
          content: string;
          deletedAt: Date | null;
          attachments: Prisma.JsonValue;
        }
      | null
      | undefined,
  ) {
    const isReadByPeer = Boolean(
      peerLastReadAt && peerLastReadAt.getTime() >= message.createdAt.getTime(),
    );

    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.deletedAt ? '' : message.content,
      attachments: message.deletedAt ? [] : this.parseAttachments(message.attachments),
      replyToId: message.replyToId,
      replyTo: replyTo
        ? {
            id: replyTo.id,
            senderId: replyTo.senderId,
            content: replyTo.deletedAt ? '' : replyTo.content,
            deletedAt: serializeDate(replyTo.deletedAt),
            attachments: replyTo.deletedAt ? [] : this.parseAttachments(replyTo.attachments),
          }
        : null,
      editedAt: serializeDate(message.editedAt),
      deletedAt: serializeDate(message.deletedAt),
      createdAt: message.createdAt.toISOString(),
      isReadByPeer,
    };
  }
}
