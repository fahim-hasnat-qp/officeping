export enum UserRole {
  MEMBER = 'member',
  STAFF = 'staff',
  ADMIN = 'admin',
}

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl: string | null;
  isOnline: boolean;
  deskLocation: string | null;
  defaultBreakfast: string | null;
  createdAt: string;
}

export interface UpdateProfileInput {
  name?: string;
  deskLocation?: string;
  defaultBreakfast?: string | null;
}

export interface UserRef {
  id: string;
  name: string;
  avatarUrl?: string | null;
}
