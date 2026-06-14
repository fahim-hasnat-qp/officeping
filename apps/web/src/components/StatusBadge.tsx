import { RequestStatus } from '@officeping/shared';

interface StatusBadgeProps {
  readonly status: RequestStatus;
  readonly dot?: boolean;
}

interface BadgeStyle {
  background: string;
  color: string;
}

const STYLES: Record<RequestStatus, BadgeStyle> = {
  [RequestStatus.PENDING]: { background: '#F4E7C8', color: '#8A6420' },
  [RequestStatus.ACCEPTED]: { background: '#E2EAF4', color: '#1B4F8A' },
  [RequestStatus.IN_PROGRESS]: { background: '#E7E5F2', color: '#3C3A86' },
  [RequestStatus.DONE]: { background: '#DCE9E0', color: '#2D6A4F' },
  [RequestStatus.CANCELLED]: { background: '#ECE8E1', color: '#8A837A' },
};

// 'delayed' is not in RequestStatus enum but referenced in design tokens
const DELAYED_STYLE: BadgeStyle = { background: '#F5E5D1', color: '#A35E1C' };

const LABELS: Record<RequestStatus, string> = {
  [RequestStatus.PENDING]: 'Pending',
  [RequestStatus.ACCEPTED]: 'Accepted',
  [RequestStatus.IN_PROGRESS]: 'In progress',
  [RequestStatus.DONE]: 'Done',
  [RequestStatus.CANCELLED]: 'Cancelled',
};

export default function StatusBadge({ status, dot = true }: StatusBadgeProps) {
  const style = STYLES[status] ?? DELAYED_STYLE;
  const label = LABELS[status] ?? status;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 22,
        padding: '0 9px',
        borderRadius: 9999,
        fontSize: 11.5,
        fontWeight: 600,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
        background: style.background,
        color: style.color,
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 9999,
            background: 'currentColor',
            flexShrink: 0,
          }}
        />
      )}
      {label}
    </span>
  );
}
