import { IsBoolean } from 'class-validator';

export class StaffStatusDto {
  @IsBoolean()
  isOnline!: boolean;
}
