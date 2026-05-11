import * as SwitchPrimitive from '@radix-ui/react-switch';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  'aria-label': string;
  size?: 'sm' | 'md';
}

function Switch({ checked, onChange, disabled, 'aria-label': ariaLabel, size = 'md' }: SwitchProps) {
  const trackSize = size === 'sm' ? 'w-5 h-3' : 'w-6 h-3.5';
  const thumbSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  const thumbTranslate = size === 'sm' ? 'data-[state=checked]:translate-x-2' : 'data-[state=checked]:translate-x-2.5';

  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className={[
        'relative inline-flex shrink-0 items-center rounded-full transition-colors duration-fast',
        'disabled:opacity-50',
        trackSize,
        checked ? 'bg-accent' : 'bg-border-default',
      ].join(' ')}
    >
      <SwitchPrimitive.Thumb
        className={[
          'block rounded-full bg-white transition-transform duration-fast',
          thumbSize,
          thumbTranslate,
          'translate-x-0.5',
        ].join(' ')}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
export type { SwitchProps };
