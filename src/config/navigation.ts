import type { Resource } from "./permissions";
import { UserRole } from "./roles";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  resource?: Resource;
  badge?: "count" | "alert";
  section?: string;
  roles?: UserRole[];
  children?: NavItem[];
};

export const NAV: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "LayoutDashboard",
    resource: "dashboards",
  },
  {
    section: "Commercial",
    label: "Customers",
    href: "/customers",
    icon: "Users",
    resource: "customers",
  },
  {
    section: "Commercial",
    label: "Units",
    href: "/units",
    icon: "Building2",
    resource: "units",
  },
  {
    section: "Commercial",
    label: "Sales Pipeline",
    href: "/sales/opportunities",
    icon: "TrendingUp",
    resource: "opportunities",
  },
  {
    section: "Commercial",
    label: "Quotations",
    href: "/sales/quotations",
    icon: "FileText",
    resource: "quotations",
  },
  {
    section: "Commercial",
    label: "Contracts",
    href: "/contracts",
    icon: "FileSignature",
    resource: "contracts",
  },
  {
    section: "Service",
    label: "My Day",
    href: "/service/my-day",
    icon: "CalendarCheck",
    roles: [
      UserRole.SERVICE_TECHNICIAN,
      UserRole.SENIOR_TECHNICIAN,
      UserRole.INSTALLATION_TECHNICIAN,
      UserRole.APPRENTICE_TECHNICIAN,
    ],
  },
  {
    section: "Service",
    label: "Monthly Planner",
    href: "/service/schedule",
    icon: "CalendarDays",
    resource: "work_orders",
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.CHAIRMAN,
      UserRole.CEO,
      UserRole.BRANCH_MANAGER,
      UserRole.HEAD_OF_SERVICE,
      UserRole.SERVICE_MANAGER,
      UserRole.DISPATCH_MANAGER,
      UserRole.SERVICE_SUPERVISOR,
    ],
  },
  {
    section: "Service",
    label: "Dispatch",
    href: "/service/dispatch",
    icon: "Radio",
    resource: "work_orders",
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.CHAIRMAN,
      UserRole.CEO,
      UserRole.BRANCH_MANAGER,
      UserRole.HEAD_OF_SERVICE,
      UserRole.SERVICE_MANAGER,
      UserRole.DISPATCH_MANAGER,
      UserRole.DISPATCHER,
    ],
  },
  {
    section: "Service",
    label: "Work Orders",
    href: "/service/work-orders",
    icon: "Wrench",
    resource: "work_orders",
  },
  {
    section: "Parts & Inventory",
    label: "Spare Part Requests",
    href: "/spare-parts/requests",
    icon: "PackageSearch",
    resource: "spare_part_requests",
  },
  {
    section: "Parts & Inventory",
    label: "Inventory",
    href: "/spare-parts/inventory",
    icon: "Package",
    resource: "spare_parts",
  },
  {
    section: "Parts & Inventory",
    label: "Procurement",
    href: "/spare-parts/procurement",
    icon: "Truck",
    resource: "purchase_orders",
  },
  {
    section: "Finance",
    label: "Invoices",
    href: "/finance/invoices",
    icon: "Receipt",
    resource: "invoices",
  },
  {
    section: "Finance",
    label: "Collection",
    href: "/finance/collection",
    icon: "Coins",
    resource: "payments",
  },
  {
    section: "Finance",
    label: "Payments",
    href: "/finance/payments",
    icon: "Wallet",
    resource: "payments",
  },
  {
    section: "Collaboration",
    label: "Tasks",
    href: "/tasks",
    icon: "CheckSquare",
    resource: "tasks",
  },
  {
    section: "Collaboration",
    label: "Disputes",
    href: "/disputes",
    icon: "AlertTriangle",
    resource: "disputes",
  },
  {
    section: "Insights",
    label: "Reports",
    href: "/reports",
    icon: "BarChart3",
    resource: "reports",
  },
  {
    section: "Insights",
    label: "Customer Health",
    href: "/customers/health",
    icon: "HeartPulse",
    resource: "customers",
  },
  {
    section: "Insights",
    label: "Modernization",
    href: "/units/modernization",
    icon: "TrendingUp",
    resource: "units",
  },
  {
    section: "Insights",
    label: "Warranty Tracker",
    href: "/units/warranty",
    icon: "Shield",
    resource: "units",
  },
  {
    section: "Insights",
    label: "Audit Log",
    href: "/settings/audit-log",
    icon: "ScrollText",
    resource: "audit_log",
  },
  {
    section: "Collaboration",
    label: "Announcements",
    href: "/announcements",
    icon: "Megaphone",
  },
  {
    section: "Administration",
    label: "Team",
    href: "/settings/users",
    icon: "UsersRound",
    resource: "users",
  },
  {
    section: "Administration",
    label: "Settings",
    href: "/settings",
    icon: "Settings",
    resource: "settings",
  },
];

export const CUSTOMER_PORTAL_NAV: NavItem[] = [
  { label: "Home", href: "/portal", icon: "Home" },
  { label: "My Units", href: "/portal/units", icon: "Building2" },
  { label: "Visits", href: "/portal/visits", icon: "CalendarCheck" },
  { label: "Invoices", href: "/portal/invoices", icon: "Receipt" },
  { label: "Support", href: "/portal/support", icon: "Headset" },
];
