'use client';

import { createContext, useContext } from 'react';

type SessionContextValue = {
  userId: string;
  userRole: string;
  tenantId: number | null;
  sessionKey: string;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export const SessionProvider = SessionContext.Provider;

export function useSessionContext() {
  return useContext(SessionContext);
}
