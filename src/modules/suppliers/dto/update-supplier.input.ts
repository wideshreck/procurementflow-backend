import { PartialType } from '@nestjs/mapped-types';
import { CreateSupplierInput } from './create-supplier.input';

export class UpdateSupplierInput extends PartialType(CreateSupplierInput) {}
