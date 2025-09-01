import { PartialType } from '@nestjs/mapped-types';
import { CreateSupplierInput } from './create-supplier.input';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AuthorizedPersonDto } from './authorized-person.dto';

export class UpdateSupplierInput extends PartialType(CreateSupplierInput) {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AuthorizedPersonDto)
    @IsOptional()
    authorizedPersons?: AuthorizedPersonDto[];
}
