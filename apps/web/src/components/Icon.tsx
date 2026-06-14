import React from 'react';

const PATHS: Record<string, React.ReactNode> = {
  coffee: (
    <>
      <path d="M4 9h13v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z" />
      <path d="M17 10h2a2.5 2.5 0 0 1 0 5h-2" />
      <path d="M8 2.5c-.6.8-.6 1.7 0 2.5M12 2.5c-.6.8-.6 1.7 0 2.5" />
    </>
  ),
  water: <path d="M12 3.2c3 3.6 5.5 6.4 5.5 9.3a5.5 5.5 0 1 1-11 0c0-2.9 2.5-5.7 5.5-9.3Z" />,
  laptop: (
    <>
      <rect x="3.5" y="5" width="17" height="11" rx="1.5" />
      <path d="M2 19.5h20" />
    </>
  ),
  supplies: (
    <>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z" />
      <path d="m3.7 7.6 8.3 4.4 8.3-4.4M12 12v9" />
    </>
  ),
  cleaning: (
    <>
      <path d="M9 8V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v3" />
      <rect x="6.5" y="8" width="9" height="4" rx="1" />
      <path d="M7.5 12v6.5A2.5 2.5 0 0 0 10 21h0a2.5 2.5 0 0 0 2.5-2.5V12" />
    </>
  ),
  wrench: <path d="M15.5 4.5a4 4 0 0 0-5 5L4 16l1.7 1.7L12 11a4 4 0 0 0 5-5l-2.3 2.3-1.7-1.7L15.5 4.5Z" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  bell: (
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14 18 8Z" />
      <path d="M10.5 19a1.8 1.8 0 0 0 3 0" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10Z" />
      <circle cx="12" cy="11" r="2.2" />
    </>
  ),
  chevronRight: <path d="m9 5 7 7-7 7" />,
  chevronLeft: <path d="m15 5-7 7 7 7" />,
  chevronDown: <path d="m5 9 7 7 7-7" />,
  arrowUpRight: <path d="M7 17 17 7M8 7h9v9" />,
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </>
  ),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  heart: <path d="M12 20s-7-4.3-7-9.3A3.7 3.7 0 0 1 12 8a3.7 3.7 0 0 1 7-2.3c0 5-7 9.3-7 9.3Z" />,
  home: (
    <>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 9.5V20h12V9.5" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 13h4l1.5 3h5L16 13h4" />
      <path d="M4 13 6 5h12l2 8v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6Z" />
    </>
  ),
  utensils: (
    <>
      <path d="M6 3v8a2 2 0 0 0 4 0V3M8 11v10M16 3c-1.5 0-2.5 2-2.5 4.5S15 12 16 12v9" />
    </>
  ),
  power: (
    <>
      <path d="M12 4v8" />
      <path d="M7 6.5a7 7 0 1 0 10 0" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6 6 18" />,
  pause: (
    <>
      <rect x="7" y="5" width="3.5" height="14" rx="1" />
      <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
    </>
  ),
  edit: <path d="M4 20h4L18.5 9.5a2 2 0 0 0-3-3L5 17l-1 3Z" />,
  sliders: (
    <>
      <path d="M4 8h10M18 8h2M4 16h2M10 16h10" />
      <circle cx="16" cy="8" r="2" />
      <circle cx="8" cy="16" r="2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  dots: (
    <>
      <circle cx="5" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="19" cy="12" r="1.4" />
    </>
  ),
  wifiOff: (
    <>
      <path d="M2 8.5C5 6 8.3 4.7 12 4.7c1.3 0 2.6.2 3.8.5M22 8.5a16 16 0 0 0-3-1.9" />
      <path d="M5.5 12.2A11 11 0 0 1 12 10M18 13a11 11 0 0 0-2.5-1.5" />
      <path d="M9 15.7a6 6 0 0 1 5-.6M12 19.5h.01M3 3l18 18" />
    </>
  ),
  sparkle: <path d="M12 3.5 13.6 9 19 10.5 13.6 12 12 17.5 10.4 12 5 10.5 10.4 9 12 3.5Z" />,
};

interface IconProps {
  name: string;
  size?: number;
  stroke?: number;
  fill?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function Icon({
  name,
  size = 22,
  stroke = 1.7,
  fill = false,
  className,
  style,
}: IconProps) {
  const content = PATHS[name] ?? null;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={fill ? 'currentColor' : 'none'}
      stroke={fill ? 'none' : 'currentColor'}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0, display: 'block', ...style }}
    >
      {content}
    </svg>
  );
}
