'use client';

import { createContext, useContext, ReactNode, useState } from 'react';

interface LoadingContextContextType {
  // Add context properties
}

const LoadingContextContext = createContext<LoadingContextContextType | undefined>(undefined);

export function LoadingContextProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState();

  const value = {{}};

  return (
    <LoadingContextContext.Provider value={value}>
      {children}
    </LoadingContextContext.Provider>
  );
}

export function useLoadingContext() {
  const context = useContext(LoadingContextContext);
  if (!context) {
    throw new Error('useLoadingContext must be used within LoadingContextProvider');
  }
  return context;
}
