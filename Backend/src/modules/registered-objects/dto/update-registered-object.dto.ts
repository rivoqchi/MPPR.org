import { PartialType } from '@nestjs/swagger';
import { CreateRegisteredObjectDto } from './create-registered-object.dto';

export class UpdateRegisteredObjectDto extends PartialType(
  CreateRegisteredObjectDto,
) {}
