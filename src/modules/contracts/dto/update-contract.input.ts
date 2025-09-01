import { PartialType } from '@nestjs/swagger';
import { CreateContractInput } from './create-contract.input';

export class UpdateContractInput extends PartialType(CreateContractInput) {}
