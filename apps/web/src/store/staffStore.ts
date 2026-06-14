import { create } from 'zustand';
import type { ComplimentDto, RequestDto } from '@officeping/shared';

interface StaffState {
  pending: RequestDto[];   // PENDING — waiting to be accepted (HomeStaff)
  active: RequestDto[];    // ACCEPTED + IN_PROGRESS (RequestsStaff)
  history: RequestDto[];   // DONE + CANCELLED
  feed: ComplimentDto[];
  completedToday: number;
  setPending: (r: RequestDto[]) => void;
  setActive: (r: RequestDto[]) => void;
  setHistory: (r: RequestDto[]) => void;
  setFeed: (f: ComplimentDto[]) => void;
  setCompletedToday: (n: number) => void;
  upsertPending: (r: RequestDto) => void;
  removePending: (id: string) => void;
}

export const useStaffStore = create<StaffState>()((set) => ({
  pending: [],
  active: [],
  history: [],
  feed: [],
  completedToday: 0,
  setPending: (pending) => set({ pending }),
  setActive: (active) => set({ active }),
  setHistory: (history) => set({ history }),
  setFeed: (feed) => set({ feed }),
  setCompletedToday: (completedToday) => set({ completedToday }),
  upsertPending: (r) =>
    set((s) => {
      const idx = s.pending.findIndex((x) => x.id === r.id);
      const next = idx >= 0 ? s.pending.map((x) => (x.id === r.id ? r : x)) : [r, ...s.pending];
      return { pending: next };
    }),
  removePending: (id) => set((s) => ({ pending: s.pending.filter((r) => r.id !== id) })),
}));
