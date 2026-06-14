import { create } from 'zustand';

export type NotificationVariant = 'default' | 'success' | 'warning' | 'info';

export interface AppNotification {
  id: string;
  title: string;
  body?: string;
  variant?: NotificationVariant;
  icon?: string;       // emoji
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number; // default 4500
}

interface NotificationState {
  queue: AppNotification[];
  push: (n: Omit<AppNotification, 'id'>) => void;
  dismiss: (id: string) => void;
}

let seq = 0;

export const useNotificationStore = create<NotificationState>()((set) => ({
  queue: [],
  push: (n) => {
    const id = String(++seq);
    set((s) => ({ queue: [...s.queue, { ...n, id }] }));
  },
  dismiss: (id) => set((s) => ({ queue: s.queue.filter((n) => n.id !== id) })),
}));
