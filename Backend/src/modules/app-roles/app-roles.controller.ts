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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
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
  create(@Body() dto: CreateAppRoleDto) {
    return this.appRolesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update app role' })
  update(@Param('id') id: string, @Body() dto: UpdateAppRoleDto) {
    return this.appRolesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete app role' })
  remove(@Param('id') id: string) {
    return this.appRolesService.remove(id);
  }
}
