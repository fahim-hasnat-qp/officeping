import type { ReactNode } from 'react';

interface SectionLabelProps {
  readonly children: ReactNode;
  readonly right?: ReactNode;
}

export default function SectionLabel({ children, right }: SectionLabelProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.13em',
          textTransform: 'uppercase',
          color: '#7A7369',
        }}
      >
        {children}
      </span>
      {right && <div>{right}</div>}
    </div>
  );
}
