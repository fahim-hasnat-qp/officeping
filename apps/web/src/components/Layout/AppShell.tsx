import type { ReactNode } from 'react';
import { useSocketStatus } from '@/hooks/useSocketStatus';
import { useAuthStore } from '@/store/authStore';
import Icon from '@/components/Icon';
import NotificationPrompt from '@/components/NotificationPrompt';

interface AppShellProps {
  readonly children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const connected = useSocketStatus();
  const { accessToken } = useAuthStore();

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 390,
        minHeight: '100svh',
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        paddingBottom: 76,
        // Phone frame effect on desktop only
        boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 32px 80px rgba(0,0,0,0.6)',
        borderRadius: '0px',
      }}
      // On wide screens add rounded corners via a media-query-free approach:
      // we use a wrapper trick — the outer #root centers this, so just add
      // top/bottom radius when not filling the full viewport width.
      className="app-shell"
    >
      {accessToken && <NotificationPrompt />}
      {accessToken && !connected && (
        <div
          style={{
            height: 26,
            background: '#F5E5D1',
            color: '#A35E1C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          <Icon name="wifiOff" size={18} stroke={1.7} />
          Reconnecting…
        </div>
      )}
      {children}
    </div>
  );
}
