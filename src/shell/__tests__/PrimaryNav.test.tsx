import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PrimaryNav, type PrimaryNavItem } from '../PrimaryNav';
import { LanguageProvider } from '../LanguageProvider';

function MockIcon({ size }: { size?: number }) {
  return <svg data-testid="icon" width={size} height={size} />;
}

const items: PrimaryNavItem[] = [
  { id: 'discovery', label: 'Discovery', icon: MockIcon, shortcut: '⌘1' },
  { id: 'my-skills', label: 'My Skills', icon: MockIcon, shortcut: '⌘2' },
  { id: 'tools', label: 'Tools', icon: MockIcon, shortcut: '⌘3' },
  { id: 'migrate', label: 'Migrate', icon: MockIcon, shortcut: '⌘4' },
  { id: 'settings', label: 'Settings', icon: MockIcon, shortcut: '⌘5' },
];

describe('PrimaryNav', () => {
  it('sets aria-current=page on active item only', () => {
    const { getAllByRole } = render(
      <PrimaryNav items={items} activeId="my-skills" collapsed={false} onNavigate={() => {}} />,
      { wrapper: LanguageProvider },
    );
    const buttons = getAllByRole('button');
    expect(buttons[1]).toHaveAttribute('aria-current', 'page');
    expect(buttons[0]).not.toHaveAttribute('aria-current');
    expect(buttons[2]).not.toHaveAttribute('aria-current');
  });

  it('calls onNavigate with correct id on click', () => {
    const onNavigate = vi.fn();
    const { getAllByRole } = render(
      <PrimaryNav items={items} activeId="discovery" collapsed={false} onNavigate={onNavigate} />,
      { wrapper: LanguageProvider },
    );
    const buttons = getAllByRole('button');
    fireEvent.click(buttons[2]);
    expect(onNavigate).toHaveBeenCalledWith('tools');
  });

  it('ArrowDown moves focus to next button', () => {
    const { getAllByRole } = render(
      <PrimaryNav items={items} activeId="discovery" collapsed={false} onNavigate={() => {}} />,
      { wrapper: LanguageProvider },
    );
    const buttons = getAllByRole('button');
    buttons[0].focus();
    expect(document.activeElement).toBe(buttons[0]);

    fireEvent.keyDown(buttons[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(buttons[1]);
  });

  it('ArrowUp from first wraps to last', () => {
    const { getAllByRole } = render(
      <PrimaryNav items={items} activeId="discovery" collapsed={false} onNavigate={() => {}} />,
      { wrapper: LanguageProvider },
    );
    const buttons = getAllByRole('button');
    buttons[0].focus();

    fireEvent.keyDown(buttons[0], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(buttons[4]);
  });
});
