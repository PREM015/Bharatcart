// Notification Context
'use client';
import { createContext } from 'react';

export const NotificationContext = createContext(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  return <NotificationContext.Provider value={null}>{children}</NotificationContext.Provider>;
}
