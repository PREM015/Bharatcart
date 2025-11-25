// Filter Context
'use client';
import { createContext } from 'react';

export const FilterContext = createContext(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  return <FilterContext.Provider value={null}>{children}</FilterContext.Provider>;
}
