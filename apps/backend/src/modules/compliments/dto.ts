import { CreateComplimentInput } from '@officeping/shared';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateComplimentDto implements CreateComplimentInput {
  @IsUUID()
  toStaffId!: string;

  @IsUUID()
  requestId!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;
}

export class ComplimentQueryDto {
  // future filtering options, reserved
}
