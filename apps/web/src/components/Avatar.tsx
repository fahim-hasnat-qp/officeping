interface AvatarProps {
  name: string;
  size?: number;
  online?: boolean;
  gold?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export default function Avatar({ name, size = 36, online, gold }: AvatarProps) {
  const bg = gold ? '#F5E8CC' : '#EDE9E3';
  const color = gold ? '#B07D2E' : '#3D3830';
  const fontSize = size * 0.38;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        overflow: 'hidden',
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: bg,
        color,
        fontSize,
        fontWeight: 600,
        fontFamily: 'var(--font-sans)',
      }}
    >
      {getInitials(name)}
      {online && (
        <span
          style={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: 11,
            height: 11,
            borderRadius: 9999,
            background: '#2D6A4F',
            border: '2px solid white',
          }}
        />
      )}
    </div>
  );
}
