import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface useNotificationStoreState {
  // Add state properties
  items: any[];
  // Add actions
  addItem: (item: any) => void;
  removeItem: (id: string) => void;
  clearItems: () => void;
}

export const useNotificationStore = create<useNotificationStoreState>()(
  devtools(
    persist(
      (set) => ({
        items: [],
        addItem: (item) => set((state) => ({ items: [...state.items, item] })),
        removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
        clearItems: () => set({ items: [] }),
      }),
      { name: 'usenotificationstore-storage' }
    )
  )
);
