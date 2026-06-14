import { create } from 'zustand';
import { RequestStatus } from '@officeping/shared';
import type { RequestDto, RequestNoteDto } from '@officeping/shared';

const LIVE_STATUSES = new Set<string>([
  RequestStatus.PENDING,
  RequestStatus.ACCEPTED,
  RequestStatus.IN_PROGRESS,
]);

function countLive(requests: RequestDto[]): number {
  return requests.filter((r) => LIVE_STATUSES.has(r.status)).length;
}

interface RequestState {
  requests: RequestDto[];
  quickSend: RequestDto[];
  liveCount: number;
  setRequests: (r: RequestDto[]) => void;
  upsertRequest: (r: RequestDto) => void;
  patchRequest: (id: string, patch: Partial<RequestDto>) => void;
  appendNote: (requestId: string, note: RequestNoteDto) => void;
  setQuickSend: (r: RequestDto[]) => void;
  setLiveCount: (n: number) => void;
}

export const useRequestStore = create<RequestState>()((set) => ({
  requests: [],
  quickSend: [],
  liveCount: 0,
  setRequests: (requests) => set({ requests, liveCount: countLive(requests) }),
  upsertRequest: (r) =>
    set((state) => {
      const idx = state.requests.findIndex((x) => x.id === r.id);
      let next: RequestDto[];
      if (idx >= 0) {
        next = [...state.requests];
        next[idx] = r;
      } else {
        next = [r, ...state.requests];
      }
      return { requests: next, liveCount: countLive(next) };
    }),
  patchRequest: (id, patch) =>
    set((state) => {
      const next = state.requests.map((r) => (r.id === id ? { ...r, ...patch } : r));
      return { requests: next, liveCount: countLive(next) };
    }),
  appendNote: (requestId, note) =>
    set((state) => ({
      requests: state.requests.map((r) =>
        r.id === requestId
          ? { ...r, notes: [...(r.notes ?? []), note] }
          : r,
      ),
    })),
  setQuickSend: (quickSend) => set({ quickSend }),
  setLiveCount: (liveCount) => set({ liveCount }),
}));
