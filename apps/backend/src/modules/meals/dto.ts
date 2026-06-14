import {
  CreateBreakfastInput,
  CreateLunchInput,
  MealStatus,
  UpdateBreakfastStatusInput,
} from '@officeping/shared';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateBreakfastDto implements CreateBreakfastInput {
  @IsString()
  @IsNotEmpty()
  order!: string;

  @IsDateString()
  date!: string;
}

export class UpdateBreakfastStatusDto implements UpdateBreakfastStatusInput {
  @IsOptional()
  @IsEnum(MealStatus)
  status?: MealStatus;

  @IsOptional()
  @IsString()
  order?: string;
}

export class CreateLunchDto implements CreateLunchInput {
  @IsBoolean()
  attending!: boolean;

  @IsDateString()
  date!: string;
}

export class MealDateQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}
