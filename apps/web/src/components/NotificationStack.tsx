import { useEffect, useRef } from 'react';
import { type AppNotification, useNotificationStore } from '@/store/notificationStore';
import Icon from '@/components/Icon';

const DEFAULT_DURATION = 4500;

const VARIANT_STYLES: Record<string, { bg: string; border: string; accent: string }> = {
  default: { bg: '#1A1714', border: '#3D3830', accent: '#F7F5F1' },
  success: { bg: '#0D2B1E', border: '#1E5C3A', accent: '#4ADE80' },
  warning: { bg: '#2B1A0D', border: '#7C4A1A', accent: '#FBBF24' },
  info:    { bg: '#0D1B2B', border: '#1A3A5C', accent: '#60A5FA' },
};

function NotificationItem({ n }: { readonly n: AppNotification }) {
  const { dismiss } = useNotificationStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const style = VARIANT_STYLES[n.variant ?? 'default'];

  useEffect(() => {
    timerRef.current = setTimeout(() => dismiss(n.id), n.durationMs ?? DEFAULT_DURATION);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [n.id, n.durationMs, dismiss]);

  function handleAction() {
    dismiss(n.id);
    if (n.onAction) n.onAction();
  }

  return (
    <div
      className="animate-slide-up"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: 14,
        padding: '12px 14px',
        minWidth: 280, maxWidth: 340,
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        pointerEvents: 'auto',
      }}
    >
      {n.icon && (
        <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1, marginTop: 1 }}>{n.icon}</span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#F7F5F1', lineHeight: 1.3 }}>
          {n.title}
        </p>
        {n.body && (
          <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#B0A99F', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {n.body}
          </p>
        )}
        {n.actionLabel && (
          <button
            onClick={handleAction}
            style={{
              marginTop: 8, padding: '4px 10px',
              background: style.accent, color: '#1A1714',
              border: 'none', borderRadius: 6,
              fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {n.actionLabel}
          </button>
        )}
      </div>
      <button
        onClick={() => dismiss(n.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0, color: '#7A7369', marginTop: -2 }}
      >
        <Icon name="x" size={14} stroke={2} />
      </button>
    </div>
  );
}

export default function NotificationStack() {
  const { queue } = useNotificationStore();
  if (queue.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      pointerEvents: 'none',
      width: 'calc(100% - 32px)',
      maxWidth: 360,
    }}>
      {queue.map((n) => <NotificationItem key={n.id} n={n} />)}
    </div>
  );
}
