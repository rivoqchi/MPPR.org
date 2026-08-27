import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  assertPagePermission,
  PAGE_KEYS,
} from '../../common/lib/assert-page-permission';
import type { AuthenticatedUser } from '../../common/types';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ChatService } from './chat.service';
import {
  CreateChatMessageDto,
  CreateConversationDto,
  DeleteChatMessageDto,
  ListChatMediaQueryDto,
  ListChatMessagesQueryDto,
  UpdateChatMessageDto,
} from './dto/chat.dto';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly prisma: PrismaService,
  ) {}

  private async assertChatAccess(userId: string) {
    await assertPagePermission(this.prisma, userId, PAGE_KEYS.chat, 'canView');
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List chat conversations' })
  async listConversations(@CurrentUser() user: AuthenticatedUser) {
    await this.assertChatAccess(user.id);
    return this.chatService.listConversations(user.id);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Get or create a 1:1 conversation' })
  async createConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConversationDto,
  ) {
    await this.assertChatAccess(user.id);
    return this.chatService.getOrCreateConversation(user.id, dto);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'List messages in a conversation' })
  async listMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ListChatMessagesQueryDto,
  ) {
    await this.assertChatAccess(user.id);
    return this.chatService.listMessages(user.id, id, query);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message' })
  async createMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateChatMessageDto,
  ) {
    await this.assertChatAccess(user.id);
    return this.chatService.createMessage(user.id, id, dto);
  }

  @Patch('conversations/:id/messages/:messageId')
  @ApiOperation({ summary: 'Edit a message' })
  async updateMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Body() dto: UpdateChatMessageDto,
  ) {
    await this.assertChatAccess(user.id);
    return this.chatService.updateMessage(user.id, id, messageId, dto);
  }

  @Delete('conversations/:id/messages/:messageId')
  @ApiOperation({ summary: 'Delete a message for me or everyone' })
  async deleteMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Body() dto: DeleteChatMessageDto,
  ) {
    await this.assertChatAccess(user.id);
    return this.chatService.deleteMessage(user.id, id, messageId, dto.scope ?? 'everyone');
  }

  @Post('conversations/:id/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  async markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.assertChatAccess(user.id);
    return this.chatService.markRead(user.id, id);
  }

  @Post('conversations/:id/clear')
  @ApiOperation({ summary: 'Clear conversation history for self only' })
  async clearConversation(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.assertChatAccess(user.id);
    return this.chatService.clearConversation(user.id, id);
  }

  @Post('conversations/:id/ping')
  @ApiOperation({ summary: 'Ping peer to open chat' })
  async pingPeer(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.assertChatAccess(user.id);
    return this.chatService.pingPeer(user.id, id);
  }

  @Get('conversations/:id/media')
  @ApiOperation({ summary: 'List shared media in conversation' })
  async listMedia(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ListChatMediaQueryDto,
  ) {
    await this.assertChatAccess(user.id);
    return this.chatService.listMedia(user.id, id, query);
  }
}
