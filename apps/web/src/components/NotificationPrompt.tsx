import { useEffect, useState } from 'react';
import { registerPush, isPushSupported } from '@/lib/push';
import Icon from '@/components/Icon';

export default function NotificationPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    if (Notification.permission === 'denied') return;
    if (Notification.permission === 'granted') {
      registerPush().catch(() => null);
      return;
    }
    setVisible(true);
  }, []);

  if (!visible) return null;

  const handleEnable = async () => {
    setVisible(false);
    await registerPush();
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        backgroundColor: '#B07D2E',
        flexShrink: 0,
      }}
    >
      <Icon name="bell" size={18} stroke={2} style={{ color: '#fff', flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: '#fff', flex: 1, lineHeight: 1.3, fontWeight: 500 }}>
        Tap to enable push notifications
      </span>
      <button
        onClick={handleEnable}
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#B07D2E',
          background: '#fff',
          border: 'none',
          cursor: 'pointer',
          padding: '5px 10px',
          borderRadius: 6,
          flexShrink: 0,
        }}
      >
        Enable
      </button>
    </div>
  );
}
