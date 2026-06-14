import { PushSubscriptionInput } from '@officeping/shared';
import { IsNotEmpty, IsObject, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PushKeysDto {
  @IsString()
  @IsNotEmpty()
  auth!: string;

  @IsString()
  @IsNotEmpty()
  p256dh!: string;
}

export class PushSubscribeDto implements PushSubscriptionInput {
  @IsString()
  @IsNotEmpty()
  endpoint!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PushKeysDto)
  keys!: { auth: string; p256dh: string };
}

export class PushUnsubscribeDto {
  @IsString()
  @IsNotEmpty()
  endpoint!: string;
}
