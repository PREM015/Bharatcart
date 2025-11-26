import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface useProductStoreState {
  // Add state properties
  items: any[];
  // Add actions
  addItem: (item: any) => void;
  removeItem: (id: string) => void;
  clearItems: () => void;
}

export const useProductStore = create<useProductStoreState>()(
  devtools(
    persist(
      (set) => ({
        items: [],
        addItem: (item) => set((state) => ({ items: [...state.items, item] })),
        removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
        clearItems: () => set({ items: [] }),
      }),
      { name: 'useproductstore-storage' }
    )
  )
);
