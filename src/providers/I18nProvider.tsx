'use client';

import { ReactNode, createContext, useContext, useState } from 'react';

interface I18nProviderContextType {
  // Add context properties
}

const I18nProviderContext = createContext<I18nProviderContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState();

  return (
    <I18nProviderContext.Provider value={{}}>
      {children}
    </I18nProviderContext.Provider>
  );
}

export function useI18nProvider() {
  const context = useContext(I18nProviderContext);
  if (context === undefined) {
    throw new Error('useI18nProvider must be used within I18nProvider');
  }
  return context;
}
