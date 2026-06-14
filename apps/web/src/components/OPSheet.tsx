import type { ReactNode } from 'react';

interface OPSheetProps {
  readonly children: ReactNode;
  readonly onClose?: () => void;
}

export default function OPSheet({ children, onClose }: OPSheetProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      {/* Scrim */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(26,23,20,0.45)',
        }}
      />

      {/* Sheet */}
      <div
        className="animate-slide-up"
        style={{
          position: 'relative',
          background: '#FFFFFF',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: '10px 20px calc(24px + 8px)',
        }}
      >
        {/* Grab handle */}
        <div
          style={{
            width: 38,
            height: 4,
            borderRadius: 99,
            background: '#DDD8CF',
            margin: '0 auto 16px',
          }}
        />
        {children}
      </div>
    </div>
  );
}
