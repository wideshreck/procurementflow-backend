import { IsString, IsDate, IsNotEmpty, IsEmail } from 'class-validator';

export class CreateEmailInput {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsEmail()
  @IsNotEmpty()
  from: string;

  @IsEmail()
  @IsNotEmpty()
  to: string;

  @IsDate()
  @IsNotEmpty()
  date: Date;

  @IsString()
  @IsNotEmpty()
  supplierId: string;
}
