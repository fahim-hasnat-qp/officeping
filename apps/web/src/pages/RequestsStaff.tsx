import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RequestStatus } from '@officeping/shared';

import { getRequests, updateRequestStatus } from '@/lib/api';
import { useUiStore } from '@/store/uiStore';
import { useStaffStore } from '@/store/staffStore';
import AppShell from '@/components/Layout/AppShell';
import Header from '@/components/Layout/Header';
import TabBar from '@/components/Layout/TabBar';
import RequestCard from '@/components/RequestCard';

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

type Tab = 'active' | 'history';

// ─── Component ────────────────────────────────────────────────────────────────

export default function RequestsStaff() {
  const navigate = useNavigate();
  const { showToast } = useUiStore();

  const { active, history, setActive, setHistory, removePending } = useStaffStore();
  const [tab, setTab] = useState<Tab>('active');
  const [loading, setLoading] = useState(active.length === 0 && history.length === 0);

  // ── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const [activeRes, historyRes] = await Promise.all([
          getRequests({
            status: [RequestStatus.ACCEPTED, RequestStatus.IN_PROGRESS].join(','),
            limit: 50,
          }),
          getRequests({
            status: [RequestStatus.DONE, RequestStatus.CANCELLED].join(','),
            limit: 50,
          }),
        ]);
        setActive(activeRes);
        setHistory(historyRes);
      } catch (err) {
        if (active.length === 0) {
          const msg =
            err instanceof Error && err.message.includes('Network')
              ? 'Network error — check connection'
              : 'Failed to load requests';
          showToast(msg);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleDone = async (id: string) => {
    try {
      const updated = await updateRequestStatus(id, { status: RequestStatus.DONE });
      removePending(id);
      setActive(active.filter((r) => r.id !== id));
      setHistory([updated, ...history]);
      showToast('Marked as done');
    } catch {
      showToast('Failed to update status');
    }
  };


  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <Header title="Requests" />

      {/* ── Segmented control ── */}
      <div style={{ padding: '0 20px 12px', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            gap: 4,
            background: '#EDE9E3',
            borderRadius: 10,
            padding: 4,
          }}
        >
          {(['active', 'history'] as Tab[]).map((t) => {
            const isActive = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 10,
                  border: 'none',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: isActive ? '#FFFFFF' : 'transparent',
                  color: isActive ? 'var(--ink)' : '#7A7369',
                  boxShadow: isActive ? '0 0 0 1px #DDD8CF' : 'none',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {t === 'active' ? 'Active' : 'History'}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 20px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {loading && (
          <p style={{ fontSize: 12, color: '#7A7369', textAlign: 'center', padding: '24px 0' }}>
            Loading…
          </p>
        )}

        {/* Active tab */}
        {!loading && tab === 'active' && (
          <>
            {active.length === 0 ? (
              <p style={{ fontSize: 13, color: '#7A7369', textAlign: 'center', padding: '32px 0' }}>
                No active requests
              </p>
            ) : (
              active.map((r) => (
                <RequestCard
                  key={r.id}
                  request={r}
                  variant="active"
                  onDone={() => handleDone(r.id)}
                  onClick={() => navigate(`/requests/${r.id}`)}
                />
              ))
            )}
          </>
        )}

        {/* History tab */}
        {!loading && tab === 'history' && (
          <>
            {history.length === 0 ? (
              <p style={{ fontSize: 13, color: '#7A7369', textAlign: 'center', padding: '32px 0' }}>
                No history yet
              </p>
            ) : (
              history.map((r) => (
                <RequestCard key={r.id} request={r} variant="history" onClick={() => navigate(`/requests/${r.id}`)} />
              ))
            )}
          </>
        )}
      </div>

      {/* ── Tab bar ── */}
      <TabBar
        tabs={STAFF_TABS}
        liveTab="requests"
        active="requests"
        onTabChange={(key) => navigate(TAB_NAV[key] ?? '/')}
      />
    </AppShell>
  );
}
