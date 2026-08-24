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
import { CreateStructuralUnitDto } from './dto/create-structural-unit.dto';
import { UpdateStructuralUnitDto } from './dto/update-structural-unit.dto';
import { StructuralUnitsService } from './structural-units.service';

@ApiTags('structural-units')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('structural-units')
export class StructuralUnitsController {
  constructor(
    private readonly structuralUnitsService: StructuralUnitsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all structural units' })
  findAll() {
    return this.structuralUnitsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get structural unit by ID' })
  findOne(@Param('id') id: string) {
    return this.structuralUnitsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create structural unit' })
  create(
    @Body() dto: CreateStructuralUnitDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.structuralUnitsService.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update structural unit' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStructuralUnitDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.structuralUnitsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete structural unit' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.structuralUnitsService.remove(id, user.id);
  }
}
