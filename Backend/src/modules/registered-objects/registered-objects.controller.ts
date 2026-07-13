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
import { CreateRegisteredObjectDto } from './dto/create-registered-object.dto';
import { UpdateRegisteredObjectDto } from './dto/update-registered-object.dto';
import { RegisteredObjectsService } from './registered-objects.service';

@ApiTags('objects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('objects')
export class RegisteredObjectsController {
  constructor(
    private readonly registeredObjectsService: RegisteredObjectsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all registered objects' })
  findAll() {
    return this.registeredObjectsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get registered object by ID' })
  findOne(@Param('id') id: string) {
    return this.registeredObjectsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create registered object' })
  create(
    @Body() dto: CreateRegisteredObjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.registeredObjectsService.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update registered object' })
  update(@Param('id') id: string, @Body() dto: UpdateRegisteredObjectDto) {
    return this.registeredObjectsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete registered object' })
  remove(@Param('id') id: string) {
    return this.registeredObjectsService.remove(id);
  }
}
