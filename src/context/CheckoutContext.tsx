// Checkout Context
'use client';
import { createContext } from 'react';

export const CheckoutContext = createContext(null);

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  return <CheckoutContext.Provider value={null}>{children}</CheckoutContext.Provider>;
}
