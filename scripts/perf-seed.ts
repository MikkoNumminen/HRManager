/**
 * Performance Seeding Script
 *
 * Seeds the database with a large, realistic dataset for performance testing:
 * - 10,000 employees (persons) across realistic distribution
 * - 50 departments with department heads
 * - 200 teams with managers, spread across departments
 * - ~30,000 team memberships (avg 3 teams per person)
 * - 5 leave types with balances and requests
 * - 10 review cycles with review requests
 *
 * Usage: npx tsx scripts/perf-seed.ts
 * Env:   DATABASE_URL must be set (reads from .env automatically)
 *
 * WARNING: This script truncates all existing data before seeding.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Load .env
const dotenv = await import("dotenv");
dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── Configuration ──────────────────────────────────────────────────────
const PERSON_COUNT = 10_000;
const DEPARTMENT_COUNT = 50;
const TEAM_COUNT = 200;
const LEAVE_TYPE_COUNT = 5;
const REVIEW_CYCLE_COUNT = 10;
const REVIEWS_PER_CYCLE = 500;
const LEAVE_REQUESTS_COUNT = 5_000;
const BATCH_SIZE = 500;

// ── Helpers ────────────────────────────────────────────────────────────
const firstNames = [
  "James",
  "Mary",
  "John",
  "Patricia",
  "Robert",
  "Jennifer",
  "Michael",
  "Linda",
  "David",
  "Elizabeth",
  "William",
  "Barbara",
  "Richard",
  "Susan",
  "Joseph",
  "Jessica",
  "Thomas",
  "Sarah",
  "Christopher",
  "Karen",
  "Charles",
  "Lisa",
  "Daniel",
  "Nancy",
  "Matthew",
  "Betty",
  "Anthony",
  "Margaret",
  "Mark",
  "Sandra",
  "Donald",
  "Ashley",
  "Steven",
  "Dorothy",
  "Paul",
  "Kimberly",
  "Andrew",
  "Emily",
  "Joshua",
  "Donna",
];

const lastNames = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Perez",
  "Thompson",
  "White",
  "Harris",
  "Sanchez",
  "Clark",
  "Ramirez",
  "Lewis",
  "Robinson",
  "Walker",
  "Young",
  "Allen",
  "King",
  "Wright",
  "Scott",
  "Torres",
  "Nguyen",
  "Hill",
  "Flores",
];

const positions = [
  "Software Engineer",
  "Senior Software Engineer",
  "Staff Engineer",
  "Principal Engineer",
  "Engineering Manager",
  "Product Manager",
  "Senior Product Manager",
  "Designer",
  "Senior Designer",
  "Data Analyst",
  "Data Scientist",
  "DevOps Engineer",
  "QA Engineer",
  "Technical Writer",
  "HR Specialist",
  "Recruiter",
  "Finance Analyst",
  "Marketing Specialist",
  "Sales Representative",
  "Customer Success Manager",
];

const departmentNames = [
  "Engineering",
  "Product",
  "Design",
  "Data Science",
  "DevOps",
  "QA",
  "HR",
  "Finance",
  "Marketing",
  "Sales",
  "Customer Success",
  "Legal",
  "Operations",
  "Security",
  "Infrastructure",
  "Mobile",
  "Frontend",
  "Backend",
  "Platform",
  "AI/ML",
  "Research",
  "Support",
  "Business Development",
  "Analytics",
  "Compliance",
  "Communications",
  "Training",
  "Facilities",
  "Procurement",
  "Strategy",
  "Quality",
  "Innovation",
  "Cloud",
  "Networking",
  "Database",
  "Integration",
  "Architecture",
  "Reliability",
  "Performance",
  "Automation",
  "Testing",
  "Release",
  "Documentation",
  "Localization",
  "Accessibility",
  "Growth",
  "Retention",
  "Partnerships",
  "Community",
  "Events",
];

const leaveTypes = [
  { name: "Annual Leave", defaultDays: 25, color: "#4caf50" },
  { name: "Sick Leave", defaultDays: 10, color: "#f44336" },
  { name: "Parental Leave", defaultDays: 90, color: "#9c27b0" },
  { name: "Personal Leave", defaultDays: 5, color: "#2196f3" },
  { name: "Bereavement Leave", defaultDays: 5, color: "#607d8b" },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log("🗑️  Truncating existing data...");
  // Order matters due to FK constraints
  await prisma.reviewSubmission.deleteMany();
  await prisma.reviewRequest.deleteMany();
  await prisma.reviewCycle.deleteMany();
  await prisma.reviewTemplate.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.department.deleteMany();
  await prisma.position.deleteMany();
  await prisma.person.deleteMany();

  // ── Persons ──────────────────────────────────────────────────────────
  console.log(`👤 Seeding ${PERSON_COUNT} persons...`);
  const personIds: string[] = [];
  for (let batch = 0; batch < PERSON_COUNT; batch += BATCH_SIZE) {
    const size = Math.min(BATCH_SIZE, PERSON_COUNT - batch);
    const data = Array.from({ length: size }, (_, i) => {
      const idx = batch + i;
      const first = pick(firstNames);
      const last = pick(lastNames);
      return {
        name: `${first} ${last}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}.${idx}@example.com`,
        position: pick(positions),
        createdAt: randomDate(new Date("2024-01-01"), new Date("2026-03-01")),
      };
    });

    const result = await prisma.person.createManyAndReturn({
      data,
      select: { id: true },
    });
    personIds.push(...result.map((r) => r.id));

    if ((batch + size) % 2000 === 0 || batch + size === PERSON_COUNT) {
      console.log(`  ... ${batch + size}/${PERSON_COUNT} persons created`);
    }
  }

  // ── Departments ──────────────────────────────────────────────────────
  console.log(`🏢 Seeding ${DEPARTMENT_COUNT} departments...`);
  const departments = await prisma.department.createManyAndReturn({
    data: departmentNames.slice(0, DEPARTMENT_COUNT).map((name, i) => ({
      name,
      description: `${name} department — responsible for ${name.toLowerCase()}-related operations`,
      headId: personIds[i], // first N persons are department heads
      createdAt: randomDate(new Date("2024-01-01"), new Date("2025-06-01")),
    })),
    select: { id: true },
  });
  const departmentIds = departments.map((d) => d.id);

  // ── Teams ────────────────────────────────────────────────────────────
  console.log(`👥 Seeding ${TEAM_COUNT} teams...`);
  const teamData = Array.from({ length: TEAM_COUNT }, (_, i) => ({
    teamName: `Team ${String(i + 1).padStart(3, "0")}`,
    departmentId: pick(departmentIds),
    teamManagerId: personIds[DEPARTMENT_COUNT + i], // next N persons are team managers
    createdAt: randomDate(new Date("2024-03-01"), new Date("2025-09-01")),
  }));
  const teams = await prisma.team.createManyAndReturn({
    data: teamData,
    select: { teamId: true },
  });
  const teamIds = teams.map((t) => t.teamId);

  // ── Team Members ─────────────────────────────────────────────────────
  console.log("🔗 Assigning persons to teams...");
  // Each person gets 1-5 team memberships (avg ~3)
  const membershipData: { personId: string; teamId: string }[] = [];
  const seenPairs = new Set<string>();

  for (const personId of personIds) {
    const numTeams = 1 + Math.floor(Math.random() * 4); // 1-4 teams
    const selectedTeams = pickN(teamIds, numTeams);
    for (const teamId of selectedTeams) {
      const key = `${personId}:${teamId}`;
      if (!seenPairs.has(key)) {
        seenPairs.add(key);
        membershipData.push({ personId, teamId });
      }
    }
  }

  for (let batch = 0; batch < membershipData.length; batch += BATCH_SIZE) {
    const slice = membershipData.slice(batch, batch + BATCH_SIZE);
    await prisma.teamMember.createMany({ data: slice });
    if ((batch + slice.length) % 5000 === 0 || batch + slice.length === membershipData.length) {
      console.log(`  ... ${batch + slice.length}/${membershipData.length} memberships created`);
    }
  }

  // ── Leave Types ──────────────────────────────────────────────────────
  console.log(`🏖️  Seeding ${LEAVE_TYPE_COUNT} leave types...`);
  const createdLeaveTypes = await prisma.leaveType.createManyAndReturn({
    data: leaveTypes.slice(0, LEAVE_TYPE_COUNT),
    select: { id: true, defaultDays: true },
  });
  const leaveTypeIds = createdLeaveTypes.map((lt) => lt.id);

  // ── Leave Balances ───────────────────────────────────────────────────
  console.log("💰 Seeding leave balances...");
  const balanceData: {
    personId: string;
    leaveTypeId: string;
    year: number;
    allocated: number;
    used: number;
  }[] = [];
  for (const personId of personIds) {
    for (const lt of createdLeaveTypes) {
      const used = Math.floor(Math.random() * Math.min(lt.defaultDays, 15));
      balanceData.push({
        personId,
        leaveTypeId: lt.id,
        year: 2026,
        allocated: lt.defaultDays,
        used,
      });
    }
  }
  for (let batch = 0; batch < balanceData.length; batch += BATCH_SIZE) {
    const slice = balanceData.slice(batch, batch + BATCH_SIZE);
    await prisma.leaveBalance.createMany({ data: slice });
    if ((batch + slice.length) % 10000 === 0 || batch + slice.length === balanceData.length) {
      console.log(`  ... ${batch + slice.length}/${balanceData.length} balances created`);
    }
  }

  // ── Leave Requests ───────────────────────────────────────────────────
  console.log(`📝 Seeding ${LEAVE_REQUESTS_COUNT} leave requests...`);
  const leaveStatuses = ["PENDING", "APPROVED", "REJECTED"] as const;
  const leaveRequestData = Array.from({ length: LEAVE_REQUESTS_COUNT }, () => {
    const startDate = randomDate(new Date("2026-01-01"), new Date("2026-12-01"));
    const days = 1 + Math.floor(Math.random() * 10);
    const endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);
    const status = pick([...leaveStatuses]);
    return {
      personId: pick(personIds),
      leaveTypeId: pick(leaveTypeIds),
      startDate,
      endDate,
      days,
      status,
      reviewerId: status !== "PENDING" ? pick(personIds) : null,
      reviewedAt: status !== "PENDING" ? randomDate(startDate, new Date()) : null,
      createdAt: randomDate(new Date("2025-12-01"), startDate),
    };
  });

  for (let batch = 0; batch < leaveRequestData.length; batch += BATCH_SIZE) {
    const slice = leaveRequestData.slice(batch, batch + BATCH_SIZE);
    await prisma.leaveRequest.createMany({ data: slice });
  }
  console.log(`  ... ${leaveRequestData.length} leave requests created`);

  // ── Review Templates & Cycles ────────────────────────────────────────
  console.log(`📋 Seeding ${REVIEW_CYCLE_COUNT} review cycles...`);
  const template = await prisma.reviewTemplate.create({
    data: {
      name: "Performance Review Q1-Q4",
      description: "Standard quarterly performance review template",
      questions: JSON.stringify([
        {
          id: "q1",
          text: "Rate overall performance",
          type: "RATING",
        },
        {
          id: "q2",
          text: "Key achievements this quarter",
          type: "TEXT",
        },
        {
          id: "q3",
          text: "Areas for improvement",
          type: "TEXT",
        },
      ]),
    },
  });

  const cycleStatuses = ["DRAFT", "OPEN", "CLOSED"] as const;
  for (let c = 0; c < REVIEW_CYCLE_COUNT; c++) {
    const startDate = new Date(`2025-${String((c % 12) + 1).padStart(2, "0")}-01`);
    const endDate = new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);
    const cycle = await prisma.reviewCycle.create({
      data: {
        name: `Review Cycle ${c + 1}`,
        templateId: template.id,
        status: pick([...cycleStatuses]),
        startDate,
        endDate,
      },
    });

    // Create review requests for this cycle
    const reviewTypes = ["SELF", "MANAGER", "PEER", "DIRECT_REPORT"] as const;
    const requestStatuses = ["PENDING", "SUBMITTED"] as const;
    const requestData = Array.from({ length: REVIEWS_PER_CYCLE }, () => ({
      cycleId: cycle.id,
      subjectId: pick(personIds),
      reviewerId: pick(personIds),
      type: pick([...reviewTypes]),
      status: pick([...requestStatuses]),
    }));

    // Batch insert — skip duplicates (unique constraint on cycleId+subjectId+reviewerId+type)
    await prisma.reviewRequest.createMany({
      data: requestData,
      skipDuplicates: true,
    });
    console.log(`  ... Cycle ${c + 1}/${REVIEW_CYCLE_COUNT} seeded`);
  }

  // ── Positions Catalog ────────────────────────────────────────────────
  console.log("📌 Seeding position catalog...");
  await prisma.position.createMany({
    data: positions.map((name) => ({ name })),
    skipDuplicates: true,
  });

  // ── Summary ──────────────────────────────────────────────────────────
  const [personCount, teamCount, deptCount, memberCount, leaveReqCount, reviewReqCount] =
    await Promise.all([
      prisma.person.count(),
      prisma.team.count(),
      prisma.department.count(),
      prisma.teamMember.count(),
      prisma.leaveRequest.count(),
      prisma.reviewRequest.count(),
    ]);

  console.log("\n✅ Seeding complete!");
  console.log(`  Persons:        ${personCount.toLocaleString()}`);
  console.log(`  Departments:    ${deptCount.toLocaleString()}`);
  console.log(`  Teams:          ${teamCount.toLocaleString()}`);
  console.log(`  Team Members:   ${memberCount.toLocaleString()}`);
  console.log(`  Leave Requests: ${leaveReqCount.toLocaleString()}`);
  console.log(`  Review Requests:${reviewReqCount.toLocaleString()}`);
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
