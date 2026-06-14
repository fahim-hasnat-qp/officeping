import {
  AddPersonInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  UpdateUserRoleInput,
  UserRole,
} from '@officeping/shared';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class AddPersonDto implements AddPersonInput {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(UserRole)
  role!: UserRole;
}

export class UpdateUserRoleDto implements UpdateUserRoleInput {
  @IsEnum(UserRole)
  role!: UserRole;
}

export class CreateCategoryDto implements CreateCategoryInput {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  icon!: string;
}

export class UpdateCategoryDto implements UpdateCategoryInput {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  icon?: string;
}
