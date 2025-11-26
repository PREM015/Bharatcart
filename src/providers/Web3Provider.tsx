'use client';

import { ReactNode, createContext, useContext, useState } from 'react';

interface Web3ProviderContextType {
  // Add context properties
}

const Web3ProviderContext = createContext<Web3ProviderContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: ReactNode }) {
  const [state, setState] = useState();

  return (
    <Web3ProviderContext.Provider value={{}}>
      {children}
    </Web3ProviderContext.Provider>
  );
}

export function useWeb3Provider() {
  const context = useContext(Web3ProviderContext);
  if (context === undefined) {
    throw new Error('useWeb3Provider must be used within Web3Provider');
  }
  return context;
}
