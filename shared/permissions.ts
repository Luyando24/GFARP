export const STAFF_PERMISSION_KEYS = [
  'players',
  'training',
  'transfers',
  'finances',
  'compliance',
] as const;

export type StaffPermission = (typeof STAFF_PERMISSION_KEYS)[number];

export const ACADEMY_STAFF_ROLES = [
  { value: 'academy_admin', label: 'Administrator' },
  { value: 'head_coach', label: 'Head coach' },
  { value: 'coach', label: 'Coach' },
  { value: 'trainer', label: 'Trainer' },
  { value: 'staff', label: 'Staff' },
] as const;

export type AcademyStaffRole = (typeof ACADEMY_STAFF_ROLES)[number]['value'];

export function isAcademyStaffRole(value: unknown): value is AcademyStaffRole {
  return ACADEMY_STAFF_ROLES.some((role) => role.value === value);
}

export interface StaffPermissionDefinition {
  key: StaffPermission;
  label: string;
  description: string;
}

export const STAFF_PERMISSIONS: StaffPermissionDefinition[] = [
  {
    key: 'players',
    label: 'Players',
    description: 'View, add, edit and remove academy players and their documents.',
  },
  {
    key: 'training',
    label: 'Training & attendance',
    description: 'Schedule sessions and take attendance.',
  },
  {
    key: 'transfers',
    label: 'Transfers',
    description: 'Create and manage player transfers.',
  },
  {
    key: 'finances',
    label: 'Finances',
    description: 'Transactions, budgets and player fee subscriptions.',
  },
  {
    key: 'compliance',
    label: 'FIFA compliance',
    description: 'Compliance records and required documents.',
  },
];

const PERMISSION_KEY_SET = new Set<string>(STAFF_PERMISSION_KEYS);

export function isStaffPermission(value: unknown): value is StaffPermission {
  return typeof value === 'string' && PERMISSION_KEY_SET.has(value);
}

export function normalizeStaffPermissions(value: unknown): StaffPermission[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.replace(/[{}]/g, '').split(',')
      : [];
  const unique = new Set<StaffPermission>();
  for (const entry of raw) {
    const key = String(entry || '').trim().toLowerCase();
    if (isStaffPermission(key)) unique.add(key);
  }
  return STAFF_PERMISSION_KEYS.filter((key) => unique.has(key));
}
