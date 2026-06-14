import Icon from '@/components/Icon';
import { useRequestStore } from '@/store/requestStore';

interface TabDef {
  readonly key: string;
  readonly label: string;
  readonly icon: string;
  readonly badge?: number;
}

interface TabBarProps {
  readonly tabs: TabDef[];
  readonly active: string;
  readonly onTabChange?: (key: string) => void;
  /** which tab key should show the live-request badge */
  readonly liveTab?: string;
}

export default function TabBar({ tabs, active, onTabChange, liveTab }: TabBarProps) {
  const liveCount = useRequestStore((s) => s.liveCount);
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxWidth: 390,
        marginLeft: 'auto',
        marginRight: 'auto',
        height: 76,
        background: '#FFFFFF',
        borderTop: '1px solid #DDD8CF',
        display: 'flex',
        padding: '8px 16px 0',
        zIndex: 40,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        const badge = liveTab && tab.key === liveTab && liveCount > 0 ? liveCount : (tab.badge ?? 0);
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange?.(tab.key)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: 3,
              paddingTop: 4,
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              padding: '4px 0 0',
              color: isActive ? '#B07D2E' : '#7A7369',
              position: 'relative',
            }}
          >
            <div style={{ position: 'relative' }}>
              <Icon
                name={tab.icon}
                size={23}
                stroke={isActive ? 2 : 1.7}
              />
              {badge > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -7,
                    minWidth: 16,
                    height: 16,
                    background: '#B07D2E',
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 9999,
                    border: '2px solid #FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                    lineHeight: 1,
                  }}
                >
                  {badge}
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: '0.01em',
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
