interface ToggleProps {
  readonly on: boolean;
  readonly onChange?: () => void;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly color?: 'green' | 'gold';
}

const SIZE_MAP = {
  sm: { width: 40, height: 24, knob: 19 },
  md: { width: 46, height: 28, knob: 22 },
  lg: { width: 52, height: 31, knob: 25 },
} as const;

const COLOR_MAP = {
  green: '#2D6A4F',
  gold: '#B07D2E',
} as const;

export default function Toggle({ on, onChange, size = 'md', color = 'green' }: ToggleProps) {
  const { width, height, knob } = SIZE_MAP[size];
  const onColor = COLOR_MAP[color];
  const offset = (height - knob) / 2;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width,
        height,
        borderRadius: 9999,
        background: on ? onColor : '#DDD8CF',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        transition: 'background 0.18s ease',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: offset,
          left: on ? width - knob - offset : offset,
          width: knob,
          height: knob,
          borderRadius: 9999,
          background: '#FFFFFF',
          transition: 'left 0.18s ease',
        }}
      />
    </button>
  );
}
