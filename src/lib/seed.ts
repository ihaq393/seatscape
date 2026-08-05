import { db } from "./db";
import { hashPassword } from "./auth";
import { ROLES, AVATAR_COLORS, DEFAULT_SETTINGS } from "./constants";

function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const rid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

export async function seedDatabase() {
  console.log("🌱 Seeding Edunet Seat Reservation database (simple)...");

  // ─── Seats (8: 7 bookable + 1 emergency) ─────────────────────────────────
  const seats = [
    { number: "S1", label: "Window Desk A", posX: 1, posY: 0, zone: "Quiet Zone", isEmergency: false },
    { number: "S2", label: "Window Desk B", posX: 2, posY: 0, zone: "Quiet Zone", isEmergency: false },
    { number: "S3", label: "Central Desk", posX: 3, posY: 0, zone: "Collab Zone", isEmergency: false },
    { number: "S4", label: "Central Desk", posX: 4, posY: 0, zone: "Collab Zone", isEmergency: false },
    { number: "S5", label: "Door Desk", posX: 1, posY: 2, zone: "Collab Zone", isEmergency: false },
    { number: "S6", label: "Corner Desk", posX: 2, posY: 2, zone: "Collab Zone", isEmergency: false },
    { number: "S7", label: "Meeting Adjacent", posX: 3, posY: 2, zone: "Collab Zone", isEmergency: false },
    { number: "S8", label: "Emergency Reserve", posX: 4, posY: 2, zone: "Emergency", isEmergency: true },
  ];
  for (const s of seats) {
    await db.seat.upsert({
      where: { number: s.number },
      update: {},
      create: s,
    });
  }

  // ─── Users (3 roles) ────────────────────────────────────────────────────
  const password = await hashPassword("Password@123");

  interface SeedUser {
    employeeId: string; name: string; email: string; phone: string;
    role: string; jobTitle: string; designation: string; department: string;
  }
  const users: SeedUser[] = [
    { employeeId: "EDU-0001", name: "Anita Verma", email: "anita.verma@edunet.org", phone: "+919811000001", role: ROLES.ADMIN, jobTitle: "Office Administrator", designation: "Office Administrator", department: "Administration" },
    { employeeId: "EDU-0002", name: "Rajesh Khanna", email: "rajesh.khanna@edunet.org", phone: "+919811000002", role: ROLES.ADMIN, jobTitle: "Admin Executive", designation: "Admin Executive", department: "Administration" },
    { employeeId: "EDU-1001", name: "Vikram Singh", email: "vikram.singh@edunet.org", phone: "+919811001001", role: ROLES.DEVELOPER, jobTitle: "IT Coordinator", designation: "IT Coordinator", department: "Technology" },
    { employeeId: "EDU-1002", name: "Meera Joshi", email: "meera.joshi@edunet.org", phone: "+919811001002", role: ROLES.DEVELOPER, jobTitle: "System Administrator", designation: "System Administrator", department: "Technology" },
    { employeeId: "EDU-2001", name: "Aarav Patel", email: "aarav.patel@edunet.org", phone: "+919811002001", role: ROLES.EMPLOYEE, jobTitle: "Program Director", designation: "Program Director", department: "Programs" },
    { employeeId: "EDU-2002", name: "Diya Sharma", email: "diya.sharma@edunet.org", phone: "+919811002002", role: ROLES.EMPLOYEE, jobTitle: "Associate Program Director", designation: "Associate Program Director", department: "Programs" },
    { employeeId: "EDU-2003", name: "Kabir Reddy", email: "kabir.reddy@edunet.org", phone: "+919811002003", role: ROLES.EMPLOYEE, jobTitle: "Master Trainer", designation: "Master Trainer", department: "Training" },
    { employeeId: "EDU-2004", name: "Ananya Gupta", email: "ananya.gupta@edunet.org", phone: "+919811002004", role: ROLES.EMPLOYEE, jobTitle: "Senior Trainer", designation: "Senior Trainer", department: "Training" },
    { employeeId: "EDU-2005", name: "Ishaan Mehta", email: "ishaan.mehta@edunet.org", phone: "+919811002005", role: ROLES.EMPLOYEE, jobTitle: "Project Officer", designation: "Project Officer", department: "Projects" },
    { employeeId: "EDU-2006", name: "Saanvi Rao", email: "saanvi.rao@edunet.org", phone: "+919811002006", role: ROLES.EMPLOYEE, jobTitle: "Associate Program Manager", designation: "Associate Program Manager", department: "Programs" },
    { employeeId: "EDU-2007", name: "Rohan Desai", email: "rohan.desai@edunet.org", phone: "+919811002007", role: ROLES.EMPLOYEE, jobTitle: "Trainer", designation: "Trainer", department: "Training" },
    { employeeId: "EDU-2008", name: "Neha Kulkarni", email: "neha.kulkarni@edunet.org", phone: "+919811002008", role: ROLES.EMPLOYEE, jobTitle: "SME Lead", designation: "Subject Matter Expert", department: "Projects" },
  ];

  for (const u of users) {
    await db.user.upsert({
      where: { employeeId: u.employeeId },
      update: { passwordHash: password, role: u.role, phone: u.phone, jobTitle: u.jobTitle },
      create: {
        employeeId: u.employeeId,
        name: u.name,
        email: u.email,
        phone: u.phone,
        passwordHash: password,
        role: u.role,
        jobTitle: u.jobTitle,
        designation: u.designation,
        department: u.department,
        avatarColor: colorFor(u.employeeId),
      },
    });
  }

  // ─── Sample bookings (today) ─────────────────────────────────────────────
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setUTCDate(dayAfter.getUTCDate() + 2);

  const seatRecords = await db.seat.findMany();
  const bookable = seatRecords.filter((s) => !s.isEmergency);
  const todayBookers = ["EDU-2001", "EDU-2002", "EDU-2003", "EDU-2005"];
  for (let i = 0; i < todayBookers.length; i++) {
    const seat = bookable[i];
    const user = await db.user.findUnique({ where: { employeeId: todayBookers[i] } });
    if (!seat || !user) continue;
    await db.booking.create({
      data: {
        reference: rid("EDU-BK"),
        userId: user.id,
        seatId: seat.id,
        date: today,
        purpose: ["Team meeting", "Training session", "Project review", "Stakeholder sync"][i],
        type: "NORMAL",
        status: i < 2 ? "CHECKED_IN" : "APPROVED",
        expectedCheckIn: "10:00",
        expectedCheckOut: "18:00",
        checkedInAt: i < 2 ? new Date() : null,
      },
    });
  }

  const tomorrowBookers = ["EDU-2006", "EDU-2004"];
  for (let i = 0; i < tomorrowBookers.length; i++) {
    const seat = bookable[(i + 4) % bookable.length];
    const user = await db.user.findUnique({ where: { employeeId: tomorrowBookers[i] } });
    if (!seat || !user) continue;
    await db.booking.create({
      data: {
        reference: rid("EDU-BK"),
        userId: user.id,
        seatId: seat.id,
        date: tomorrow,
        purpose: ["Program planning", "Budget review"][i],
        type: "NORMAL",
        status: "APPROVED",
        expectedCheckIn: "10:00",
        expectedCheckOut: "18:00",
      },
    });
  }

  // A late booking pending admin approval (day after tomorrow)
  const admin = await db.user.findUnique({ where: { employeeId: "EDU-0001" } });
  const lateUser = await db.user.findUnique({ where: { employeeId: "EDU-2004" } });
  const lateSeat = bookable[6 % bookable.length];
  if (lateUser && lateSeat && admin) {
    await db.booking.create({
      data: {
        reference: rid("EDU-BK"),
        userId: lateUser.id,
        seatId: lateSeat.id,
        date: dayAfter,
        purpose: "Urgent training material preparation",
        justification: "Critical incident requires on-site access to debug with the team.",
        type: "LATE",
        status: "PENDING",
        expectedCheckIn: "09:30",
        expectedCheckOut: "17:00",
      },
    });
  }

  // ─── Settings ───────────────────────────────────────────────────────────
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    await db.setting.upsert({
      where: { key: k },
      update: {},
      create: { key: k, value: v },
    });
  }

  // ─── Customization (editable homepage content) ───────────────────────────
  await db.customization.upsert({
    where: { id: "seed-customization" },
    update: {},
    create: {
      id: "seed-customization",
      heroTitle: "Reserve your seat here",
      heroSubtitle: "Check live seat availability and book your desk in seconds.",
      heroBadge: "Edunet Foundation",
      loginLabel: "Login to book",
      accentColor: "#10b981",
      officeOpenTime: "09:00",
      officeCloseTime: "19:00",
      brandName: "SeatScape",
    },
  });

  // ─── Sample signup request (pending admin approval) ──────────────────────
  await db.signupRequest.upsert({
    where: { email: "rahul.sharma@edunet.org" },
    update: {},
    create: {
      name: "Rahul Sharma",
      email: "rahul.sharma@edunet.org",
      employeeId: "EDU-3001",
      phone: "+919811003001",
      jobTitle: "Trainer",
      designation: "Trainer",
      department: "Training",
      passwordHash: password,
      status: "PENDING",
    },
  });

  console.log("✅ Seed complete. 8 seats (7+1 emergency), 12 users (2 Admin, 2 Developer, 8 Employee) + 1 pending signup.");
  console.log("   Demo login → employeeId: EDU-0001 password: Password@123 (Admin)");
  console.log("                 employeeId: EDU-1001 password: Password@123 (Developer)");
  console.log("                 employeeId: EDU-2001 password: Password@123 (Employee)");
}

if (require.main === module) {
  seedDatabase()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await db.$disconnect(); });
}
