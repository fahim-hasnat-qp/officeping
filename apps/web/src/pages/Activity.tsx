import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RequestStatus, UserRole } from '@officeping/shared';
import type { RequestDto } from '@officeping/shared';
import { getRequests } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useRequestStore } from '@/store/requestStore';
import { useUiStore } from '@/store/uiStore';
import AppShell from '@/components/Layout/AppShell';
import Header from '@/components/Layout/Header';
import TabBar from '@/components/Layout/TabBar';
import RequestCard from '@/components/RequestCard';
import Icon from '@/components/Icon';

const BASE_TABS = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'activity', label: 'Activity', icon: 'inbox' },
  { key: 'meals', label: 'Meals', icon: 'utensils' },
  { key: 'profile', label: 'Profile', icon: 'user' },
];
const MANAGE_TAB = { key: 'manage', label: 'Manage', icon: 'settings' };

const TAB_ROUTES: Record<string, string> = {
  home: '/',
  activity: '/activity',
  meals: '/meals',
  profile: '/profile',
  manage: '/manage',
};

const ACTIVE_STATUSES = [RequestStatus.PENDING, RequestStatus.ACCEPTED, RequestStatus.IN_PROGRESS];
const PAST_STATUSES = [RequestStatus.DONE, RequestStatus.CANCELLED];

type SegmentKey = 'active' | 'past';

export default function Activity() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const tabs = user?.role === UserRole.ADMIN ? [...BASE_TABS, MANAGE_TAB] : BASE_TABS;
  const { requests, setRequests } = useRequestStore();
  const { showToast } = useUiStore();
  const [segment, setSegment] = useState<SegmentKey>('active');
  const [loading, setLoading] = useState(requests.length === 0);

  useEffect(() => {
    (async () => {
      try {
        const [activeRes, pastRes] = await Promise.all([
          getRequests({ status: ACTIVE_STATUSES.join(','), limit: 50 }),
          getRequests({ status: PAST_STATUSES.join(','), limit: 50 }),
        ]);
        setRequests([...activeRes, ...pastRes]);
      } catch {
        if (requests.length === 0) showToast('Failed to load activity');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeList = requests.filter((r) => ACTIVE_STATUSES.includes(r.status));
  const pastList = requests.filter((r) => PAST_STATUSES.includes(r.status));
  const visibleList: RequestDto[] = segment === 'active' ? activeList : pastList;

  function hasUnreadNote(r: RequestDto): boolean {
    // RequestNoteDto has no readAt; treat any notes on an active request as potentially unread
    return ACTIVE_STATUSES.includes(r.status) && (r.notes?.length ?? 0) > 0;
  }

  return (
    <AppShell>
      <Header
        title="Activity"
        action={
          <button
            type="button"
            onClick={() => navigate('/notifications')}
            style={{
              width: 38,
              height: 38,
              borderRadius: 9999,
              border: '1px solid #DDD8CF',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <Icon name="bell" size={18} stroke={1.7} />
          </button>
        }
      />

      {/* Segmented control */}
      <div style={{ padding: '0 20px 16px', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            background: '#EDE9E3',
            borderRadius: 10,
            padding: 4,
            gap: 4,
          }}
        >
          {(['active', 'past'] as SegmentKey[]).map((key) => {
            const isActive = segment === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSegment(key)}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 8,
                  border: 'none',
                  background: isActive ? '#FFFFFF' : 'transparent',
                  boxShadow: isActive ? '0 0 0 1px #DDD8CF' : 'none',
                  color: isActive ? 'var(--ink)' : '#7A7369',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  fontFamily: 'var(--font-sans)',
                  textTransform: 'capitalize',
                }}
              >
                {key}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 32px' }}>
        {loading && (
          <p style={{ fontSize: 12, color: '#7A7369', textAlign: 'center', padding: '32px 0' }}>Loading…</p>
        )}

        {!loading && visibleList.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '64px 0',
              color: '#7A7369',
            }}
          >
            <Icon name="inbox" size={36} stroke={1.5} />
            <p style={{ fontSize: 14, marginTop: 12, fontWeight: 500 }}>No requests yet</p>
          </div>
        )}

        {!loading && visibleList.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visibleList.map((r) => {
              const unread = hasUnreadNote(r);
              return (
                <div key={r.id} style={{ position: 'relative' }}>
                  <RequestCard
                    request={r}
                    variant={segment === 'active' ? 'plain' : 'history'}
                    onClick={() => navigate(`/requests/${r.id}`)}
                  />
                  {unread && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        background: '#FBF4E6',
                        color: '#B07D2E',
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 9999,
                        padding: '3px 9px',
                        pointerEvents: 'none',
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 9999,
                          background: '#B07D2E',
                          flexShrink: 0,
                        }}
                      />
                      New note
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TabBar
        tabs={tabs}
        liveTab="activity"
        active="activity"
        onTabChange={(key) => navigate(TAB_ROUTES[key] ?? '/')}
      />
    </AppShell>
  );
}
