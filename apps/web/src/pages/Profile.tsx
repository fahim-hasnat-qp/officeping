import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type MemberStats, getMemberStats, getRequests, updateProfile } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import AppShell from '@/components/Layout/AppShell';
import Header from '@/components/Layout/Header';
import TabBar from '@/components/Layout/TabBar';
import OPSheet from '@/components/OPSheet';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import { type RequestDto, RequestStatus, UserRole } from '@officeping/shared';

const BASE_TABS = [
  { key: 'home',     label: 'Home',     icon: 'home' },
  { key: 'activity', label: 'Activity', icon: 'inbox' },
  { key: 'meals',    label: 'Meals',    icon: 'utensils' },
  { key: 'profile',  label: 'Profile',  icon: 'user' },
];
const MANAGE_TAB = { key: 'manage', label: 'Manage', icon: 'settings' };

const TAB_ROUTES: Record<string, string> = {
  home: '/', activity: '/activity', meals: '/meals', profile: '/profile', manage: '/manage',
};

const STATUS_LABEL: Record<RequestStatus, string> = {
  [RequestStatus.PENDING]: 'Pending',
  [RequestStatus.ACCEPTED]: 'Accepted',
  [RequestStatus.IN_PROGRESS]: 'In progress',
  [RequestStatus.DONE]: 'Done',
  [RequestStatus.CANCELLED]: 'Cancelled',
};

const STATUS_COLOR: Record<RequestStatus, { bg: string; text: string }> = {
  [RequestStatus.PENDING]:     { bg: '#FEF3C7', text: '#92400E' },
  [RequestStatus.ACCEPTED]:    { bg: '#DBEAFE', text: '#1E40AF' },
  [RequestStatus.IN_PROGRESS]: { bg: '#EDE9FE', text: '#5B21B6' },
  [RequestStatus.DONE]:        { bg: '#D1FAE5', text: '#065F46' },
  [RequestStatus.CANCELLED]:   { bg: '#FEE2E2', text: '#991B1B' },
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function Card({ children, style }: Readonly<{ children: React.ReactNode; style?: React.CSSProperties }>) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #DDD8CF', borderRadius: 14, overflow: 'hidden', ...style }}>
      {children}
    </div>
  );
}

function StatTile({ label, value, sub, gold }: Readonly<{ label: string; value: string | number; sub?: string; gold?: boolean }>) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 8px', gap: 2 }}>
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 500, color: gold ? '#B07D2E' : 'var(--ink)', margin: 0, lineHeight: 1 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 10, color: '#B07D2E', margin: 0, fontWeight: 600 }}>{sub}</p>}
      <p style={{ fontSize: 11, color: '#7A7369', margin: '3px 0 0', textAlign: 'center', lineHeight: 1.3 }}>{label}</p>
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, background: '#EDE9E3', alignSelf: 'stretch', margin: '10px 0' }} />;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, setAuth } = useAuthStore();
  const tabs = user?.role === UserRole.ADMIN ? [...BASE_TABS, MANAGE_TAB] : BASE_TABS;
  const accessToken = useAuthStore((s) => s.accessToken);
  const { showToast } = useUiStore();

  const defaultStats: MemberStats = {
    requestsSent: 0, requestsToday: 0, requestsThisWeek: 0, requestsThisMonth: 0,
    complimentsGiven: 0, topCategories: [],
  };
  const [stats, setStats] = useState<MemberStats>(defaultStats);
  const [recentRequests, setRecentRequests] = useState<RequestDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit sheet
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDefaultBreakfast, setEditDefaultBreakfast] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (stats || recentRequests.length > 0) setLoading(false);
    Promise.all([
      getMemberStats(),
      getRequests({ limit: 5 }),
    ]).then(([s, r]) => {
      setStats(s);
      setRecentRequests(r);
    }).catch(() => undefined).finally(() => setLoading(false));
  }, []);

  function openEdit() {
    setEditName(user?.name ?? '');
    setEditLocation(user?.deskLocation ?? '');
    setEditDefaultBreakfast(user?.defaultBreakfast ?? '');
    setEditOpen(true);
  }

  async function handleSave() {
    if (!editName.trim()) { showToast('Name is required'); return; }
    setSaving(true);
    try {
      const updated = await updateProfile({
        name: editName.trim(),
        deskLocation: editLocation.trim() || undefined,
        defaultBreakfast: editDefaultBreakfast.trim() || null,
      });
      if (accessToken) setAuth(updated, accessToken);
      setEditOpen(false);
      showToast('Profile updated');
    } catch {
      showToast('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  // Category bar helpers
  const maxCat = Math.max(...stats.topCategories.map((c) => c.count), 1);

  return (
    <AppShell>
      <Header title="Profile" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 32px' }}>

        {/* ── Identity ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <Avatar name={user?.name ?? '?'} size={62} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, margin: 0, color: 'var(--ink)', letterSpacing: '-0.3px' }}>
              {user?.name ?? '—'}
            </h2>
            <p style={{ fontSize: 13, color: '#7A7369', margin: '2px 0 0' }}>{user?.email ?? '—'}</p>
            {user?.deskLocation && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Icon name="pin" size={12} stroke={1.8} style={{ color: '#B07D2E' }} />
                <span style={{ fontSize: 12, color: '#B07D2E', fontWeight: 500 }}>{user.deskLocation}</span>
              </div>
            )}
          </div>
          <button
            onClick={openEdit}
            style={{ width: 36, height: 36, borderRadius: 9999, border: '1px solid #DDD8CF', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 }}
          >
            <Icon name="pencil" size={16} stroke={1.8} />
          </button>
        </div>

        {/* ── Period stats ── */}
        <Card style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex' }}>
            <StatTile label="Today" value={loading ? '·' : stats.requestsToday} />
            <Divider />
            <StatTile label="This week" value={loading ? '·' : stats.requestsThisWeek} />
            <Divider />
            <StatTile label="This month" value={loading ? '·' : stats.requestsThisMonth} />
            <Divider />
            <StatTile label="Compliments" value={loading ? '·' : stats.complimentsGiven} gold />
          </div>
        </Card>

        {/* ── Recent activity ── */}
        <Card style={{ marginBottom: 12 }}>
          <div style={{ padding: '12px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7A7369', margin: 0 }}>
              Recent activity
            </p>
            <button
              onClick={() => navigate('/activity')}
              style={{ fontSize: 12, color: '#B07D2E', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              See all
            </button>
          </div>
          {loading && (
            <p style={{ fontSize: 13, color: '#7A7369', padding: '8px 16px 16px', margin: 0 }}>Loading…</p>
          )}
          {!loading && recentRequests.length === 0 && (
            <p style={{ fontSize: 13, color: '#7A7369', padding: '8px 16px 16px', margin: 0 }}>No requests yet.</p>
          )}
          {!loading && recentRequests.map((req, idx) => {
            const chip = STATUS_COLOR[req.status];
            return (
              <button
                key={req.id}
                onClick={() => navigate(`/requests/${req.id}`)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 16px', background: 'none', border: 'none',
                  borderTop: idx === 0 ? 'none' : '1px solid #EDE9E3',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 20, flexShrink: 0, width: 28, textAlign: 'center' }}>{req.category.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {req.category.name}
                  </p>
                  <p style={{ fontSize: 12, color: '#7A7369', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {req.description || req.location}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: chip.bg, color: chip.text }}>
                    {STATUS_LABEL[req.status]}
                  </span>
                  <span style={{ fontSize: 11, color: '#7A7369' }}>{timeAgo(req.createdAt)}</span>
                </div>
              </button>
            );
          })}
        </Card>

        {/* ── Top categories ── */}
        {stats.topCategories.length > 0 && (
          <Card style={{ marginBottom: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7A7369', margin: '0 0 14px' }}>
              Top requests
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.topCategories.map((cat, i) => (
                <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 }}>{cat.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{cat.name}</span>
                      <span style={{ fontSize: 12, color: '#7A7369', fontWeight: 500 }}>{cat.count}</span>
                    </div>
                    <div style={{ height: 5, background: '#EDE9E3', borderRadius: 99 }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${(cat.count / maxCat) * 100}%`,
                          background: i === 0 ? '#B07D2E' : '#1A1714',
                          borderRadius: 99,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Settings ── */}
        <Card style={{ marginBottom: 24 }}>
          <button
            onClick={openEdit}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ width: 34, height: 34, background: '#EDE9E3', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="pin" size={17} stroke={1.8} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--ink)', margin: 0 }}>Default location</p>
              <p style={{ fontSize: 12.5, color: '#7A7369', margin: '2px 0 0' }}>{user?.deskLocation ?? 'Not set'}</p>
            </div>
            <Icon name="chevronRight" size={16} stroke={1.8} style={{ color: '#7A7369' }} />
          </button>
          <button
            onClick={openEdit}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: 'none', border: 'none', borderTop: '1px solid #EDE9E3', cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ width: 34, height: 34, background: '#F5E8CC', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="utensils" size={17} stroke={1.8} style={{ color: '#B07D2E' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--ink)', margin: 0 }}>Default breakfast</p>
              <p style={{ fontSize: 12.5, color: '#7A7369', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.defaultBreakfast ?? 'Not set — tap to add your usual order'}
              </p>
            </div>
            <Icon name="chevronRight" size={16} stroke={1.8} style={{ color: '#7A7369' }} />
          </button>
          <button
            onClick={() => { useAuthStore.getState().clearAuth(); navigate('/login'); }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: 'none', border: 'none', borderTop: '1px solid #EDE9E3', cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ width: 34, height: 34, background: '#FDECEA', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="power" size={17} stroke={1.8} style={{ color: '#9B2335' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 14.5, color: '#9B2335', margin: 0 }}>Sign out</p>
            </div>
          </button>
        </Card>
      </div>

      <TabBar
        tabs={tabs}
        liveTab="activity"
        active="profile"
        onTabChange={(key) => navigate(TAB_ROUTES[key] ?? '/')}
      />

      {editOpen && (
        <OPSheet onClose={() => setEditOpen(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.13em', color: '#7A7369', marginBottom: 8 }}>Name</p>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Your name"
                style={{ width: '100%', height: 46, border: '1.5px solid #DDD8CF', borderRadius: 10, padding: '0 14px', fontSize: 15, fontFamily: 'var(--font-sans)', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box', color: 'var(--ink)' }}
              />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.13em', color: '#7A7369', marginBottom: 8 }}>Desk location</p>
              <input
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                placeholder="e.g. Desk 14, Meeting Room 2"
                style={{ width: '100%', height: 46, border: '1.5px solid #DDD8CF', borderRadius: 10, padding: '0 14px', fontSize: 15, fontFamily: 'var(--font-sans)', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box', color: 'var(--ink)' }}
              />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.13em', color: '#7A7369', marginBottom: 8 }}>Default breakfast</p>
              <textarea
                value={editDefaultBreakfast}
                onChange={(e) => setEditDefaultBreakfast(e.target.value)}
                placeholder="e.g. Avocado toast + oat latte"
                rows={3}
                style={{ width: '100%', border: '1.5px solid #DDD8CF', borderRadius: 10, padding: '12px 14px', fontSize: 15, fontFamily: 'var(--font-sans)', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box', color: 'var(--ink)', resize: 'none', lineHeight: 1.5 }}
              />
              <p style={{ fontSize: 12, color: '#7A7369', margin: '6px 0 0' }}>Saved as your usual — one tap to order it on the Meals screen.</p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !editName.trim()}
              style={{ width: '100%', height: 50, background: saving || !editName.trim() ? '#C8B89A' : 'var(--ink)', color: '#F7F5F1', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: saving || !editName.trim() ? 'not-allowed' : 'pointer' }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </OPSheet>
      )}
    </AppShell>
  );
}
