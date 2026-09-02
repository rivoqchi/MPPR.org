import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateQrImageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text!: string;

  @IsOptional()
  @IsString()
  lang?: string;
}
