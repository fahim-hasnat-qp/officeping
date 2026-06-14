import type { ReactNode } from 'react';
import { useSocketStatus } from '@/hooks/useSocketStatus';
import Icon from '@/components/Icon';

interface AppShellProps {
  readonly children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const connected = useSocketStatus();

  return (
    <div className="max-w-[390px] mx-auto min-h-screen bg-surface flex flex-col relative pb-[76px]">
      {!connected && (
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
