import { UserRole, isExecutive, isTechnician } from "./roles";

export type Resource =
  | "users"
  | "roles"
  | "customers"
  | "units"
  | "opportunities"
  | "quotations"
  | "contracts"
  | "work_orders"
  | "spare_parts"
  | "spare_part_requests"
  | "purchase_orders"
  | "vendors"
  | "invoices"
  | "payments"
  | "promises_to_pay"
  | "tasks"
  | "disputes"
  | "notifications"
  | "notes"
  | "audit_log"
  | "settings"
  | "reports"
  | "dashboards"
  | "customer_portal";

export type Action =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "approve"
  | "export"
  | "assign";

export type Scope = "own" | "team" | "department" | "branch" | "region" | "global";

export type Permission = {
  resource: Resource;
  action: Action;
  scope: Scope;
};

export type PermissionContext = {
  userId: string;
  role: UserRole;
  departmentId?: string | null;
  branchId?: string | null;
  managerId?: string | null;
};

export type Target = {
  ownerId?: string | null;
  assigneeIds?: string[];
  departmentId?: string | null;
  branchId?: string | null;
  createdBy?: string | null;
};

const ALL_ACTIONS: Action[] = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "export",
  "assign",
];

const ALL_RESOURCES: Resource[] = [
  "users",
  "roles",
  "customers",
  "units",
  "opportunities",
  "quotations",
  "contracts",
  "work_orders",
  "spare_parts",
  "spare_part_requests",
  "purchase_orders",
  "vendors",
  "invoices",
  "payments",
  "promises_to_pay",
  "tasks",
  "disputes",
  "notifications",
  "notes",
  "audit_log",
  "settings",
  "reports",
  "dashboards",
  "customer_portal",
];

function all(scope: Scope = "global"): Permission[] {
  return ALL_RESOURCES.flatMap((r) =>
    ALL_ACTIONS.map((a) => ({ resource: r, action: a, scope })),
  );
}

function resourceAll(resource: Resource, scope: Scope): Permission[] {
  return ALL_ACTIONS.map((a) => ({ resource, action: a, scope }));
}

function view(resource: Resource, scope: Scope): Permission {
  return { resource, action: "view", scope };
}

function viewEdit(resource: Resource, scope: Scope): Permission[] {
  return [
    { resource, action: "view", scope },
    { resource, action: "edit", scope },
  ];
}

function crud(resource: Resource, scope: Scope): Permission[] {
  return [
    { resource, action: "view", scope },
    { resource, action: "create", scope },
    { resource, action: "edit", scope },
    { resource, action: "delete", scope },
  ];
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // ===== EXECUTIVE TIER (GOD-MODE) =====
  [UserRole.SUPER_ADMIN]: all("global"),
  [UserRole.CHAIRMAN]: all("global"),
  [UserRole.CEO]: all("global"),
  [UserRole.COO]: all("global"),
  [UserRole.CFO]: all("global"),
  [UserRole.CTO]: all("global"),
  [UserRole.CCO]: all("global"),
  [UserRole.CIO]: all("global"),

  // ===== REGIONAL / BRANCH =====
  [UserRole.REGIONAL_DIRECTOR]: all("region"),
  [UserRole.BRANCH_MANAGER]: [
    ...all("branch").filter((p) => p.resource !== "audit_log"),
    view("audit_log", "branch"),
    view("roles", "global"),
  ],
  [UserRole.DEPUTY_BRANCH_MANAGER]: [
    ...all("branch").filter(
      (p) =>
        !(p.resource === "users" && p.action === "delete") &&
        p.resource !== "audit_log" &&
        p.resource !== "roles",
    ),
    view("audit_log", "branch"),
  ],

  // ===== HEADS OF DEPARTMENT =====
  [UserRole.HEAD_OF_SALES]: [
    ...crud("customers", "branch"),
    ...crud("opportunities", "branch"),
    ...crud("quotations", "branch"),
    ...crud("contracts", "branch"),
    ...crud("tasks", "branch"),
    ...crud("disputes", "branch"),
    ...crud("notes", "branch"),
    view("units", "branch"),
    view("invoices", "branch"),
    view("users", "department"),
    { resource: "users", action: "assign", scope: "department" },
    view("dashboards", "branch"),
    view("reports", "branch"),
    { resource: "quotations", action: "approve", scope: "branch" },
  ],
  [UserRole.HEAD_OF_SERVICE]: [
    view("customers", "branch"),
    view("contracts", "branch"),
    ...crud("units", "branch"),
    ...crud("work_orders", "branch"),
    ...crud("spare_part_requests", "branch"),
    ...crud("tasks", "branch"),
    ...crud("disputes", "branch"),
    ...crud("notes", "branch"),
    view("users", "department"),
    { resource: "spare_part_requests", action: "approve", scope: "branch" },
    view("dashboards", "branch"),
    view("reports", "branch"),
  ],
  [UserRole.HEAD_OF_INSTALLATION]: [
    view("customers", "branch"),
    ...crud("units", "branch"),
    ...crud("contracts", "branch"),
    ...crud("work_orders", "branch"),
    ...crud("tasks", "branch"),
    ...crud("disputes", "branch"),
    view("dashboards", "branch"),
  ],
  [UserRole.HEAD_OF_FINANCE]: [
    view("customers", "branch"),
    view("contracts", "branch"),
    ...crud("invoices", "branch"),
    ...crud("payments", "branch"),
    ...crud("purchase_orders", "branch"),
    ...crud("vendors", "branch"),
    ...crud("tasks", "branch"),
    ...crud("disputes", "branch"),
    ...crud("notes", "branch"),
    view("users", "department"),
    { resource: "invoices", action: "approve", scope: "branch" },
    { resource: "purchase_orders", action: "approve", scope: "branch" },
    view("dashboards", "branch"),
    view("reports", "branch"),
    view("audit_log", "branch"),
  ],
  [UserRole.HEAD_OF_COLLECTION]: [
    view("customers", "branch"),
    view("contracts", "branch"),
    view("invoices", "branch"),
    ...crud("payments", "branch"),
    ...crud("promises_to_pay", "branch"),
    ...crud("tasks", "branch"),
    ...crud("disputes", "branch"),
    ...crud("notes", "branch"),
    view("users", "department"),
    { resource: "invoices", action: "edit", scope: "branch" },
    view("dashboards", "branch"),
    view("reports", "branch"),
  ],
  [UserRole.HEAD_OF_PROCUREMENT]: [
    ...crud("purchase_orders", "branch"),
    ...crud("vendors", "branch"),
    ...crud("spare_parts", "branch"),
    view("spare_part_requests", "branch"),
    { resource: "spare_part_requests", action: "approve", scope: "branch" },
    { resource: "purchase_orders", action: "approve", scope: "branch" },
    ...crud("tasks", "branch"),
    ...crud("disputes", "branch"),
    view("dashboards", "branch"),
  ],
  [UserRole.HEAD_OF_WAREHOUSE]: [
    ...crud("spare_parts", "branch"),
    ...crud("spare_part_requests", "branch"),
    view("purchase_orders", "branch"),
    ...crud("tasks", "branch"),
    ...crud("disputes", "branch"),
    view("dashboards", "branch"),
  ],
  [UserRole.HEAD_OF_HR]: [
    ...crud("users", "branch"),
    ...crud("tasks", "branch"),
    ...crud("disputes", "branch"),
    view("dashboards", "branch"),
  ],
  [UserRole.HEAD_OF_CUSTOMER_CARE]: [
    view("customers", "branch"),
    view("units", "branch"),
    view("contracts", "branch"),
    view("work_orders", "branch"),
    ...crud("disputes", "branch"),
    ...crud("tasks", "branch"),
    ...crud("notes", "branch"),
    view("dashboards", "branch"),
  ],
  [UserRole.HEAD_OF_QUALITY]: [
    view("work_orders", "branch"),
    view("disputes", "branch"),
    view("audit_log", "branch"),
    ...crud("tasks", "branch"),
    view("dashboards", "branch"),
  ],
  [UserRole.HEAD_OF_IT]: [
    ...crud("users", "branch"),
    ...crud("settings", "branch"),
    view("audit_log", "branch"),
    ...crud("tasks", "branch"),
    view("dashboards", "branch"),
  ],
  [UserRole.HEAD_OF_MARKETING]: [
    view("customers", "branch"),
    view("opportunities", "branch"),
    view("reports", "branch"),
    ...crud("tasks", "branch"),
    view("dashboards", "branch"),
  ],

  // ===== MANAGERS =====
  [UserRole.SALES_MANAGER]: [
    ...crud("customers", "team"),
    ...crud("opportunities", "team"),
    ...crud("quotations", "team"),
    view("contracts", "team"),
    ...crud("tasks", "team"),
    ...crud("disputes", "team"),
    ...crud("notes", "team"),
    view("units", "branch"),
    view("users", "team"),
    view("dashboards", "team"),
    view("reports", "team"),
  ],
  [UserRole.SERVICE_MANAGER]: [
    view("customers", "branch"),
    view("contracts", "branch"),
    ...crud("units", "branch"),
    ...crud("work_orders", "branch"),
    ...crud("spare_part_requests", "branch"),
    { resource: "spare_part_requests", action: "approve", scope: "branch" },
    ...crud("tasks", "branch"),
    ...crud("disputes", "branch"),
    ...crud("notes", "branch"),
    view("users", "team"),
    { resource: "work_orders", action: "assign", scope: "branch" },
    view("dashboards", "team"),
  ],
  [UserRole.DISPATCH_MANAGER]: [
    view("customers", "branch"),
    view("units", "branch"),
    ...crud("work_orders", "branch"),
    { resource: "work_orders", action: "assign", scope: "branch" },
    ...crud("tasks", "branch"),
    view("users", "team"),
    view("dashboards", "team"),
  ],
  [UserRole.INSTALLATION_MANAGER]: [
    view("customers", "branch"),
    ...crud("units", "team"),
    ...crud("work_orders", "team"),
    ...crud("tasks", "team"),
    view("dashboards", "team"),
  ],
  [UserRole.FINANCE_MANAGER]: [
    view("customers", "branch"),
    ...crud("invoices", "branch"),
    ...crud("payments", "branch"),
    ...crud("purchase_orders", "branch"),
    ...crud("tasks", "branch"),
    view("dashboards", "team"),
  ],
  [UserRole.COLLECTION_MANAGER]: [
    view("customers", "branch"),
    view("invoices", "branch"),
    ...crud("payments", "branch"),
    ...crud("promises_to_pay", "branch"),
    ...crud("tasks", "branch"),
    ...crud("disputes", "branch"),
    ...crud("notes", "branch"),
    view("users", "team"),
    view("dashboards", "team"),
  ],
  [UserRole.PROCUREMENT_MANAGER]: [
    ...crud("purchase_orders", "team"),
    ...crud("vendors", "branch"),
    ...crud("spare_parts", "branch"),
    ...crud("spare_part_requests", "team"),
    ...crud("tasks", "team"),
    view("dashboards", "team"),
  ],
  [UserRole.WAREHOUSE_MANAGER]: [
    ...crud("spare_parts", "branch"),
    ...crud("spare_part_requests", "branch"),
    view("purchase_orders", "branch"),
    ...crud("tasks", "team"),
    view("dashboards", "team"),
  ],
  [UserRole.HR_MANAGER]: [
    ...crud("users", "branch"),
    ...crud("tasks", "team"),
    view("dashboards", "team"),
  ],
  [UserRole.CUSTOMER_CARE_MANAGER]: [
    view("customers", "branch"),
    view("units", "branch"),
    view("work_orders", "branch"),
    ...crud("disputes", "branch"),
    ...crud("tasks", "team"),
    ...crud("notes", "team"),
    view("dashboards", "team"),
  ],
  [UserRole.QUALITY_MANAGER]: [
    view("work_orders", "branch"),
    view("disputes", "branch"),
    ...crud("tasks", "team"),
    view("dashboards", "team"),
  ],
  [UserRole.IT_MANAGER]: [
    ...crud("users", "branch"),
    view("settings", "branch"),
    view("audit_log", "branch"),
    ...crud("tasks", "team"),
    view("dashboards", "team"),
  ],
  [UserRole.PROJECT_MANAGER]: [
    view("customers", "branch"),
    ...crud("units", "team"),
    ...crud("work_orders", "team"),
    ...crud("tasks", "team"),
    ...crud("disputes", "team"),
    view("dashboards", "team"),
  ],

  // ===== SUPERVISORS =====
  [UserRole.SALES_TEAM_LEADER]: [
    ...crud("customers", "team"),
    ...crud("opportunities", "team"),
    ...crud("quotations", "team"),
    ...crud("tasks", "team"),
    ...crud("notes", "team"),
    view("users", "team"),
    view("dashboards", "team"),
  ],
  [UserRole.SERVICE_SUPERVISOR]: [
    view("customers", "branch"),
    view("units", "branch"),
    ...viewEdit("work_orders", "team"),
    { resource: "work_orders", action: "assign", scope: "team" },
    ...crud("spare_part_requests", "team"),
    ...crud("tasks", "team"),
    ...crud("disputes", "team"),
    ...crud("notes", "team"),
    view("users", "team"),
    view("dashboards", "team"),
  ],
  [UserRole.INSTALLATION_SUPERVISOR]: [
    view("customers", "branch"),
    view("units", "team"),
    ...viewEdit("work_orders", "team"),
    ...crud("tasks", "team"),
    view("dashboards", "team"),
  ],
  [UserRole.COLLECTION_SUPERVISOR]: [
    view("customers", "branch"),
    view("invoices", "team"),
    ...crud("payments", "team"),
    ...crud("promises_to_pay", "team"),
    ...crud("tasks", "team"),
    ...crud("disputes", "team"),
    view("dashboards", "team"),
  ],
  [UserRole.ACCOUNTING_SUPERVISOR]: [
    view("invoices", "branch"),
    ...crud("payments", "team"),
    ...crud("tasks", "team"),
    view("dashboards", "team"),
  ],

  // ===== TEAM MEMBERS =====
  [UserRole.SALES_EXECUTIVE]: [
    ...crud("customers", "own"),
    ...crud("opportunities", "own"),
    ...crud("quotations", "own"),
    ...crud("tasks", "own"),
    ...crud("notes", "own"),
    view("contracts", "own"),
    view("invoices", "own"),
    view("units", "branch"),
    view("dashboards", "own"),
  ],
  [UserRole.SALES_ENGINEER]: [
    ...crud("customers", "own"),
    ...crud("opportunities", "own"),
    ...crud("quotations", "own"),
    ...crud("tasks", "own"),
    view("units", "branch"),
    view("dashboards", "own"),
  ],
  [UserRole.ACCOUNT_MANAGER]: [
    ...crud("customers", "own"),
    view("contracts", "own"),
    view("invoices", "own"),
    ...crud("tasks", "own"),
    ...crud("notes", "own"),
    ...crud("disputes", "own"),
    view("dashboards", "own"),
  ],
  [UserRole.SERVICE_TECHNICIAN]: [
    view("customers", "own"),
    view("units", "own"),
    ...viewEdit("work_orders", "own"),
    ...crud("spare_part_requests", "own"),
    ...crud("tasks", "own"),
    ...crud("notes", "own"),
    ...crud("disputes", "own"),
    view("dashboards", "own"),
  ],
  [UserRole.SENIOR_TECHNICIAN]: [
    view("customers", "own"),
    view("units", "own"),
    ...viewEdit("work_orders", "own"),
    ...crud("spare_part_requests", "own"),
    ...crud("tasks", "own"),
    ...crud("notes", "own"),
    ...crud("disputes", "own"),
    view("dashboards", "own"),
  ],
  [UserRole.INSTALLATION_TECHNICIAN]: [
    view("customers", "own"),
    view("units", "own"),
    ...viewEdit("work_orders", "own"),
    ...crud("tasks", "own"),
    view("dashboards", "own"),
  ],
  [UserRole.APPRENTICE_TECHNICIAN]: [
    view("customers", "own"),
    view("units", "own"),
    view("work_orders", "own"),
    ...crud("tasks", "own"),
    view("dashboards", "own"),
  ],
  [UserRole.ACCOUNTANT]: [
    view("customers", "branch"),
    ...crud("invoices", "team"),
    ...crud("payments", "team"),
    ...crud("tasks", "own"),
    view("dashboards", "own"),
  ],
  [UserRole.COLLECTION_OFFICER]: [
    view("customers", "own"),
    view("invoices", "own"),
    ...crud("payments", "own"),
    ...crud("promises_to_pay", "own"),
    ...crud("tasks", "own"),
    ...crud("disputes", "own"),
    ...crud("notes", "own"),
    view("dashboards", "own"),
  ],
  [UserRole.CASHIER]: [
    view("invoices", "branch"),
    ...crud("payments", "own"),
    ...crud("tasks", "own"),
    view("dashboards", "own"),
  ],
  [UserRole.PROCUREMENT_OFFICER]: [
    ...crud("purchase_orders", "own"),
    view("vendors", "branch"),
    view("spare_parts", "branch"),
    view("spare_part_requests", "branch"),
    ...crud("tasks", "own"),
    view("dashboards", "own"),
  ],
  [UserRole.WAREHOUSE_OFFICER]: [
    view("spare_parts", "branch"),
    ...crud("spare_part_requests", "branch"),
    view("purchase_orders", "branch"),
    ...crud("tasks", "own"),
    view("dashboards", "own"),
  ],
  [UserRole.INVENTORY_CLERK]: [
    view("spare_parts", "branch"),
    view("spare_part_requests", "branch"),
    ...crud("tasks", "own"),
    view("dashboards", "own"),
  ],
  [UserRole.CUSTOMER_CARE_AGENT]: [
    view("customers", "branch"),
    view("units", "branch"),
    view("contracts", "branch"),
    view("work_orders", "branch"),
    ...crud("disputes", "own"),
    ...crud("tasks", "own"),
    ...crud("notes", "own"),
    view("dashboards", "own"),
  ],
  [UserRole.DISPATCHER]: [
    view("customers", "branch"),
    view("units", "branch"),
    ...crud("work_orders", "branch"),
    { resource: "work_orders", action: "assign", scope: "branch" },
    ...crud("tasks", "own"),
    view("dashboards", "team"),
  ],
  [UserRole.RECEPTIONIST]: [
    view("customers", "branch"),
    ...crud("tasks", "own"),
    view("dashboards", "own"),
  ],
  [UserRole.HR_OFFICER]: [
    view("users", "branch"),
    ...crud("tasks", "own"),
    view("dashboards", "own"),
  ],
  [UserRole.QA_INSPECTOR]: [
    view("work_orders", "branch"),
    view("disputes", "branch"),
    ...crud("tasks", "own"),
    view("dashboards", "own"),
  ],
  [UserRole.SAFETY_OFFICER]: [
    view("work_orders", "branch"),
    ...crud("disputes", "own"),
    ...crud("tasks", "own"),
    view("dashboards", "own"),
  ],
  [UserRole.IT_SUPPORT]: [
    view("users", "branch"),
    ...crud("tasks", "own"),
    view("dashboards", "own"),
  ],
  [UserRole.DATA_ANALYST]: [
    view("customers", "branch"),
    view("units", "branch"),
    view("work_orders", "branch"),
    view("invoices", "branch"),
    view("dashboards", "branch"),
    view("reports", "branch"),
  ],

  // ===== CUSTOMER =====
  [UserRole.CUSTOMER]: [
    view("customer_portal", "own"),
    view("units", "own"),
    view("contracts", "own"),
    view("work_orders", "own"),
    view("invoices", "own"),
    ...crud("disputes", "own"),
  ],
};

export function hasPermission(
  ctx: PermissionContext,
  resource: Resource,
  action: Action,
  target?: Target,
): boolean {
  if (ctx.role === UserRole.SUPER_ADMIN) return true;

  const perms = ROLE_PERMISSIONS[ctx.role] ?? [];
  const match = perms.filter((p) => p.resource === resource && p.action === action);
  if (match.length === 0) return false;

  return match.some((p) => satisfiesScope(ctx, p.scope, target));
}

function satisfiesScope(
  ctx: PermissionContext,
  scope: Scope,
  target?: Target,
): boolean {
  switch (scope) {
    case "global":
      return true;
    case "region":
      return isExecutive(ctx.role) || !!ctx.branchId;
    case "branch":
      if (!target?.branchId) return true;
      return ctx.branchId === target.branchId;
    case "department":
      if (!target?.departmentId) return !!ctx.departmentId;
      return ctx.departmentId === target.departmentId;
    case "team":
      if (!target) return true;
      return (
        target.ownerId === ctx.userId ||
        (target.assigneeIds ?? []).includes(ctx.userId) ||
        target.createdBy === ctx.userId ||
        ctx.departmentId === target.departmentId
      );
    case "own":
      if (!target) return true;
      return (
        target.ownerId === ctx.userId ||
        (target.assigneeIds ?? []).includes(ctx.userId) ||
        target.createdBy === ctx.userId
      );
    default:
      return false;
  }
}

export function can(ctx: PermissionContext, resource: Resource, action: Action): boolean {
  return hasPermission(ctx, resource, action);
}

export function getPermittedResources(ctx: PermissionContext): Resource[] {
  if (ctx.role === UserRole.SUPER_ADMIN) return ALL_RESOURCES;
  const perms = ROLE_PERMISSIONS[ctx.role] ?? [];
  return [...new Set(perms.filter((p) => p.action === "view").map((p) => p.resource))];
}

export { isTechnician };
