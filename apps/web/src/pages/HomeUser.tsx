import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { RequestStatus, SocketEvents, UserRole } from '@officeping/shared';
import type { RequestDto } from '@officeping/shared';
import {
  addNote,
  createRequest,
  getQuickSend,
  getRequests,
  toggleSaveRequest,
  updateQuickSendLabel,
} from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useRequestStore } from '@/store/requestStore';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { usePushMessages } from '@/hooks/usePushMessages';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import AppShell from '@/components/Layout/AppShell';
import TabBar from '@/components/Layout/TabBar';
import SectionLabel from '@/components/SectionLabel';
import RequestCard from '@/components/RequestCard';
import OPSheet from '@/components/OPSheet';
import Avatar from '@/components/Avatar';
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

const GREETINGS = {
  morning: [
    'Good morning',
    'Rise and shine',
    'Morning!',
    'Hope your day is off to a great start',
    "Let's make today count",
  ],
  afternoon: [
    'Good afternoon',
    'Hope the day is treating you well',
    'Afternoon!',
    "You're doing great — keep it up",
    'Halfway through — you got this',
  ],
  evening: [
    'Good evening',
    'Wrapping up the day?',
    'Evening!',
    'Hope it was a good one',
    'Almost there — hang tight',
  ],
};

function getGreeting() {
  const h = new Date().getHours();
  let pool: string[];
  if (h < 12) pool = GREETINGS.morning;
  else if (h < 17) pool = GREETINGS.afternoon;
  else pool = GREETINGS.evening;
  return pool[h % pool.length];
}

function getCategoryIcon(categoryName: string): string {
  const n = categoryName.toLowerCase();
  if (n.includes('coffee')) return 'coffee';
  if (n.includes('water')) return 'droplets';
  if (n.includes('it') || n.includes('laptop')) return 'laptop';
  if (n.includes('supplies')) return 'package';
  if (n.includes('cleaning')) return 'sparkles';
  if (n.includes('maintenance') || n.includes('wrench')) return 'wrench';
  if (n.includes('mail')) return 'mail';
  return 'grid';
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const NOTE_SUGGESTIONS = ['No rush at all', 'Extra hot, please', 'Leave it at reception'];

export default function HomeUser() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const tabs = user?.role === UserRole.ADMIN ? [...BASE_TABS, MANAGE_TAB] : BASE_TABS;
  const { requests, quickSend, setRequests, upsertRequest, patchRequest, appendNote, setQuickSend } = useRequestStore();
  const { showToast } = useUiStore();
  const socket = useSocket(); // re-runs socket effects when connection is (re)established
  const [loading, setLoading] = useState(requests.length === 0);
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [noteTargetId, setNoteTargetId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [sendingNote, setSendingNote] = useState(false);
  const [editQuickOpen, setEditQuickOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editingLabels, setEditingLabels] = useState<Record<string, string>>({});
  const [pendingQuick, setPendingQuick] = useState<RequestDto | null>(null);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const greetingRef = useRef(getGreeting());

  usePushMessages();
  const { canInstall, install } = usePwaInstall();

  const activeStatuses = [RequestStatus.PENDING, RequestStatus.ACCEPTED, RequestStatus.IN_PROGRESS];
  const firstName = user?.name?.split(' ')[0] ?? '';

  useEffect(() => {
    (async () => {
      try {
        const [activeRes, doneRes, qs] = await Promise.all([
          getRequests({ status: activeStatuses.join(','), limit: 10 }),
          getRequests({ status: RequestStatus.DONE, limit: 3 }),
          getQuickSend(),
        ]);
        setRequests([...activeRes, ...doneRes]);
        setQuickSend(qs);
      } catch (err) {
        const msg =
          err instanceof Error && err.message.includes('Network')
            ? 'Network error — check connection'
            : 'Failed to load your requests';
        showToast(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (data: import('@officeping/shared').RequestUpdateEvent) => {
      patchRequest(data.requestId, {
        status: data.status,
        staff: data.staff,
        delayReason: data.delayReason,
        cancelReason: data.cancelReason,
      });
    };
    socket.on(SocketEvents.RequestUpdate, handler);
    return () => {
      socket.off(SocketEvents.RequestUpdate, handler);
    };
  }, [socket, patchRequest]);

  const activeRequests = requests.filter((r) => activeStatuses.includes(r.status));
  const recentDone = requests.filter((r) => r.status === RequestStatus.DONE).slice(0, 3);


  const handleNote = async (requestId: string, message: string) => {
    try {
      const note = await addNote(requestId, { message });
      appendNote(requestId, note);
    } catch {
      showToast('Failed to send note');
    }
  };

  const handleSendNote = async () => {
    if (!noteTargetId || !noteText.trim()) return;
    setSendingNote(true);
    await handleNote(noteTargetId, noteText.trim());
    setSendingNote(false);
    setNoteText('');
    setNoteSheetOpen(false);
    showToast('Note sent!');
  };

  const handleLabelSave = async (id: string) => {
    const label = (editingLabels[id] ?? '').trim();
    try {
      const updated = await updateQuickSendLabel(id, label);
      setQuickSend(quickSend.map((r) => r.id === id ? { ...r, quickSendLabel: updated.quickSendLabel } : r));
    } catch {
      showToast('Failed to update label');
    }
  };

  const handleRemoveQuick = async (id: string) => {
    setRemovingId(id);
    try {
      await toggleSaveRequest(id);
      setQuickSend(quickSend.filter((r) => r.id !== id));
    } catch {
      showToast('Failed to remove');
    } finally {
      setRemovingId(null);
    }
  };

  const COUNTDOWN_SECS = 3;

  const firePendingQuick = async (r: RequestDto) => {
    try {
      const created = await createRequest({
        categoryId: r.category.id,
        description: r.description,
        note: r.note ?? undefined,
        location: r.location ?? undefined,
      });
      upsertRequest(created);
      showToast('Request sent!');
    } catch {
      showToast('Failed to send request');
    }
  };

  const handleQuickSend = (r: RequestDto) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setPendingQuick(r);
    setCountdown(COUNTDOWN_SECS);
    let remaining = COUNTDOWN_SECS;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
        setPendingQuick(null);
        firePendingQuick(r);
      }
    }, 1000);
  };

  const cancelPendingQuick = () => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setPendingQuick(null);
    setCountdown(0);
  };

  return (
    <AppShell>
      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 32px' }}>
        {/* Greeting block */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ flex: 1, paddingRight: 12 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.13em',
                color: '#7A7369',
                margin: 0,
              }}
            >
              {formatDate(new Date())}
            </p>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 30,
                fontWeight: 500,
                letterSpacing: '-0.3px',
                lineHeight: 1.1,
                marginTop: 6,
                marginBottom: 0,
                color: 'var(--ink)',
                whiteSpace: 'pre-line',
              }}
            >
              {`${greetingRef.current},\n${firstName}`}
            </h1>
          </div>
          {user?.name && <Avatar name={user.name} size={44} />}
        </div>

        {/* PWA install banner */}
        {canInstall && (
          <button
            type="button"
            onClick={install}
            style={{
              width: '100%',
              marginBottom: 12,
              padding: '12px 16px',
              background: '#FBF4E6',
              border: '1px solid #F0DEB4',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#1A1714', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="chevronDown" size={20} stroke={2} style={{ color: '#F7F5F1' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', margin: 0 }}>Install DingDong</p>
              <p style={{ fontSize: 12.5, color: '#7A7369', margin: '2px 0 0' }}>Add to your home screen for quick access</p>
            </div>
            <Icon name="chevronRight" size={16} stroke={2} style={{ color: '#B07D2E', flexShrink: 0 }} />
          </button>
        )}

        {/* New request CTA */}
        <button
          type="button"
          onClick={() => navigate('/requests/new')}
          style={{
            width: '100%',
            height: 52,
            fontSize: 16,
            fontWeight: 600,
            background: '#1A1714',
            color: '#F7F5F1',
            borderRadius: 12,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
            marginBottom: 28,
            flexShrink: 0,
          }}
        >
          <Icon name="plus" size={20} stroke={2.2} />
          New request
        </button>

        {loading && (
          <p style={{ fontSize: 12, color: '#7A7369', textAlign: 'center', padding: '24px 0' }}>Loading…</p>
        )}

        {/* Active now section */}
        {!loading && (
          <section style={{ marginBottom: 28 }}>
            <div style={{ marginBottom: 12 }}>
              <SectionLabel>Active now</SectionLabel>
            </div>
            {activeRequests.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activeRequests.slice(0, 3).map((r) => (
                  <RequestCard
                    key={r.id}
                    request={r}
                    variant="member"
                    showNotes
                    onNote={() => { setNoteTargetId(r.id); setNoteSheetOpen(true); }}
                    onClick={() => navigate(`/requests/${r.id}`)}
                  />
                ))}
                {activeRequests.length > 3 && (
                  <button
                    onClick={() => navigate('/activity')}
                    style={{ background: 'none', border: 'none', padding: '6px 0', fontSize: 13.5, fontWeight: 600, color: '#B07D2E', cursor: 'pointer', textAlign: 'center', fontFamily: 'var(--font-sans)' }}
                  >
                    See all {activeRequests.length} active requests →
                  </button>
                )}
              </div>
            ) : (
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
                    background: '#EDE9E3',
                    color: '#7A7369',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}
                >
                  <Icon name="checkCircle" size={26} stroke={1.7} />
                </div>
                <p style={{ fontWeight: 600, fontSize: 16, color: 'var(--ink)', margin: '0 0 6px' }}>
                  Nothing in progress
                </p>
                <p
                  style={{
                    fontSize: 13.5,
                    color: '#7A7369',
                    maxWidth: 240,
                    lineHeight: 1.4,
                    margin: '0 auto',
                  }}
                >
                  Tap "New request" to get assistance from office staff.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Quick send section */}
        {quickSend.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <div style={{ marginBottom: 12 }}>
              <SectionLabel
                right={
                  <button
                    type="button"
                    onClick={() => {
                      const initial: Record<string, string> = {};
                      quickSend.forEach((r) => { initial[r.id] = r.quickSendLabel ?? ''; });
                      setEditingLabels(initial);
                      setEditQuickOpen(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#B07D2E',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Edit
                  </button>
                }
              >
                Quick send
              </SectionLabel>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                marginLeft: -20,
                marginRight: -20,
                paddingLeft: 20,
                paddingRight: 20,
                paddingBottom: 4,
              }}
            >
              {quickSend.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleQuickSend(r)}
                  style={{
                    height: 40,
                    border: '1px solid #DDD8CF',
                    background: '#FFFFFF',
                    borderRadius: 9999,
                    padding: '0 16px 0 12px',
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--ink)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexShrink: 0,
                    cursor: 'pointer',
                  }}
                >
                  <Icon name={getCategoryIcon(r.category.name)} size={16} stroke={1.8} />
                  {r.quickSendLabel ?? r.category.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Recently completed section */}
        {recentDone.length > 0 && (
          <section style={{ marginBottom: 8 }}>
            <div style={{ marginBottom: 12 }}>
              <SectionLabel>Recently completed</SectionLabel>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentDone.map((r) => (
                <div
                  key={r.id}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #DDD8CF',
                    borderRadius: 12,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      background: '#EDE9E3',
                      color: '#5A5350',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={getCategoryIcon(r.category.name)} size={19} stroke={1.7} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--ink)', margin: 0 }}>
                      {r.category.name}
                    </p>
                    <p
                      style={{
                        fontSize: 12.5,
                        color: '#7A7369',
                        margin: '2px 0 0',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {r.description} · {timeAgo(r.createdAt)}
                    </p>
                  </div>
                  {r.staff && !r.complimentSent && (
                    <button
                      type="button"
                      onClick={() => navigate(`/compliment/${r.staff!.id}?requestId=${r.id}`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        height: 32,
                        padding: '0 10px',
                        background: '#FBF4E6',
                        border: '1px solid #F0DEB4',
                        borderRadius: 9999,
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: '#B07D2E',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <Icon name="heart" size={13} fill style={{ color: '#B07D2E' }} />
                      Appreciate
                      <Icon name="arrowUpRight" size={12} stroke={2} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Tab bar */}
      <TabBar
        tabs={tabs}
        liveTab="activity"
        active="home"
        onTabChange={(key) => navigate(TAB_ROUTES[key] ?? '/')}
      />

      {/* Send-a-note sheet */}
      {noteSheetOpen && noteTargetId && (() => {
        const noteRequest = activeRequests.find((r) => r.id === noteTargetId);
        if (!noteRequest) return null;
        return (
        <OPSheet onClose={() => { setNoteSheetOpen(false); setNoteText(''); setNoteTargetId(null); }}>
          {/* Staff info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            {noteRequest.staff ? (
              <Avatar name={noteRequest.staff.name} size={40} online />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 9999, background: '#EDE9E3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="user" size={20} stroke={1.7} />
              </div>
            )}
            <div>
              <p style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--ink)', margin: 0 }}>
                Send a note to {noteRequest.staff?.name ?? 'staff'}
              </p>
              <p style={{ fontSize: 12.5, color: '#7A7369', margin: '2px 0 0' }}>
                {noteRequest.category.name} · {noteRequest.description}
              </p>
            </div>
          </div>

          {/* Textarea */}
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Type a note…"
            style={{
              width: '100%',
              minHeight: 96,
              border: '1px solid #DDD8CF',
              borderRadius: 8,
              padding: '12px 16px',
              fontSize: 15,
              color: 'var(--ink)',
              background: '#FFFFFF',
              resize: 'none',
              fontFamily: 'var(--font-sans)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          {/* Suggestion chips */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {NOTE_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setNoteText(s)}
                style={{
                  height: 34,
                  padding: '0 12px',
                  border: '1px solid #DDD8CF',
                  background: '#FFFFFF',
                  borderRadius: 9999,
                  fontSize: 13,
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Send button */}
          <button
            type="button"
            onClick={handleSendNote}
            disabled={!noteText.trim() || sendingNote}
            style={{
              width: '100%',
              height: 50,
              background: sendingNote || !noteText.trim() ? '#5A5350' : '#1A1714',
              color: '#F7F5F1',
              border: 'none',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: noteText.trim() && !sendingNote ? 'pointer' : 'not-allowed',
              marginTop: 16,
              transition: 'background 0.15s ease',
            }}
          >
            <Icon name="arrowUpRight" size={18} stroke={2} />
            {sendingNote ? 'Sending…' : 'Send note'}
          </button>
        </OPSheet>
        );
      })()}

      {/* Edit quick-send sheet */}
      {editQuickOpen && (
        <OPSheet onClose={() => setEditQuickOpen(false)}>
          <div style={{ padding: '4px 4px 8px' }}>
            <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)', margin: '0 0 4px' }}>
              Edit quick send
            </p>
            <p style={{ fontSize: 13, color: '#7A7369', margin: '0 0 20px' }}>
              Tap the remove button to remove a shortcut.
            </p>

            {quickSend.length === 0 ? (
              <p style={{ fontSize: 13, color: '#7A7369', textAlign: 'center', padding: '16px 0' }}>
                No quick-send shortcuts yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {quickSend.map((r) => {
                  const currentLabel = editingLabels[r.id] ?? (r.quickSendLabel ?? '');
                  const placeholder = r.quickSendLabel ?? r.category.name;
                  return (
                    <div
                      key={r.id}
                      style={{
                        background: '#FAFAF8',
                        border: '1px solid #DDD8CF',
                        borderRadius: 12,
                        padding: '12px 14px',
                      }}
                    >
                      {/* Top row: icon + name + remove */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: '#EDE9E3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon name={getCategoryIcon(r.category.name)} size={17} stroke={1.8} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', margin: 0 }}>{r.category.name}</p>
                          {r.description && (
                            <p style={{ fontSize: 12, color: '#7A7369', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveQuick(r.id)}
                          disabled={removingId === r.id}
                          style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #EBCBC7', background: '#FDF4F4', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: removingId === r.id ? 'not-allowed' : 'pointer', flexShrink: 0, opacity: removingId === r.id ? 0.5 : 1 }}
                        >
                          <Icon name="x" size={13} stroke={2.2} style={{ color: '#9B2335' }} />
                        </button>
                      </div>
                      {/* Label input */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <input
                          value={currentLabel}
                          onChange={(e) => setEditingLabels((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          onBlur={() => handleLabelSave(r.id)}
                          placeholder={`Label (default: ${placeholder})`}
                          maxLength={32}
                          style={{ flex: 1, height: 36, border: '1.5px solid #DDD8CF', borderRadius: 8, padding: '0 10px', fontSize: 13, fontFamily: 'var(--font-sans)', background: '#fff', outline: 'none', color: 'var(--ink)' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => setEditQuickOpen(false)}
              style={{
                width: '100%', marginTop: 20, height: 50, borderRadius: 14,
                border: '1.5px solid #DDD8CF', background: 'transparent',
                fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              Done
            </button>
          </div>
        </OPSheet>
      )}

      {/* Quick-send confirmation sheet */}
      {pendingQuick && (
        <OPSheet onClose={cancelPendingQuick}>
          <div style={{ padding: '4px 4px 8px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#EDE9E3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={getCategoryIcon(pendingQuick.category.name)} size={24} stroke={1.8} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)', margin: '0 0 2px' }}>
                  {pendingQuick.quickSendLabel ?? pendingQuick.category.name}
                </p>
                {pendingQuick.description && (
                  <p style={{ fontSize: 13, color: '#7A7369', margin: 0 }}>{pendingQuick.description}</p>
                )}
              </div>
            </div>

            {/* Details row */}
            {(pendingQuick.location) && (
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, color: '#7A7369', fontSize: 13 }}>
                {pendingQuick.location && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="pin" size={13} stroke={1.8} />
                    {pendingQuick.location}
                  </span>
                )}
              </div>
            )}

            {/* Countdown ring + label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              {/* SVG ring */}
              <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
                <svg width="52" height="52" style={{ transform: 'rotate(-90deg)' }}>
                  {/* track */}
                  <circle cx="26" cy="26" r="22" fill="none" stroke="#EDE9E3" strokeWidth="4" />
                  {/* progress */}
                  <circle
                    cx="26" cy="26" r="22"
                    fill="none"
                    stroke="#B07D2E"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 22}`}
                    strokeDashoffset={`${2 * Math.PI * 22 * (1 - countdown / COUNTDOWN_SECS)}`}
                    style={{ transition: 'stroke-dashoffset 0.9s linear' }}
                  />
                </svg>
                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>
                  {countdown}
                </span>
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--ink)', margin: '0 0 2px' }}>
                  Sending in {countdown}s…
                </p>
                <p style={{ fontSize: 13, color: '#7A7369', margin: 0 }}>
                  Tap cancel to stop
                </p>
              </div>
            </div>

            {/* Cancel button */}
            <button
              onClick={cancelPendingQuick}
              style={{
                width: '100%', height: 52, borderRadius: 14,
                border: '1.5px solid #DDD8CF', background: 'transparent',
                fontSize: 15, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-sans)', color: 'var(--ink)',
              }}
            >
              Cancel
            </button>
          </div>
        </OPSheet>
      )}
    </AppShell>
  );
}
