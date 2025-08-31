import { PartialType } from '@nestjs/swagger';
import { CreateEmailInput } from './create-email.input';

export class UpdateEmailInput extends PartialType(CreateEmailInput) {}
