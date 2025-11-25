// Wishlist Context
'use client';
import { createContext } from 'react';

export const WishlistContext = createContext(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  return <WishlistContext.Provider value={null}>{children}</WishlistContext.Provider>;
}
