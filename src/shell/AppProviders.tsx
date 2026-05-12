import type { ReactNode } from 'react';
import { ThemeProvider } from './ThemeProvider';
import { ToastProvider } from './ToastProvider';
import { CommandBarProvider } from './CommandBarProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <CommandBarProvider>
          {children}
        </CommandBarProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
