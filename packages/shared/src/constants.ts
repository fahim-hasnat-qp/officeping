/** Seeded by the InsertDefaultCategories data migration. */
export const DEFAULT_CATEGORIES = [
  { name: 'Tea / Coffee', icon: '☕' },
  { name: 'Snacks', icon: '🍪' },
  { name: 'Supplies', icon: '📎' },
  { name: 'Parcel', icon: '📦' },
  { name: 'Assistance', icon: '🙋' },
] as const;

/**
 * Seeded when DEMO_MODE=true; POST /auth/demo-login accepts these emails.
 * The Login page renders one-tap buttons for them when VITE_DEMO_MODE=true.
 */
export const DEMO_USERS = [
  { email: 'demo.member@officeping.local', name: 'Dana Member', role: 'member' },
  { email: 'demo.staff@officeping.local', name: 'Karim Staff', role: 'staff' },
  { email: 'demo.admin@officeping.local', name: 'Ayesha Admin', role: 'admin' },
] as const;
