import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { RequestStatus, SocketEvents, UserRole } from '@officeping/shared';
import type { RequestDto, RequestNoteDto } from '@officeping/shared';
import { addDelay, addNote, cancelRequest, getRequest, updateRequestStatus } from '@/lib/api';
import { subscribeRequest, unsubscribeRequest } from '@/lib/socket';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/store/authStore';
import { useRequestStore } from '@/store/requestStore';
import { useUiStore } from '@/store/uiStore';
import AppShell from '@/components/Layout/AppShell';
import Header from '@/components/Layout/Header';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import OPSheet from '@/components/OPSheet';
import StatusBadge from '@/components/StatusBadge';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function categoryIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('coffee') || n.includes('drink') || n.includes('beverage')) return 'coffee';
  if (n.includes('water')) return 'water';
  if (n.includes('it') || n.includes('tech') || n.includes('laptop') || n.includes('computer')) return 'laptop';
  if (n.includes('suppli')) return 'supplies';
  if (n.includes('clean')) return 'cleaning';
  if (n.includes('mainten') || n.includes('repair') || n.includes('fix')) return 'wrench';
  if (n.includes('mail') || n.includes('post') || n.includes('delivery')) return 'mail';
  if (n.includes('food') || n.includes('meal') || n.includes('lunch')) return 'utensils';
  return 'grid';
}

// ─── sub-components ───────────────────────────────────────────────────────────

interface TimelineStep {
  label: string;
  done: boolean;
  current: boolean;
  time: string;
}

function Timeline({ steps }: { readonly steps: TimelineStep[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;

        let nodeBg: string;
        if (step.done) nodeBg = 'var(--green)';
        else if (step.current) nodeBg = '#B07D2E';
        else nodeBg = 'var(--card)';

        let nodeBorder: string;
        if (step.done) nodeBorder = 'var(--green)';
        else if (step.current) nodeBorder = '#B07D2E';
        else nodeBorder = '#DDD8CF';
        const lineColor = step.done ? 'var(--green)' : '#DDD8CF';

        return (
          <div key={step.label} style={{ display: 'flex', gap: 12 }}>
            {/* Rail column */}
            <div
              style={{
                width: 18,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              {/* Node */}
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: nodeBg,
                  border: `2px solid ${nodeBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {step.done && (
                  <Icon name="check" size={11} stroke={3} style={{ color: '#fff' }} />
                )}
              </div>
              {/* Connector line */}
              {!isLast && (
                <div
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: 16,
                    background: lineColor,
                    marginTop: 2,
                  }}
                />
              )}
            </div>

            {/* Label + time */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                paddingBottom: isLast ? 0 : 20,
              }}
            >
              <span
                style={{
                  fontWeight: step.current ? 600 : 500,
                  fontSize: 14.5,
                  color: !step.done && !step.current ? 'var(--ink3)' : 'var(--ink)',
                }}
              >
                {step.label}
              </span>
              <span style={{ fontSize: 12, color: 'var(--ink3)', marginLeft: 'auto' }}>
                {step.time}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface NoteBubbleProps {
  readonly note: RequestNoteDto;
  readonly isMe: boolean;
  readonly isUnread: boolean;
}

function NoteBubble({ note, isMe, isUnread }: NoteBubbleProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMe ? 'flex-end' : 'flex-start',
        gap: 4,
      }}
    >
      <div
        style={{
          background: isMe ? '#F5E8CC' : 'var(--surface2)',
          color: 'var(--ink)',
          borderRadius: isMe
            ? '12px 12px 4px 12px'
            : '12px 12px 12px 4px',
          alignSelf: isMe ? 'flex-end' : 'flex-start',
          maxWidth: '78%',
          padding: '12px 16px',
          fontSize: 14,
          lineHeight: 1.4,
          boxShadow: isUnread ? '0 0 0 2px #B07D2E' : undefined,
        }}
      >
        {note.message}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 10.5,
          color: isUnread ? '#B07D2E' : 'var(--ink3)',
        }}
      >
        {isUnread && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#B07D2E',
              flexShrink: 0,
            }}
          />
        )}
        {formatTime(note.createdAt)}
      </div>
    </div>
  );
}

// ─── delay sheet duration / reason options ────────────────────────────────────

const DELAY_DURATIONS = ['10 min', '30 min', '1 hour', 'Custom'];
const DELAY_REASONS = [
  'Busy with another request',
  'Waiting on supplies',
  'Out of stock',
  'On a break',
];

// ─── main component ───────────────────────────────────────────────────────────

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { appendNote, patchRequest } = useRequestStore();
  const { showToast } = useUiStore();
  const socket = useSocket();

  const [request, setRequest] = useState<RequestDto | null>(null);
  const [loading, setLoading] = useState(true);

  // Notes / reply
  const [replyText, setReplyText] = useState('');
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());

  // Delay sheet
  const [delaySheetOpen, setDelaySheetOpen] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState('30 min');
  const [selectedReason, setSelectedReason] = useState('');
  const [delaySubmitting, setDelaySubmitting] = useState(false);

  // Cancel sheet
  const [cancelSheetOpen, setCancelSheetOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Track note count at mount to determine "unread"
  const initialNoteCountRef = useRef<number | null>(null);

  // Extracted to keep useEffect bodies thin (reduces cognitive complexity)
  const applyRequestUpdate = useCallback(
    (data: import('@officeping/shared').RequestUpdateEvent) => {
      if (data.requestId !== id) return;
      setRequest((prev) =>
        prev
          ? {
              ...prev,
              status: data.status,
              staff: data.staff ?? prev.staff,
              delayReason: data.delayReason ?? prev.delayReason,
              cancelReason: data.cancelReason ?? prev.cancelReason,
              notes: data.notes ?? prev.notes,
            }
          : prev,
      );
      patchRequest(id, {
        status: data.status,
        staff: data.staff,
        delayReason: data.delayReason,
        cancelReason: data.cancelReason,
      });
    },
    [id, patchRequest],
  );

  const markIncomingNotesUnread = useCallback(
    (notes: RequestDto['notes']) => {
      if (!notes || initialNoteCountRef.current === null) return;
      const initial = initialNoteCountRef.current;
      const newUnread = new Set<string>();
      notes.forEach((n, i) => {
        if (i >= initial && n.author.id !== user?.id) newUnread.add(n.id);
      });
      if (newUnread.size > 0) setUnreadIds((prev) => new Set([...prev, ...newUnread]));
    },
    [user?.id],
  );


  useEffect(() => {
    if (!id) return;
    getRequest(id)
      .then((r) => {
        setRequest(r);
        initialNoteCountRef.current = r.notes?.length ?? 0;
        if (searchParams.get('action') === 'cancel') setCancelSheetOpen(true);
      })
      .catch(() => showToast('Failed to load request'))
      .finally(() => setLoading(false));

    subscribeRequest(id);
    socket?.on(SocketEvents.RequestUpdate, applyRequestUpdate);
    return () => {
      socket?.off(SocketEvents.RequestUpdate, applyRequestUpdate);
      unsubscribeRequest(id);
    };
  }, [id, socket, applyRequestUpdate]);

  // Mark notes received after initial load as unread
  useEffect(() => {
    markIncomingNotesUnread(request?.notes);
  }, [request?.notes?.length]);

  const isActive = request
    ? [RequestStatus.PENDING, RequestStatus.ACCEPTED, RequestStatus.IN_PROGRESS].includes(
        request.status,
      )
    : false;

  const isStaff = user?.role === UserRole.STAFF || user?.role === UserRole.ADMIN;

  // ── action handlers ────────────────────────────────────────────────────────

  const handleNote = async () => {
    const msg = replyText.trim();
    if (!msg || !id) return;
    setReplyText('');
    try {
      const note = await addNote(id, { message: msg });
      appendNote(id, note);
      setRequest((prev) => (prev ? { ...prev, notes: [...(prev.notes ?? []), note] } : prev));
    } catch {
      showToast('Failed to send note');
    }
  };

  const handleAccept = async () => {
    if (!id) return;
    try {
      const updated = await updateRequestStatus(id, { status: RequestStatus.ACCEPTED });
      setRequest(updated);
    } catch {
      showToast('Failed to accept');
    }
  };

  const handleDone = async () => {
    if (!id) return;
    try {
      const updated = await updateRequestStatus(id, { status: RequestStatus.DONE });
      setRequest(updated);
    } catch {
      showToast('Failed to mark done');
    }
  };

  const handleDelay = async () => {
    if (!id || delaySubmitting) return;
    setDelaySubmitting(true);
    try {
      await addDelay(id, { reason: selectedReason || selectedDuration });
      showToast('Delay notified');
      setDelaySheetOpen(false);
    } catch {
      showToast('Failed to notify delay');
    } finally {
      setDelaySubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!id || cancelSubmitting) return;
    if (isStaff && !cancelReason.trim()) { showToast('Please provide a reason'); return; }
    setCancelSubmitting(true);
    try {
      const updated = await cancelRequest(id, { reason: cancelReason.trim() || 'Cancelled by requester' });
      setRequest(updated);
      setCancelSheetOpen(false);
      setCancelReason('');
      showToast('Request cancelled');
    } catch {
      showToast('Failed to cancel');
    } finally {
      setCancelSubmitting(false);
    }
  };

  // ── derived ────────────────────────────────────────────────────────────────

  const status = request?.status ?? RequestStatus.PENDING;
  const unreadCount = unreadIds.size;

  const timelineSteps: TimelineStep[] = request
    ? [
        { label: 'Submitted', done: true, current: false, time: formatTime(request.createdAt) },
        {
          label: 'Accepted',
          done: ['accepted', 'in_progress', 'done'].includes(status),
          current: status === RequestStatus.ACCEPTED,
          time: request.acceptedAt ? formatTime(request.acceptedAt) : '—',
        },
        {
          label: 'In progress',
          done: ['in_progress', 'done'].includes(status),
          current: status === RequestStatus.IN_PROGRESS,
          time:
            status === RequestStatus.IN_PROGRESS || status === RequestStatus.DONE ? '…' : '—',
        },
        {
          label: 'Delivered',
          done: status === RequestStatus.DONE,
          current: status === RequestStatus.DONE,
          time: request.completedAt ? formatTime(request.completedAt) : '—',
        },
      ]
    : [];

  const otherPartyName = isStaff
    ? (request?.requester.name ?? 'member')
    : (request?.staff?.name ?? '');

  const canSendCompliment =
    !isStaff && request?.status === RequestStatus.DONE && !!request?.staff && !request?.complimentSent;

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <Header
        title="Request"
        back={true}
        action={request ? <StatusBadge status={request.status} /> : undefined}
      />

      <div className="flex-1 overflow-y-auto" style={{ padding: '20px 20px 0' }}>
        {loading && (
          <p style={{ fontSize: 12, color: 'var(--ink3)', textAlign: 'center', paddingTop: 40 }}>
            Loading…
          </p>
        )}

        {request && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── Summary block ──────────────────────────────────────────── */}
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
                {/* Icon tile */}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    background: '#F5E8CC',
                    color: '#B07D2E',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon name={categoryIcon(request.category.name)} size={24} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontWeight: 600,
                      fontSize: 17,
                      color: 'var(--ink)',
                      margin: '0 0 4px',
                    }}
                  >
                    {request.category.name}
                  </p>
                  <p
                    style={{
                      fontSize: 14,
                      color: 'var(--ink2)',
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {request.description}
                  </p>
                </div>
              </div>

              {/* Meta row */}
              <div
                style={{
                  display: 'flex',
                  gap: 20,
                  color: 'var(--ink3)',
                  fontSize: 13,
                  marginTop: -4,
                }}
              >
                {request.location && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="pin" size={13} />
                    {request.location}
                  </span>
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="clock" size={13} />
                  {formatTime(request.createdAt)}
                </span>
              </div>
            </div>

            {/* ── Requester / Staff card ──────────────────────────────────── */}
            {(isStaff ? request.requester : request.staff) && (
              <div
                style={{
                  background: 'var(--card)',
                  border: '1px solid #DDD8CF',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Avatar
                  name={isStaff ? request.requester.name : (request.staff?.name ?? '')}
                  size={42}
                  online={!isStaff && !!request.staff}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)', margin: 0 }}>
                    {isStaff ? request.requester.name : request.staff?.name}
                  </p>
                  <p style={{ fontSize: 12.5, color: 'var(--ink3)', margin: '2px 0 0' }}>
                    {isStaff ? 'Requester' : 'Handled by'}
                  </p>
                </div>
              </div>
            )}

            {/* ── Status timeline ─────────────────────────────────────────── */}
            <div
              style={{
                background: 'var(--card)',
                border: '1px solid #DDD8CF',
                borderRadius: 12,
                padding: 16,
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.13em',
                  color: 'var(--ink3)',
                  margin: '0 0 16px',
                }}
              >
                Status
              </p>
              <Timeline steps={timelineSteps} />
            </div>

            {/* ── Delay banner ────────────────────────────────────────────── */}
            {request.delayReason && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  background: '#F5E5D1',
                  border: '1.5px solid #EDD0AA',
                  borderRadius: 12,
                  padding: '14px 16px',
                }}
              >
                <Icon name="clock" size={20} stroke={2} style={{ color: '#A35E1C', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#A35E1C' }}>Staff is delayed</p>
                  <p style={{ margin: '3px 0 0', fontSize: 13, color: '#7A7369' }}>{request.delayReason}</p>
                </div>
              </div>
            )}

            {/* ── Notes thread ────────────────────────────────────────────── */}
            <div
              style={{
                background: 'var(--card)',
                border: '1px solid #DDD8CF',
                borderRadius: 12,
                padding: 16,
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.13em',
                    color: 'var(--ink3)',
                    margin: 0,
                  }}
                >
                  Notes
                </p>
                {unreadCount > 0 && (
                  <span
                    style={{
                      background: '#B07D2E',
                      color: '#fff',
                      fontSize: 9.5,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      borderRadius: 999,
                      padding: '2px 7px',
                    }}
                  >
                    {unreadCount} NEW
                  </span>
                )}
              </div>

              {/* Bubbles */}
              {(request.notes?.length ?? 0) > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  {(request.notes ?? []).map((n) => (
                    <NoteBubble
                      key={n.id}
                      note={n}
                      isMe={n.author.id === user?.id}
                      isUnread={unreadIds.has(n.id)}
                    />
                  ))}
                </div>
              ) : (
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--ink3)',
                    margin: '0 0 12px',
                  }}
                >
                  No notes yet.
                </p>
              )}

              {/* Reply row */}
              {isActive && (
                <div
                  style={{
                    background: 'var(--card)',
                    border: '1px solid #DDD8CF',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '0 16px',
                    height: 48,
                  }}
                >
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleNote();
                      }
                    }}
                    placeholder={
                      otherPartyName ? `Reply to ${otherPartyName}…` : 'Add a note…'
                    }
                    style={{
                      flex: 1,
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      fontFamily: 'inherit',
                      fontSize: 15,
                      color: 'var(--ink)',
                    }}
                  />
                  <button
                    onClick={handleNote}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: '#B07D2E',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Icon name="arrowUpRight" size={18} stroke={2} />
                  </button>
                </div>
              )}
            </div>

            {/* bottom spacer so content clears sticky bar */}
            <div style={{ height: 8 }} />
          </div>
        )}
      </div>

      {/* ── Sticky bottom action bar ──────────────────────────────────────── */}
      {request && (
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #EDE9E3',
            background: 'var(--surface)',
            flexShrink: 0,
          }}
        >
          {isStaff && isActive && (
            <div style={{ display: 'flex', gap: 8 }}>
              {status === RequestStatus.PENDING && (
                <>
                  <button onClick={handleAccept} style={darkBlockBtn}>Accept</button>
                  <button onClick={() => setDelaySheetOpen(true)} style={ghostBtn}>Delay</button>
                  <button onClick={() => setCancelSheetOpen(true)} style={{ ...ghostBtn, color: '#9B2335', borderColor: '#EBCBC7' }}>Cancel</button>
                </>
              )}
              {(status === RequestStatus.ACCEPTED || status === RequestStatus.IN_PROGRESS) && (
                <>
                  <button onClick={handleDone} style={{ ...darkBlockBtn, background: 'var(--green)' }}>Mark done</button>
                  <button onClick={() => setDelaySheetOpen(true)} style={ghostBtn}>Delay</button>
                  <button onClick={() => setCancelSheetOpen(true)} style={{ ...ghostBtn, color: '#9B2335', borderColor: '#EBCBC7', padding: '0 14px' }}>Cancel</button>
                </>
              )}
            </div>
          )}

          {/* Member can cancel their own PENDING request */}
          {!isStaff && status === RequestStatus.PENDING && request?.requester.id === user?.id && (
            <button
              onClick={() => setCancelSheetOpen(true)}
              style={{ ...ghostBtn, color: '#9B2335', borderColor: '#EBCBC7', width: '100%' }}
            >
              Cancel request
            </button>
          )}

          {status === RequestStatus.CANCELLED && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                background: '#F9E5E7',
                border: '1.5px solid #EBCBC7',
                borderRadius: 14,
                padding: '14px 16px',
              }}
            >
              <Icon name="x" size={20} stroke={2} style={{ color: '#9B2335', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#9B2335' }}>Request cancelled</p>
                {request.cancelReason && (
                  <p style={{ margin: '3px 0 0', fontSize: 13, color: '#7A7369' }}>{request.cancelReason}</p>
                )}
              </div>
            </div>
          )}

          {status === RequestStatus.DONE && !canSendCompliment && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: '#DCE9E0',
                border: '1.5px solid #B7D4C4',
                borderRadius: 14,
                padding: '14px 16px',
              }}
            >
              <Icon name="check" size={20} stroke={2.5} style={{ color: '#2D6A4F', flexShrink: 0 }} />
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#2D6A4F' }}>Request completed</p>
            </div>
          )}

          {canSendCompliment && (
            <button
              onClick={() =>
                navigate(`/compliment/${request.staff!.id}?requestId=${request.id}`)
              }
              style={{ ...darkBlockBtn, background: '#B07D2E' }}
            >
              Send {request.staff!.name.split(' ')[0]} a compliment
            </button>
          )}
        </div>
      )}

      {/* ── Delay bottom sheet ────────────────────────────────────────────── */}
      {delaySheetOpen && (
        <OPSheet onClose={() => setDelaySheetOpen(false)}>
          <div style={{ padding: '4px 4px 8px' }}>
            {/* Icon + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  background: '#F5E5D1',
                  color: '#A35E1C',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name="pause" size={22} fill />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)', margin: '0 0 2px' }}>
                  Delay this request
                </p>
                {request && (
                  <p style={{ fontSize: 13, color: 'var(--ink3)', margin: 0 }}>
                    {request.category.name} · {request.description.slice(0, 48)}
                    {request.description.length > 48 ? '…' : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Duration chips */}
            <p style={sheetLabel}>Push back by</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {DELAY_DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDuration(d)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 999,
                    border: `1px solid ${selectedDuration === d ? '#A35E1C' : '#DDD8CF'}`,
                    background: selectedDuration === d ? '#F5E5D1' : '#fff',
                    color: selectedDuration === d ? '#A35E1C' : 'var(--ink2)',
                    fontSize: 13.5,
                    fontWeight: selectedDuration === d ? 600 : 400,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Reason chips */}
            <p style={sheetLabel}>
              Reason{' '}
              <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>
                · shared with the member
              </span>
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {DELAY_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedReason(r === selectedReason ? '' : r)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 999,
                    border: `1px solid ${selectedReason === r ? '#A35E1C' : '#DDD8CF'}`,
                    background: selectedReason === r ? '#F5E5D1' : '#fff',
                    color: selectedReason === r ? '#A35E1C' : 'var(--ink2)',
                    fontSize: 13.5,
                    fontWeight: selectedReason === r ? 600 : 400,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Notification note */}
            {request && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  marginBottom: 24,
                  color: 'var(--ink3)',
                  fontSize: 12.5,
                }}
              >
                <Icon name="bell" size={14} style={{ marginTop: 1, flexShrink: 0 }} />
                <span>
                  {request.requester.name.split(' ')[0]} will be notified it&apos;s running ~
                  {selectedDuration} late.
                </span>
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleDelay}
              disabled={delaySubmitting}
              style={{
                ...darkBlockBtn,
                marginBottom: 12,
                opacity: delaySubmitting ? 0.6 : 1,
              }}
            >
              {delaySubmitting ? 'Notifying…' : 'Delay & notify'}
            </button>
            <button
              onClick={() => setDelaySheetOpen(false)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                padding: '10px 0',
                fontSize: 15,
                fontWeight: 500,
                color: 'var(--ink3)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
          </div>
        </OPSheet>
      )}

      {/* ── Cancel bottom sheet ───────────────────────────────────────────── */}
      {cancelSheetOpen && (
        <OPSheet onClose={() => { setCancelSheetOpen(false); setCancelReason(''); }}>
          <div style={{ padding: '4px 4px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, background: '#F9E5E7', color: '#9B2335', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="x" size={22} stroke={2} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>Cancel request</p>
                <p style={{ fontSize: 13, color: '#7A7369', margin: '2px 0 0' }}>
                  {isStaff ? 'Reason is required — the member will see this' : 'Let us know why (optional)'}
                </p>
              </div>
            </div>

            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={isStaff ? 'e.g. Out of stock, duplicate request…' : 'e.g. No longer needed'}
              rows={3}
              style={{ width: '100%', borderRadius: 12, border: `1.5px solid ${isStaff && !cancelReason.trim() ? '#DDD8CF' : '#DDD8CF'}`, padding: '12px 14px', fontSize: 14, fontFamily: 'var(--font-sans)', resize: 'none', background: '#FAFAF8', boxSizing: 'border-box', outline: 'none' }}
            />

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button
                onClick={() => { setCancelSheetOpen(false); setCancelReason(''); }}
                style={{ flex: 1, height: 52, borderRadius: 14, border: '1.5px solid #DDD8CF', background: 'transparent', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
              >
                Keep it
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelSubmitting || (isStaff && !cancelReason.trim())}
                style={{ flex: 1, height: 52, borderRadius: 14, border: 'none', background: '#9B2335', color: '#FFFFFF', fontSize: 15, fontWeight: 600, cursor: (cancelSubmitting || (isStaff && !cancelReason.trim())) ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)', opacity: (cancelSubmitting || (isStaff && !cancelReason.trim())) ? 0.45 : 1 }}
              >
                {cancelSubmitting ? 'Cancelling…' : 'Yes, cancel'}
              </button>
            </div>
          </div>
        </OPSheet>
      )}
    </AppShell>
  );
}

// ─── shared button style objects ──────────────────────────────────────────────

const darkBlockBtn: React.CSSProperties = {
  flex: 1,
  width: '100%',
  height: 52,
  background: 'var(--ink)',
  color: 'var(--surface)',
  border: 'none',
  borderRadius: 14,
  fontSize: 15.5,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
};

const ghostBtn: React.CSSProperties = {
  height: 52,
  padding: '0 20px',
  background: '#fff',
  color: 'var(--ink)',
  border: '1px solid #DDD8CF',
  borderRadius: 14,
  fontSize: 15.5,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
  flexShrink: 0,
};

const sheetLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.13em',
  color: 'var(--ink3)',
  margin: '0 0 10px',
};
