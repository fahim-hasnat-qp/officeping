import { DemoLoginInput, GoogleLoginInput, UpdateProfileInput } from '@officeping/shared';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleLoginDto implements GoogleLoginInput {
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}

export class DemoLoginDto implements DemoLoginInput {
  @IsEmail()
  email!: string;
}

export class UpdateProfileDto implements UpdateProfileInput {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  deskLocation?: string;
}
