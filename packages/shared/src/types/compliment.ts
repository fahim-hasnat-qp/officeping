import { UserRef } from './user';

export interface ComplimentDto {
  id: string;
  fromUser: UserRef;
  toStaff: UserRef;
  requestId: string;
  message: string;
  createdAt: string;
}

export interface CreateComplimentInput {
  toStaffId: string;
  requestId: string;
  message: string;
}
