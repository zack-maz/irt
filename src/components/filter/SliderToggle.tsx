interface SliderToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  color?: string;
}

export function SliderToggle({ label, checked, onChange, color = '#22c55e' }: SliderToggleProps) {
  return (
    <label className="flex items-center justify-between gap-2 cursor-pointer">
      <span className="text-[10px] uppercase tracking-wider text-text-muted">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative h-4 w-7 rounded-full transition-colors"
        style={{ backgroundColor: checked ? color : 'rgba(255,255,255,0.15)' }}
      >
        <span
          className="absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? 'translateX(12px)' : 'translateX(0)' }}
        />
      </button>
    </label>
  );
}
