import { useEffect } from 'react';
import { useUiStore } from '@/store/uiStore';

export default function Toast() {
  const { message, clearToast } = useUiStore();

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(clearToast, 3000);
    return () => clearTimeout(t);
  }, [message, clearToast]);

  if (!message) return null;

  return (
    <div
      className="animate-pop"
      style={{
        position: 'fixed',
        bottom: 96,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        pointerEvents: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: '#1A1714',
        color: '#F7F5F1',
        padding: '12px 16px',
        borderRadius: 9999,
        fontSize: 13.5,
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      {message}
    </div>
  );
}
