import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MealStatus, UserRole } from '@officeping/shared';
import {
  createBreakfast,
  getBreakfast,
  getLunch,
  updateBreakfastStatus,
  upsertLunch,
} from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { useMealsStore } from '@/store/mealsStore';
import AppShell from '@/components/Layout/AppShell';
import Header from '@/components/Layout/Header';
import TabBar from '@/components/Layout/TabBar';
import Icon from '@/components/Icon';
import SectionLabel from '@/components/SectionLabel';
import Toggle from '@/components/Toggle';
import type { BreakfastDto } from '@officeping/shared';

const BREAKFAST_CUTOFF = '08:30';
const LUNCH_CUTOFF = '11:00';

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

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function isPastCutoff(hhmm: string): boolean {
  const now = new Date();
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
}

function CutoffTag({ text }: { readonly text: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, color: '#7A7369' }}>
      <Icon name="clock" size={13} stroke={1.8} />
      {text}
    </span>
  );
}

// ── Sub-components for breakfast panel ───────────────────────────────────────

interface BreakfastEditProps {
  editText: string;
  submitting: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}
function BreakfastEditPanel({ editText, submitting, textareaRef, onChange, onSave, onCancel }: Readonly<BreakfastEditProps>) {
  return (
    <div style={{ background: '#fff', border: '1px solid #DDD8CF', borderRadius: 12, padding: 16 }}>
      <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: '#1A1714' }}>Edit your order</p>
      <textarea
        ref={textareaRef}
        value={editText}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        style={{
          width: '100%', minHeight: 64, border: '1px solid #DDD8CF', borderRadius: 8,
          padding: '12px 16px', fontSize: 15, color: '#1A1714', background: '#F7F5F1',
          resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.5,
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#B07D2E'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = '#DDD8CF'; }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, height: 42, background: 'transparent', border: '1px solid #DDD8CF',
            borderRadius: 10, fontSize: 14, fontWeight: 500, color: '#3D3830', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >Cancel</button>
        <button
          onClick={onSave}
          disabled={!editText.trim() || submitting}
          style={{
            flex: 2, height: 42, background: '#1A1714', border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 600, color: '#F7F5F1', fontFamily: 'inherit',
            cursor: editText.trim() && !submitting ? 'pointer' : 'not-allowed',
            opacity: editText.trim() && !submitting ? 1 : 0.45,
          }}
        >Save</button>
      </div>
    </div>
  );
}

interface BreakfastOrderedProps {
  breakfast: BreakfastDto;
  onEdit: () => void;
}
function BreakfastOrderedPanel({ breakfast, onEdit }: Readonly<BreakfastOrderedProps>) {
  const isPending   = breakfast.status === MealStatus.PENDING;
  const isConfirmed = breakfast.status === MealStatus.CONFIRMED;
  const isServed    = breakfast.status === MealStatus.SERVED;
  let chipBg = '#FEF3C7'; let chipText = '#92400E'; let chipLabel = 'Pending';
  if (isServed)         { chipBg = '#D1FAE5'; chipText = '#065F46'; chipLabel = 'Served'; }
  else if (isConfirmed) { chipBg = '#E2EAF4'; chipText = '#1B4F8A'; chipLabel = 'Confirmed'; }

  return (
    <div style={{ background: '#fff', border: '1px solid #DDD8CF', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: 16, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isServed ? '#D1FAE5' : '#F5E8CC', color: isServed ? '#065F46' : '#B07D2E',
        }}>
          <Icon name="utensils" size={22} stroke={1.7} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1A1714', lineHeight: 1.3 }}>
              Breakfast order
            </p>
            <span style={{
              display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 9px',
              borderRadius: 999, background: chipBg, color: chipText,
              fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap',
            }}>{chipLabel}</span>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#3D3830', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {breakfast.order}
          </p>
        </div>
      </div>
      {!isServed && (
        <div style={{ padding: '0 12px 12px', borderTop: '1px solid #EDE9E3' }}>
          <button
            onClick={onEdit}
            disabled={!isPending}
            style={{
              marginTop: 12, width: '100%', height: 42,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              background: 'transparent', border: '1px solid #DDD8CF', borderRadius: 10,
              fontSize: 14, fontWeight: 500, color: isPending ? '#3D3830' : '#7A7369',
              cursor: isPending ? 'pointer' : 'not-allowed', opacity: isPending ? 1 : 0.5, fontFamily: 'inherit',
            }}
          >
            <Icon name="edit" size={15} stroke={1.8} />
            {isPending ? 'Edit order' : 'Order locked in'}
          </button>
        </div>
      )}
    </div>
  );
}

interface BreakfastNewProps {
  closed: boolean;
  defaultBreakfast: string | null;
  itemsText: string;
  submitting: boolean;
  onChangeText: (v: string) => void;
  onSubmit: () => void;
}
function BreakfastNewPanel({ closed, defaultBreakfast, itemsText, submitting, onChangeText, onSubmit }: Readonly<BreakfastNewProps>) {
  const isDefaultLoaded = Boolean(defaultBreakfast) && itemsText === defaultBreakfast;
  return (
    <div style={{
      background: '#fff', border: '1px solid #DDD8CF', borderRadius: 12, padding: 16,
      opacity: closed ? 0.55 : 1, pointerEvents: closed ? 'none' : 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EDE9E3', color: '#7A7369',
        }}>
          <Icon name="utensils" size={22} stroke={1.7} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1A1714', lineHeight: 1.3 }}>Want breakfast today?</p>
          <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#7A7369', lineHeight: 1.4 }}>Type what you'd like — staff brings it in.</p>
        </div>
      </div>

      {defaultBreakfast && (
        <button
          onClick={() => onChangeText(defaultBreakfast)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            marginBottom: 10, padding: '6px 12px',
            background: isDefaultLoaded ? '#F5E8CC' : '#FAFAF8',
            border: `1.5px solid ${isDefaultLoaded ? '#B07D2E' : '#DDD8CF'}`,
            borderRadius: 99, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <Icon name="star" size={13} stroke={1.8} style={{ color: '#B07D2E' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#B07D2E' }}>
            {isDefaultLoaded ? 'Your usual' : 'Use my usual'}
          </span>
          {!isDefaultLoaded && (
            <span style={{ fontSize: 12, color: '#7A7369', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              — {defaultBreakfast}
            </span>
          )}
        </button>
      )}

      <textarea
        value={itemsText}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder={closed ? 'Breakfast orders are closed for today' : 'e.g. Avocado toast + oat latte'}
        disabled={closed}
        rows={3}
        style={{
          width: '100%', minHeight: 64, border: '1px solid #DDD8CF', borderRadius: 8,
          padding: '12px 16px', fontSize: 15, color: '#1A1714',
          background: closed ? '#EDE9E3' : '#F7F5F1',
          resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.5,
          cursor: closed ? 'not-allowed' : 'text',
        }}
        onFocus={(e) => { if (!closed) e.currentTarget.style.borderColor = '#B07D2E'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = '#DDD8CF'; }}
      />
      <button
        onClick={onSubmit}
        disabled={!itemsText.trim() || submitting || closed}
        style={{
          marginTop: 12, width: '100%', height: 48,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: itemsText.trim() && !submitting && !closed ? '#1A1714' : '#3D3830',
          color: '#F7F5F1', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600,
          cursor: itemsText.trim() && !submitting && !closed ? 'pointer' : 'not-allowed',
          opacity: itemsText.trim() && !submitting && !closed ? 1 : 0.45,
          transition: 'opacity 0.15s', fontFamily: 'inherit',
        }}
      >
        <Icon name="plus" size={18} stroke={2.2} />
        Add to breakfast run
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Meals() {
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const tabs = me?.role === UserRole.ADMIN ? [...BASE_TABS, MANAGE_TAB] : BASE_TABS;
  const { showToast } = useUiStore();
  const today = todayStr();

  const {
    breakfast: allBreakfast, lunch: allLunch,
    setBreakfast, setLunch, upsertBreakfast,
  } = useMealsStore();

  const myBreakfast = allBreakfast.find((b) => b.user.id === me?.id) ?? null;
  const myLunch = allLunch.find((l) => l.user.id === me?.id);

  const [lunchIn, setLunchIn] = useState(() => myLunch?.attending ?? true);
  const lunchToggling = useRef(false);

  useEffect(() => {
    if (myLunch !== undefined) setLunchIn(myLunch.attending);
  }, [myLunch?.attending]); // eslint-disable-line react-hooks/exhaustive-deps

  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState('');
  const [itemsText, setItemsText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';
  const breakfastClosed = !isDemo && isPastCutoff(BREAKFAST_CUTOFF);
  const lunchClosed = !isDemo && isPastCutoff(LUNCH_CUTOFF);

  useEffect(() => {
    if (!me) return;
    void (async () => {
      try {
        const [lunchList, bfList] = await Promise.all([getLunch(today), getBreakfast(today)]);
        setLunch(lunchList);
        setBreakfast(bfList);
      } catch {
        // cached data already visible — silently ignore
      }
    })();
  }, [me?.id, today]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleLunch() {
    if (lunchToggling.current) return;
    const next = !lunchIn;
    setLunchIn(next);
    lunchToggling.current = true;
    try {
      await upsertLunch({ date: today, attending: next });
    } catch {
      setLunchIn(!next);
    } finally {
      lunchToggling.current = false;
    }
  }

  async function handleAddBreakfast() {
    if (!itemsText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const result = await createBreakfast({ order: itemsText.trim(), date: today });
      upsertBreakfast(result);
      setItemsText('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg ?? 'Failed to submit breakfast order');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveEdit() {
    if (!editText.trim() || !myBreakfast) return;
    setSubmitting(true);
    try {
      const result = await updateBreakfastStatus(myBreakfast.id, { order: editText.trim() });
      upsertBreakfast(result);
      setEditMode(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg ?? 'Failed to update order');
    } finally {
      setSubmitting(false);
    }
  }

  function enterEditMode() {
    setEditText(myBreakfast?.order ?? '');
    setEditMode(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function renderBreakfastPanel() {
    if (!myBreakfast) {
      return (
        <BreakfastNewPanel
          closed={breakfastClosed}
          defaultBreakfast={me?.defaultBreakfast ?? null}
          itemsText={itemsText}
          submitting={submitting}
          onChangeText={setItemsText}
          onSubmit={handleAddBreakfast}
        />
      );
    }
    if (editMode) {
      return (
        <BreakfastEditPanel
          editText={editText}
          submitting={submitting}
          textareaRef={textareaRef}
          onChange={setEditText}
          onSave={handleSaveEdit}
          onCancel={() => setEditMode(false)}
        />
      );
    }
    return <BreakfastOrderedPanel breakfast={myBreakfast} onEdit={enterEditMode} />;
  }

  return (
    <AppShell>
      <Header
        title="Meals"
        action={
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#7A7369' }}>
            Today
          </span>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <section>
          <SectionLabel right={<CutoffTag text={lunchClosed ? 'Closed' : 'Opt out by 11:00 AM'} />}>
            Lunch
          </SectionLabel>
          <div style={{
            background: '#fff', border: '1px solid #DDD8CF', borderRadius: 12, padding: 16, marginTop: 10,
            opacity: lunchClosed ? 0.55 : 1, pointerEvents: lunchClosed ? 'none' : 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: lunchIn ? '#DCE9E0' : '#EDE9E3', color: lunchIn ? '#2D6A4F' : '#7A7369',
              }}>
                <Icon name="utensils" size={22} stroke={1.7} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1A1714', lineHeight: 1.3 }}>
                  {lunchIn ? "You're in for lunch" : 'Not joining lunch'}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#7A7369', lineHeight: 1.4 }}>
                  {lunchIn ? 'Counted in for today' : 'Opted out for today'}
                </p>
              </div>
              <Toggle size="lg" color="green" on={lunchIn} onChange={lunchClosed ? () => undefined : toggleLunch} />
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #EDE9E3', fontSize: 12.5, color: '#7A7369', lineHeight: 1.5 }}>
              {"Everyone's counted in by default — only switch off if you're skipping today."}
            </div>
          </div>
        </section>

        <section style={{ paddingBottom: 20 }}>
          <SectionLabel right={<CutoffTag text={breakfastClosed ? 'Closed' : 'Order by 8:30 AM'} />}>
            Breakfast
          </SectionLabel>
          <div style={{ marginTop: 10 }}>{renderBreakfastPanel()}</div>
        </section>
      </div>

      <TabBar
        tabs={tabs}
        liveTab="activity"
        active="meals"
        onTabChange={(key) => navigate(TAB_ROUTES[key] ?? '/')}
      />
    </AppShell>
  );
}
