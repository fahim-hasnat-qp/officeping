import { UserRole } from '@officeping/shared';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}
