import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/types';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

@ApiTags('applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all applications' })
  findAll() {
    return this.applicationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get application by ID' })
  findOne(@Param('id') id: string) {
    return this.applicationsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create application' })
  create(@Body() dto: CreateApplicationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.applicationsService.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update application' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applicationsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete application' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.applicationsService.remove(id, user.id);
  }
}
