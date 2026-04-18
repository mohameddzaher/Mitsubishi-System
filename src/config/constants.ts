export const APP = {
  name: "MELSA Mecca",
  longName: "Mitsubishi Electric Saudi — Makkah Regional Office",
  shortName: "MELSA",
  tagline: "Elevators, Escalators & Moving Walks",
  branchCode: "MKK",
  branchName: "Makkah",
  supportPhone: "8001282828",
  companyEstablished: 1980,
} as const;

export const VAT_RATE = 0.15;
export const CURRENCY = "SAR";
export const DEFAULT_LOCALE = "en";
export const LOCALES = ["en", "ar"] as const;

export const DATE_FORMAT = "dd MMM yyyy";
export const DATETIME_FORMAT = "dd MMM yyyy HH:mm";
export const TIME_FORMAT = "HH:mm";

export const MAKKAH_CENTER = { lat: 21.3891, lng: 39.8579 };

export const CONTRACT_TYPES = [
  "amc_comprehensive",
  "amc_non_comprehensive",
  "amc_semi",
  "installation",
  "modernization",
  "one_time_repair",
] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  amc_comprehensive: "AMC Comprehensive",
  amc_non_comprehensive: "AMC Non-Comprehensive",
  amc_semi: "AMC Semi-Comprehensive",
  installation: "New Installation",
  modernization: "Modernization",
  one_time_repair: "One-Time Repair",
};

export const CUSTOMER_STATUSES = [
  "lead",
  "qualified",
  "quotation_sent",
  "negotiating",
  "active",
  "on_hold",
  "churned",
] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  lead: "Lead",
  qualified: "Qualified",
  quotation_sent: "Quotation Sent",
  negotiating: "Negotiating",
  active: "Active",
  on_hold: "On Hold",
  churned: "Churned",
};

export const CUSTOMER_STATUS_COLORS: Record<CustomerStatus, string> = {
  lead: "var(--color-info)",
  qualified: "var(--color-chart-5)",
  quotation_sent: "var(--color-chart-3)",
  negotiating: "var(--color-warning)",
  active: "var(--color-success)",
  on_hold: "var(--color-text-muted)",
  churned: "var(--color-danger)",
};

export const CUSTOMER_TYPES = [
  "individual",
  "company",
  "government",
  "vip",
  "mosque",
  "hotel",
  "mall",
  "hospital",
  "residential",
  "mixed_use",
] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  individual: "Individual",
  company: "Company",
  government: "Government",
  vip: "VIP",
  mosque: "Mosque",
  hotel: "Hotel",
  mall: "Mall",
  hospital: "Hospital",
  residential: "Residential",
  mixed_use: "Mixed Use",
};

export const UNIT_TYPES = [
  "passenger",
  "freight",
  "hospital",
  "observation",
  "service",
  "home",
  "escalator",
  "moving_walk",
] as const;
export type UnitType = (typeof UNIT_TYPES)[number];

export const UNIT_STATUSES = [
  "operational",
  "under_maintenance",
  "breakdown",
  "decommissioned",
  "modernization",
] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];

export const UNIT_STATUS_COLORS: Record<UnitStatus, string> = {
  operational: "var(--color-success)",
  under_maintenance: "var(--color-warning)",
  breakdown: "var(--color-danger)",
  decommissioned: "var(--color-text-muted)",
  modernization: "var(--color-info)",
};

export const MITSUBISHI_MODELS = [
  "NEXIEZ-MR",
  "NEXIEZ-MRL",
  "GPM-III",
  "Elenessa",
  "Diamond Trac",
  "Series J Escalator",
  "Series Z Escalator",
  "Moving Walk TXE",
];

export const WO_TYPES = [
  "preventive",
  "corrective",
  "emergency",
  "inspection",
  "installation",
  "modernization",
  "safety_test",
  "follow_up",
] as const;
export type WorkOrderType = (typeof WO_TYPES)[number];

export const WO_TYPE_LABELS: Record<WorkOrderType, string> = {
  preventive: "Preventive",
  corrective: "Corrective",
  emergency: "Emergency",
  inspection: "Inspection",
  installation: "Installation",
  modernization: "Modernization",
  safety_test: "Safety Test",
  follow_up: "Follow-up",
};

export const WO_STATUSES = [
  "scheduled",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
  "rescheduled",
] as const;
export type WorkOrderStatus = (typeof WO_STATUSES)[number];

export const PRIORITIES = ["critical", "high", "medium", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_COLORS: Record<Priority, string> = {
  critical: "var(--color-danger)",
  high: "var(--color-warning)",
  medium: "var(--color-info)",
  low: "var(--color-text-muted)",
};

export const INVOICE_STATUSES = [
  "draft",
  "issued",
  "sent",
  "viewed",
  "partially_paid",
  "paid",
  "overdue",
  "voided",
  "written_off",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: "var(--color-text-muted)",
  issued: "var(--color-info)",
  sent: "var(--color-info)",
  viewed: "var(--color-chart-5)",
  partially_paid: "var(--color-warning)",
  paid: "var(--color-success)",
  overdue: "var(--color-danger)",
  voided: "var(--color-text-disabled)",
  written_off: "var(--color-text-disabled)",
};

export const SPARE_REQUEST_STATUSES = [
  "pending_manager_approval",
  "approved",
  "rejected",
  "routed_to_warehouse",
  "po_created",
  "ordered",
  "received",
  "ready_for_pickup",
  "delivered",
  "installed",
] as const;
export type SparePartRequestStatus = (typeof SPARE_REQUEST_STATUSES)[number];

export const SLA_MINUTES = {
  emergency: 60,
  critical: 120,
  high: 240,
  medium: 480,
  low: 1440,
} as const;

export const MAKKAH_DISTRICTS = [
  { name: "Al-Aziziyah", lat: 21.4225, lng: 39.8262 },
  { name: "Al-Misfalah", lat: 21.4166, lng: 39.8241 },
  { name: "Al-Shubaika", lat: 21.4208, lng: 39.8209 },
  { name: "Ajyad", lat: 21.4203, lng: 39.8252 },
  { name: "Al-Awali", lat: 21.3696, lng: 39.896 },
  { name: "Al-Rusaifah", lat: 21.4506, lng: 39.8289 },
  { name: "Al-Zahir", lat: 21.4333, lng: 39.815 },
  { name: "Jarwal", lat: 21.4306, lng: 39.8225 },
  { name: "Al-Haram", lat: 21.4225, lng: 39.8262 },
  { name: "Al-Kaakia", lat: 21.4158, lng: 39.8308 },
  { name: "Al-Shisha", lat: 21.4269, lng: 39.8033 },
  { name: "Jabal Al-Nour", lat: 21.4558, lng: 39.8608 },
  { name: "Al-Taneem", lat: 21.4572, lng: 39.7814 },
  { name: "Al-Mansour", lat: 21.4381, lng: 39.835 },
  { name: "Batha Quraish", lat: 21.4058, lng: 39.8397 },
];
