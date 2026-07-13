import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/types';
import {
  CreatePprCalendarEntryDto,
  GetApprovedPprCalendarMonthsQueryDto,
  GetPprCalendarMonthQueryDto,
  UpdatePprCalendarEntryDto,
} from './dto/ppr-calendar.dto';
import { ExecutePprCalendarEntryDto } from './dto/ppr-calendar-execution.dto';
import { PprCalendarService } from './ppr-calendar.service';

@ApiTags('ppr-calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ppr-calendar')
export class PprCalendarController {
  constructor(private readonly pprCalendarService: PprCalendarService) {}

  @Get('months')
  @ApiOperation({ summary: 'Get PPR calendar month with entries' })
  getMonth(@Query() query: GetPprCalendarMonthQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.pprCalendarService.getMonth(query, user);
  }

  @Get('months/pending')
  @ApiOperation({ summary: 'List pending approval PPR calendar months for head' })
  getPendingMonths(
    @Query('structuralUnitId') structuralUnitId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pprCalendarService.getPendingMonths(
      structuralUnitId ? { structuralUnitId } : {},
      user,
    );
  }

  @Post('entries')
  @ApiOperation({ summary: 'Create PPR calendar entry' })
  createEntry(@Body() dto: CreatePprCalendarEntryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.pprCalendarService.createEntry(dto, user);
  }

  @Patch('entries/:id')
  @ApiOperation({ summary: 'Update PPR calendar entry' })
  updateEntry(
    @Param('id') id: string,
    @Body() dto: UpdatePprCalendarEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pprCalendarService.updateEntry(id, dto, user);
  }

  @Delete('entries/:id')
  @ApiOperation({ summary: 'Delete PPR calendar entry' })
  removeEntry(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.pprCalendarService.removeEntry(id, user);
  }

  @Post('months/:id/submit')
  @ApiOperation({ summary: 'Submit PPR calendar month for approval' })
  submitMonth(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.pprCalendarService.submitMonth(id, user);
  }

  @Post('months/:id/approve')
  @ApiOperation({ summary: 'Approve PPR calendar month' })
  approveMonth(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.pprCalendarService.approveMonth(id, user);
  }

  @Post('months/:id/reject')
  @ApiOperation({ summary: 'Reject PPR calendar month submission' })
  rejectMonth(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.pprCalendarService.rejectMonth(id, user);
  }

  @Post('months/:id/clear')
  @ApiOperation({ summary: 'Clear all entries from draft PPR calendar month' })
  clearMonth(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.pprCalendarService.clearMonth(id, user);
  }

  @Post('entries/:id/execute')
  @ApiOperation({ summary: 'Mark PPR calendar objects as executed' })
  executeEntry(
    @Param('id') id: string,
    @Body() dto: ExecutePprCalendarEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pprCalendarService.executeEntry(id, dto, user);
  }

  @Get('admin/months/approved')
  @ApiOperation({ summary: 'List approved PPR calendar months for management' })
  getApprovedMonths(
    @Query() query: GetApprovedPprCalendarMonthsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pprCalendarService.getApprovedMonths(query, user);
  }

  @Get('admin/months/:id')
  @ApiOperation({ summary: 'Get approved PPR calendar month by id for management' })
  getApprovedMonthById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.pprCalendarService.getApprovedMonthById(id, user);
  }

  @Post('admin/months/:id/clear')
  @ApiOperation({ summary: 'Admin clear all entries from approved PPR calendar month' })
  adminClearMonth(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.pprCalendarService.adminClearMonth(id, user);
  }

  @Delete('admin/entries/:id')
  @ApiOperation({ summary: 'Admin delete entry from approved PPR calendar month' })
  adminRemoveEntry(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.pprCalendarService.adminRemoveEntry(id, user);
  }
}
