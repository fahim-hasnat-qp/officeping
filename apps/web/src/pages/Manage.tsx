import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '@officeping/shared';
import type {
  AdminStats,
  CategoryDto,
  CategoryStat,
  StaffPerformance,
  UserDto,
} from '@officeping/shared';
import {
  addUser,
  adminGetCategories,
  createCategory,
  getCategoryStats,
  getSettings,
  getStaffPerformance,
  getStats,
  getUsers,
  updateCategory,
  updateSetting,
  updateUserRole,
} from '@/lib/api';
import { useUiStore } from '@/store/uiStore';
import AppShell from '@/components/Layout/AppShell';
import Header from '@/components/Layout/Header';
import TabBar from '@/components/Layout/TabBar';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import Toggle from '@/components/Toggle';
import OPSheet from '@/components/OPSheet';

// ── constants ─────────────────────────────────────────────────────────────────

const MEMBER_TABS = [
  { key: 'home',     label: 'Home',    icon: 'home' },
  { key: 'activity', label: 'Activity', icon: 'inbox' },
  { key: 'meals',    label: 'Meals',   icon: 'utensils' },
  { key: 'profile',  label: 'Profile', icon: 'user' },
  { key: 'manage',   label: 'Manage',  icon: 'settings' },
];

const TAB_ROUTES: Record<string, string> = {
  home: '/', activity: '/activity', meals: '/meals', profile: '/profile', manage: '/manage',
};

type SubTab = 'users' | 'categories' | 'meals' | 'stats';

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'users', label: 'Users' },
  { key: 'categories', label: 'Categories' },
  { key: 'meals', label: 'Meals' },
  { key: 'stats', label: 'Stats' },
];

const CAT_ICONS = [
  'coffee',
  'water',
  'laptop',
  'supplies',
  'cleaning',
  'wrench',
  'mail',
  'grid',
];

// ── shared primitives ─────────────────────────────────────────────────────────

function OPLabel({ children, style }: { readonly children: React.ReactNode; readonly style?: React.CSSProperties }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        color: 'var(--ink3)',
        marginBottom: 10,
        ...style,
      }}
    >
      {children}
    </p>
  );
}

function OPCard({
  children,
  style,
  noPad,
}: {
  readonly children: React.ReactNode;
  readonly style?: React.CSSProperties;
  readonly noPad?: boolean;
}) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--surface3)',
        borderRadius: 16,
        overflow: 'hidden',
        ...(noPad ? {} : { padding: '12px 16px' }),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function OPInputRow({
  icon,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  readonly icon: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly placeholder?: string;
  readonly type?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'var(--surface2)',
        borderRadius: 12,
        padding: '0 14px',
        height: 48,
      }}
    >
      <Icon name={icon} size={18} stroke={1.7} style={{ color: 'var(--ink3)', flexShrink: 0 }} />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          background: 'none',
          border: 'none',
          outline: 'none',
          fontSize: 15,
          color: 'var(--ink)',
          fontFamily: 'var(--font-sans)',
        }}
      />
    </div>
  );
}

function RoleBadge({ role }: { readonly role: UserRole }) {
  const styles: Record<UserRole, React.CSSProperties> = {
    [UserRole.ADMIN]: { background: 'var(--gold-light)', color: 'var(--gold)' },
    [UserRole.STAFF]: { background: '#E2EAF4', color: '#1B4F8A' },
    [UserRole.MEMBER]: { background: 'var(--surface2)', color: 'var(--ink3)' },
  };
  const labels: Record<UserRole, string> = {
    [UserRole.ADMIN]: 'Admin',
    [UserRole.STAFF]: 'Staff',
    [UserRole.MEMBER]: 'Member',
  };
  return (
    <span
      style={{
        fontSize: 11.5,
        fontWeight: 600,
        padding: '3px 9px',
        borderRadius: 9999,
        ...styles[role],
      }}
    >
      {labels[role]}
    </span>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  readonly options: readonly { readonly key: T; readonly label: string }[];
  readonly value: T;
  readonly onChange: (v: T) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        background: 'var(--surface2)',
        borderRadius: 10,
        padding: 4,
      }}
    >
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            style={{
              flex: 1,
              height: 38,
              borderRadius: 10,
              border: 'none',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              background: active ? 'var(--card)' : 'transparent',
              color: active ? 'var(--ink)' : 'var(--ink3)',
              boxShadow: active ? '0 0 0 1px #DDD8CF' : 'none',
              transition: 'background 0.14s, color 0.14s',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function DarkButton({
  children,
  onClick,
  height = 50,
}: {
  readonly children: React.ReactNode;
  readonly onClick?: () => void;
  readonly height?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        height,
        borderRadius: 14,
        background: 'var(--ink)',
        color: '#FFFFFF',
        border: 'none',
        fontFamily: 'var(--font-sans)',
        fontSize: 15.5,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function GhostSmButton({ children, onClick }: { readonly children: React.ReactNode; readonly onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 32,
        padding: '0 12px',
        borderRadius: 8,
        border: '1px solid var(--surface3)',
        background: 'var(--card)',
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--ink)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

// ── Users tab ─────────────────────────────────────────────────────────────────

const ROLE_OPTIONS: { key: UserRole; label: string }[] = [
  { key: UserRole.MEMBER, label: 'Member' },
  { key: UserRole.STAFF, label: 'Staff' },
  { key: UserRole.ADMIN, label: 'Admin' },
];

function UsersTab({
  users,
  categories,
  onReload,
}: {
  readonly users: UserDto[];
  readonly categories: CategoryDto[];
  readonly onReload: () => void;
}) {
  const { showToast } = useUiStore();
  const [editingUser, setEditingUser] = useState<UserDto | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.MEMBER);
  const [showAddSheet, setShowAddSheet] = useState(false);

  // Add sheet state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>(UserRole.MEMBER);

  function openEdit(user: UserDto) {
    setEditingUser(user);
    setSelectedRole(user.role);
  }

  async function handleSaveRole() {
    if (!editingUser) return;
    try {
      await updateUserRole(editingUser.id, selectedRole);
      showToast('Role updated');
      setEditingUser(null);
      onReload();
    } catch {
      showToast('Failed to update role');
    }
  }

  async function handleAddUser() {
    if (!newEmail.trim() || !newName.trim()) {
      showToast('Please fill in email and name');
      return;
    }
    try {
      await addUser({ email: newEmail.trim(), name: newName.trim(), role: newRole });
      showToast('Person added');
      setNewName('');
      setNewEmail('');
      setNewRole(UserRole.MEMBER);
      setShowAddSheet(false);
      onReload();
    } catch {
      showToast('Failed to add person');
    }
  }

  const needsCategories =
    selectedRole === UserRole.STAFF || selectedRole === UserRole.ADMIN;

  return (
    <>
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <OPLabel style={{ marginBottom: 0 }}>{users.length} people</OPLabel>
          <GhostSmButton onClick={() => setShowAddSheet(true)}>+ Invite</GhostSmButton>
        </div>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {users.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => openEdit(u)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              background: 'var(--card)',
              border: '1px solid var(--surface3)',
              borderRadius: 16,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <Avatar name={u.name} size={38} online={u.isOnline} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--ink)', lineHeight: 1.3 }}>
                {u.name}
              </p>
              <p style={{ fontSize: 12.5, color: 'var(--ink3)', lineHeight: 1.3, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {u.email}
              </p>
            </div>
            <RoleBadge role={u.role} />
            <Icon name="chevronDown" size={16} stroke={1.7} style={{ color: 'var(--ink3)' }} />
          </button>
        ))}
      </div>

      {/* Edit user sheet */}
      {editingUser && (
        <OPSheet onClose={() => setEditingUser(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Identity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name={editingUser.name} size={48} online={editingUser.isOnline} />
              <div>
                <p style={{ fontWeight: 600, fontSize: 17, color: 'var(--ink)', lineHeight: 1.25 }}>
                  {editingUser.name}
                </p>
                <p style={{ fontSize: 12.5, color: 'var(--ink3)', marginTop: 2 }}>
                  {editingUser.email}
                </p>
              </div>
            </div>

            {/* Role */}
            <div>
              <OPLabel>Role</OPLabel>
              <SegmentedControl options={ROLE_OPTIONS} value={selectedRole} onChange={setSelectedRole} />
            </div>

            {/* Category chips (display only) */}
            {needsCategories && categories.length > 0 && (
              <div>
                <OPLabel>Handles categories</OPLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      style={{
                        height: 34,
                        padding: '0 12px',
                        borderRadius: 9999,
                        border: '1px solid var(--surface3)',
                        background: 'var(--card)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--ink)',
                      }}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Save */}
            <DarkButton onClick={handleSaveRole}>Save changes</DarkButton>

            {/* Remove */}
            <button
              type="button"
              onClick={() => showToast('Contact your admin to remove users')}
              style={{
                width: '100%',
                height: 44,
                border: 'none',
                background: 'none',
                fontFamily: 'var(--font-sans)',
                fontSize: 14.5,
                fontWeight: 600,
                color: 'var(--red)',
                cursor: 'pointer',
              }}
            >
              Remove from workspace
            </button>
          </div>
        </OPSheet>
      )}

      {/* Add person sheet */}
      {showAddSheet && (
        <OPSheet onClose={() => setShowAddSheet(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontWeight: 600, fontSize: 17, color: 'var(--ink)', marginBottom: 4 }}>
              Add a person
            </p>
            <OPInputRow
              icon="user"
              value={newName}
              onChange={setNewName}
              placeholder="Full name"
            />
            <OPInputRow
              icon="mail"
              value={newEmail}
              onChange={setNewEmail}
              placeholder="Email address"
              type="email"
            />
            <div>
              <OPLabel>Role</OPLabel>
              <SegmentedControl options={ROLE_OPTIONS} value={newRole} onChange={setNewRole} />
            </div>
            <DarkButton onClick={handleAddUser}>Add person</DarkButton>
          </div>
        </OPSheet>
      )}
    </>
  );
}

// ── Categories tab ────────────────────────────────────────────────────────────

function CategoriesTab({
  categories,
  categoryStats,
  onReload,
}: {
  readonly categories: CategoryDto[];
  readonly categoryStats: CategoryStat[];
  readonly onReload: () => void;
}) {
  const { showToast } = useUiStore();
  const [editingCat, setEditingCat] = useState<CategoryDto | 'new' | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('');

  function openEdit(cat: CategoryDto) {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatIcon(cat.icon);
  }

  function openNew() {
    setEditingCat('new');
    setCatName('');
    setCatIcon('');
  }

  function closeSheet() {
    setEditingCat(null);
  }

  async function handleSave() {
    if (!catName.trim()) {
      showToast('Please enter a category name');
      return;
    }
    try {
      if (editingCat === 'new') {
        await createCategory({ name: catName.trim(), icon: catIcon.trim() || '📦' });
        showToast('Category added');
      } else if (editingCat) {
        await updateCategory(editingCat.id, { name: catName.trim(), icon: catIcon.trim() || editingCat.icon });
        showToast('Category updated');
      }
      closeSheet();
      onReload();
    } catch {
      showToast('Failed to save category');
    }
  }

  const isNew = editingCat === 'new';

  return (
    <>
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <OPLabel style={{ marginBottom: 0 }}>{categories.length} categories</OPLabel>
          <GhostSmButton onClick={openNew}>+ Add</GhostSmButton>
        </div>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => openEdit(cat)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              background: 'var(--card)',
              border: '1px solid var(--surface3)',
              borderRadius: 16,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            {/* Icon tile */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'var(--surface2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 19,
                flexShrink: 0,
              }}
            >
              {cat.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--ink)', lineHeight: 1.3 }}>
                {cat.name}
              </p>
              <p style={{ fontSize: 12.5, color: 'var(--ink3)', lineHeight: 1.3, marginTop: 1 }}>
                {(categoryStats.find((s) => s.categoryId === cat.id)?.count ?? 0)} requests · this month
              </p>
            </div>
            <Toggle size="sm" color="gold" on={true} />
          </button>
        ))}
      </div>

      {/* Edit / New category sheet */}
      {editingCat !== null && (
        <OPSheet onClose={closeSheet}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ fontWeight: 600, fontSize: 17, color: 'var(--ink)' }}>
              {isNew ? 'New category' : 'Edit category'}
            </p>

            <div>
              <OPLabel>Name</OPLabel>
              <OPInputRow
                icon="grid"
                value={catName}
                onChange={setCatName}
                placeholder="Category name"
              />
            </div>

            <div>
              <OPLabel>Icon</OPLabel>
              {/* Emoji text input */}
              <OPInputRow
                icon="grid"
                value={catIcon}
                onChange={setCatIcon}
                placeholder="Paste emoji e.g. ☕"
              />
              {/* Icon picker grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 8,
                  marginTop: 10,
                }}
              >
                {CAT_ICONS.map((iconName) => {
                  const active = catIcon === iconName;
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setCatIcon(iconName)}
                      style={{
                        height: 52,
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `1px solid ${active ? 'var(--gold)' : 'var(--surface3)'}`,
                        background: active ? 'var(--gold-light)' : 'var(--card)',
                        color: active ? 'var(--gold)' : 'var(--ink2)',
                        cursor: 'pointer',
                      }}
                    >
                      <Icon name={iconName} size={22} stroke={1.7} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Enabled toggle row */}
            <OPCard>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--ink)' }}>Enabled</p>
                <Toggle color="gold" on={true} />
              </div>
            </OPCard>

            <DarkButton onClick={handleSave}>Save category</DarkButton>

            <button
              type="button"
              onClick={() => showToast('Feature coming soon')}
              style={{
                width: '100%',
                height: 44,
                border: 'none',
                background: 'none',
                fontFamily: 'var(--font-sans)',
                fontSize: 14.5,
                fontWeight: 600,
                color: 'var(--red)',
                cursor: 'pointer',
              }}
            >
              Delete category
            </button>
          </div>
        </OPSheet>
      )}
    </>
  );
}

// ── Meals tab ─────────────────────────────────────────────────────────────────


function MealRow({
  label,
  sub,
  right,
  first,
}: {
  readonly label: string;
  readonly sub: string;
  readonly right: React.ReactNode;
  readonly first?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderTop: first ? 'none' : '1px solid var(--surface2)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--ink)', lineHeight: 1.3 }}>
          {label}
        </p>
        <p style={{ fontSize: 12.5, color: 'var(--ink3)', marginTop: 2 }}>{sub}</p>
      </div>
      {right}
    </div>
  );
}

function CutoffRow({
  label,
  sub,
  value,
  onChange,
  onSave,
  saving,
  first,
}: {
  readonly label: string;
  readonly sub: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly onSave: () => void;
  readonly saving: boolean;
  readonly first?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: first ? 'none' : '1px solid var(--surface2)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--ink)', lineHeight: 1.3 }}>{label}</p>
        <p style={{ fontSize: 12.5, color: 'var(--ink3)', marginTop: 2 }}>{sub}</p>
      </div>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onSave}
        disabled={saving}
        style={{
          height: 34, padding: '0 10px', border: '1px solid var(--surface3)',
          borderRadius: 8, fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
          background: 'var(--surface2)', color: 'var(--ink)', outline: 'none',
          cursor: 'pointer', opacity: saving ? 0.5 : 1,
        }}
      />
    </div>
  );
}

function MealsTab() {
  const { showToast } = useUiStore();
  const [bfCutoff, setBfCutoff] = useState('08:30');
  const [lunchCutoff, setLunchCutoff] = useState('11:00');
  const [savingBf, setSavingBf] = useState(false);
  const [savingLunch, setSavingLunch] = useState(false);

  useEffect(() => {
    getSettings()
      .then((s) => {
        if (s.breakfast_cutoff) setBfCutoff(s.breakfast_cutoff);
        if (s.lunch_cutoff) setLunchCutoff(s.lunch_cutoff);
      })
      .catch(() => undefined);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveBfCutoff() {
    if (savingBf) return;
    setSavingBf(true);
    try {
      await updateSetting('breakfast_cutoff', bfCutoff);
      showToast('Breakfast cutoff saved');
    } catch {
      showToast('Failed to save');
    } finally {
      setSavingBf(false);
    }
  }

  async function saveLunchCutoff() {
    if (savingLunch) return;
    setSavingLunch(true);
    try {
      await updateSetting('lunch_cutoff', lunchCutoff);
      showToast('Lunch cutoff saved');
    } catch {
      showToast('Failed to save');
    } finally {
      setSavingLunch(false);
    }
  }

  return (
    <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <OPLabel>Breakfast · order cutoff</OPLabel>
        <OPCard noPad>
          <MealRow first label="Breakfast enabled" sub="Members order items for staff to bring in" right={<Toggle color="gold" on={true} />} />
          <CutoffRow
            first={false}
            label="Order cutoff"
            sub="Members cannot order after this time"
            value={bfCutoff}
            onChange={setBfCutoff}
            onSave={saveBfCutoff}
            saving={savingBf}
          />
          <MealRow label="Who can order" sub="Opt-in — no order, no breakfast" right={
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink3)' }}>All members</span>
          } />
        </OPCard>
      </div>

      <div>
        <OPLabel>Lunch · headcount cutoff</OPLabel>
        <OPCard noPad>
          <MealRow first label="Lunch enabled" sub="Everyone counted in unless opted out" right={<Toggle color="gold" on={true} />} />
          <CutoffRow
            first={false}
            label="Opt-out cutoff"
            sub="Members cannot change attendance after this"
            value={lunchCutoff}
            onChange={setLunchCutoff}
            onSave={saveLunchCutoff}
            saving={savingLunch}
          />
          <MealRow label="Default" sub="Counted in by default" right={
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--green)' }}>Opt-out</span>
          } />
        </OPCard>
      </div>

      <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Icon name="clock" size={18} stroke={1.7} style={{ color: 'var(--ink3)', marginTop: 1 }} />
        <p style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.45, flex: 1, margin: 0 }}>
          Changes take effect immediately. Tap or click outside the time field to save.
        </p>
      </div>
    </div>
  );
}

// ── Stats tab ─────────────────────────────────────────────────────────────────

function StatsTab({
  stats,
  categoryStats,
  staffPerf,
}: {
  readonly stats: AdminStats | null;
  readonly categoryStats: CategoryStat[];
  readonly staffPerf: StaffPerformance[];
}) {
  const maxCount = Math.max(...categoryStats.map((c) => c.count), 1);

  return (
    <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top stat cards */}
      {stats && (
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { num: stats.totalRequests, label: 'Requests today' },
            { num: stats.activeNow, label: 'Active now' },
            { num: stats.totalCompliments, label: 'Compliments today' },
          ].map(({ num, label }) => (
            <div
              key={label}
              style={{
                flex: 1,
                background: 'var(--card)',
                border: '1px solid var(--surface3)',
                borderRadius: 16,
                padding: 16,
              }}
            >
              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: '-0.5px',
                  lineHeight: 1,
                  color: 'var(--ink)',
                }}
              >
                {num}
              </p>
              <p
                style={{
                  fontSize: 12.5,
                  color: 'var(--ink3)',
                  marginTop: 5,
                }}
              >
                {label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Category bar chart */}
      {categoryStats.length > 0 && (
        <OPCard>
          <OPLabel style={{ marginBottom: 16 }}>Requests by category</OPLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {categoryStats.map((c) => (
              <div key={c.categoryId}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <Icon name="grid" size={16} stroke={1.7} style={{ color: 'var(--ink3)', marginRight: 6 }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', flex: 1 }}>
                    {c.icon} {c.name}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: 'var(--ink3)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {c.count}
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    background: 'var(--surface2)',
                    borderRadius: 9999,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      background: 'var(--gold)',
                      borderRadius: 9999,
                      width: `${(c.count / maxCount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </OPCard>
      )}

      {/* Staff performance */}
      {staffPerf.length > 0 && (
        <OPCard noPad>
          <div style={{ padding: '16px 16px 12px' }}>
            <OPLabel style={{ marginBottom: 0 }}>Staff performance</OPLabel>
          </div>
          {staffPerf.map((s, i) => {
            const avg = s.avgResponseTimeMinutes;
            let avgLabel = '—';
            if (avg != null) avgLabel = avg < 60 ? `${Math.round(avg)}m` : `${(avg / 60).toFixed(1)}h`;
            return (
              <div
                key={s.staffId}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: i === 0 ? 'none' : '1px solid var(--surface2)' }}
              >
                <Avatar name={s.name} size={34} online={s.isOnline} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', lineHeight: 1.3, margin: 0 }}>{s.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2, margin: 0 }}>avg response · {avgLabel}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: 'var(--ink)', margin: 0, lineHeight: 1 }}>{s.completed}</p>
                  <p style={{ fontSize: 11, color: 'var(--ink3)', margin: '2px 0 0' }}>done this month</p>
                </div>
              </div>
            );
          })}
        </OPCard>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Manage() {
  const navigate = useNavigate();
  const { showToast } = useUiStore();

  const [subTab, setSubTab] = useState<SubTab>('users');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [staffPerf, setStaffPerf] = useState<StaffPerformance[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);

  async function loadAll() {
    try {
      const [s, cs, sp, u, cats] = await Promise.all([
        getStats(),
        getCategoryStats(),
        getStaffPerformance(),
        getUsers(),
        adminGetCategories(),
      ]);
      setStats(s);
      setCategoryStats(cs);
      setStaffPerf(sp);
      setUsers(u);
      setCategories(cats);
    } catch {
      showToast('Failed to load data');
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  return (
    <AppShell>
      <Header
        title="Manage"
        action={
          subTab === 'users' ? (
            <button
              type="button"
              style={{
                width: 38,
                height: 38,
                borderRadius: 9999,
                border: '1px solid var(--surface3)',
                background: 'var(--card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <Icon name="search" size={18} stroke={1.7} />
            </button>
          ) : undefined
        }
      />

      {/* Sub-tab segmented control */}
      <div style={{ padding: '0 20px 12px' }}>
        <div
          style={{
            background: 'var(--surface2)',
            borderRadius: 10,
            padding: 4,
            display: 'flex',
            gap: 4,
          }}
        >
          {SUB_TABS.map((tab) => {
            const active = tab.key === subTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSubTab(tab.key)}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 10,
                  border: 'none',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: active ? 'var(--card)' : 'transparent',
                  color: active ? 'var(--ink)' : 'var(--ink3)',
                  boxShadow: active ? '0 0 0 1px #DDD8CF' : 'none',
                  transition: 'background 0.14s, color 0.14s',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 20 }}>
        {subTab === 'users' && (
          <UsersTab users={users} categories={categories} onReload={loadAll} />
        )}
        {subTab === 'categories' && (
          <CategoriesTab categories={categories} categoryStats={categoryStats} onReload={loadAll} />
        )}
        {subTab === 'meals' && <MealsTab />}
        {subTab === 'stats' && (
          <StatsTab stats={stats} categoryStats={categoryStats} staffPerf={staffPerf} />
        )}
      </div>

      <TabBar tabs={MEMBER_TABS} active="manage" onTabChange={(key) => navigate(TAB_ROUTES[key] ?? '/')} />
    </AppShell>
  );
}
