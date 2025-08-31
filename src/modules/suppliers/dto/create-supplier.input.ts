import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { AuthorizedPersonDto } from './authorized-person.dto';

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
