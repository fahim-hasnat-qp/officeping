import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyStats, updateMyStatus } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import AppShell from '@/components/Layout/AppShell';
import Header from '@/components/Layout/Header';
import TabBar from '@/components/Layout/TabBar';
import SectionLabel from '@/components/SectionLabel';
import Avatar from '@/components/Avatar';
import Toggle from '@/components/Toggle';
import Icon from '@/components/Icon';

// ─── Constants ────────────────────────────────────────────────────────────────

const STAFF_TABS = [
  { key: 'home',     label: 'Home',     icon: 'home' },
  { key: 'requests', label: 'Requests', icon: 'inbox' },
  { key: 'meals',    label: 'Meals',    icon: 'utensils' },
  { key: 'profile',  label: 'Profile',  icon: 'user' },
];

const TAB_NAV: Record<string, string> = {
  home: '/',
  requests: '/requests',
  meals: '/meals',
  profile: '/profile',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface RowProps {
  readonly icon: string;
  readonly title: string;
  readonly value: string;
  readonly right?: React.ReactNode;
  readonly border?: boolean;
}

function SettingsRow({ icon, title, value, right, border = true }: RowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 16px',
        borderTop: border ? '1px solid #EDE9E3' : 'none',
      }}
    >
      {/* Icon tile */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: '#EDE9E3',
          color: '#3D3830',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={17} stroke={1.8} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: 14.5, margin: '0 0 1px', color: 'var(--ink)' }}>
          {title}
        </p>
        <p style={{ fontSize: 12.5, color: '#7A7369', margin: 0 }}>
          {value}
        </p>
      </div>

      {/* Right element */}
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StaffProfile() {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

  const [isOnline, setIsOnline] = useState(user?.isOnline ?? true);
  const [onBreak, setOnBreak] = useState(false);
  const [stats, setStats] = useState({ doneToday: 0, doneThisMonth: 0, compliments: 0 });

  useEffect(() => {
    getMyStats().then(setStats).catch(() => undefined);
  }, []);

  const handleToggleOnline = async () => {
    const next = !isOnline;
    setIsOnline(next);
    try {
      await updateMyStatus(next);
    } catch {
      setIsOnline(!next);
    }
  };

  const handleToggleBreak = () => {
    setOnBreak((prev) => !prev);
  };

  const handleSignOut = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  const name = user?.name ?? 'Staff';
  const role = user?.role ?? 'staff';

  return (
    <AppShell>
      <Header title="Profile" />

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 20px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* ── 1. Identity ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '4px 0',
          }}
        >
          <Avatar name={name} size={64} online={isOnline} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 24,
                fontWeight: 500,
                color: 'var(--ink)',
                margin: '0 0 2px',
                letterSpacing: '-0.2px',
                lineHeight: 1.15,
              }}
            >
              {name}
            </p>
            <p style={{ fontSize: 13.5, color: '#7A7369', margin: 0, textTransform: 'capitalize' }}>
              {role}
            </p>
          </div>

          {/* Edit icon button */}
          <button
            type="button"
            style={{
              width: 36,
              height: 36,
              borderRadius: 9999,
              border: '1px solid #DDD8CF',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#7A7369',
              flexShrink: 0,
              padding: 0,
            }}
            aria-label="Edit profile"
          >
            <Icon name="edit" size={16} stroke={1.8} />
          </button>
        </div>

        {/* ── 2. Stats row ── */}
        <div style={{ display: 'flex', gap: 12 }}>
          {/* Done today */}
          <div
            style={{
              flex: 1,
              background: '#FFFFFF',
              border: '1px solid #DDD8CF',
              borderRadius: 12,
              padding: '14px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Icon name="checkCircle" size={18} stroke={1.8} style={{ color: '#2D6A4F' }} />
            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 22,
                fontWeight: 600,
                color: 'var(--ink)',
                margin: 0,
                lineHeight: 1,
              }}
            >
              {stats.doneToday}
            </p>
            <p style={{ fontSize: 11, color: '#7A7369', margin: 0, textAlign: 'center' }}>
              Done today
            </p>
          </div>

          {/* This month */}
          <div
            style={{
              flex: 1,
              background: '#FFFFFF',
              border: '1px solid #DDD8CF',
              borderRadius: 12,
              padding: '14px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Icon name="check" size={18} stroke={2} style={{ color: 'var(--ink3)' }} />
            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 22,
                fontWeight: 600,
                color: 'var(--ink)',
                margin: 0,
                lineHeight: 1,
              }}
            >
              {stats.doneThisMonth}
            </p>
            <p style={{ fontSize: 11, color: '#7A7369', margin: 0, textAlign: 'center' }}>
              This month
            </p>
          </div>

          {/* Compliments */}
          <div
            style={{
              flex: 1,
              background: '#FFFFFF',
              border: '1px solid #DDD8CF',
              borderRadius: 12,
              padding: '14px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Icon name="heart" size={18} stroke={1.8} style={{ color: '#B07D2E' }} />
            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 22,
                fontWeight: 600,
                color: '#B07D2E',
                margin: 0,
                lineHeight: 1,
              }}
            >
              {stats.compliments}
            </p>
            <p style={{ fontSize: 11, color: '#7A7369', margin: 0, textAlign: 'center' }}>
              Compliments
            </p>
          </div>
        </div>

        {/* ── 3. Availability card ── */}
        <section>
          <div style={{ marginBottom: 12 }}>
            <SectionLabel>Availability</SectionLabel>
          </div>

          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #DDD8CF',
              borderRadius: 12,
              overflow: 'hidden',
              padding: 0,
            }}
          >
            {/* Online row */}
            <SettingsRow
              border={false}
              icon="power"
              title="Online"
              value="Receiving new requests"
              right={
                <Toggle
                  size="sm"
                  color="green"
                  on={isOnline}
                  onChange={handleToggleOnline}
                />
              }
            />

            {/* Auto-offline row */}
            <SettingsRow
              icon="clock"
              title="Auto-offline"
              value="After 6:00 PM"
              right={
                <Icon name="chevronRight" size={18} stroke={1.8} style={{ color: '#7A7369' }} />
              }
            />

            {/* On a break row */}
            <SettingsRow
              icon="pause"
              title="On a break"
              value="Pauses incoming for 30 min"
              right={
                <Toggle
                  size="sm"
                  on={onBreak}
                  onChange={handleToggleBreak}
                />
              }
            />
          </div>
        </section>

        {/* ── 4. Settings card ── */}
        <section>
          <div style={{ marginBottom: 12 }}>
            <SectionLabel>Settings</SectionLabel>
          </div>

          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #DDD8CF',
              borderRadius: 12,
              overflow: 'hidden',
              padding: 0,
            }}
          >
            {/* Categories */}
            <SettingsRow
              border={false}
              icon="grid"
              title="Categories I handle"
              value="All categories"
              right={
                <Icon name="chevronRight" size={18} stroke={1.8} style={{ color: '#7A7369' }} />
              }
            />

            {/* Notifications */}
            <SettingsRow
              icon="bell"
              title="Notifications"
              value="New requests, notes"
              right={
                <Icon name="chevronRight" size={18} stroke={1.8} style={{ color: '#7A7369' }} />
              }
            />
          </div>
        </section>

        {/* ── 5. Sign out ── */}
        <button
          type="button"
          onClick={handleSignOut}
          style={{
            width: '100%',
            height: 48,
            borderRadius: 12,
            border: '1px solid #DDD8CF',
            background: 'transparent',
            color: '#9B2335',
            fontSize: 15,
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          Sign out
        </button>
      </div>

      {/* ── Tab bar ── */}
      <TabBar
        tabs={STAFF_TABS}
        liveTab="requests"
        active="profile"
        onTabChange={(key) => navigate(TAB_NAV[key] ?? '/')}
      />
    </AppShell>
  );
}
