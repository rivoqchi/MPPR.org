import { PartialType } from '@nestjs/swagger';
import { CreateStructuralUnitDto } from './create-structural-unit.dto';

export class UpdateStructuralUnitDto extends PartialType(
  CreateStructuralUnitDto,
) {}
