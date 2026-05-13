import * as SwitchPrimitive from '@radix-ui/react-switch';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  'aria-label': string;
  size?: 'sm' | 'md';
}

function Switch({ checked, onChange, disabled, 'aria-label': ariaLabel, size = 'md' }: SwitchProps) {
  const trackSize = size === 'sm' ? 'w-8 h-5' : 'w-10 h-6';
  const thumbSize = size === 'sm' ? 'w-4 h-4' : 'w-[18px] h-[18px]';
  const thumbTranslate = size === 'sm' ? 'data-[state=checked]:translate-x-3' : 'data-[state=checked]:translate-x-4';

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
          'block rounded-full bg-white shadow-sm transition-transform duration-fast ease-out-quart',
          thumbSize,
          thumbTranslate,
          'translate-x-[3px]',
        ].join(' ')}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
export type { SwitchProps };
