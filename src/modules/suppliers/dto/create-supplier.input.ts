import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

class AuthorizedPersonDto {
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

class TaxInfoDto {
    @IsString()
    @IsNotEmpty()
    taxNumber: string;

    @IsString()
    @IsNotEmpty()
    taxOffice: string;
}

export class CreateSupplierInput {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => TaxInfoDto)
  @IsOptional()
  taxInfo?: TaxInfoDto;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AuthorizedPersonDto)
  @IsOptional()
  authorizedPersons?: AuthorizedPersonDto[];
}
