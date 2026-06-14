import { UserRef } from './user';

export enum MealStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SERVED = 'served',
}

/** Daily breakfast order cutoff, local office time (HH:mm). Enforced by the backend. */
export const BREAKFAST_CUTOFF = '08:30';
/** Daily lunch attendance cutoff, local office time (HH:mm). */
export const LUNCH_CUTOFF = '11:00';

export interface BreakfastDto {
  id: string;
  user: UserRef;
  date: string; // YYYY-MM-DD
  order: string;
  status: MealStatus;
  createdAt: string;
}

export interface LunchDto {
  id: string;
  user: UserRef;
  date: string; // YYYY-MM-DD
  attending: boolean;
}

export interface CreateBreakfastInput {
  order: string;
  date: string; // YYYY-MM-DD
}

export interface UpdateBreakfastStatusInput {
  status?: MealStatus;
  order?: string;
}

export interface CreateLunchInput {
  attending: boolean;
  date: string; // YYYY-MM-DD
}
