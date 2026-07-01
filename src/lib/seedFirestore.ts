import { collection, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getCoordinatorStaffByEmail } from "@/lib/coordinatorAuth";
import type { Shift, Staff } from "@/types/scheduling";

const now = new Date().toISOString();

type MockStaffSeed = Omit<Staff, "createdAt" | "updatedAt">;

const mockStaffSeeds: MockStaffSeed[] = [
  {
    id: "staff_001",
    firstName: "Maya",
    lastName: "Patel",
    email: "maya.patel@shiftly.dev",
    phoneNumber: "555-0101",
    role: "coordinator",
    department: "Operations",
    skills: ["Scheduling", "Escalations"],
    isActive: true,
    maxWeeklyHours: 40,
  },
  {
    id: "staff_002",
    firstName: "Jordan",
    lastName: "Lee",
    email: "jordan.lee@shiftly.dev",
    phoneNumber: "555-0102",
    role: "supervisor",
    department: "Front Desk",
    skills: ["Check-In", "Training"],
    isActive: true,
    maxWeeklyHours: 38,
  },
  {
    id: "staff_003",
    firstName: "Avery",
    lastName: "Nguyen",
    email: "avery.nguyen@shiftly.dev",
    phoneNumber: "555-0103",
    role: "employee",
    department: "Front Desk",
    skills: ["Check-In", "Customer Support"],
    isActive: true,
    maxWeeklyHours: 32,
  },
  {
    id: "staff_004",
    firstName: "Diego",
    lastName: "Martinez",
    email: "diego.martinez@shiftly.dev",
    phoneNumber: "555-0104",
    role: "employee",
    department: "Front Desk",
    skills: ["Check-In", "Spanish"],
    isActive: true,
    maxWeeklyHours: 30,
  },
  {
    id: "staff_005",
    firstName: "Chloe",
    lastName: "Johnson",
    email: "chloe.johnson@shiftly.dev",
    phoneNumber: "555-0105",
    role: "employee",
    department: "Support",
    skills: ["Customer Support", "Phones"],
    isActive: true,
    maxWeeklyHours: 25,
  },
  {
    id: "staff_006",
    firstName: "Noah",
    lastName: "Kim",
    email: "noah.kim@shiftly.dev",
    phoneNumber: "555-0106",
    role: "employee",
    department: "Support",
    skills: ["Phones", "Troubleshooting"],
    isActive: true,
    maxWeeklyHours: 36,
  },
  {
    id: "staff_007",
    firstName: "Fatima",
    lastName: "Hassan",
    email: "fatima.hassan@shiftly.dev",
    phoneNumber: "555-0107",
    role: "supervisor",
    department: "Operations",
    skills: ["Escalations", "Scheduling"],
    isActive: true,
    maxWeeklyHours: 40,
  },
  {
    id: "staff_008",
    firstName: "Ethan",
    lastName: "Walker",
    email: "ethan.walker@shiftly.dev",
    phoneNumber: "555-0108",
    role: "employee",
    department: "Warehouse",
    skills: ["Inventory", "Forklift"],
    isActive: true,
    maxWeeklyHours: 40,
  },
  {
    id: "staff_009",
    firstName: "Sofia",
    lastName: "Garcia",
    email: "sofia.garcia@shiftly.dev",
    phoneNumber: "555-0109",
    role: "employee",
    department: "Warehouse",
    skills: ["Inventory", "Packing"],
    isActive: true,
    maxWeeklyHours: 34,
  },
  {
    id: "staff_010",
    firstName: "Liam",
    lastName: "Brown",
    email: "liam.brown@shiftly.dev",
    phoneNumber: "555-0110",
    role: "employee",
    department: "Dispatch",
    skills: ["Routing", "Phones"],
    isActive: true,
    maxWeeklyHours: 28,
  },
  {
    id: "staff_011",
    firstName: "Emma",
    lastName: "Davis",
    email: "emma.davis@shiftly.dev",
    phoneNumber: "555-0111",
    role: "employee",
    department: "Dispatch",
    skills: ["Routing", "Data Entry"],
    isActive: true,
    maxWeeklyHours: 30,
  },
  {
    id: "staff_012",
    firstName: "Owen",
    lastName: "Clark",
    email: "owen.clark@shiftly.dev",
    phoneNumber: "555-0112",
    role: "employee",
    department: "Operations",
    skills: ["Closing", "Safety"],
    isActive: true,
    maxWeeklyHours: 20,
  },
];

function getStartOfWeek(baseDate = new Date()) {
  const result = new Date(baseDate);
  result.setHours(0, 0, 0, 0);

  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);

  return result;
}

function toIsoAt(date: Date, hour: number) {
  const result = new Date(date);
  result.setHours(hour, 0, 0, 0);
  return result.toISOString();
}

function buildMockStaff(): Staff[] {
  return mockStaffSeeds.map((staff) => ({
    ...staff,
    createdAt: now,
    updatedAt: now,
  }));
}

function buildMockShifts(staff: Staff[]): Shift[] {
  const weekStart = getStartOfWeek();
  const creatorId = staff[0]?.id ?? "staff_001";
  const morningAssignments = [
    ["staff_002", "staff_003"],
    ["staff_002", "staff_004"],
    ["staff_007", "staff_005"],
    ["staff_007", "staff_006"],
    ["staff_002", "staff_010"],
    ["staff_007", "staff_011"],
    ["staff_002", "staff_012"],
  ];
  const eveningAssignments = [
    ["staff_008", "staff_009"],
    ["staff_008", "staff_010"],
    ["staff_009", "staff_011"],
    ["staff_008", "staff_012"],
    ["staff_009", "staff_003"],
    ["staff_008", "staff_004"],
    ["staff_009", "staff_005"],
  ];

  const shifts: Shift[] = [];

  for (let index = 0; index < 7; index += 1) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const dayCode = date.toISOString().slice(0, 10);

    shifts.push({
      id: `shift_${dayCode}_am`,
      title: "Morning Coverage",
      location: "Main Office",
      department: "Operations",
      startTime: toIsoAt(date, 8),
      endTime: toIsoAt(date, 16),
      requiredStaffCount: 2,
      assignedStaffIds: morningAssignments[index],
      status: "assigned",
      notes: "Standard weekday opening shift.",
      createdBy: creatorId,
      createdAt: now,
      updatedAt: now,
    });

    shifts.push({
      id: `shift_${dayCode}_pm`,
      title: "Evening Coverage",
      location: "Main Office",
      department: "Operations",
      startTime: toIsoAt(date, 16),
      endTime: toIsoAt(date, 22),
      requiredStaffCount: 2,
      assignedStaffIds: eveningAssignments[index],
      status: "assigned",
      notes: "Standard evening support shift.",
      createdBy: creatorId,
      createdAt: now,
      updatedAt: now,
    });
  }

  return shifts;
}

export async function seedMockFirestore(coordinatorEmail: string) {
  const coordinatorStaff = await getCoordinatorStaffByEmail(coordinatorEmail);

  if (!coordinatorStaff) {
    throw new Error("Only an active coordinator can seed Firestore.");
  }

  const staff = buildMockStaff();
  const shifts = buildMockShifts(staff);
  const batch = writeBatch(db);

  for (const staffMember of staff) {
    const staffRef = doc(collection(db, "staff"), staffMember.id);
    batch.set(staffRef, staffMember);
  }

  for (const shift of shifts) {
    const shiftRef = doc(collection(db, "shifts"), shift.id);
    batch.set(shiftRef, shift);
  }

  await batch.commit();

  return {
    staffCount: staff.length,
    shiftCount: shifts.length,
  };
}