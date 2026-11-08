import { createContext, useContext, useState, type ReactNode } from 'react';

export type RequestState = 'idle' | 'loading' | 'success' | 'error';
type Draft = { email: string; phone: string; dial: string; method: 'whatsapp' | 'email' };
const emptyDraft: Draft = { email: '', phone: '', dial: '+967', method: 'whatsapp' };
const RequestContext = createContext({ draft: emptyDraft, setDraft: (_draft: Draft) => {}, state: 'idle' as RequestState, setState: (_state: RequestState) => {} });
export function EarlyAccessProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [state, setState] = useState<RequestState>('idle');
  return <RequestContext.Provider value={{ draft, setDraft, state, setState }}>{children}</RequestContext.Provider>;
}
export function useEarlyAccess() { return useContext(RequestContext); }