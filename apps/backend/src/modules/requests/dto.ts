import {
  CreateNoteInput,
  CreateRequestInput,
  ReasonInput,
  RequestStatus,
  UpdateQuickSendLabelInput,
  UpdateRequestStatusInput,
} from '@officeping/shared';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateRequestDto implements CreateRequestInput {
  @IsUUID()
  categoryId!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBoolean()
  isSavedRequest?: boolean;

  @IsOptional()
  @IsString()
  quickSendLabel?: string;
}

export class UpdateQuickSendLabelDto implements UpdateQuickSendLabelInput {
  @IsString()
  @IsNotEmpty()
  label!: string;
}

export class UpdateRequestStatusDto implements UpdateRequestStatusInput {
  @IsEnum(RequestStatus)
  status!: RequestStatus;
}

export class ReasonDto implements ReasonInput {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class CreateNoteDto implements CreateNoteInput {
  @IsString()
  @IsNotEmpty()
  message!: string;
}

export class RequestsQueryDto {
  /**
   * One status value or multiple comma-separated: ?status=accepted,in_progress
   * ValidationPipe runs AFTER this split, so each token is validated individually.
   */
  @IsOptional()
  status?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  /** Returns the status values as a validated array, or undefined. */
  get statusList(): RequestStatus[] | undefined {
    if (!this.status) return undefined;
    const vals = this.status.split(',').map((s) => s.trim()).filter(Boolean);
    const valid = Object.values(RequestStatus) as string[];
    const invalid = vals.filter((v) => !valid.includes(v));
    if (invalid.length) return undefined; // treated as no filter
    return vals as RequestStatus[];
  }
}
