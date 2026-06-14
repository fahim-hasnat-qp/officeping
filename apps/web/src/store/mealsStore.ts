import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BreakfastDto, LunchDto } from '@officeping/shared';

interface MealsState {
  breakfast: BreakfastDto[];
  lunch: LunchDto[];
  // Staff: persisted across tab switches, reset each calendar day
  acknowledgedDate: string | null;   // date string (YYYY-MM-DD) when acknowledged
  checkedItems: Record<string, boolean>; // shopping list checkboxes
  setBreakfast: (b: BreakfastDto[]) => void;
  setLunch: (l: LunchDto[]) => void;
  upsertBreakfast: (b: BreakfastDto) => void;
  upsertLunch: (l: LunchDto) => void;
  acknowledge: (date: string) => void;
  toggleCheckedItem: (item: string) => void;
  resetCheckedItems: () => void;
}

export const useMealsStore = create<MealsState>()(
  persist(
    (set) => ({
      breakfast: [],
      lunch: [],
      acknowledgedDate: null,
      checkedItems: {},
      setBreakfast: (breakfast) => set({ breakfast }),
      setLunch: (lunch) => set({ lunch }),
      upsertBreakfast: (b) =>
        set((s) => {
          const idx = s.breakfast.findIndex((x) => x.id === b.id);
          const next = idx >= 0 ? s.breakfast.map((x) => (x.id === b.id ? b : x)) : [...s.breakfast, b];
          return { breakfast: next };
        }),
      upsertLunch: (l) =>
        set((s) => {
          const idx = s.lunch.findIndex((x) => x.id === l.id);
          const next = idx >= 0 ? s.lunch.map((x) => (x.id === l.id ? l : x)) : [...s.lunch, l];
          return { lunch: next };
        }),
      acknowledge: (date) => set({ acknowledgedDate: date, checkedItems: {} }),
      toggleCheckedItem: (item) =>
        set((s) => ({ checkedItems: { ...s.checkedItems, [item]: !s.checkedItems[item] } })),
      resetCheckedItems: () => set({ checkedItems: {} }),
    }),
    {
      name: 'meals',
      // Only persist the staff UI state — not the server data (it refreshes on mount)
      partialize: (s) => ({
        acknowledgedDate: s.acknowledgedDate,
        checkedItems: s.checkedItems,
      }),
    },
  ),
);
