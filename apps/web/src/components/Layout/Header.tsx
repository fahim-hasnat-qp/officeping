import type { ReactNode } from 'react';
import Icon from '@/components/Icon';

interface HeaderProps {
  readonly title: string | ReactNode;
  readonly back?: boolean | (() => void);
  readonly action?: ReactNode;
}

export default function Header({ title, back, action }: HeaderProps) {
  function handleBack() {
    if (typeof back === 'function') {
      back();
    } else {
      globalThis.history.back();
    }
  }

  return (
    <div
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 20px 16px',
        minHeight: 52,
      }}
    >
      {back && (
        <button
          type="button"
          onClick={handleBack}
          style={{
            width: 38,
            height: 38,
            borderRadius: 9999,
            border: '1px solid #DDD8CF',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <Icon name="chevronLeft" size={20} stroke={1.7} />
        </button>
      )}
      <div
        style={{
          fontSize: 19,
          fontWeight: 600,
          letterSpacing: '-0.2px',
          flex: 1,
          color: 'var(--ink)',
        }}
      >
        {title}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}
