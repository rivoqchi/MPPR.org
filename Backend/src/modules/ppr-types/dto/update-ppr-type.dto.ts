import { PartialType } from '@nestjs/swagger';
import { CreatePprTypeDto } from './create-ppr-type.dto';

export class UpdatePprTypeDto extends PartialType(CreatePprTypeDto) {}
