import { createContext, useContext } from 'react';
import type { ToastPayload } from '../lib/toastQueue';

interface ToastContextValue {
  toasts: readonly ToastPayload[];
  toast: (payload: Omit<ToastPayload, 'id'>) => string;
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
