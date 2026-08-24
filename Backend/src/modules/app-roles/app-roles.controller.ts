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
import { AppRolesService } from './app-roles.service';
import { CreateAppRoleDto } from './dto/create-app-role.dto';
import { UpdateAppRoleDto } from './dto/update-app-role.dto';

@ApiTags('app-roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('app-roles')
export class AppRolesController {
  constructor(private readonly appRolesService: AppRolesService) {}

  @Get()
  @ApiOperation({ summary: 'List all app roles' })
  findAll() {
    return this.appRolesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get app role by ID' })
  findOne(@Param('id') id: string) {
    return this.appRolesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create app role' })
  create(
    @Body() dto: CreateAppRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.appRolesService.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update app role' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAppRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.appRolesService.update(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete app role' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.appRolesService.remove(id, user.id);
  }
}
