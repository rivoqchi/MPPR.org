import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/types';
import { CreateErrorLogDto } from './dto/create-error-log.dto';
import { GetErrorLogsQueryDto } from './dto/get-error-logs-query.dto';
import { ErrorLogsService } from './error-logs.service';

@ApiTags('error-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('error-logs')
export class ErrorLogsController {
  constructor(private readonly errorLogsService: ErrorLogsService) {}

  @Get()
  @ApiOperation({ summary: 'List error logs for authorized users' })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: GetErrorLogsQueryDto) {
    return this.errorLogsService.findAll(user.id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Report a client-side error' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateErrorLogDto) {
    return this.errorLogsService.createFromClient(user.id, dto);
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Mark an error log as resolved' })
  markResolved(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.errorLogsService.markResolved(id, user.id);
  }
}
