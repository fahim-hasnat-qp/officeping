import { create } from 'zustand';

interface UiState {
  message: string | null;
  showToast: (msg: string) => void;
  clearToast: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  message: null,
  showToast: (msg) => set({ message: msg }),
  clearToast: () => set({ message: null }),
}));
