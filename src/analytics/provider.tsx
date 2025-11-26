'use client';

import { ReactNode, createContext, useContext, useState } from 'react';

interface providerContextType {
  // Add context properties
}

const providerContext = createContext<providerContextType | undefined>(undefined);

export function provider({ children }: { children: ReactNode }) {
  const [state, setState] = useState();

  return (
    <providerContext.Provider value={{}}>
      {children}
    </providerContext.Provider>
  );
}

export function useprovider() {
  const context = useContext(providerContext);
  if (context === undefined) {
    throw new Error('useprovider must be used within provider');
  }
  return context;
}
