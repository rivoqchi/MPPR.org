import { PartialType } from '@nestjs/swagger';
import { CreateAppRoleDto } from './create-app-role.dto';

export class UpdateAppRoleDto extends PartialType(CreateAppRoleDto) {}
