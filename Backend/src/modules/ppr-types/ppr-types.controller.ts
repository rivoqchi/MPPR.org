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
import { CreatePprTypeDto } from './dto/create-ppr-type.dto';
import { UpdatePprTypeDto } from './dto/update-ppr-type.dto';
import { PprTypesService } from './ppr-types.service';

@ApiTags('ppr-types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ppr-types')
export class PprTypesController {
  constructor(private readonly pprTypesService: PprTypesService) {}

  @Get()
  @ApiOperation({ summary: 'List all PPR types' })
  findAll() {
    return this.pprTypesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get PPR type by ID' })
  findOne(@Param('id') id: string) {
    return this.pprTypesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create PPR type' })
  create(
    @Body() dto: CreatePprTypeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pprTypesService.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update PPR type' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePprTypeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pprTypesService.update(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete PPR type' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.pprTypesService.remove(id, user.id);
  }
}
