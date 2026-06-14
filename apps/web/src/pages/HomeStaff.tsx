import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RequestStatus, SocketEvents } from '@officeping/shared';
import type { ComplimentDto, RequestDto } from '@officeping/shared';
import {
  getComplimentsFeed,
  getRequests,
  updateMyStatus,
  updateRequestStatus,
} from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { useStaffStore } from '@/store/staffStore';
import AppShell from '@/components/Layout/AppShell';
import TabBar from '@/components/Layout/TabBar';
import SectionLabel from '@/components/SectionLabel';
import RequestCard from '@/components/RequestCard';
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

// ─── OnlinePill ───────────────────────────────────────────────────────────────

interface OnlinePillProps {
  readonly online: boolean;
  readonly onToggle: () => void;
}

function OnlinePill({ online, onToggle }: OnlinePillProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        height: 34,
        padding: '0 6px 0 12px',
        borderRadius: 9999,
        border: 'none',
        cursor: 'pointer',
        background: online ? '#DCE9E0' : '#EDE9E3',
        color: online ? '#2D6A4F' : '#7A7369',
        flexShrink: 0,
      }}
    >
      {/* dot */}
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 9999,
          background: 'currentColor',
          flexShrink: 0,
        }}
      />
      {/* label */}
      <span style={{ fontSize: 13, fontWeight: 600 }}>
        {online ? 'Online' : 'Offline'}
      </span>
      {/* inner toggle */}
      <span
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          width: 36,
          height: 22,
          borderRadius: 9999,
          background: online ? '#2D6A4F' : '#DDD8CF',
          transition: 'background 0.18s ease',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: online ? 16 : 2,
            width: 18,
            height: 18,
            borderRadius: 9999,
            background: '#FFFFFF',
            transition: 'left 0.18s ease',
          }}
        />
      </span>
    </button>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatComplimentTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return diffMin <= 1 ? 'just now' : `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomeStaff() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { showToast } = useUiStore();
  const socket = useSocket();
  const {
    pending, feed, completedToday,
    setPending, setFeed, setCompletedToday, upsertPending,
  } = useStaffStore();
  const [isOnline, setIsOnline] = useState(user?.isOnline ?? true);
  const [loading, setLoading] = useState(pending.length === 0);
  const [newComplimentId, setNewComplimentId] = useState<string | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const [pendingRes, feedRes, doneRes] = await Promise.all([
          getRequests({ status: RequestStatus.PENDING, limit: 50 }),
          getComplimentsFeed(),
          getRequests({ status: RequestStatus.DONE, limit: 50 }),
        ]);
        setPending(pendingRes);
        setFeed(feedRes);
        setCompletedToday(doneRes.length);
      } catch (err) {
        if (pending.length === 0) {
          const msg =
            err instanceof Error && err.message.includes('Network')
              ? 'Network error — check connection'
              : 'Failed to load dashboard';
          showToast(msg);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Socket ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const onNew = (req: RequestDto) => upsertPending(req);
    const onCompliment = (c: ComplimentDto) => {
      setFeed([c, ...feed]);
      setNewComplimentId(c.id);
      setTimeout(() => setNewComplimentId(null), 800);
    };

    socket.on(SocketEvents.RequestNew, onNew);
    socket.on(SocketEvents.ComplimentNew, onCompliment);
    return () => {
      socket.off(SocketEvents.RequestNew, onNew);
      socket.off(SocketEvents.ComplimentNew, onCompliment);
    };
  }, [socket, feed]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const toggleOnline = async () => {
    const next = !isOnline;
    setIsOnline(next);
    try {
      await updateMyStatus(next);
    } catch {
      setIsOnline(!next);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await updateRequestStatus(id, { status: RequestStatus.ACCEPTED });
      setPending(pending.filter((r) => r.id !== id));
      showToast('Request accepted');
    } catch {
      showToast('Failed to accept');
    }
  };


  // ── Derived ────────────────────────────────────────────────────────────────

  const firstName = user?.name?.split(' ')[0] ?? '';
  const roleLabel = 'Facilities · Floor 2–4';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      {/* ── Greeting block ── */}
      <div style={{ padding: '12px 20px 4px', flexShrink: 0 }}>
        {/* op-label */}
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.13em',
            textTransform: 'uppercase',
            color: '#7A7369',
            marginBottom: 0,
          }}
        >
          {roleLabel}
        </p>

        {/* Heading + pill row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginTop: 5 }}>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 28,
              fontWeight: 500,
              letterSpacing: '-0.3px',
              lineHeight: 1.1,
              color: 'var(--ink)',
              margin: 0,
            }}
          >
            Hi, {firstName}
          </h1>
          <OnlinePill online={isOnline} onToggle={toggleOnline} />
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* ── Stats row ── */}
        <div style={{ display: 'flex', gap: 12 }}>
          {/* Completed */}
          <div
            style={{
              flex: 1,
              background: '#FFFFFF',
              border: '1px solid #DDD8CF',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Icon name="checkCircle" size={18} stroke={1.8} style={{ color: '#2D6A4F', marginBottom: 6, display: 'block' }} />
            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: '-0.5px',
                lineHeight: 1,
                color: 'var(--ink)',
                margin: 0,
              }}
            >
              {completedToday}
            </p>
            <p style={{ fontSize: 12.5, color: '#7A7369', fontWeight: 500, marginTop: 5, marginBottom: 0 }}>
              Completed
            </p>
            <p style={{ fontSize: 11, color: '#7A7369', marginTop: 1, marginBottom: 0 }}>
              today
            </p>
          </div>

          {/* Compliments */}
          <div
            style={{
              flex: 1,
              background: '#FFFFFF',
              border: '1px solid #DDD8CF',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Icon name="heart" size={18} stroke={1.8} style={{ color: '#B07D2E', marginBottom: 6, display: 'block' }} />
            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: '-0.5px',
                lineHeight: 1,
                color: 'var(--ink)',
                margin: 0,
              }}
            >
              {feed.length}
            </p>
            <p style={{ fontSize: 12.5, color: '#7A7369', fontWeight: 500, marginTop: 5, marginBottom: 0 }}>
              Compliments
            </p>
            <p style={{ fontSize: 11, color: '#7A7369', marginTop: 1, marginBottom: 0 }}>
              this week
            </p>
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <p style={{ fontSize: 12, color: '#7A7369', textAlign: 'center', padding: '8px 0' }}>
            Loading…
          </p>
        )}

        {/* ── Pending requests ── */}
        {!loading && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionLabel
              right={
                pending.length > 0 ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      height: 20,
                      padding: '0 9px',
                      borderRadius: 9999,
                      background: '#F4E7C8',
                      color: '#8A6420',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {pending.length} waiting
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      height: 20,
                      padding: '0 9px',
                      borderRadius: 9999,
                      background: '#DCE9E0',
                      color: '#2D6A4F',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    All clear
                  </span>
                )
              }
            >
              Pending requests
            </SectionLabel>

            {pending.length === 0 ? (
              /* Empty state */
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #DDD8CF',
                  borderRadius: 12,
                  textAlign: 'center',
                  padding: '24px 20px',
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 9999,
                    background: '#DCE9E0',
                    color: '#2D6A4F',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}
                >
                  <Icon name="checkCircle" size={26} stroke={1.7} />
                </div>
                <p
                  style={{
                    fontWeight: 600,
                    fontSize: 16,
                    color: 'var(--ink)',
                    margin: '0 0 6px',
                  }}
                >
                  You're all caught up
                </p>
                <p style={{ fontSize: 13.5, color: '#7A7369', margin: 0, lineHeight: 1.4 }}>
                  No requests waiting. New ones will appear here the moment they come in.
                </p>
              </div>
            ) : (
              /* Request cards */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pending.map((r) => (
                  <RequestCard
                    key={r.id}
                    request={r}
                    variant="pending"
                    onAccept={() => handleAccept(r.id)}
                    onCancel={() => navigate(`/requests/${r.id}?action=cancel`)}
                    onClick={() => navigate(`/requests/${r.id}`)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Compliments feed ── */}
        {feed.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionLabel>Compliments</SectionLabel>

            {feed.map((c) => (
              <div
                key={c.id}
                className={c.id === newComplimentId ? 'animate-pop' : undefined}
                style={{
                  background: '#F5E8CC',
                  border: '1px solid #EAD6A8',
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                {/* Header row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Icon name="heart" size={16} fill stroke={0} style={{ color: '#B07D2E', flexShrink: 0 }} />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.13em',
                      textTransform: 'uppercase',
                      color: '#B07D2E',
                      flex: 1,
                    }}
                  >
                    Compliment
                  </span>
                  <span style={{ fontSize: 11.5, color: '#B07D2E' }}>
                    {formatComplimentTime(c.createdAt)}
                  </span>
                </div>

                {/* Message */}
                <p
                  style={{
                    fontSize: 14.5,
                    color: 'var(--ink)',
                    lineHeight: 1.4,
                    marginTop: 8,
                    marginBottom: 0,
                  }}
                >
                  {c.message}
                </p>

                {/* Attribution */}
                <p
                  style={{
                    fontSize: 12.5,
                    color: 'var(--ink2)',
                    marginTop: 12,
                    marginBottom: 0,
                  }}
                >
                  From {c.fromUser.name}
                </p>
              </div>
            ))}
          </section>
        )}
      </div>

      {/* ── Tab bar ── */}
      <TabBar
        tabs={STAFF_TABS}
        liveTab="requests"
        active="home"
        onTabChange={(key) => navigate(TAB_NAV[key] ?? '/')}
      />
    </AppShell>
  );
}
