import AppShell from '@/components/Layout/AppShell';
import Header from '@/components/Layout/Header';
import Icon from '@/components/Icon';

export default function Notifications() {
  return (
    <AppShell>
      <Header
        title="Notifications"
        back
        action={
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              color: '#7A7369',
              cursor: 'pointer',
              padding: '6px 2px',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Mark all read
          </button>
        }
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 32px 80px',
          textAlign: 'center',
        }}
      >
        <div style={{ color: '#7A7369', marginBottom: 12 }}>
          <Icon name="bell" size={40} stroke={1.5} />
        </div>
        <p style={{ fontWeight: 600, fontSize: 16, color: 'var(--ink)', margin: '0 0 8px' }}>
          No notifications yet
        </p>
        <p style={{ fontSize: 13.5, color: '#7A7369', lineHeight: 1.5, margin: 0 }}>
          Status updates and notes will appear here.
        </p>
      </div>
    </AppShell>
  );
}
