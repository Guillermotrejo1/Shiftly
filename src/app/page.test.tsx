import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Home from "./page";

const mockCoordinatorStaff = {
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
  createdAt: "2026-07-12T00:00:00.000Z",
  updatedAt: "2026-07-12T00:00:00.000Z",
};

const mockStaffRecords = [
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
    createdAt: "2026-07-12T00:00:00.000Z",
    updatedAt: "2026-07-12T00:00:00.000Z",
  },
  {
    id: "staff_002",
    firstName: "Jordan",
    lastName: "Lee",
    email: "jordan.lee@shiftly.dev",
    phoneNumber: "555-0102",
    role: "supervisor",
    department: "Operations",
    skills: ["Check-In", "Training"],
    isActive: false,
    maxWeeklyHours: 38,
    createdAt: "2026-07-12T00:00:00.000Z",
    updatedAt: "2026-07-12T00:00:00.000Z",
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
    createdAt: "2026-07-12T00:00:00.000Z",
    updatedAt: "2026-07-12T00:00:00.000Z",
  },
  {
    id: "staff_004",
    firstName: "Chloe",
    lastName: "Johnson",
    email: "chloe.johnson@shiftly.dev",
    phoneNumber: "555-0105",
    role: "employee",
    department: "Support",
    skills: ["Customer Support", "Phones"],
    isActive: true,
    maxWeeklyHours: 25,
    createdAt: "2026-07-12T00:00:00.000Z",
    updatedAt: "2026-07-12T00:00:00.000Z",
  },
];

const mockShiftRecords = [
  {
    id: "shift_001",
    title: "Morning Coverage",
    location: "Main Office",
    department: "Operations",
    startTime: "2026-07-12T08:00:00.000Z",
    endTime: "2026-07-12T16:00:00.000Z",
    requiredStaffCount: 2,
    assignedStaffIds: ["staff_001", "staff_002"],
    status: "assigned",
    notes: "Standard weekday opening shift.",
    createdBy: "staff_001",
    createdAt: "2026-07-12T00:00:00.000Z",
    updatedAt: "2026-07-12T00:00:00.000Z",
  },
  {
    id: "shift_002",
    title: "Evening Coverage",
    location: "Main Office",
    department: "Operations",
    startTime: "2026-07-11T16:00:00.000Z",
    endTime: "2026-07-11T22:00:00.000Z",
    requiredStaffCount: 2,
    assignedStaffIds: ["staff_003"],
    status: "assigned",
    notes: "Standard evening support shift.",
    createdBy: "staff_001",
    createdAt: "2026-07-12T00:00:00.000Z",
    updatedAt: "2026-07-12T00:00:00.000Z",
  },
];

jest.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: jest.fn(),
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback({ email: "maya.patel@shiftly.dev" });
    return jest.fn();
  }),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn((db, name) => ({ db, name })),
  getDocs: jest
    .fn()
    .mockResolvedValueOnce({
      docs: [
        {
          id: "staff_001",
          data: () => ({
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
            createdAt: "2026-07-12T00:00:00.000Z",
            updatedAt: "2026-07-12T00:00:00.000Z",
          }),
        },
        {
          id: "staff_002",
          data: () => ({
            id: "staff_002",
            firstName: "Jordan",
            lastName: "Lee",
            email: "jordan.lee@shiftly.dev",
            phoneNumber: "555-0102",
            role: "supervisor",
            department: "Operations",
            skills: ["Check-In", "Training"],
            isActive: false,
            maxWeeklyHours: 38,
            createdAt: "2026-07-12T00:00:00.000Z",
            updatedAt: "2026-07-12T00:00:00.000Z",
          }),
        },
        {
          id: "staff_003",
          data: () => ({
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
            createdAt: "2026-07-12T00:00:00.000Z",
            updatedAt: "2026-07-12T00:00:00.000Z",
          }),
        },
        {
          id: "staff_004",
          data: () => ({
            id: "staff_004",
            firstName: "Chloe",
            lastName: "Johnson",
            email: "chloe.johnson@shiftly.dev",
            phoneNumber: "555-0105",
            role: "employee",
            department: "Support",
            skills: ["Customer Support", "Phones"],
            isActive: true,
            maxWeeklyHours: 25,
            createdAt: "2026-07-12T00:00:00.000Z",
            updatedAt: "2026-07-12T00:00:00.000Z",
          }),
        },
      ],
    })
    .mockResolvedValueOnce({
      docs: [
        {
          id: "shift_001",
          data: () => ({
            id: "shift_001",
            title: "Morning Coverage",
            location: "Main Office",
            department: "Operations",
            startTime: "2026-07-12T08:00:00.000Z",
            endTime: "2026-07-12T16:00:00.000Z",
            requiredStaffCount: 2,
            assignedStaffIds: ["staff_001", "staff_002"],
            status: "assigned",
            notes: "Standard weekday opening shift.",
            createdBy: "staff_001",
            createdAt: "2026-07-12T00:00:00.000Z",
            updatedAt: "2026-07-12T00:00:00.000Z",
          }),
        },
        {
          id: "shift_002",
          data: () => ({
            id: "shift_002",
            title: "Evening Coverage",
            location: "Main Office",
            department: "Operations",
            startTime: "2026-07-11T16:00:00.000Z",
            endTime: "2026-07-11T22:00:00.000Z",
            requiredStaffCount: 2,
            assignedStaffIds: ["staff_003"],
            status: "assigned",
            notes: "Standard evening support shift.",
            createdBy: "staff_001",
            createdAt: "2026-07-12T00:00:00.000Z",
            updatedAt: "2026-07-12T00:00:00.000Z",
          }),
        },
      ],
    }),
}));

jest.mock("@/lib/firebase", () => ({
  auth: {},
  db: {},
}));

jest.mock("@/lib/coordinatorAuth", () => ({
  getCoordinatorStaffByEmail: jest.fn(() => Promise.resolve(mockCoordinatorStaff)),
}));

jest.mock("@/lib/seedFirestore", () => ({
  seedMockFirestore: jest.fn(),
}));

describe("Staff Directory filters", () => {
  it("filters staff by unit and availability", async () => {
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Maya Patel")).toBeInTheDocument();
    });

    expect(screen.getByText("Maya Patel")).toBeInTheDocument();
    expect(screen.getByText("Jordan Lee")).toBeInTheDocument();
    expect(screen.getByText("Avery Nguyen")).toBeInTheDocument();
    expect(screen.getByText("Chloe Johnson")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Unit"), {
      target: { value: "Operations" },
    });

    expect(screen.getByText("Maya Patel")).toBeInTheDocument();
    expect(screen.getByText("Jordan Lee")).toBeInTheDocument();
    expect(screen.queryByText("Avery Nguyen")).not.toBeInTheDocument();
    expect(screen.queryByText("Chloe Johnson")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Availability"), {
      target: { value: "available" },
    });

    expect(screen.getByText("Maya Patel")).toBeInTheDocument();
    expect(screen.queryByText("Jordan Lee")).not.toBeInTheDocument();
  });
});
