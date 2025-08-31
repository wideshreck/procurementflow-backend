import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class AuthorizedPersonDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;
}
