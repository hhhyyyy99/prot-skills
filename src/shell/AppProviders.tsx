import type { ReactNode } from 'react';
import { ThemeProvider } from './ThemeProvider';
import { ToastProvider } from './ToastProvider';
import { CommandBarProvider } from './CommandBarProvider';
import { LanguageProvider } from './LanguageProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <CommandBarProvider>
            {children}
          </CommandBarProvider>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
