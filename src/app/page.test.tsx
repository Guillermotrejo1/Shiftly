import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import Home from "./page";

expect.extend(toHaveNoViolations);

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

const mockQueryClient = {
  removeQueries: jest.fn(),
  setQueryData: jest.fn(),
};

jest.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: jest.fn(),
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback({ email: "maya.patel@shiftly.dev" });
    return jest.fn();
  }),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn((options: { queryKey: [string, string] }) => {
    if (options.queryKey[0] === "directory-staff") {
      return {
        data: mockStaffRecords,
        error: null,
        isLoading: false,
      };
    }

    return {
      data: mockShiftRecords,
      error: null,
      isLoading: false,
    };
  }),
  useQueryClient: jest.fn(() => mockQueryClient),
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn((db, name) => ({ db, name })),
  onSnapshot: jest.fn((collectionRef, next) => {
    next({
      docs: [],
    });

    return jest.fn();
  }),
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

describe("Call-Out Log form", () => {
  it("shows validation errors for missing and short inputs", async () => {
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Call-Out Log")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Log call-out" }));
    expect(screen.getByText("Select a shift for the call-out.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Call-out shift"), {
      target: { value: "shift_001" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Log call-out" }));
    expect(screen.getByText("Select the staff member calling out.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Staff member"), {
      target: { value: "staff_001" },
    });
    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "Sick" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Log call-out" }));
    expect(screen.getByText("Enter a reason with at least 8 characters.")).toBeInTheDocument();
  });

  it("logs a call-out when the form is valid", async () => {
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Call-Out Log")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Call-out shift"), {
      target: { value: "shift_001" },
    });
    fireEvent.change(screen.getByLabelText("Staff member"), {
      target: { value: "staff_001" },
    });

    const reason = "Fever symptoms and unable to complete the shift.";
    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: reason },
    });

    fireEvent.click(screen.getByRole("button", { name: "Log call-out" }));

    await waitFor(() => {
      expect(
        screen.getByText("Call-out logged for Maya Patel on Morning Coverage.")
      ).toBeInTheDocument();
    });

    expect(screen.getByText(reason)).toBeInTheDocument();
  });
});

describe("Schedule Board keyboard navigation", () => {
  it("supports arrow key navigation between day cells", async () => {
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Weekly Schedule Board")).toBeInTheDocument();
    });

    const grid = screen.getByRole("grid", { name: "Weekly schedule board" });
    const cells = within(grid).getAllByRole("gridcell");

    expect(cells).toHaveLength(7);

    const firstCell = cells[0] as HTMLElement;
    const secondCell = cells[1] as HTMLElement;

    expect(firstCell).toHaveAttribute("tabindex", "0");
    expect(secondCell).toHaveAttribute("tabindex", "-1");

    fireEvent.keyDown(firstCell, { key: "ArrowRight" });
    await waitFor(() => {
      expect(secondCell).toHaveAttribute("tabindex", "0");
    });

    fireEvent.keyDown(secondCell, { key: "ArrowLeft" });
    await waitFor(() => {
      expect(firstCell).toHaveAttribute("tabindex", "0");
    });
  });
});

describe("Accessibility", () => {
  it("has no critical axe violations", async () => {
    const { container } = render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Weekly Schedule Board")).toBeInTheDocument();
    });

    const results = await axe(container, {
      rules: {
        region: { enabled: false },
      },
    });

    const criticalViolations = results.violations.filter(
      (violation: { impact?: string | null }) =>
        violation.impact === "critical"
    );

    expect(criticalViolations).toEqual([]);
  });
});
