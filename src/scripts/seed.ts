/* eslint-disable no-console */
import mongoose from "mongoose";
import * as argon2 from "argon2";
import { connectDB, disconnectDB } from "@/lib/db";
import {
  Branch,
  Department,
  Team,
  User,
  Customer,
  Unit,
  Opportunity,
  Quotation,
  Contract,
  WorkOrder,
  SparePart,
  SparePartRequest,
  Vendor,
  PurchaseOrder,
  Invoice,
  Payment,
  PromiseToPay,
  Task,
  Dispute,
  Notification,
  Note,
  AuditLog,
  Setting,
} from "@/models";
import { UserRole } from "@/config/roles";
import {
  MAKKAH_DISTRICTS,
  MITSUBISHI_MODELS,
  VAT_RATE,
} from "@/config/constants";

const RESET = process.argv.includes("--reset");
const DEMO_PASSWORD = "Melsa@2026!";

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function pad(n: number, w: number) {
  return String(n).padStart(w, "0");
}

const COMPANY_NAME_PARTS_1 = [
  "Al-Haram", "Al-Aziziyah", "Makkah", "Al-Misfalah", "Jabal Al-Nour", "Al-Rusaifah",
  "Al-Awali", "Al-Shubaika", "Ajyad", "Al-Kaakia", "Al-Shisha", "Al-Mansour",
  "Al-Hidayah", "Al-Noor", "Al-Rawdah", "Al-Safwa", "Al-Marwa", "Al-Zahra",
  "Al-Falah", "Grand", "Royal", "Pearl", "Emerald", "Diamond", "Crystal",
  "Continental", "Prestige", "Heritage", "Premier", "Elite",
];

const COMPANY_NAME_PARTS_2 = [
  "Towers", "Heights", "Plaza", "Mall", "Hotel", "Residential", "Complex",
  "Business Park", "Medical Center", "Clinic", "Hospital", "Office Tower",
  "Group", "Holdings", "Co.", "LLC", "Trading", "Investment", "Hospitality",
  "Properties", "Development", "Square", "Gardens", "Village", "Resort",
];

const SAUDI_FIRST_NAMES_MALE = [
  "Ahmed", "Mohammed", "Abdullah", "Khalid", "Saeed", "Faisal", "Omar", "Ali",
  "Yousef", "Ibrahim", "Hassan", "Hussein", "Bandar", "Sultan", "Majed",
  "Turki", "Nasser", "Saad", "Fahad", "Waleed", "Tariq", "Rakan",
];

const NON_SAUDI_FIRST_NAMES = [
  "Raj", "Vikram", "Anil", "Sanjay", "Rahul", "Hamza", "Farooq", "Junaid",
  "Mikhail", "Alessandro", "Carlos", "Miguel", "James", "David",
];

const LAST_NAMES = [
  "Al-Harbi", "Al-Ghamdi", "Al-Zahrani", "Al-Shehri", "Al-Mutairi", "Al-Qahtani",
  "Al-Otaibi", "Al-Dosari", "Al-Rashidi", "Al-Sulaiman", "Al-Sharif", "Al-Malki",
  "Ahmed", "Khan", "Hussain", "Siddique", "Sharma", "Patel", "Smith", "Johnson",
];

// Fixed technician identities so tech1…tech25 always map to the same person
// across re-seeds. tech1 is the demo technician surfaced on the login page.
const TECHNICIAN_IDENTITIES: Array<{ first: string; last: string }> = [
  { first: "Omar",       last: "Al-Rashidi"  }, // tech1  (demo)
  { first: "Khalid",     last: "Al-Dosari"   }, // tech2
  { first: "Faisal",     last: "Al-Qahtani"  }, // tech3
  { first: "Ahmed",      last: "Al-Harbi"    }, // tech4
  { first: "Mohammed",   last: "Al-Ghamdi"   }, // tech5
  { first: "Abdullah",   last: "Al-Zahrani"  }, // tech6
  { first: "Saeed",      last: "Al-Shehri"   }, // tech7
  { first: "Yousef",     last: "Al-Mutairi"  }, // tech8
  { first: "Ibrahim",    last: "Al-Otaibi"   }, // tech9
  { first: "Hassan",     last: "Al-Sulaiman" }, // tech10
  { first: "Hussein",    last: "Al-Sharif"   }, // tech11
  { first: "Bandar",     last: "Al-Malki"    }, // tech12
  { first: "Sultan",     last: "Al-Harbi"    }, // tech13
  { first: "Majed",      last: "Al-Ghamdi"   }, // tech14
  { first: "Turki",      last: "Al-Zahrani"  }, // tech15
  { first: "Nasser",     last: "Al-Shehri"   }, // tech16
  { first: "Saad",       last: "Al-Mutairi"  }, // tech17
  { first: "Fahad",      last: "Al-Qahtani"  }, // tech18
  { first: "Waleed",     last: "Al-Otaibi"   }, // tech19
  { first: "Tariq",      last: "Al-Dosari"   }, // tech20
  { first: "Rakan",      last: "Al-Rashidi"  }, // tech21
  { first: "Raj",        last: "Sharma"      }, // tech22
  { first: "Vikram",     last: "Patel"       }, // tech23
  { first: "Farooq",     last: "Khan"        }, // tech24
  { first: "Junaid",     last: "Hussain"     }, // tech25
];

async function reset() {
  console.log("⚠️  Resetting all collections...");
  await Promise.all([
    Branch.deleteMany({}),
    Department.deleteMany({}),
    Team.deleteMany({}),
    User.deleteMany({}),
    Customer.deleteMany({}),
    Unit.deleteMany({}),
    Opportunity.deleteMany({}),
    Quotation.deleteMany({}),
    Contract.deleteMany({}),
    WorkOrder.deleteMany({}),
    SparePart.deleteMany({}),
    SparePartRequest.deleteMany({}),
    Vendor.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    Invoice.deleteMany({}),
    Payment.deleteMany({}),
    PromiseToPay.deleteMany({}),
    Task.deleteMany({}),
    Dispute.deleteMany({}),
    Notification.deleteMany({}),
    Note.deleteMany({}),
    AuditLog.deleteMany({}),
    Setting.deleteMany({}),
  ]);
  console.log("✓ Cleared");
}

async function main() {
  console.log("🌱 MELSA Mecca seed starting...");
  await connectDB();

  if (RESET) await reset();

  // Check if already seeded
  const existingBranch = await Branch.findOne({ code: "MKK" });
  if (existingBranch && !RESET) {
    console.log("⚠️  Database already seeded. Run with --reset to reseed.");
    await disconnectDB();
    return;
  }

  const passwordHash = await argon2.hash(DEMO_PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  // ============ BRANCH & DEPARTMENTS ============
  console.log("→ Creating branch & departments");
  const branch = await Branch.create({
    name: "Makkah Regional Office",
    code: "MKK",
    city: "Makkah",
    region: "Makkah Province",
    address: "Al-Aziziyah District, Makkah Al-Mukarramah, Saudi Arabia",
    phone: "8001282828",
    email: "makkah@melsa-mkk.com",
    latitude: 21.3891,
    longitude: 39.8579,
    isHeadquarters: false,
  });

  const deptDefs = [
    { name: "Executive", code: "EXEC" },
    { name: "Sales & Business Development", code: "SALES" },
    { name: "Service & Maintenance", code: "SERVICE" },
    { name: "Installation", code: "INSTALL" },
    { name: "Finance & Accounting", code: "FIN" },
    { name: "Collection", code: "COLL" },
    { name: "Procurement", code: "PROC" },
    { name: "Warehouse & Inventory", code: "WH" },
    { name: "Customer Care & Dispatch", code: "CC" },
    { name: "Quality & Safety", code: "QS" },
    { name: "Human Resources", code: "HR" },
    { name: "IT & Systems", code: "IT" },
  ];
  const depts = await Department.insertMany(
    deptDefs.map((d) => ({ ...d, branchId: branch._id })),
  );
  const deptByCode = new Map(depts.map((d) => [d.code, d]));

  // ============ USERS ============
  console.log("→ Creating users");
  const allUsers: Array<{
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    employeeId: string;
    deptCode?: string;
    managerId?: mongoose.Types.ObjectId;
  }> = [];

  // Super admin
  allUsers.push({
    email: "admin@melsa-mkk.com",
    firstName: "Ahmed",
    lastName: "Al-Rashid",
    role: UserRole.SUPER_ADMIN,
    employeeId: "EMP-00001",
    deptCode: "EXEC",
  });

  // Branch manager
  allUsers.push({
    email: "branch.manager@melsa-mkk.com",
    firstName: "Khalid",
    lastName: "Al-Harbi",
    role: UserRole.BRANCH_MANAGER,
    employeeId: "EMP-00002",
    deptCode: "EXEC",
  });

  // Heads
  const heads: Array<{ email: string; first: string; last: string; role: UserRole; deptCode: string }> = [
    { email: "sales.head@melsa-mkk.com", first: "Faisal", last: "Al-Ghamdi", role: UserRole.HEAD_OF_SALES, deptCode: "SALES" },
    { email: "service.head@melsa-mkk.com", first: "Saeed", last: "Al-Zahrani", role: UserRole.HEAD_OF_SERVICE, deptCode: "SERVICE" },
    { email: "finance.head@melsa-mkk.com", first: "Mohammed", last: "Al-Shehri", role: UserRole.HEAD_OF_FINANCE, deptCode: "FIN" },
    { email: "collection.head@melsa-mkk.com", first: "Abdullah", last: "Al-Mutairi", role: UserRole.HEAD_OF_COLLECTION, deptCode: "COLL" },
    { email: "procurement.head@melsa-mkk.com", first: "Bandar", last: "Al-Qahtani", role: UserRole.HEAD_OF_PROCUREMENT, deptCode: "PROC" },
  ];
  let empCounter = 3;
  heads.forEach((h) => {
    allUsers.push({
      email: h.email,
      firstName: h.first,
      lastName: h.last,
      role: h.role,
      employeeId: `EMP-${pad(empCounter++, 5)}`,
      deptCode: h.deptCode,
    });
  });

  // Managers
  const managers: Array<{ email: string; first: string; last: string; role: UserRole; deptCode: string }> = [
    { email: "sales.manager@melsa-mkk.com", first: "Sultan", last: "Al-Otaibi", role: UserRole.SALES_MANAGER, deptCode: "SALES" },
    { email: "service.manager@melsa-mkk.com", first: "Omar", last: "Al-Dosari", role: UserRole.SERVICE_MANAGER, deptCode: "SERVICE" },
    { email: "dispatch.manager@melsa-mkk.com", first: "Tariq", last: "Al-Rashidi", role: UserRole.DISPATCH_MANAGER, deptCode: "CC" },
    { email: "install.manager@melsa-mkk.com", first: "Nasser", last: "Al-Sulaiman", role: UserRole.INSTALLATION_MANAGER, deptCode: "INSTALL" },
    { email: "finance.manager@melsa-mkk.com", first: "Majed", last: "Al-Sharif", role: UserRole.FINANCE_MANAGER, deptCode: "FIN" },
    { email: "collection.manager@melsa-mkk.com", first: "Waleed", last: "Al-Malki", role: UserRole.COLLECTION_MANAGER, deptCode: "COLL" },
    { email: "procurement.manager@melsa-mkk.com", first: "Rakan", last: "Al-Harbi", role: UserRole.PROCUREMENT_MANAGER, deptCode: "PROC" },
    { email: "warehouse.manager@melsa-mkk.com", first: "Turki", last: "Al-Ghamdi", role: UserRole.WAREHOUSE_MANAGER, deptCode: "WH" },
    { email: "cc.manager@melsa-mkk.com", first: "Yousef", last: "Al-Zahrani", role: UserRole.CUSTOMER_CARE_MANAGER, deptCode: "CC" },
    { email: "hr.manager@melsa-mkk.com", first: "Ibrahim", last: "Al-Shehri", role: UserRole.HR_MANAGER, deptCode: "HR" },
  ];
  managers.forEach((m) => {
    allUsers.push({
      email: m.email,
      firstName: m.first,
      lastName: m.last,
      role: m.role,
      employeeId: `EMP-${pad(empCounter++, 5)}`,
      deptCode: m.deptCode,
    });
  });

  // Supervisors
  const supervisors = [
    { email: "service.super1@melsa-mkk.com", first: "Hassan", last: "Al-Mutairi", role: UserRole.SERVICE_SUPERVISOR, deptCode: "SERVICE" },
    { email: "service.super2@melsa-mkk.com", first: "Hussein", last: "Al-Qahtani", role: UserRole.SERVICE_SUPERVISOR, deptCode: "SERVICE" },
    { email: "sales.leader1@melsa-mkk.com", first: "Saad", last: "Al-Otaibi", role: UserRole.SALES_TEAM_LEADER, deptCode: "SALES" },
    { email: "collection.super@melsa-mkk.com", first: "Fahad", last: "Al-Dosari", role: UserRole.COLLECTION_SUPERVISOR, deptCode: "COLL" },
  ];
  supervisors.forEach((s) => {
    allUsers.push({
      email: s.email,
      firstName: s.first,
      lastName: s.last,
      role: s.role,
      employeeId: `EMP-${pad(empCounter++, 5)}`,
      deptCode: s.deptCode,
    });
  });

  // Technicians (25) — fixed identities so tech1…tech25 always map to the same
  // person across re-seeds. Required for the demo flow: Service Manager assigns
  // a visit to "Omar Al-Rashidi" → the tech1 login sees it on /service/my-day.
  for (let i = 1; i <= 25; i++) {
    const identity = TECHNICIAN_IDENTITIES[i - 1]!;
    const seniorRole =
      i <= 3 ? UserRole.SENIOR_TECHNICIAN : i >= 22 ? UserRole.APPRENTICE_TECHNICIAN : UserRole.SERVICE_TECHNICIAN;
    allUsers.push({
      email: `tech${i}@melsa-mkk.com`,
      firstName: identity.first,
      lastName: identity.last,
      role: seniorRole,
      employeeId: `EMP-${pad(empCounter++, 5)}`,
      deptCode: "SERVICE",
    });
  }

  // Sales executives (8)
  for (let i = 1; i <= 8; i++) {
    allUsers.push({
      email: `sales${i}@melsa-mkk.com`,
      firstName: rand(SAUDI_FIRST_NAMES_MALE),
      lastName: rand(LAST_NAMES),
      role: i <= 2 ? UserRole.SALES_ENGINEER : UserRole.SALES_EXECUTIVE,
      employeeId: `EMP-${pad(empCounter++, 5)}`,
      deptCode: "SALES",
    });
  }

  // Collection officers (4)
  for (let i = 1; i <= 4; i++) {
    allUsers.push({
      email: `collection${i}@melsa-mkk.com`,
      firstName: rand(SAUDI_FIRST_NAMES_MALE),
      lastName: rand(LAST_NAMES),
      role: UserRole.COLLECTION_OFFICER,
      employeeId: `EMP-${pad(empCounter++, 5)}`,
      deptCode: "COLL",
    });
  }

  // Customer Care (3)
  for (let i = 1; i <= 3; i++) {
    allUsers.push({
      email: `cc${i}@melsa-mkk.com`,
      firstName: rand(SAUDI_FIRST_NAMES_MALE),
      lastName: rand(LAST_NAMES),
      role: i === 1 ? UserRole.DISPATCHER : UserRole.CUSTOMER_CARE_AGENT,
      employeeId: `EMP-${pad(empCounter++, 5)}`,
      deptCode: "CC",
    });
  }

  // Accountants (2)
  for (let i = 1; i <= 2; i++) {
    allUsers.push({
      email: `accountant${i}@melsa-mkk.com`,
      firstName: rand(SAUDI_FIRST_NAMES_MALE),
      lastName: rand(LAST_NAMES),
      role: UserRole.ACCOUNTANT,
      employeeId: `EMP-${pad(empCounter++, 5)}`,
      deptCode: "FIN",
    });
  }

  // Warehouse officer
  allUsers.push({
    email: "warehouse.officer@melsa-mkk.com",
    firstName: "Abdullah",
    lastName: "Al-Sulaiman",
    role: UserRole.WAREHOUSE_OFFICER,
    employeeId: `EMP-${pad(empCounter++, 5)}`,
    deptCode: "WH",
  });

  // Procurement officer
  allUsers.push({
    email: "procurement.officer@melsa-mkk.com",
    firstName: "Mohammed",
    lastName: "Al-Shehri",
    role: UserRole.PROCUREMENT_OFFICER,
    employeeId: `EMP-${pad(empCounter++, 5)}`,
    deptCode: "PROC",
  });

  const insertedUsers = await User.insertMany(
    allUsers.map((u) => ({
      email: u.email,
      phone: `+9665${randInt(10000000, 99999999)}`,
      passwordHash,
      employeeId: u.employeeId,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      departmentId: u.deptCode ? deptByCode.get(u.deptCode)?._id : undefined,
      branchId: branch._id,
      status: "active",
      preferences: {
        theme: "dark",
        notifications: { email: true, push: true, inApp: true },
        language: "en",
        timezone: "Asia/Riyadh",
      },
    })),
  );
  console.log(`✓ ${insertedUsers.length} users`);

  const userByEmail = new Map(insertedUsers.map((u) => [u.email, u]));
  const superAdmin = userByEmail.get("admin@melsa-mkk.com")!;
  const branchManager = userByEmail.get("branch.manager@melsa-mkk.com")!;
  const salesHead = userByEmail.get("sales.head@melsa-mkk.com")!;
  const salesManager = userByEmail.get("sales.manager@melsa-mkk.com")!;
  const serviceHead = userByEmail.get("service.head@melsa-mkk.com")!;
  const serviceManager = userByEmail.get("service.manager@melsa-mkk.com")!;
  const dispatcher = userByEmail.get("cc1@melsa-mkk.com")!;
  const warehouseOfficer = userByEmail.get("warehouse.officer@melsa-mkk.com")!;
  const procurementOfficer = userByEmail.get("procurement.officer@melsa-mkk.com")!;
  const financeHead = userByEmail.get("finance.head@melsa-mkk.com")!;
  const collectionManager = userByEmail.get("collection.manager@melsa-mkk.com")!;

  const technicians = insertedUsers.filter((u) =>
    [UserRole.SERVICE_TECHNICIAN, UserRole.SENIOR_TECHNICIAN, UserRole.APPRENTICE_TECHNICIAN].includes(u.role as UserRole),
  );
  const salesExecutives = insertedUsers.filter((u) =>
    [UserRole.SALES_EXECUTIVE, UserRole.SALES_ENGINEER].includes(u.role as UserRole),
  );
  const collectionOfficers = insertedUsers.filter(
    (u) => u.role === UserRole.COLLECTION_OFFICER,
  );
  const supervisorUsers = insertedUsers.filter((u) => u.role === UserRole.SERVICE_SUPERVISOR);

  // Set branch manager
  await Branch.updateOne({ _id: branch._id }, { $set: { managerId: branchManager._id } });

  // Set dept heads
  await Department.updateOne({ _id: deptByCode.get("SALES")!._id }, { $set: { headId: salesHead._id } });
  await Department.updateOne({ _id: deptByCode.get("SERVICE")!._id }, { $set: { headId: serviceHead._id } });
  await Department.updateOne({ _id: deptByCode.get("FIN")!._id }, { $set: { headId: financeHead._id } });

  // ============ VENDORS ============
  console.log("→ Creating vendors");
  const vendors = await Vendor.insertMany([
    { code: "V-001", name: "Mitsubishi Electric HQ (Tokyo)", contactName: "Tanaka-san", phone: "+81-3-0000-0000", email: "parts@mitsubishi.jp", paymentTerms: "Net 60", rating: 5, avgLeadTimeDays: 30, branchId: branch._id },
    { code: "V-002", name: "Al-Riyadh Elevator Parts", contactName: "Khalid Al-Turki", phone: "+966-11-0000-000", email: "sales@rep.sa", paymentTerms: "Net 30", rating: 4, avgLeadTimeDays: 7, branchId: branch._id },
    { code: "V-003", name: "Gulf Industrial Supplies", contactName: "Raj Kumar", phone: "+966-12-0000-000", email: "info@gis.com", paymentTerms: "Net 45", rating: 4, avgLeadTimeDays: 14, branchId: branch._id },
    { code: "V-004", name: "Jeddah Hardware Trading", contactName: "Ahmed Al-Mansouri", phone: "+966-12-5000-000", paymentTerms: "Net 15", rating: 3, avgLeadTimeDays: 5, branchId: branch._id },
  ]);

  // ============ SPARE PARTS ============
  console.log("→ Creating spare parts catalog");
  const spareCategories = [
    { cat: "motor", names: ["Traction Motor", "Gearless Hoist Motor", "AC Drive Motor", "Brake Motor"] },
    { cat: "controller", names: ["Main Control Board", "Door Control Unit", "LCD Display Module", "Safety Circuit Board"] },
    { cat: "door", names: ["Door Roller", "Door Operator", "Door Interlock", "Door Shoe", "Door Sill"] },
    { cat: "safety", names: ["Overspeed Governor", "Safety Gear", "Buffer Oil", "Emergency Brake", "Limit Switch"] },
    { cat: "cable", names: ["Traveling Cable 24C", "Hoist Rope 10mm", "Compensating Chain", "Signal Cable"] },
    { cat: "sensor", names: ["Photo Eye", "Load Weigher", "Encoder", "Position Sensor"] },
    { cat: "lighting", names: ["LED Cabin Light", "Emergency Light", "Floor Indicator"] },
    { cat: "interior", names: ["Stainless Steel Panel", "Handrail", "Ceiling Panel", "Floor Mat"] },
    { cat: "consumable", names: ["Gear Oil 5L", "Grease Cartridge", "Cleaning Agent", "Polish"] },
    { cat: "electronic", names: ["VFD Unit", "Relay", "Contactor", "Fuse Pack"] },
    { cat: "mechanical", names: ["Sheave Bearing", "Guide Shoe", "Counterweight Filler"] },
  ];

  const spareParts: Array<typeof SparePart.prototype> = [];
  let partCounter = 1;
  for (const c of spareCategories) {
    for (const name of c.names) {
      const unitCost = randInt(50, 5000);
      spareParts.push({
        partNumber: `SP-${c.cat.toUpperCase().slice(0, 3)}-${pad(partCounter++, 4)}`,
        name,
        description: `${name} compatible with Mitsubishi elevators`,
        category: c.cat,
        compatibleModels: [rand(MITSUBISHI_MODELS), rand(MITSUBISHI_MODELS)],
        unitCost,
        sellingPrice: Math.round(unitCost * randFloat(1.3, 1.8)),
        stockLevel: randInt(0, 50),
        reorderLevel: randInt(5, 15),
        maxStock: 100,
        warehouseLocation: {
          shelf: `S-${randInt(1, 10)}`,
          bin: `B-${randInt(1, 20)}`,
          zone: rand(["A", "B", "C"]),
        },
        supplierIds: [vendors[randInt(0, vendors.length - 1)]!._id],
        leadTimeDays: randInt(3, 30),
        warrantyMonths: 12,
        branchId: branch._id,
      });
    }
  }
  const insertedParts = await SparePart.insertMany(spareParts);
  console.log(`✓ ${insertedParts.length} spare parts`);

  // ============ CUSTOMERS ============
  console.log("→ Creating customers");
  const customers: Array<Record<string, unknown>> = [];

  const CUSTOMER_TYPES_WEIGHTED: Array<{ type: string; weight: number }> = [
    { type: "hotel", weight: 15 },
    { type: "mall", weight: 10 },
    { type: "residential", weight: 20 },
    { type: "mixed_use", weight: 12 },
    { type: "company", weight: 15 },
    { type: "government", weight: 8 },
    { type: "hospital", weight: 8 },
    { type: "mosque", weight: 5 },
    { type: "vip", weight: 4 },
    { type: "individual", weight: 3 },
  ];

  function pickCustomerType() {
    const total = CUSTOMER_TYPES_WEIGHTED.reduce((a, b) => a + b.weight, 0);
    let r = Math.random() * total;
    for (const t of CUSTOMER_TYPES_WEIGHTED) {
      r -= t.weight;
      if (r <= 0) return t.type;
    }
    return "company";
  }

  // Status distribution (80 customers):
  // 20 active, 10 quotation_sent, 15 qualified, 20 leads, 10 on_hold, 5 churned
  const statusPlan: Array<{ status: string; count: number }> = [
    { status: "active", count: 20 },
    { status: "quotation_sent", count: 10 },
    { status: "negotiating", count: 5 },
    { status: "qualified", count: 15 },
    { status: "lead", count: 20 },
    { status: "on_hold", count: 10 },
    { status: "churned", count: 5 },
  ];

  let custCounter = 1;
  for (const plan of statusPlan) {
    for (let i = 0; i < plan.count; i++) {
      const type = pickCustomerType();
      const p1 = rand(COMPANY_NAME_PARTS_1);
      const p2 = rand(COMPANY_NAME_PARTS_2);
      const name = `${p1} ${p2}`;
      const district = rand(MAKKAH_DISTRICTS);
      const assignedSalesRep = rand(salesExecutives);
      const assignedCollector = plan.status === "active" ? rand(collectionOfficers) : undefined;
      const activatedAt = plan.status === "active" ? daysAgo(randInt(60, 540)) : null;

      customers.push({
        code: `MELSA-MKK-2026-${pad(custCounter++, 4)}`,
        type,
        commercialName: name,
        legalName: `${name} Ltd.`,
        contacts: [
          {
            name: `${rand(SAUDI_FIRST_NAMES_MALE)} ${rand(LAST_NAMES)}`,
            role: rand(["Owner", "General Manager", "Facilities Manager", "Operations Director", "Purchasing Officer"]),
            phone: `+9665${randInt(10000000, 99999999)}`,
            email: `contact@${name.toLowerCase().replace(/[^a-z]/g, "")}.sa`,
            isPrimary: true,
          },
        ],
        addresses: [
          {
            label: "Main",
            street: `${district.name} District, Building ${randInt(1, 500)}`,
            district: district.name,
            city: "Makkah",
            country: "Saudi Arabia",
            latitude: district.lat + randFloat(-0.01, 0.01),
            longitude: district.lng + randFloat(-0.01, 0.01),
            isDefault: true,
          },
        ],
        taxNumber: `3${randInt(100000000, 999999999)}000${randInt(1, 9)}`,
        commercialRegistration: `${randInt(1000000000, 9999999999)}`,
        vatNumber: `3${randInt(100000000, 999999999)}000${randInt(1, 9)}`,
        status: plan.status,
        activatedAt,
        leadSource: rand(["website", "referral", "cold_call", "walk_in", "marketing_campaign", "existing_customer", "partner"]),
        riskRating: rand(["A", "B", "C", "D"]),
        creditLimit: randInt(50000, 500000),
        assignedSalesRepId: assignedSalesRep._id,
        assignedCollectionOfficerId: assignedCollector?._id,
        branchId: branch._id,
        createdBy: superAdmin._id,
        createdAt: daysAgo(randInt(30, 700)),
      });
    }
  }

  const insertedCustomers = await Customer.insertMany(customers);
  console.log(`✓ ${insertedCustomers.length} customers`);

  const activeCustomers = insertedCustomers.filter((c) => c.status === "active");

  // ============ UNITS ============
  console.log("→ Creating units");
  const units: Array<Record<string, unknown>> = [];
  let unitCounter = 1;
  for (const c of activeCustomers) {
    const n = randInt(2, 8);
    for (let i = 0; i < n; i++) {
      const type = rand(["passenger", "passenger", "passenger", "freight", "escalator", "hospital"]);
      const addr = (c as { addresses?: Array<{ label?: string; latitude?: number; longitude?: number }> }).addresses?.[0];
      units.push({
        code: `UNIT-MKK-${pad(unitCounter++, 6)}`,
        serialNumber: `MITS-${randInt(100000, 999999)}`,
        model: rand(MITSUBISHI_MODELS),
        type,
        capacity: type === "freight" ? randInt(1600, 3000) : randInt(600, 1800),
        speed: randFloat(1.0, 2.5),
        floorsServed: randInt(4, 40),
        travelDistance: randFloat(12, 120),
        customerId: c._id,
        addressLabel: addr?.label ?? "Main",
        location: {
          building: `Tower ${rand(["A", "B", "C"])}`,
          floor: "All",
          latitude: (addr?.latitude ?? 21.4) + randFloat(-0.005, 0.005),
          longitude: (addr?.longitude ?? 39.85) + randFloat(-0.005, 0.005),
        },
        currentStatus: rand([
          "operational", "operational", "operational", "operational", "operational",
          "under_maintenance", "breakdown",
        ]),
        installedAt: daysAgo(randInt(365, 3650)),
        warrantyStart: daysAgo(randInt(365, 3650)),
        warrantyEnd: daysAgo(randInt(-365, 365)),
        lastServiceAt: daysAgo(randInt(15, 90)),
        nextServiceDue: daysFromNow(randInt(-7, 45)),
        qrCode: `QR-${pad(unitCounter, 6)}-${randInt(1000, 9999)}`,
        branchId: branch._id,
      });
    }
  }
  const insertedUnits = await Unit.insertMany(units);
  console.log(`✓ ${insertedUnits.length} units`);

  // ============ OPPORTUNITIES (for non-active customers) ============
  console.log("→ Creating opportunities");
  const pipelineCustomers = insertedCustomers.filter((c) =>
    ["lead", "qualified", "quotation_sent", "negotiating"].includes(c.status as string),
  );
  const opportunities: Array<Record<string, unknown>> = [];
  for (const c of pipelineCustomers) {
    const stageMap: Record<string, string> = {
      lead: rand(["new", "contacted"]),
      qualified: "qualified",
      quotation_sent: "quotation_sent",
      negotiating: "negotiation",
    };
    opportunities.push({
      customerId: c._id,
      title: `${rand(["AMC Contract", "Installation Deal", "Modernization", "Service Upgrade"])} — ${(c as { commercialName: string }).commercialName}`,
      stage: stageMap[c.status as string],
      dealType: rand(["amc", "installation", "modernization", "upgrade"]),
      value: randInt(30000, 600000),
      probability: randInt(10, 80),
      expectedCloseDate: daysFromNow(randInt(15, 120)),
      ownerId: (c as { assignedSalesRepId: mongoose.Types.ObjectId }).assignedSalesRepId,
      activities: [
        {
          type: "call",
          notes: "Initial discovery call. Customer interested.",
          date: daysAgo(randInt(2, 30)),
          durationMinutes: randInt(15, 60),
          userId: (c as { assignedSalesRepId: mongoose.Types.ObjectId }).assignedSalesRepId,
        },
      ],
      branchId: branch._id,
    });
  }
  const insertedOpps = await Opportunity.insertMany(opportunities);
  console.log(`✓ ${insertedOpps.length} opportunities`);

  // ============ CONTRACTS ============
  console.log("→ Creating contracts");
  const contracts: Array<Record<string, unknown>> = [];
  let contractCounter = 1;
  for (const c of activeCustomers) {
    const customerUnits = insertedUnits.filter((u) => String(u.customerId) === String(c._id));
    if (!customerUnits.length) continue;
    const price = customerUnits.length * randInt(8000, 18000);
    const vat = Math.round(price * VAT_RATE);
    const startDate = daysAgo(randInt(180, 700));
    const durationMonths = 12;
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + durationMonths);

    const status = endDate < new Date() ? rand(["expired", "renewed"]) :
      daysBetween(new Date(), endDate) <= 90 ? "expiring_soon" : "active";

    contracts.push({
      code: `CON-MKK-2026-${pad(contractCounter++, 5)}`,
      customerId: c._id,
      type: rand(["amc_comprehensive", "amc_comprehensive", "amc_comprehensive", "amc_non_comprehensive", "amc_semi"]),
      status,
      unitIds: customerUnits.map((u) => u._id),
      unitCount: customerUnits.length,
      startDate,
      endDate,
      durationMonths,
      billingCycle: "semi_annual",
      paymentTiming: "in_advance",
      visitFrequency: "monthly",
      visitsPerYear: 12,
      coverage: {
        sparePartsCovered: true,
        laborCovered: true,
        emergencyIncluded: true,
        modernizationIncluded: false,
      },
      sla: { responseTimeMinutes: 60, resolutionTimeHours: 24 },
      price,
      vatAmount: vat,
      total: price + vat,
      autoRenew: true,
      renewalNoticeDays: 60,
      signedBy: (c as { commercialName: string }).commercialName,
      signedAt: startDate,
      branchId: branch._id,
    });
  }
  const insertedContracts = await Contract.insertMany(contracts);
  console.log(`✓ ${insertedContracts.length} contracts`);

  // Update units with activeContractId
  for (const contract of insertedContracts) {
    await Unit.updateMany(
      { _id: { $in: contract.unitIds } },
      { $set: { activeContractId: contract._id } },
    );
  }

  // ============ WORK ORDERS ============
  console.log("→ Creating work orders");
  const workOrders: Array<Record<string, unknown>> = [];
  let woCounter = 1;

  const checklistTemplate = [
    { itemId: "c1", label: "Check motor temperature and vibration", category: "mechanical", required: true },
    { itemId: "c2", label: "Inspect traveling cables for wear", category: "electrical", required: true },
    { itemId: "c3", label: "Test emergency brake", category: "safety", required: true },
    { itemId: "c4", label: "Verify door operator alignment", category: "doors", required: true },
    { itemId: "c5", label: "Lubricate guide rails", category: "mechanical", required: true },
    { itemId: "c6", label: "Test overload sensor", category: "safety", required: true },
    { itemId: "c7", label: "Check cabin interior and lighting", category: "interior", required: false },
    { itemId: "c8", label: "Verify floor indicator operation", category: "electrical", required: false },
    { itemId: "c9", label: "Test emergency communication system", category: "safety", required: true },
    { itemId: "c10", label: "Inspect buffer oil level", category: "mechanical", required: false },
  ];

  for (const contract of insertedContracts) {
    if (!(contract.status === "active" || contract.status === "expiring_soon")) continue;
    const unitIds = contract.unitIds as mongoose.Types.ObjectId[];

    // Past 6 months of work orders
    for (let monthBack = 6; monthBack >= 0; monthBack--) {
      for (const unitId of unitIds) {
        const tech = rand(technicians);
        const supervisor = rand(supervisorUsers);
        const scheduledDate = daysAgo(monthBack * 30 + randInt(0, 28));
        const isCompleted = monthBack > 0 || Math.random() > 0.3;
        const type = rand(["preventive", "preventive", "preventive", "preventive", "corrective", "emergency", "inspection"]);
        const priority = type === "emergency" ? "critical" : type === "corrective" ? "high" : "medium";
        const expectedDuration = type === "emergency" ? 90 : type === "preventive" ? 60 : 45;
        const actualDuration = isCompleted ? expectedDuration + randInt(-15, 30) : undefined;

        const status = isCompleted ? "completed" : monthBack === 0 ? (scheduledDate < new Date() ? (Math.random() > 0.5 ? "in_progress" : "scheduled") : "scheduled") : "completed";

        const completedChecklist = checklistTemplate.map((item) => ({
          ...item,
          completed: isCompleted ? Math.random() > 0.1 : false,
          issue: isCompleted && Math.random() > 0.9,
          notes: "",
        }));

        const wo: Record<string, unknown> = {
          code: `WO-MKK-${String(scheduledDate.getFullYear()).slice(2)}${pad(scheduledDate.getMonth() + 1, 2)}${pad(scheduledDate.getDate(), 2)}-${pad(woCounter++, 4)}`,
          type,
          priority,
          status,
          customerId: contract.customerId,
          unitId,
          contractId: contract._id,
          technicianId: tech._id,
          supervisorId: supervisor?._id,
          dispatchedById: dispatcher._id,
          scheduledDate,
          scheduledTime: rand(["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"]),
          expectedDurationMinutes: expectedDuration,
          checklist: completedChecklist,
          branchId: branch._id,
          createdBy: dispatcher._id,
        };

        if (isCompleted) {
          wo.actualStartAt = new Date(scheduledDate.getTime() + randInt(-10, 30) * 60_000);
          wo.actualEndAt = new Date((wo.actualStartAt as Date).getTime() + (actualDuration ?? expectedDuration) * 60_000);
          wo.actualDurationMinutes = actualDuration;
          wo.durationVarianceMinutes = (actualDuration ?? 0) - expectedDuration;
          wo.startLocation = { lat: 21.4 + randFloat(-0.05, 0.05), lng: 39.85 + randFloat(-0.05, 0.05), accuracy: 10 };
          wo.endLocation = { lat: 21.4 + randFloat(-0.05, 0.05), lng: 39.85 + randFloat(-0.05, 0.05), accuracy: 10 };
          wo.technicianNotes = rand([
            "Routine maintenance completed. All systems operational.",
            "Replaced worn door roller. No further issues detected.",
            "Topped up gear oil, adjusted brake pads.",
            "Customer reported noise in cabin — traced to loose panel, tightened.",
            "All safety systems verified and tested.",
          ]);

          if (Math.random() > 0.3) {
            wo.customerFeedback = {
              rating: rand([5, 5, 5, 4, 4, 4, 4, 3, 3, 2]),
              comment: rand([
                "Very professional and quick.",
                "Good service, polite technician.",
                "Work completed on time.",
                "Could improve communication.",
                "",
              ]),
              submittedAt: new Date((wo.actualEndAt as Date).getTime() + randInt(1, 48) * 3_600_000),
              submittedFromPortal: Math.random() > 0.5,
            };
          }
        }

        workOrders.push(wo);
      }
    }
  }

  // Insert in chunks
  const insertedWOs: Array<Record<string, unknown>> = [];
  const WO_CHUNK = 500;
  for (let i = 0; i < workOrders.length; i += WO_CHUNK) {
    const chunk = workOrders.slice(i, i + WO_CHUNK);
    const res = await WorkOrder.insertMany(chunk);
    insertedWOs.push(...(res as unknown as Array<Record<string, unknown>>));
  }
  console.log(`✓ ${insertedWOs.length} work orders`);

  // ============ SPARE PART REQUESTS ============
  console.log("→ Creating spare part requests");
  const completedWOs = insertedWOs.filter((w) => w.status === "completed").slice(0, 80);
  const sparePartRequests: Array<Record<string, unknown>> = [];
  let sprCounter = 1;
  for (const wo of completedWOs) {
    const part = rand(insertedParts);
    const status = rand([
      "pending_manager_approval", "approved", "approved",
      "routed_to_warehouse", "ready_for_pickup",
      "delivered", "installed", "installed", "installed",
    ]);
    sparePartRequests.push({
      code: `SPR-MKK-${pad(sprCounter++, 5)}`,
      workOrderId: wo._id,
      technicianId: wo.technicianId,
      customerId: wo.customerId,
      unitId: wo.unitId,
      partId: part._id,
      partNameSnapshot: part.name,
      qty: randInt(1, 3),
      priority: rand(["urgent", "normal", "normal", "normal", "scheduled"]),
      reason: rand([
        "Found during preventive maintenance.",
        "Customer reported issue; part is worn.",
        "Scheduled replacement as per plan.",
        "Failure detected; unit offline.",
      ]),
      status,
      timeline: [
        { status: "pending_manager_approval", at: (wo.actualEndAt as Date) ?? new Date(), byId: wo.technicianId, note: "Requested by technician" },
      ],
      branchId: branch._id,
      createdAt: (wo.actualEndAt as Date) ?? new Date(),
    });
  }
  await SparePartRequest.insertMany(sparePartRequests);
  console.log(`✓ ${sparePartRequests.length} spare part requests`);

  // ============ INVOICES ============
  console.log("→ Creating invoices");
  const invoices: Array<Record<string, unknown>> = [];
  let invoiceCounter = 1;
  for (const contract of insertedContracts) {
    const customerId = contract.customerId;
    // Semi-annual in-advance: 2 invoices per year
    const startDate = contract.startDate as Date;
    const currentDate = new Date();
    let periodStart = new Date(startDate);
    while (periodStart < currentDate) {
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 6);
      const dueDate = new Date(periodStart);
      dueDate.setDate(dueDate.getDate() + 30);

      const halfPrice = Math.round((contract.price as number) / 2);
      const vat = Math.round(halfPrice * VAT_RATE);
      const total = halfPrice + vat;

      const ageDays = Math.floor((Date.now() - dueDate.getTime()) / 86_400_000);
      let status: string;
      let paidAmount = 0;
      if (ageDays < -30) {
        status = "issued";
      } else if (ageDays < 0) {
        status = "sent";
      } else if (ageDays <= 7 && Math.random() > 0.3) {
        status = "paid";
        paidAmount = total;
      } else if (ageDays <= 30 && Math.random() > 0.2) {
        status = "paid";
        paidAmount = total;
      } else if (ageDays <= 60 && Math.random() > 0.4) {
        status = "paid";
        paidAmount = total;
      } else if (ageDays > 90 && Math.random() > 0.3) {
        status = "overdue";
        paidAmount = Math.random() > 0.5 ? Math.round(total * randFloat(0.2, 0.6)) : 0;
      } else {
        status = rand(["overdue", "partially_paid"]);
        paidAmount = status === "partially_paid" ? Math.round(total * randFloat(0.3, 0.7)) : 0;
      }

      const balance = total - paidAmount;
      const agingBucket = ageDays <= 0 ? "current" : ageDays <= 30 ? "1-30" : ageDays <= 60 ? "31-60" : ageDays <= 90 ? "61-90" : "90+";

      invoices.push({
        code: `INV-MKK-2026-${pad(invoiceCounter++, 5)}`,
        customerId,
        contractId: contract._id,
        issueDate: new Date(periodStart),
        dueDate,
        periodStart: new Date(periodStart),
        periodEnd,
        items: [
          {
            description: `AMC Maintenance — ${periodStart.toLocaleDateString("en-GB", { month: "short", year: "numeric" })} to ${periodEnd.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`,
            qty: contract.unitCount,
            unitPrice: Math.round(halfPrice / (contract.unitCount as number)),
            total: halfPrice,
            taxRate: VAT_RATE,
          },
        ],
        subtotal: halfPrice,
        vatAmount: vat,
        total,
        paidAmount,
        balance,
        status,
        agingDays: Math.max(0, ageDays),
        agingBucket,
        assignedCollectionOfficerId: balance > 0 ? rand(collectionOfficers)._id : undefined,
        branchId: branch._id,
      });

      periodStart = new Date(periodEnd);
    }
  }

  const insertedInvoices = await Invoice.insertMany(invoices);
  console.log(`✓ ${insertedInvoices.length} invoices`);

  // ============ PAYMENTS ============
  console.log("→ Creating payments");
  const payments: Array<Record<string, unknown>> = [];
  let paymentCounter = 1;
  for (const inv of insertedInvoices) {
    if ((inv.paidAmount as number) > 0) {
      payments.push({
        code: `PAY-MKK-${pad(paymentCounter++, 5)}`,
        invoiceId: inv._id,
        customerId: inv.customerId,
        amount: inv.paidAmount,
        method: rand(["bank_transfer", "bank_transfer", "bank_transfer", "cheque", "cash", "stc_pay", "mada"]),
        reference: `REF-${randInt(100000, 999999)}`,
        receivedAt: new Date((inv.dueDate as Date).getTime() - randInt(-10, 45) * 86_400_000),
        receivedById: rand([...collectionOfficers, branchManager])._id,
        reconciled: true,
        reconciledAt: new Date(),
        branchId: branch._id,
      });
    }
  }
  await Payment.insertMany(payments);
  console.log(`✓ ${payments.length} payments`);

  // ============ PROMISES TO PAY ============
  console.log("→ Creating promises to pay");
  const overdueInvoices = insertedInvoices.filter((i) => i.status === "overdue").slice(0, 25);
  const ptpRecords = overdueInvoices.map((inv) => ({
    invoiceId: inv._id,
    customerId: inv.customerId,
    collectionOfficerId: (inv.assignedCollectionOfficerId as mongoose.Types.ObjectId | undefined) ?? rand(collectionOfficers)._id,
    amount: inv.balance,
    promisedDate: daysFromNow(randInt(3, 30)),
    status: rand(["active", "active", "active", "kept", "broken"]),
    note: "Promise discussed via phone call.",
    branchId: branch._id,
  }));
  await PromiseToPay.insertMany(ptpRecords);
  console.log(`✓ ${ptpRecords.length} promises to pay`);

  // ============ TASKS ============
  console.log("→ Creating tasks");
  const tasks: Array<Record<string, unknown>> = [];
  for (let i = 0; i < 60; i++) {
    const assigner = rand([branchManager, serviceHead, salesHead, financeHead, salesManager, serviceManager]);
    const assignees = [rand([...technicians, ...salesExecutives, ...collectionOfficers])];
    tasks.push({
      title: rand([
        "Follow up with customer regarding quotation",
        "Review overdue payment and prepare collection plan",
        "Schedule preventive maintenance visit",
        "Prepare contract renewal proposal",
        "Investigate customer complaint",
        "Reconcile bank statement for this month",
        "Update customer contact information",
        "Approve pending spare part request",
        "Complete safety inspection report",
        "Send birthday greeting to VIP customer",
      ]),
      description: "Auto-generated task for seed data demonstration.",
      assignerId: assigner._id,
      assigneeIds: assignees.map((a) => a._id),
      priority: rand(["urgent", "high", "normal", "normal", "normal", "low"]),
      dueDate: daysFromNow(randInt(-3, 14)),
      status: rand(["todo", "todo", "in_progress", "in_progress", "pending_review", "done", "done"]),
      relatedType: rand(["customer", "workorder", "invoice", "none"]),
      branchId: branch._id,
      createdBy: assigner._id,
    });
  }
  await Task.insertMany(tasks);
  console.log(`✓ ${tasks.length} tasks`);

  // ============ DISPUTES ============
  console.log("→ Creating disputes");
  const disputes: Array<Record<string, unknown>> = [];
  let dispCounter = 1;
  for (let i = 0; i < 25; i++) {
    const raiser = rand([dispatcher, ...technicians.slice(0, 5), ...activeCustomers]);
    const raiserIsCustomer = (raiser as { role?: string }).role === "customer" || !(raiser as { role?: string }).role;
    disputes.push({
      code: `DSP-MKK-${pad(dispCounter++, 4)}`,
      title: rand([
        "Customer reports elevator not responding to calls",
        "Noisy operation after last maintenance",
        "Billing amount dispute",
        "Technician was late to scheduled visit",
        "Door not closing properly",
        "Quality of spare part installed",
        "Safety concerns reported",
      ]),
      description: "Initial report captured from customer/staff.",
      raisedById: (raiser as { _id: mongoose.Types.ObjectId })._id,
      raisedByType: raiserIsCustomer ? "customer" : "employee",
      customerId: rand(activeCustomers)._id,
      category: rand([
        "customer_complaint", "quality_issue", "technician_issue", "payment_dispute",
        "customer_complaint", "customer_complaint",
      ]),
      severity: rand(["critical", "high", "medium", "medium", "medium", "low"]),
      status: rand(["open", "investigating", "investigating", "escalated", "resolved", "resolved", "closed"]),
      currentAssigneeId: rand([serviceHead, serviceManager, branchManager])._id,
      timeline: [
        {
          type: "assigned",
          toUserId: serviceManager._id,
          note: "Assigned to service manager",
          at: daysAgo(randInt(1, 30)),
        },
      ],
      slaTargetHours: 24,
      branchId: branch._id,
      createdBy: (raiser as { _id: mongoose.Types.ObjectId })._id,
      createdAt: daysAgo(randInt(1, 60)),
    });
  }
  await Dispute.insertMany(disputes);
  console.log(`✓ ${disputes.length} disputes`);

  // ============ NOTIFICATIONS ============
  console.log("→ Creating notifications");
  const notifications: Array<Record<string, unknown>> = [];
  for (const user of insertedUsers) {
    const count = randInt(3, 15);
    for (let i = 0; i < count; i++) {
      notifications.push({
        userId: user._id,
        type: rand(["task_assigned", "task_due", "visit_scheduled", "spare_approval_needed", "invoice_overdue", "dispute_raised", "mention"]),
        title: rand([
          "New task assigned to you",
          "Task due in 24 hours",
          "Visit scheduled for tomorrow",
          "Spare part request awaiting approval",
          "Invoice is overdue",
          "New dispute raised",
          "You were mentioned in a task",
        ]),
        body: "Tap to view details.",
        link: "/dashboard",
        priority: rand(["critical", "high", "normal", "normal", "low"]),
        readAt: i < 3 ? null : daysAgo(randInt(1, 14)),
        createdAt: daysAgo(randInt(0, 30)),
      });
    }
  }
  await Notification.insertMany(notifications);
  console.log(`✓ ${notifications.length} notifications`);

  // ============ SETTINGS ============
  console.log("→ Creating settings");
  await Setting.insertMany([
    { key: "vat_rate", value: VAT_RATE, scope: "global", description: "KSA VAT rate (15%)" },
    { key: "active_ratio_target", value: 40, scope: "branch", scopeId: branch._id, description: "Target % for customer active ratio" },
    { key: "emergency_sla_minutes", value: 60, scope: "branch", scopeId: branch._id, description: "Emergency response SLA" },
    { key: "technician_on_time_target", value: 95, scope: "branch", scopeId: branch._id, description: "Technician on-time % target" },
    { key: "dso_target_days", value: 45, scope: "branch", scopeId: branch._id, description: "DSO target in days" },
  ]);

  console.log("\n✅ Seed complete!");
  console.log("\n📧 Demo accounts (password: Melsa@2026!):");
  console.log("   admin@melsa-mkk.com             - Super Admin");
  console.log("   branch.manager@melsa-mkk.com    - Branch Manager");
  console.log("   sales.manager@melsa-mkk.com     - Sales Manager");
  console.log("   service.manager@melsa-mkk.com   - Service Manager");
  console.log("   tech1@melsa-mkk.com             - Technician");
  console.log("   collection1@melsa-mkk.com       - Collection Officer");

  await disconnectDB();
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
