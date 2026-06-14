import { UserRole } from './user';

export interface AdminStats {
  totalRequests: number;
  activeNow: number;
  avgResponseTimeMinutes: number | null;
  totalCompliments: number;
}

export interface CategoryStat {
  categoryId: string;
  name: string;
  icon: string;
  count: number;
}

export interface StaffPerformance {
  staffId: string;
  name: string;
  avatarUrl: string | null;
  completed: number;
  avgResponseTimeMinutes: number | null;
  isOnline: boolean;
}

/** "Add person" — pre-provision an account (staff personal Gmails, contractors). */
export interface AddPersonInput {
  email: string;
  name: string;
  role: UserRole;
}

export interface UpdateUserRoleInput {
  role: UserRole;
}

export interface CreateCategoryInput {
  name: string;
  icon: string;
}

export interface UpdateCategoryInput {
  name?: string;
  icon?: string;
}
