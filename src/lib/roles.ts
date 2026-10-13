/**
 * Client mirror of the server's role/permission map
 * (server: src/common/roles/roles.ts).
 *
 * This drives what the admin UI shows. It is presentation only — the server
 * enforces the same map on every route, so a stale copy here can hide
 * something a role may use, but it can never grant access it lacks. Keep the
 * two in step when roles change.
 */
export type AdminRole =
  | "customer"
  | "support"
  | "catalogue"
  | "manager"
  | "super_admin";

export const INVITABLE_ROLES: AdminRole[] = [
  "support",
  "catalogue",
  "manager",
  "super_admin",
];

export type Permission =
  | "dashboard:view"
  | "products:manage"
  | "orders:manage"
  | "refunds:issue"
  | "reviews:moderate"
  | "customers:view"
  | "customers:suspend"
  | "analytics:view"
  | "audit:view"
  | "delivery:manage"
  | "team:manage"
  | "settings:manage";

export const ALL_PERMISSIONS: Permission[] = [
  "dashboard:view",
  "products:manage",
  "orders:manage",
  "refunds:issue",
  "reviews:moderate",
  "customers:view",
  "customers:suspend",
  "analytics:view",
  "audit:view",
  "delivery:manage",
  "team:manage",
  "settings:manage",
];

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  customer: [],
  support: [
    "dashboard:view",
    "orders:manage",
    "reviews:moderate",
    "customers:view",
  ],
  catalogue: ["dashboard:view", "products:manage", "analytics:view"],
  manager: [
    "dashboard:view",
    "products:manage",
    "orders:manage",
    "refunds:issue",
    "reviews:moderate",
    "customers:view",
    "customers:suspend",
    "analytics:view",
    "audit:view",
    "delivery:manage",
  ],
  super_admin: ALL_PERMISSIONS,
};

export const ROLE_LABELS: Record<AdminRole, string> = {
  customer: "Customer",
  support: "Support",
  catalogue: "Catalogue",
  manager: "Manager",
  super_admin: "Super admin",
};

export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  customer: "No admin access.",
  support:
    "Orders, returns, reviews and customer records. Cannot issue refunds or suspend accounts.",
  catalogue: "Products and analytics. No access to orders or customers.",
  manager:
    "Full store operations, including refunds and suspending customers.",
  super_admin: "Everything, including the admin team and store settings.",
};

/** Falls back to the legacy flags for accounts issued before roles existed. */
export const resolveRole = (user?: {
  role?: string | null;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
} | null): AdminRole => {
  if (!user) return "customer";
  const stored = user.role as AdminRole | undefined;
  if (stored && stored !== "customer" && stored in ROLE_PERMISSIONS) {
    return stored;
  }
  if (user.isSuperAdmin) return "super_admin";
  if (user.isAdmin) return "manager";
  return "customer";
};

export const permissionsFor = (role: AdminRole): Permission[] =>
  ROLE_PERMISSIONS[role] ?? [];

export const hasPermission = (
  user: Parameters<typeof resolveRole>[0],
  permission: Permission,
): boolean => permissionsFor(resolveRole(user)).includes(permission);
