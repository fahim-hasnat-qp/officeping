import axios from 'axios';
import type {
  AdminStats,
  AuthResponse,
  BreakfastDto,
  CategoryDto,
  CategoryStat,
  ComplimentDto,
  CreateBreakfastInput,
  CreateCategoryInput,
  CreateComplimentInput,
  CreateLunchInput,
  CreateNoteInput,
  CreateRequestInput,
  LunchDto,
  PushSubscriptionInput,
  ReasonInput,
  RequestDto,
  RequestNoteDto,
  StaffPerformance,
  UpdateBreakfastStatusInput,
  UpdateProfileInput,
  UpdateCategoryInput,
  UpdateRequestStatusInput,
  UserDto,
  UserRole,
} from '@officeping/shared';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || ''}/api`,
  headers: { 'ngrok-skip-browser-warning': '1' },
});

api.interceptors.request.use((config) => {
  // Lazy import to avoid circular dependency at module init time
  const raw = localStorage.getItem('auth');
  if (raw) {
    try {
      const state = JSON.parse(raw) as { state?: { accessToken?: string } };
      const token = state?.state?.accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore parse errors
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      // Clear auth store and redirect
      localStorage.removeItem('auth');
      globalThis.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// Auth
export function googleLogin(idToken: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/google', { idToken }).then((r) => r.data);
}

export function demoLogin(email: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/demo-login', { email }).then((r) => r.data);
}

// Requests
export function getRequests(params?: {
  status?: string;
  categoryId?: string;
  limit?: number;
  offset?: number;
}): Promise<RequestDto[]> {
  return api.get<RequestDto[]>('/requests', { params }).then((r) => r.data);
}

export function getRequest(id: string): Promise<RequestDto> {
  return api.get<RequestDto>(`/requests/${id}`).then((r) => r.data);
}

export function createRequest(input: CreateRequestInput): Promise<RequestDto> {
  return api.post<RequestDto>('/requests', input).then((r) => r.data);
}

export function updateRequestStatus(id: string, input: UpdateRequestStatusInput): Promise<RequestDto> {
  return api.patch<RequestDto>(`/requests/${id}/status`, input).then((r) => r.data);
}

export function cancelRequest(id: string, input: ReasonInput): Promise<RequestDto> {
  return api.patch<RequestDto>(`/requests/${id}/cancel`, input).then((r) => r.data);
}

export function addDelay(id: string, input: ReasonInput): Promise<RequestDto> {
  return api.patch<RequestDto>(`/requests/${id}/delay`, input).then((r) => r.data);
}

export function addCancel(id: string, input: ReasonInput): Promise<RequestDto> {
  return api.post<RequestDto>(`/requests/${id}/cancel`, input).then((r) => r.data);
}

export function addNote(id: string, input: CreateNoteInput): Promise<RequestNoteDto> {
  return api.post<RequestNoteDto>(`/requests/${id}/notes`, input).then((r) => r.data);
}

export function getQuickSend(): Promise<RequestDto[]> {
  return api.get<RequestDto[]>('/requests/quick-send').then((r) => r.data);
}

export function toggleSaveRequest(id: string): Promise<RequestDto> {
  return api.patch<RequestDto>(`/requests/${id}/save`).then((r) => r.data);
}

export function updateQuickSendLabel(id: string, label: string): Promise<RequestDto> {
  return api.patch<RequestDto>(`/requests/${id}/quick-send-label`, { label }).then((r) => r.data);
}

export function getCategories(): Promise<CategoryDto[]> {
  return api.get<CategoryDto[]>('/admin/categories').then((r) => r.data);
}

// Meals — breakfast
export function createBreakfast(input: CreateBreakfastInput): Promise<BreakfastDto> {
  return api.post<BreakfastDto>('/meals/breakfast', input).then((r) => r.data);
}

export function getBreakfast(date?: string): Promise<BreakfastDto[]> {
  return api.get<BreakfastDto[]>('/meals/breakfast', { params: date ? { date } : undefined }).then((r) => r.data);
}

export function updateBreakfastStatus(id: string, input: UpdateBreakfastStatusInput): Promise<BreakfastDto> {
  return api.patch<BreakfastDto>(`/meals/breakfast/${id}`, input).then((r) => r.data);
}

// Meals — lunch
export function upsertLunch(input: CreateLunchInput): Promise<LunchDto> {
  return api.post<LunchDto>('/meals/lunch', input).then((r) => r.data);
}

export function getLunch(date?: string): Promise<LunchDto[]> {
  return api.get<LunchDto[]>('/meals/lunch', { params: date ? { date } : undefined }).then((r) => r.data);
}

// Compliments
export function createCompliment(input: CreateComplimentInput): Promise<ComplimentDto> {
  return api.post<ComplimentDto>('/compliments', input).then((r) => r.data);
}

export function getComplimentsFeed(): Promise<ComplimentDto[]> {
  return api.get<ComplimentDto[]>('/compliments/feed').then((r) => r.data);
}

// Admin stats
export function getStats(): Promise<AdminStats> {
  return api.get<AdminStats>('/admin/stats').then((r) => r.data);
}

export function getCategoryStats(): Promise<CategoryStat[]> {
  return api.get<CategoryStat[]>('/admin/stats/by-category').then((r) => r.data);
}

export function getStaffPerformance(): Promise<StaffPerformance[]> {
  return api.get<StaffPerformance[]>('/admin/staff-performance').then((r) => r.data);
}

// Admin users
export function getUsers(): Promise<UserDto[]> {
  return api.get<UserDto[]>('/admin/users').then((r) => r.data);
}

export function addUser(input: { email: string; name: string; role: UserRole }): Promise<UserDto> {
  return api.post<UserDto>('/admin/users', input).then((r) => r.data);
}

export function updateUserRole(id: string, role: UserRole): Promise<UserDto> {
  return api.patch<UserDto>(`/admin/users/${id}`, { role }).then((r) => r.data);
}

// Admin categories
export function adminGetCategories(): Promise<CategoryDto[]> {
  return api.get<CategoryDto[]>('/admin/categories').then((r) => r.data);
}

export function createCategory(input: CreateCategoryInput): Promise<CategoryDto> {
  return api.post<CategoryDto>('/admin/categories', input).then((r) => r.data);
}

export function updateCategory(id: string, input: UpdateCategoryInput): Promise<CategoryDto> {
  return api.patch<CategoryDto>(`/admin/categories/${id}`, input).then((r) => r.data);
}

// Push
export function subscribePush(sub: PushSubscriptionInput): Promise<void> {
  return api.post('/push/subscribe', sub).then(() => undefined);
}

// Status
export function updateMyStatus(isOnline: boolean): Promise<void> {
  return api.patch('/staff/me/status', { isOnline }).then(() => undefined);
}

export function getMyStats(): Promise<{ doneToday: number; doneThisMonth: number; compliments: number }> {
  return api.get('/staff/me/stats').then((r) => r.data);
}

// Profile
export function updateProfile(input: UpdateProfileInput): Promise<UserDto> {
  return api.patch<UserDto>('/auth/profile', input).then((r) => r.data);
}

export interface MemberStats {
  requestsSent: number;
  requestsToday: number;
  requestsThisWeek: number;
  requestsThisMonth: number;
  complimentsGiven: number;
  topCategories: { name: string; icon: string; count: number }[];
}

export function getMemberStats(): Promise<MemberStats> {
  return api.get('/auth/me/stats').then((r) => r.data);
}

export function getSettings(): Promise<Record<string, string>> {
  return api.get('/admin/settings').then((r) => r.data);
}

export function updateSetting(key: string, value: string): Promise<void> {
  return api.patch(`/admin/settings/${key}`, { value }).then(() => undefined);
}

export default api;
