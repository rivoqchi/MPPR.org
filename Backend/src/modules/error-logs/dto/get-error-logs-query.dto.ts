import { Transform, Type } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pipes/pagination.dto';

export class GetErrorLogsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['api', 'frontend', 'route'])
  source?: 'api' | 'frontend' | 'route';

  @IsOptional()
  @IsString()
  @IsIn(['user', 'system'])
  severity?: 'user' | 'system';

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) {
      return true;
    }

    if (value === 'false' || value === false) {
      return false;
    }

    return undefined;
  })
  resolved?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}
