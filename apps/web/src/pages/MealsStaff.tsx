import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MealStatus } from '@officeping/shared';
import type { BreakfastDto } from '@officeping/shared';
import { getBreakfast, getLunch, updateBreakfastStatus } from '@/lib/api';
import { useUiStore } from '@/store/uiStore';
import { useMealsStore } from '@/store/mealsStore';
import AppShell from '@/components/Layout/AppShell';
import Header from '@/components/Layout/Header';
import TabBar from '@/components/Layout/TabBar';
import SectionLabel from '@/components/SectionLabel';
import Avatar from '@/components/Avatar';
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

type MealTab = 'breakfast' | 'lunch';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Aggregate breakfast orders into a shopping list: { item, qty } */
function buildShoppingList(orders: BreakfastDto[]): { item: string; qty: number }[] {
  const map = new Map<string, number>();
  for (const bf of orders) {
    // Each order string may contain comma-separated items
    const items = bf.order.split(',').map((s) => s.trim()).filter(Boolean);
    for (const item of items) {
      map.set(item, (map.get(item) ?? 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([item, qty]) => ({ item, qty }))
    .sort((a, b) => b.qty - a.qty);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MealsStaff() {
  const navigate = useNavigate();
  const { showToast } = useUiStore();
  const today = todayStr();

  const {
    breakfast: breakfasts, lunch: lunches,
    setBreakfast: setBreakfasts, setLunch: setLunches,
    upsertBreakfast,
    acknowledgedDate, checkedItems,
    acknowledge, toggleCheckedItem,
  } = useMealsStore();

  const [mealTab, setMealTab] = useState<MealTab>('breakfast');
  const [loading, setLoading] = useState(breakfasts.length === 0 && lunches.length === 0);

  const acknowledged = acknowledgedDate === today;

  // ── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const [bfList, lunchList] = await Promise.all([
          getBreakfast(today),
          getLunch(today),
        ]);
        setBreakfasts(bfList);
        setLunches(lunchList);
      } catch {
        // silently ignore — show empty state
      } finally {
        setLoading(false);
      }
    })();
  }, [today]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleAdvanceStatus = async (bf: BreakfastDto) => {
    let next: MealStatus | null = null;
    if (bf.status === MealStatus.PENDING) next = MealStatus.CONFIRMED;
    else if (bf.status === MealStatus.CONFIRMED) next = MealStatus.SERVED;
    if (!next) return;
    try {
      const updated = await updateBreakfastStatus(bf.id, { status: next });
      upsertBreakfast(updated);
    } catch {
      showToast('Failed to update status');
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const shoppingList = buildShoppingList(breakfasts);
  const attendingCount = lunches.filter((l) => l.attending).length;
  const optedOut = lunches.filter((l) => l.attending === false);
  const totalLunch = lunches.length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <Header title="Meals" />

      {/* ── Segmented control ── */}
      <div style={{ padding: '0 20px 12px', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            gap: 4,
            background: '#EDE9E3',
            borderRadius: 10,
            padding: 4,
          }}
        >
          {(['breakfast', 'lunch'] as MealTab[]).map((t) => {
            const isActive = mealTab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setMealTab(t)}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 10,
                  border: 'none',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: isActive ? '#FFFFFF' : 'transparent',
                  color: isActive ? 'var(--ink)' : '#7A7369',
                  boxShadow: isActive ? '0 0 0 1px #DDD8CF' : 'none',
                  transition: 'background 0.15s, color 0.15s',
                  textTransform: 'capitalize',
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Body ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 20px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {loading && (
          <p style={{ fontSize: 12, color: '#7A7369', textAlign: 'center', padding: '24px 0' }}>
            Loading…
          </p>
        )}

        {/* ══ BREAKFAST TAB ══════════════════════════════════════════════════ */}
        {!loading && mealTab === 'breakfast' && (
          <>
            {/* 1. Run status card */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #DDD8CF',
                borderRadius: 12,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              {/* Icon tile */}
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: '#F5E8CC',
                  color: '#B07D2E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name="utensils" size={22} stroke={1.8} />
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: 15, margin: '0 0 2px', color: 'var(--ink)' }}>
                  {breakfasts.length} breakfast order{breakfasts.length !== 1 ? 's' : ''}
                </p>
                <p style={{ fontSize: 12.5, color: '#7A7369', margin: 0 }}>
                  Cutoff 9:30 AM · orders locked
                </p>
              </div>

              {/* Locked badge */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 20,
                  padding: '0 9px',
                  borderRadius: 9999,
                  background: '#ECE8E1',
                  color: '#8A837A',
                  fontSize: 11,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                Locked
              </span>
            </div>

            {/* 2. Acknowledge button */}
            <div>
              <button
                type="button"
                onClick={() => acknowledge(today)}
                disabled={acknowledged || breakfasts.length === 0}
                style={{
                  width: '100%',
                  height: 52,
                  borderRadius: 12,
                  border: 'none',
                  background: acknowledged ? '#DDD8CF' : '#B07D2E',
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: 600,
                  fontFamily: 'var(--font-sans)',
                  cursor: acknowledged || breakfasts.length === 0 ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'background 0.15s',
                }}
              >
                <Icon name="checkCircle" size={20} stroke={1.8} />
                {acknowledged ? 'Acknowledged' : 'Acknowledge & start run'}
              </button>
              <p
                style={{
                  fontSize: 12,
                  color: '#7A7369',
                  textAlign: 'center',
                  marginTop: 8,
                  marginBottom: 0,
                }}
              >
                Tells all {breakfasts.length} people you're on it — no more group-chat guessing.
              </p>
            </div>

            {/* 3. Shopping list card */}
            {shoppingList.length > 0 && (
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #DDD8CF',
                  borderRadius: 12,
                  padding: 0,
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '16px 16px 12px' }}>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.13em',
                      textTransform: 'uppercase',
                      color: '#7A7369',
                      margin: 0,
                    }}
                  >
                    Shopping list · totals
                  </p>
                </div>

                {shoppingList.map((row, i) => (
                  <div
                    key={row.item}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      borderTop: i === 0 ? 'none' : '1px solid #EDE9E3',
                    }}
                  >
                    {/* Qty */}
                    <span
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: 18,
                        fontWeight: 500,
                        color: '#B07D2E',
                        minWidth: 30,
                        fontVariantNumeric: 'tabular-nums',
                        flexShrink: 0,
                      }}
                    >
                      {row.qty}×
                    </span>

                    {/* Item name */}
                    <span style={{ fontSize: 14.5, fontWeight: 500, flex: 1, color: 'var(--ink)' }}>
                      {row.item}
                    </span>

                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleCheckedItem(row.item)}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 9999,
                        border: checkedItems[row.item] ? 'none' : '2px solid #DDD8CF',
                        background: checkedItems[row.item] ? '#2D6A4F' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                        padding: 0,
                        color: '#FFFFFF',
                        transition: 'background 0.15s',
                      }}
                    >
                      {checkedItems[row.item] && <Icon name="check" size={13} stroke={2.5} />}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 4. Deliver to section */}
            {breakfasts.length > 0 && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <SectionLabel>Deliver to</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {breakfasts.map((bf) => (
                    <button
                      key={bf.id}
                      type="button"
                      onClick={() => handleAdvanceStatus(bf)}
                      disabled={bf.status === MealStatus.SERVED}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 16px',
                        background: '#FFFFFF',
                        border: '1px solid #DDD8CF',
                        borderRadius: 12,
                        cursor: bf.status === MealStatus.SERVED ? 'default' : 'pointer',
                        textAlign: 'left',
                        font: 'inherit',
                        color: 'inherit',
                        opacity: bf.status === MealStatus.SERVED ? 0.6 : 1,
                      }}
                    >
                      <Avatar name={bf.user.name} size={36} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: 14.5, margin: '0 0 2px', color: 'var(--ink)' }}>
                          {bf.user.name}
                        </p>
                        <p
                          style={{
                            fontSize: 12.5,
                            color: '#7A7369',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {bf.order}
                        </p>
                      </div>

                      {/* Circle checkbox */}
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 9999,
                          border: bf.status === MealStatus.SERVED ? 'none' : '1px solid #DDD8CF',
                          background: bf.status === MealStatus.SERVED ? '#2D6A4F' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          color: '#FFFFFF',
                        }}
                      >
                        {bf.status === MealStatus.SERVED && <Icon name="check" size={14} stroke={2.2} />}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Empty breakfast state */}
            {breakfasts.length === 0 && (
              <p style={{ fontSize: 13, color: '#7A7369', textAlign: 'center', padding: '24px 0' }}>
                No breakfast orders today
              </p>
            )}
          </>
        )}

        {/* ══ LUNCH TAB ═══════════════════════════════════════════════════════ */}
        {!loading && mealTab === 'lunch' && (
          <>
            {/* Headcount hero card */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #DDD8CF',
                borderRadius: 12,
                padding: '24px 16px',
                textAlign: 'center',
              }}
            >
              {/* op-label */}
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.13em',
                  textTransform: 'uppercase',
                  color: '#2D6A4F',
                  margin: '0 0 8px',
                }}
              >
                In for lunch today
              </p>

              {/* Big number */}
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 56,
                  fontWeight: 500,
                  letterSpacing: '-1px',
                  lineHeight: 1,
                  color: 'var(--ink)',
                  margin: '0 0 8px',
                }}
              >
                {attendingCount}
              </p>

              {/* Sub */}
              <p style={{ fontSize: 13, color: '#7A7369', margin: '0 0 16px' }}>
                of {totalLunch} people · {optedOut.length} opted out
              </p>

              {/* Divider */}
              <div style={{ height: 1, background: '#EDE9E3', margin: '0 0 12px' }} />

              <p style={{ fontSize: 12.5, color: '#7A7369', margin: 0 }}>
                Headcount locked at 11:00 AM
              </p>
            </div>

            {/* Opted out list */}
            {optedOut.length > 0 && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <SectionLabel>Opted out</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {optedOut.map((l) => (
                    <div
                      key={l.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 16px',
                        background: '#FFFFFF',
                        border: '1px solid #DDD8CF',
                        borderRadius: 12,
                      }}
                    >
                      <Avatar name={l.user.name} size={34} />
                      <p style={{ fontWeight: 600, fontSize: 14.5, flex: 1, margin: 0, color: 'var(--ink)' }}>
                        {l.user.name}
                      </p>
                      <Icon name="x" size={18} stroke={1.8} style={{ color: '#7A7369', flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Empty lunch state */}
            {lunches.length === 0 && (
              <p style={{ fontSize: 13, color: '#7A7369', textAlign: 'center', padding: '16px 0' }}>
                No lunch data yet for today
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Tab bar ── */}
      <TabBar
        tabs={STAFF_TABS}
        liveTab="requests"
        active="meals"
        onTabChange={(key) => navigate(TAB_NAV[key] ?? '/')}
      />
    </AppShell>
  );
}
