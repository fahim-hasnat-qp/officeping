import { useState } from 'react';
import type { RequestDto } from '@officeping/shared';
import StatusBadge from './StatusBadge';
import Icon from './Icon';
import Avatar from './Avatar';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RequestCardProps {
  request: RequestDto;
  variant?: 'pending' | 'active' | 'history' | 'member' | 'plain';
  showNotes?: boolean;
  onNote?: (message: string) => void;
  onAccept?: () => void;
  onDone?: () => void;
  onDelay?: () => void;
  onCancel?: () => void;
  onClick?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategoryIcon(category: { name: string; icon: string }): { type: 'svg'; name: string } | { type: 'emoji'; value: string } {
  const n = category.name.toLowerCase();
  if (n.includes('coffee') || n.includes('tea')) return { type: 'svg', name: 'coffee' };
  if (n.includes('water')) return { type: 'svg', name: 'water' };
  if (n.includes('it') || n.includes('laptop') || n.includes('computer')) return { type: 'svg', name: 'laptop' };
  if (n.includes('supplies') || n.includes('supply') || n.includes('stationery')) return { type: 'svg', name: 'supplies' };
  if (n.includes('cleaning') || n.includes('clean')) return { type: 'svg', name: 'cleaning' };
  if (n.includes('maintenance') || n.includes('repair') || n.includes('wrench')) return { type: 'svg', name: 'wrench' };
  if (n.includes('mail') || n.includes('courier') || n.includes('parcel') || n.includes('delivery')) return { type: 'svg', name: 'mail' };
  if (n.includes('food') || n.includes('snack') || n.includes('lunch') || n.includes('meal')) return { type: 'svg', name: 'utensils' };
  if (n.includes('assist') || n.includes('help') || n.includes('support')) return { type: 'svg', name: 'user' };
  // Fall back to the emoji stored in the DB if no SVG match
  if (category.icon && !/^[a-z]/.test(category.icon)) return { type: 'emoji', value: category.icon };
  return { type: 'svg', name: 'grid' };
}

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const ts = new Date(iso).getTime();
  const diffMs = now - ts;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 60) return diffMin <= 1 ? 'just now' : `${diffMin} min ago`;

  const today = new Date();
  const d = new Date(iso);
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  if (isToday) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─── Shared style tokens ──────────────────────────────────────────────────────

const S = {
  card: {
    background: '#FFFFFF',
    border: '1px solid #DDD8CF',
    borderRadius: 12,
    padding: 0,
    overflow: 'hidden' as const,
  } as React.CSSProperties,

  // sm button shared base
  btnSm: {
    height: 36,
    fontSize: 13.5,
    borderRadius: 10,
    padding: '0 12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 500,
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  } as React.CSSProperties,

  dark: {
    background: '#1A1714',
    color: '#F7F5F1',
  } as React.CSSProperties,

  green: {
    background: '#2D6A4F',
    color: '#FFFFFF',
  } as React.CSSProperties,

  ghost: {
    background: '#FFFFFF',
    color: '#1A1714',
    border: '1px solid #DDD8CF',
  } as React.CSSProperties,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function RequestCard({
  request,
  variant = 'plain',
  showNotes: _showNotes,
  onNote,
  onAccept,
  onDone,
  onDelay,
  onCancel,
  onClick,
}: Readonly<RequestCardProps>) {
  const [accepting, setAccepting] = useState(false);

  function handleAccept(e: React.MouseEvent) {
    e.stopPropagation();
    if (!onAccept || accepting) return;
    setAccepting(true);
    onAccept();
  }

  const categoryIcon = getCategoryIcon(request.category);
  const relTime = formatRelativeTime(request.createdAt);

  const showStaffRow =
    variant !== 'pending' && request.staff != null;

  let staffLabel = 'Handled by';
  if (request.status === 'cancelled') staffLabel = 'Cancelled by';
  else if (variant === 'history') staffLabel = 'Completed by';

  // Last note for member variant
  const lastNote =
    request.notes && request.notes.length > 0
      ? request.notes[request.notes.length - 1]
      : null;

  const cardStyle: React.CSSProperties = { ...S.card };

  // Use a <button> wrapper when the whole card is clickable so keyboard/a11y
  // is handled natively. When not clickable, use a plain <div>.
  const Wrapper = onClick ? 'button' : 'div';
  const wrapperProps = onClick
    ? {
        type: 'button' as const,
        onClick,
        style: {
          ...cardStyle,
          cursor: 'pointer',
          display: 'block',
          width: '100%',
          textAlign: 'left' as const,
          font: 'inherit',
          color: 'inherit',
        },
      }
    : { style: cardStyle };

  return (
    <Wrapper {...wrapperProps}>
      {/* ── Header ── */}
      <div style={{ padding: '14px 16px 12px' }}>
        {/* Top row: icon tile + name + badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {/* Icon tile */}
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: '#EDE9E3',
              color: '#3D3830',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {categoryIcon.type === 'svg'
              ? <Icon name={categoryIcon.name} size={20} stroke={1.8} />
              : <span style={{ fontSize: 20, lineHeight: 1 }}>{categoryIcon.value}</span>
            }
          </div>

          {/* Name + description */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: 15.5,
                  letterSpacing: '-0.1px',
                  color: '#1A1714',
                  lineHeight: 1.2,
                }}
              >
                {request.category.name}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {(request.notes?.length ?? 0) > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#FBF4E6', border: '1px solid #F0DEB4', borderRadius: 9999, padding: '2px 8px' }}>
                    <Icon name="edit" size={11} stroke={2} style={{ color: '#B07D2E' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#B07D2E' }}>{request.notes!.length}</span>
                  </div>
                )}
                <StatusBadge status={request.status} />
              </div>
            </div>

            {request.description && (
              <p
                style={{
                  color: '#3D3830',
                  fontSize: 14,
                  lineHeight: 1.35,
                  marginTop: 3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {request.description}
              </p>
            )}

            {request.delayReason && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, background: '#F5E5D1', borderRadius: 6, padding: '4px 8px', alignSelf: 'flex-start' }}>
                <Icon name="clock" size={12} stroke={2} style={{ color: '#A35E1C', flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#A35E1C' }}>Delayed · {request.delayReason}</span>
              </div>
            )}

            {/* Meta row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginTop: 5,
                color: '#7A7369',
                fontSize: 12.5,
              }}
            >
              {request.location && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Icon name="pin" size={12} stroke={1.8} />
                  {request.location}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Icon name="clock" size={12} stroke={1.8} />
                {relTime}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Staff row ── */}
      {showStaffRow && request.staff && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '0 16px 12px',
            fontSize: 13,
            color: '#3D3830',
          }}
        >
          <Avatar name={request.staff.name} size={22} />
          <span>
            {staffLabel}{' '}
            <strong style={{ fontWeight: 600 }}>{request.staff.name}</strong>
          </span>
        </div>
      )}

      {/* ── Action footers ── */}

      {/* pending */}
      {variant === 'pending' && (onAccept || onDelay || onCancel) && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: '0 12px 12px',
            alignItems: 'center',
          }}
        >
          {onAccept && (
            <button
              style={{
                ...S.btnSm,
                flex: 1,
                background: accepting ? '#2D6A4F' : '#1A1714',
                color: '#F7F5F1',
                transition: 'background 0.15s ease',
              }}
              onClick={handleAccept}
            >
              <Icon name="check" size={14} stroke={2.2} />
              {accepting ? 'Accepted' : 'Accept'}
            </button>
          )}
          {onDelay && (
            <button
              style={{ ...S.btnSm, ...S.ghost, flex: 1 }}
              onClick={(e) => { e.stopPropagation(); onDelay(); }}
            >
              <Icon name="pause" size={14} stroke={2} />
              Delay
            </button>
          )}
          {onCancel && (
            <button
              style={{ ...S.btnSm, ...S.ghost, flex: 1, color: '#9B2335', borderColor: '#EBCBC7' }}
              onClick={(e) => { e.stopPropagation(); onCancel(); }}
            >
              <Icon name="x" size={14} stroke={2.2} style={{ color: '#9B2335' }} />
              Reject
            </button>
          )}
        </div>
      )}

      {/* active */}
      {variant === 'active' && (onDone || onDelay) && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: '0 12px 12px',
            alignItems: 'center',
          }}
        >
          {onDone && (
            <button
              style={{ ...S.btnSm, ...S.green, flex: 1 }}
              onClick={(e) => { e.stopPropagation(); onDone(); }}
            >
              <Icon name="check" size={14} stroke={2.2} />
              Mark done
            </button>
          )}
          {onDelay && (
            <button
              style={{ ...S.btnSm, ...S.ghost, flex: 1 }}
              onClick={(e) => { e.stopPropagation(); onDelay(); }}
            >
              <Icon name="pause" size={14} stroke={2} />
              Delay
            </button>
          )}
        </div>
      )}

      {/* member */}
      {variant === 'member' && (
        <>
          {/* divider */}
          <div style={{ height: 1, background: '#DDD8CF', margin: '0 0 0 0' }} />

          {/* last note preview */}
          {lastNote && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                background: '#FFFFFF',
              }}
            >
              <Avatar name={lastNote.author.name} size={24} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    color: '#1A1714',
                    marginRight: 4,
                  }}
                >
                  {lastNote.author.name}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: '#7A7369',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'inline',
                  }}
                >
                  {lastNote.message}
                </span>
              </div>
            </div>
          )}

          {/* Send a note button */}
          {onNote && (
            <div style={{ padding: '8px 12px 12px' }}>
              <button
                style={{
                  ...S.btnSm,
                  ...S.ghost,
                  width: '100%',
                  height: 42,
                  justifyContent: 'center',
                  gap: 7,
                }}
                onClick={(e) => { e.stopPropagation(); onNote(''); }}
              >
                <Icon name="edit" size={14} stroke={1.8} />
                Send a note
              </button>
            </div>
          )}
        </>
      )}
    </Wrapper>
  );
}
