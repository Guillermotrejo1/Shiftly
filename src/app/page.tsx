"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  doc,
  collection,
  deleteDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  setDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { auth, db } from "@/lib/firebase";
import {
  getCoordinatorStaffByEmail,
  type CoordinatorStaff,
} from "@/lib/coordinatorAuth";
import { seedMockFirestore } from "@/lib/seedFirestore";
import { wouldExceedWeeklyHoursThreshold } from "@/lib/overtime";
import type { Shift, Staff } from "@/types/scheduling";
import {
  AppErrorBoundary,
  GapAlertsSkeleton,
  HomeLoadingSkeleton,
  StaffDirectorySkeleton,
} from "@/components/view-state";
import type { CallOut } from "@/types/scheduling";

type DirectoryStaff = Staff & { id: string };
type AvailabilityFilter = "all" | "available" | "unavailable";
type DirectoryShift = Shift & { id: string };
type ShiftCoverageState = "filled" | "gap" | "pending";
type PostShiftMode = "gap" | "pending";
type DirectoryCallOut = CallOut;
type CallOutAuditAction = "reported" | "note_added";

type CallOutAuditEntry = {
  id: string;
  action: CallOutAuditAction;
  actorName: string;
  timestamp: string;
  detail: string;
};

type DirectoryCallOutRecord = DirectoryCallOut & {
  shiftTitle: string;
  staffName: string;
  loggedByName: string;
  auditTrail: CallOutAuditEntry[];
};

function getStartOfWeekLocal(baseDate = new Date()) {
  const result = new Date(baseDate);
  result.setHours(0, 0, 0, 0);

  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);

  return result;
}

function formatWeekdayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatLocalTime(isoDateTime: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(isoDateTime));
}

function getShiftDurationHours(shift: DirectoryShift) {
  const start = new Date(shift.startTime).getTime();
  const end = new Date(shift.endTime).getTime();
  return Math.max(0, (end - start) / (1000 * 60 * 60));
}

function getWeekStartKeyFromIso(isoDateTime: string) {
  const date = new Date(isoDateTime);
  const weekStart = getStartOfWeekLocal(date);
  return weekStart.toISOString().slice(0, 10);
}

function formatRangeDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTimeUntilShift(startTimeIso: string, nowTimestamp: number) {
  const startTimestamp = new Date(startTimeIso).getTime();
  const minutesUntilStart = Math.floor((startTimestamp - nowTimestamp) / (1000 * 60));

  if (minutesUntilStart <= 0) {
    return "Starting now";
  }

  if (minutesUntilStart < 60) {
    return `${minutesUntilStart} min`;
  }

  const hours = Math.floor(minutesUntilStart / 60);
  const minutes = minutesUntilStart % 60;

  if (hours < 24) {
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours === 0 ? `${days}d` : `${days}d ${remainingHours}h`;
}

function getShiftCoverageState(shift: DirectoryShift): ShiftCoverageState {
  if (shift.status === "draft" || shift.status === "open") {
    return "pending";
  }

  if (shift.assignedStaffIds.length < shift.requiredStaffCount) {
    return "gap";
  }

  return "filled";
}

function getCoverageStyles(state: ShiftCoverageState) {
  if (state === "filled") {
    return {
      card: "bg-emerald-50 ring-1 ring-emerald-200",
      badge: "bg-emerald-100 text-emerald-800",
    };
  }

  if (state === "gap") {
    return {
      card: "bg-rose-50 ring-1 ring-rose-200",
      badge: "bg-rose-100 text-rose-800",
    };
  }

  return {
    card: "bg-amber-50 ring-1 ring-amber-200",
    badge: "bg-amber-100 text-amber-800",
  };
}

function ModalLayer({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(children, document.body);
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [coordinatorStaff, setCoordinatorStaff] =
    useState<CoordinatorStaff | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(
    auth && db
      ? "Firebase Auth and Firestore are connected. Sign in to seed Firestore."
      : "Firebase setup is incomplete."
  );
  const [isSeeding, setIsSeeding] = useState(false);
  const [unitFilter, setUnitFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] =
    useState<AvailabilityFilter>("all");
  const [selectedStaff, setSelectedStaff] =
    useState<DirectoryStaff | null>(null);
  const [selectedGapShift, setSelectedGapShift] =
    useState<DirectoryShift | null>(null);
  const [selectedAssignmentStaffId, setSelectedAssignmentStaffId] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [isStaffDirectoryExpanded, setIsStaffDirectoryExpanded] = useState(true);
  const [isPostShiftModalOpen, setIsPostShiftModalOpen] = useState(false);
  const [isPostingShift, setIsPostingShift] = useState(false);
  const [postShiftTitle, setPostShiftTitle] = useState("");
  const [postShiftLocation, setPostShiftLocation] = useState("Main Office");
  const [postShiftDepartment, setPostShiftDepartment] = useState("Operations");
  const [postShiftStartTime, setPostShiftStartTime] = useState("");
  const [postShiftEndTime, setPostShiftEndTime] = useState("");
  const [postShiftRequiredCount, setPostShiftRequiredCount] = useState(2);
  const [postShiftNotes, setPostShiftNotes] = useState("");
  const [postShiftMode, setPostShiftMode] = useState<PostShiftMode>("gap");
  const [callOutShiftId, setCallOutShiftId] = useState("");
  const [callOutStaffId, setCallOutStaffId] = useState("");
  const [callOutReason, setCallOutReason] = useState("");
  const [callOutNotes, setCallOutNotes] = useState("");
  const [callOutError, setCallOutError] = useState<string | null>(null);
  const [callOutFeed, setCallOutFeed] = useState<DirectoryCallOutRecord[]>([]);
  const [activeScheduleCellIndex, setActiveScheduleCellIndex] = useState(0);
  const [deletingShiftId, setDeletingShiftId] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const callOutIdCounterRef = useRef(0);
  const scheduleBoardCellRefs = useRef<Array<HTMLDivElement | null>>([]);

  const queryClient = useQueryClient();

  const directoryStaffQuery = useQuery<DirectoryStaff[]>({
    queryKey: ["directory-staff", coordinatorStaff?.id ?? "none"],
    enabled: !!coordinatorStaff && !!db,
    queryFn: async () => {
      const staffSnapshot = await getDocs(collection(db!, "staff"));

      return staffSnapshot.docs
        .map(mapStaffDocument)
        .sort((a: DirectoryStaff, b: DirectoryStaff) =>
          `${a.lastName} ${a.firstName}`.localeCompare(
            `${b.lastName} ${b.firstName}`
          )
        );
    },
    staleTime: 60_000,
  });

  const directoryShiftsQuery = useQuery<DirectoryShift[]>({
    queryKey: ["directory-shifts", coordinatorStaff?.id ?? "none"],
    enabled: !!coordinatorStaff && !!db,
    queryFn: async () => {
      const shiftsSnapshot = await getDocs(collection(db!, "shifts"));

      return shiftsSnapshot.docs
        .map(mapShiftDocument)
        .sort((a: DirectoryShift, b: DirectoryShift) =>
          b.startTime.localeCompare(a.startTime)
        );
    },
    staleTime: 15_000,
  });

  const directoryStaff = directoryStaffQuery.data ?? [];
  const directoryShifts = directoryShiftsQuery.data ?? [];
  const isDirectoryLoading =
    directoryStaffQuery.isLoading || directoryShiftsQuery.isLoading;

  const dataErrorStatus = directoryStaffQuery.error
    ? `Staff directory failed to load: ${
        directoryStaffQuery.error instanceof Error
          ? directoryStaffQuery.error.message
          : "Unable to load staff directory."
      }`
    : directoryShiftsQuery.error
      ? `Shift load failed: ${
          directoryShiftsQuery.error instanceof Error
            ? directoryShiftsQuery.error.message
            : "Unable to load shifts."
        }`
      : null;

  if (dataErrorStatus) {
    throw new Error(dataErrorStatus);
  }

  const unitOptions = Array.from(
    new Set(directoryStaff.map((staff) => staff.department ?? "Unassigned"))
  ).sort((a, b) => a.localeCompare(b));

  const filteredDirectoryStaff = directoryStaff.filter((staff) => {
    const unit = staff.department ?? "Unassigned";
    const matchesUnit = unitFilter === "all" || unit === unitFilter;
    const matchesAvailability =
      availabilityFilter === "all" ||
      (availabilityFilter === "available" ? staff.isActive : !staff.isActive);

    return matchesUnit && matchesAvailability;
  });

  const selectedStaffShiftHistory = selectedStaff
    ? directoryShifts
        .filter((shift) => shift.assignedStaffIds.includes(selectedStaff.id))
        .sort((a, b) => b.startTime.localeCompare(a.startTime))
    : [];

  const selectedGapShiftWeekKey = selectedGapShift
    ? getWeekStartKeyFromIso(selectedGapShift.startTime)
    : null;

  const selectedGapShiftHours = selectedGapShift
    ? getShiftDurationHours(selectedGapShift)
    : 0;

  const staffWeeklyHours = new Map(
    directoryStaff.map((staff) => {
      if (!selectedGapShiftWeekKey) {
        return [staff.id, 0] as const;
      }

      const weeklyHours = directoryShifts
        .filter((shift) => shift.assignedStaffIds.includes(staff.id))
        .filter(
          (shift) => getWeekStartKeyFromIso(shift.startTime) === selectedGapShiftWeekKey
        )
        .reduce((total, shift) => total + getShiftDurationHours(shift), 0);

      return [staff.id, weeklyHours] as const;
    })
  );

  const eligibleStaffForGap = selectedGapShift
    ? directoryStaff
        .filter((staff) => staff.isActive)
        .filter((staff) => !selectedGapShift.assignedStaffIds.includes(staff.id))
        .filter((staff) =>
          selectedGapShift.department ? staff.department === selectedGapShift.department : true
        )
        .sort((a, b) =>
          `${a.lastName} ${a.firstName}`.localeCompare(
            `${b.lastName} ${b.firstName}`
          )
        )
    : [];

  const selectedAssignmentStaff = directoryStaff.find(
    (staff) => staff.id === selectedAssignmentStaffId
  );

  const selectedAssignmentThreshold = selectedAssignmentStaff?.maxWeeklyHours ?? 40;
  const selectedAssignmentCurrentHours = selectedAssignmentStaff
    ? staffWeeklyHours.get(selectedAssignmentStaff.id) ?? 0
    : 0;
  const selectedAssignmentProjectedHours =
    selectedAssignmentCurrentHours + selectedGapShiftHours;
  const selectedAssignmentWouldExceedThreshold =
    !!selectedAssignmentStaff &&
    wouldExceedWeeklyHoursThreshold(
      selectedAssignmentCurrentHours,
      selectedGapShiftHours,
      selectedAssignmentThreshold
    );

  const staffNameById = new Map(
    directoryStaff.map((staff) => [staff.id, `${staff.firstName} ${staff.lastName}`])
  );

  const gapAlertFeed = directoryShifts
    .filter((shift) => getShiftCoverageState(shift) === "gap")
    .filter((shift) => new Date(shift.endTime).getTime() > nowMs)
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

  const callOutShiftOptions = directoryShifts
    .filter((shift) => shift.assignedStaffIds.length > 0)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const selectedCallOutShift = callOutShiftOptions.find(
    (shift) => shift.id === callOutShiftId
  );

  const callOutStaffOptions = selectedCallOutShift
    ? directoryStaff.filter((staff) =>
        selectedCallOutShift.assignedStaffIds.includes(staff.id)
      )
    : [];

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const weekStart = getStartOfWeekLocal();
  weekStart.setDate(weekStart.getDate() + weekOffset * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const weekBoardDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const dayKey = date.toISOString().slice(0, 10);

    return {
      dayKey,
      label: formatWeekdayLabel(date),
      shifts: directoryShifts
        .filter((shift) => shift.startTime.slice(0, 10) === dayKey)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    };
  });

  function focusScheduleCell(index: number) {
    const totalCells = weekBoardDays.length;
    if (totalCells === 0) {
      return;
    }

    const normalizedIndex = (index + totalCells) % totalCells;
    setActiveScheduleCellIndex(normalizedIndex);
    scheduleBoardCellRefs.current[normalizedIndex]?.focus();
  }

  function handleScheduleCellKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>,
    cellIndex: number
  ) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusScheduleCell(cellIndex + 1);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusScheduleCell(cellIndex - 1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = cellIndex + 7;
      if (nextIndex < weekBoardDays.length) {
        focusScheduleCell(nextIndex);
      }
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = cellIndex - 7;
      if (nextIndex >= 0) {
        focusScheduleCell(nextIndex);
      }
    }
  }

  function mapStaffDocument(snapshot: QueryDocumentSnapshot<DocumentData>) {
    const staff = snapshot.data() as Staff;

    return {
      ...staff,
      id: snapshot.id,
    } satisfies DirectoryStaff;
  }

  function mapShiftDocument(snapshot: QueryDocumentSnapshot<DocumentData>) {
    const shift = snapshot.data() as Shift;

    return {
      ...shift,
      id: snapshot.id,
    } satisfies DirectoryShift;
  }

  useEffect(() => {
    const firebaseAuth = auth;

    if (!firebaseAuth) {
      setIsAuthLoading(false);
      setStatus("Firebase setup is incomplete.");
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setCurrentUser(user);
      setCoordinatorStaff(null);
      setIsAuthLoading(false);

      if (!db) {
        setStatus("Firebase setup is incomplete.");
        return;
      }

      if (!user) {
        queryClient.removeQueries({ queryKey: ["directory-staff"] });
        queryClient.removeQueries({ queryKey: ["directory-shifts"] });
        setSelectedStaff(null);
        setUnitFilter("all");
        setAvailabilityFilter("all");
        setStatus("Welcome to Shiftly. Sign in to continue.");
        return;
      }

      setStatus("Checking coordinator access...");

      void (async () => {
        const staff = await getCoordinatorStaffByEmail(user.email ?? "");

        if (!staff) {
          queryClient.removeQueries({ queryKey: ["directory-staff"] });
          queryClient.removeQueries({ queryKey: ["directory-shifts"] });
          setSelectedStaff(null);
          setUnitFilter("all");
          setAvailabilityFilter("all");
          setStatus("");
          return;
        }

        setCoordinatorStaff(staff);
        setStatus(``);
      })();
    });

    return unsubscribe;
  }, [queryClient]);

  useEffect(() => {
    if (!coordinatorStaff || !db) {
      return;
    }

    const unsubscribeShifts = onSnapshot(
      collection(db, "shifts"),
      (snapshot) => {
        const shifts = snapshot.docs
          .map(mapShiftDocument)
          .sort((a: DirectoryShift, b: DirectoryShift) =>
            b.startTime.localeCompare(a.startTime)
          );

        queryClient.setQueryData(
          ["directory-shifts", coordinatorStaff.id],
          shifts
        );
      },
      (error) => {
        const message =
          error instanceof Error ? error.message : "Unable to stream shifts.";
        setStatus(`Real-time shift feed failed: ${message}`);
      }
    );

    return () => {
      unsubscribeShifts();
    };
  }, [coordinatorStaff, queryClient]);

  async function handleCreateAccount() {
    const firebaseAuth = auth;

    if (!firebaseAuth) {
      setStatus("Firebase setup is incomplete.");
      return;
    }

    if (!email || !password) {
      setStatus("Enter an email and password first.");
      return;
    }

    setIsSubmitting(true);
    setStatus("Creating account...");

    try {
      const credential = await createUserWithEmailAndPassword(
        firebaseAuth,
        email,
        password
      );
      setStatus(`Account created and signed in as ${credential.user.email}.`);
      setEmail("");
      setPassword("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create account.";
      setStatus(`Create account failed: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignIn() {
    const firebaseAuth = auth;

    if (!firebaseAuth) {
      setStatus("Firebase setup is incomplete.");
      return;
    }

    if (!email || !password) {
      setStatus("Enter an email and password first.");
      return;
    }

    setIsSubmitting(true);
    setStatus("Signing in...");

    try {
      const credential = await signInWithEmailAndPassword(
        firebaseAuth,
        email,
        password
      );
      setStatus(`Signed in as ${credential.user.email}.`);
      setEmail("");
      setPassword("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sign in.";
      setStatus(`Sign in failed: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    const firebaseAuth = auth;

    if (!firebaseAuth) {
      setStatus("Firebase setup is incomplete.");
      return;
    }

    setIsSubmitting(true);
    setStatus("Signing out...");

    try {
      await signOut(firebaseAuth);
      setStatus("Signed out. Sign in again to seed Firestore.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sign out.";
      setStatus(`Sign out failed: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSeed() {
    if (!currentUser?.email || !coordinatorStaff) {
      setStatus("Only a coordinator can seed Firestore.");
      return;
    }

    setIsSeeding(true);
    setStatus("Checking coordinator access before seeding Firestore...");

    try {
      const result = await seedMockFirestore(currentUser.email);
      setStatus(
        `Seed complete: ${result.staffCount} staff records and ${result.shiftCount} shifts written to Firestore.`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to seed Firestore.";
      setStatus(`Seed failed: ${message}`);
    } finally {
      setIsSeeding(false);
    }
  }

  function handleOpenGapAssignment(shift: DirectoryShift) {
    setSelectedGapShift(shift);
    setSelectedAssignmentStaffId("");
  }

  function handleCloseGapAssignment() {
    setSelectedGapShift(null);
    setSelectedAssignmentStaffId("");
  }

  function resetPostShiftForm() {
    setPostShiftTitle("");
    setPostShiftLocation("Main Office");
    setPostShiftDepartment("Operations");
    setPostShiftStartTime("");
    setPostShiftEndTime("");
    setPostShiftRequiredCount(2);
    setPostShiftNotes("");
    setPostShiftMode("gap");
  }

  function handleClosePostShiftModal() {
    setIsPostShiftModalOpen(false);
    resetPostShiftForm();
  }

  async function handlePostShift() {
    if (!db || !coordinatorStaff) {
      setStatus("Only a coordinator can post future shifts.");
      return;
    }

    if (!postShiftTitle || !postShiftStartTime || !postShiftEndTime) {
      setStatus("Enter shift title, start time, and end time.");
      return;
    }

    const startDate = new Date(postShiftStartTime);
    const endDate = new Date(postShiftEndTime);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setStatus("Invalid date/time selected for the shift.");
      return;
    }

    if (endDate <= startDate) {
      setStatus("Shift end time must be after start time.");
      return;
    }

    if (postShiftRequiredCount < 1) {
      setStatus("Required staff count must be at least 1.");
      return;
    }

    setIsPostingShift(true);

    try {
      const shiftRef = doc(collection(db, "shifts"));
      const nowIso = new Date().toISOString();
      const normalizedDepartment = postShiftDepartment.trim();
      const normalizedNotes = postShiftNotes.trim();
      const nextShift: DirectoryShift = {
        id: shiftRef.id,
        title: postShiftTitle.trim(),
        location: postShiftLocation.trim() || "Main Office",
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        requiredStaffCount: postShiftRequiredCount,
        assignedStaffIds: [],
        status: postShiftMode === "gap" ? "assigned" : "open",
        createdBy: coordinatorStaff.id,
        createdAt: nowIso,
        updatedAt: nowIso,
        ...(normalizedDepartment ? { department: normalizedDepartment } : {}),
        ...(normalizedNotes ? { notes: normalizedNotes } : {}),
      };

      await setDoc(shiftRef, nextShift);

      queryClient.setQueryData<DirectoryShift[]>(
        ["directory-shifts", coordinatorStaff.id],
        (previousShifts: DirectoryShift[] = []) => {
        const mergedShifts = [nextShift, ...previousShifts];
        const uniqueShifts = Array.from(
          new Map(mergedShifts.map((shift) => [shift.id, shift])).values()
        );

        return uniqueShifts.sort((a, b) => b.startTime.localeCompare(a.startTime));
      }
      );

      setStatus(
        `Posted shift "${nextShift.title}" for ${formatRangeDate(startDate)}.`
      );
      handleClosePostShiftModal();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to post shift.";
      setStatus(`Post shift failed: ${message}`);
    } finally {
      setIsPostingShift(false);
    }
  }

  async function handleDeleteShift(shift: DirectoryShift) {
    if (!db || !coordinatorStaff) {
      setStatus("Only a coordinator can delete shifts.");
      return;
    }

    const confirmed = window.confirm(
      `Delete shift "${shift.title}" on ${formatRangeDate(new Date(shift.startTime))}?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingShiftId(shift.id);

    try {
      await deleteDoc(doc(db, "shifts", shift.id));
      queryClient.setQueryData<DirectoryShift[]>(
        ["directory-shifts", coordinatorStaff.id],
        (previousShifts: DirectoryShift[] = []) =>
          previousShifts.filter((existingShift) => existingShift.id !== shift.id)
      );

      if (selectedGapShift?.id === shift.id) {
        handleCloseGapAssignment();
      }

      setStatus(`Deleted shift "${shift.title}".`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete shift.";
      setStatus(`Delete shift failed: ${message}`);
    } finally {
      setDeletingShiftId("");
    }
  }

  async function handleAssignToGap() {
    if (!db || !coordinatorStaff) {
      setStatus("Only a coordinator can assign staff to shifts.");
      return;
    }

    if (!selectedGapShift || !selectedAssignmentStaffId) {
      setStatus("Choose a staff member to assign first.");
      return;
    }

    if (selectedAssignmentWouldExceedThreshold) {
      setStatus(
        `Assignment blocked: projected hours (${selectedAssignmentProjectedHours.toFixed(1)}) exceed threshold (${selectedAssignmentThreshold}).`
      );
      return;
    }

    try {
      const shiftRef = doc(db, "shifts", selectedGapShift.id);
      const assignedStaffId = selectedAssignmentStaffId;

      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(shiftRef);

        if (!snapshot.exists()) {
          throw new Error("Shift no longer exists.");
        }

        const shift = snapshot.data() as Shift;
        const hasStaffAlready = shift.assignedStaffIds.includes(assignedStaffId);

        if (hasStaffAlready) {
          return;
        }

        const nextAssignedStaffIds = [...shift.assignedStaffIds, assignedStaffId];

        transaction.update(shiftRef, {
          assignedStaffIds: nextAssignedStaffIds,
          status:
            nextAssignedStaffIds.length >= shift.requiredStaffCount
              ? "assigned"
              : shift.status,
          updatedAt: new Date().toISOString(),
        });
      });

      queryClient.setQueryData<DirectoryShift[]>(
        ["directory-shifts", coordinatorStaff.id],
        (previousShifts: DirectoryShift[] = []) =>
          previousShifts.map((shift) => {
            if (shift.id !== selectedGapShift.id) {
              return shift;
            }

            const hasStaffAlready = shift.assignedStaffIds.includes(assignedStaffId);
            const nextAssignedStaffIds = hasStaffAlready
              ? shift.assignedStaffIds
              : [...shift.assignedStaffIds, assignedStaffId];

            return {
              ...shift,
              assignedStaffIds: nextAssignedStaffIds,
              status:
                nextAssignedStaffIds.length >= shift.requiredStaffCount
                  ? "assigned"
                  : shift.status,
              updatedAt: new Date().toISOString(),
            };
          })
      );

      const assignedStaffName =
        staffNameById.get(assignedStaffId) ?? assignedStaffId;
      setStatus(`Assigned ${assignedStaffName} to ${selectedGapShift.title}.`);
      handleCloseGapAssignment();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to assign shift.";
      setStatus(`Assign failed: ${message}`);
    }
  }

  function resetCallOutForm() {
    setCallOutShiftId("");
    setCallOutStaffId("");
    setCallOutReason("");
    setCallOutNotes("");
    setCallOutError(null);
  }

  function handleSubmitCallOut(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!coordinatorStaff) {
      setCallOutError("Only a coordinator can log call-outs.");
      return;
    }

    if (!callOutShiftId) {
      setCallOutError("Select a shift for the call-out.");
      return;
    }

    if (!callOutStaffId) {
      setCallOutError("Select the staff member calling out.");
      return;
    }

    const trimmedReason = callOutReason.trim();
    if (trimmedReason.length < 8) {
      setCallOutError("Enter a reason with at least 8 characters.");
      return;
    }

    const trimmedNotes = callOutNotes.trim();
    if (trimmedNotes.length > 280) {
      setCallOutError("Notes must be 280 characters or fewer.");
      return;
    }

    if (!selectedCallOutShift) {
      setCallOutError("Selected shift is no longer available.");
      return;
    }

    if (!selectedCallOutShift.assignedStaffIds.includes(callOutStaffId)) {
      setCallOutError("Selected staff member is not assigned to this shift.");
      return;
    }

    callOutIdCounterRef.current += 1;
    const entryId = `callout_${callOutIdCounterRef.current}`;
    const reportedAtIso = new Date().toISOString();
    const coordinatorName = `${coordinatorStaff.firstName} ${coordinatorStaff.lastName}`;
    const staffName = staffNameById.get(callOutStaffId) ?? callOutStaffId;

    const auditTrail: CallOutAuditEntry[] = [
      {
        id: `${entryId}_reported`,
        action: "reported",
        actorName: coordinatorName,
        timestamp: reportedAtIso,
        detail: `Marked ${staffName} as called out for ${selectedCallOutShift.title}.`,
      },
    ];

    if (trimmedNotes) {
      auditTrail.push({
        id: `${entryId}_note_added`,
        action: "note_added",
        actorName: coordinatorName,
        timestamp: reportedAtIso,
        detail: "Added supporting notes for coverage context.",
      });
    }

    const entry: DirectoryCallOutRecord = {
      id: entryId,
      shiftId: selectedCallOutShift.id,
      staffId: callOutStaffId,
      reason: trimmedReason,
      status: "reported",
      reportedAt: reportedAtIso,
      shiftTitle: selectedCallOutShift.title,
      staffName,
      loggedByName: coordinatorName,
      auditTrail,
      ...(trimmedNotes ? { notes: trimmedNotes } : {}),
    };

    setCallOutFeed((previous) => [entry, ...previous].slice(0, 25));
    setStatus(`Call-out logged for ${staffName} on ${selectedCallOutShift.title}.`);
    resetCallOutForm();
  }

  const showLoadingSkeleton = isAuthLoading;

  return (
    <AppErrorBoundary
      title="Shiftly dashboard failed"
      description="Refresh the page to try loading the dashboard again."
    >
      {showLoadingSkeleton ? (
        <HomeLoadingSkeleton />
      ) : (
    <main className="app-shell">
      <div className="app-frame stagger">
        <div className="inline-flex w-fit items-center rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-900">
          Live operations hub
        </div>
        <h1 className="view-title mt-3">
          Shiftly
        </h1>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link href="/coordinator" className="nav-chip">
            Coordinator view
          </Link>
          <Link href="/manager" className="nav-chip">
            Manager view
          </Link>
          <Link href="/staff" className="nav-chip">
            Staff view
          </Link>
        </div>
        <p className="view-subtitle mt-4 text-base leading-7">
          {status}
        </p>
        <div className="dashboard-matrix mt-8">
          <section className="control-rail">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-100/90">Identity access</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-1">
              <label className="text-sm font-medium text-cyan-50">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  suppressHydrationWarning
                  className="mt-2 w-full rounded-2xl border border-cyan-300/50 bg-cyan-50/95 px-4 py-3 text-zinc-950 outline-none transition focus:border-emerald-300"
                  placeholder="spider@gmail.com"
                  autoComplete="email"
                />
              </label>
              <label className="text-sm font-medium text-cyan-50">
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  suppressHydrationWarning
                  className="mt-2 w-full rounded-2xl border border-cyan-300/50 bg-cyan-50/95 px-4 py-3 text-zinc-950 outline-none transition focus:border-emerald-300"
                  placeholder="At least 6 characters"
                  autoComplete="current-password"
                />
              </label>
            </div>
          </section>

          <div className="control-rail mt-0 flex flex-wrap gap-3">
            {!currentUser && (
              <button
                type="button"
                onClick={handleCreateAccount}
                disabled={isSubmitting || isAuthLoading || !(auth && db)}
                className="rounded-full bg-cyan-200 px-5 py-3 text-sm font-semibold text-cyan-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {isSubmitting ? "Working..." : "Create account"}
              </button>
            )}
            {!currentUser && (
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isSubmitting || isAuthLoading || !(auth && db)}
                className="rounded-full border border-cyan-200 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-100 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400"
              >
                Sign in
              </button>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSubmitting || isAuthLoading || !currentUser}
              className="rounded-full border border-cyan-200 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-100 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400"
            >
              Sign out
            </button>
          </div>

          <div className="control-rail mt-0 text-sm leading-6">
            <p>{isAuthLoading ? "Checking auth session..." : currentUser ? `Current user: ${currentUser.email}` : "No user is signed in."}</p>
          </div>

          {coordinatorStaff ? (
            <div className="control-rail mt-0 p-6 text-sm leading-6">
              <p>This will write:</p>
              <p>12 mock staff records into the staff collection.</p>
              <p>14 mock shifts covering one full week into the shifts collection.</p>
            </div>
          ) : null}

          {coordinatorStaff ? (
            <button
              type="button"
              onClick={handleSeed}
              disabled={isSeeding || isSubmitting || !(auth && db)}
              className="mt-0 rounded-full bg-emerald-300 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {isSeeding ? "Seeding..." : "Seed Firestore"}
            </button>
          ) : null}
        {coordinatorStaff ? (
          <section className="section-card mt-8 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-zinc-950">Real-time Gap Alerts</h2>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-800">
                  {gapAlertFeed.length} open gaps
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                  Live
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {isDirectoryLoading ? (
                <GapAlertsSkeleton />
              ) : gapAlertFeed.length === 0 ? (
                <p className="rounded-2xl bg-zinc-100 p-4 text-sm text-zinc-700">
                  No real-time gap alerts right now.
                </p>
              ) : (
                gapAlertFeed.slice(0, 8).map((shift) => (
                  <article
                    key={shift.id}
                    className="rounded-2xl border border-rose-200 bg-rose-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-zinc-900">{shift.title}</h3>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                          {formatTimeUntilShift(shift.startTime, nowMs)}
                        </span>
                        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-800">
                          Gap
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-zinc-700">
                      {formatWeekdayLabel(new Date(shift.startTime))} · {formatLocalTime(shift.startTime)} - {formatLocalTime(shift.endTime)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      {shift.location}
                      {shift.department ? ` | ${shift.department}` : ""}
                    </p>
                    {shift.notes ? (
                      <p className="mt-2 rounded-lg bg-white/80 px-2 py-1 text-xs text-zinc-700 ring-1 ring-rose-200/60">
                        Note: {shift.notes}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs font-medium text-rose-700">
                      Assigned {shift.assignedStaffIds.length} of {shift.requiredStaffCount}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : null}
        {coordinatorStaff ? (
          <section className="section-card mt-8 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-zinc-950">Weekly Schedule Board</h2>
                <p className="text-sm text-zinc-600">
                  {formatRangeDate(weekStart)} - {formatRangeDate(weekEnd)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPostShiftModalOpen(true)}
                  className="rounded-full bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800"
                >
                  Post shift
                </button>
                <button
                  type="button"
                  onClick={() => setWeekOffset((previous) => previous - 1)}
                  className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-900 transition hover:border-zinc-950"
                >
                  Prev week
                </button>
                <button
                  type="button"
                  onClick={() => setWeekOffset(0)}
                  className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-900 transition hover:border-zinc-950"
                >
                  Current week
                </button>
                <button
                  type="button"
                  onClick={() => setWeekOffset((previous) => previous + 1)}
                  className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-900 transition hover:border-zinc-950"
                >
                  Next week
                </button>
                <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs text-zinc-600">
                  {directoryShifts.length} shifts loaded
                </span>
              </div>
            </div>

            <div
              role="grid"
              aria-label="Weekly schedule board"
              aria-colcount={weekBoardDays.length}
              aria-rowcount={1}
            >
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-7" role="row">
              {weekBoardDays.map((day, index) => (
                <div
                  key={day.dayKey}
                  ref={(element) => {
                    scheduleBoardCellRefs.current[index] = element;
                  }}
                  role="gridcell"
                  aria-colindex={index + 1}
                  aria-rowindex={1}
                  tabIndex={activeScheduleCellIndex === index ? 0 : -1}
                  onFocus={() => setActiveScheduleCellIndex(index)}
                  onKeyDown={(event) => handleScheduleCellKeyDown(event, index)}
                  className="min-h-64 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-200 pb-3">
                    <p className="text-sm font-semibold text-zinc-900">{day.label}</p>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200">
                      {day.shifts.length}
                    </span>
                  </div>

                  <div className="mt-3 space-y-3">
                    {day.shifts.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-3 text-xs text-zinc-500">
                        No shifts scheduled.
                      </p>
                    ) : (
                      day.shifts.map((shift) => {
                        const coverageState = getShiftCoverageState(shift);
                        const coverageStyles = getCoverageStyles(coverageState);
                        const canAssign = coverageState === "gap";

                        return (
                          <article
                            key={shift.id}
                            onClick={canAssign ? () => handleOpenGapAssignment(shift) : undefined}
                            className={`rounded-xl p-3 text-xs text-zinc-700 ${coverageStyles.card} ${
                              canAssign ? "cursor-pointer transition hover:brightness-95" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="font-semibold text-zinc-900">{shift.title}</h3>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${coverageStyles.badge}`}
                                >
                                  {coverageState}
                                </span>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleDeleteShift(shift);
                                  }}
                                  disabled={deletingShiftId === shift.id}
                                  className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-700 transition hover:border-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400"
                                >
                                  {deletingShiftId === shift.id ? "Deleting..." : "Delete"}
                                </button>
                              </div>
                            </div>
                            <p className="mt-1 text-zinc-600">
                              {formatLocalTime(shift.startTime)} - {formatLocalTime(shift.endTime)}
                            </p>
                            <p className="mt-1 text-zinc-600">{shift.location}</p>
                            {shift.notes ? (
                              <p className="mt-1 rounded-lg bg-white/80 px-2 py-1 text-[11px] text-zinc-700 ring-1 ring-zinc-200">
                                Note: {shift.notes}
                              </p>
                            ) : null}
                            <p className="mt-1 text-zinc-500">
                              Assigned: {shift.assignedStaffIds.length}/{shift.requiredStaffCount}
                            </p>
                            {canAssign ? (
                              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                                Click to assign staff
                              </p>
                            ) : null}
                            {shift.assignedStaffIds.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {shift.assignedStaffIds.slice(0, 3).map((staffId) => (
                                  <span
                                    key={staffId}
                                    className="rounded-full bg-white px-2 py-0.5 text-[10px] text-zinc-700 ring-1 ring-zinc-200"
                                  >
                                    {staffNameById.get(staffId) ?? staffId}
                                  </span>
                                ))}
                                {shift.assignedStaffIds.length > 3 ? (
                                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-zinc-700 ring-1 ring-zinc-200">
                                    +{shift.assignedStaffIds.length - 3} more
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </article>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
              <span className="font-medium text-zinc-700">Legend:</span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">filled</span>
              <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-800">gap</span>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">pending</span>
            </div>
          </section>
        ) : null}
        {coordinatorStaff ? (
          <section className="section-card mt-8 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-zinc-950">Staff Directory</h2>
                <p className="text-sm text-zinc-600">
                  Showing {filteredDirectoryStaff.length} of {directoryStaff.length} staff
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setIsStaffDirectoryExpanded((previous) => !previous)
                }
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:border-zinc-950"
              >
                {isStaffDirectoryExpanded ? "Collapse" : "Expand"}
              </button>
            </div>

            {isStaffDirectoryExpanded ? (
              <>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-zinc-900">
                Unit
                <select
                  value={unitFilter}
                  onChange={(event) => setUnitFilter(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-950"
                >
                  <option value="all">All units</option>
                  {unitOptions.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-zinc-900">
                Availability
                <select
                  value={availabilityFilter}
                  onChange={(event) =>
                    setAvailabilityFilter(event.target.value as AvailabilityFilter)
                  }
                  className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-950"
                >
                  <option value="all">All statuses</option>
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </label>
                </div>

                <div className="mt-6 space-y-3">
              {isDirectoryLoading ? (
                <StaffDirectorySkeleton />
              ) : filteredDirectoryStaff.length === 0 ? (
                <p className="rounded-2xl bg-zinc-100 p-4 text-sm text-zinc-700">
                  No staff match the current filters.
                </p>
              ) : (
                filteredDirectoryStaff.map((staff) => (
                  <article
                    key={staff.id}
                    className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-semibold text-zinc-900">
                        {staff.firstName} {staff.lastName}
                      </h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          staff.isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-zinc-200 text-zinc-700"
                        }`}
                      >
                        {staff.isActive ? "Available" : "Unavailable"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-700">{staff.email}</p>
                    <p className="mt-1 text-sm text-zinc-600">
                      Unit: {staff.department ?? "Unassigned"} | Role: {staff.role}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedStaff(staff)}
                      className="mt-4 rounded-full border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-900 transition hover:border-zinc-950"
                    >
                      View profile
                    </button>
                  </article>
                ))
              )}
                </div>
              </>
            ) : (
              <p className="mt-4 rounded-2xl bg-zinc-100 p-4 text-sm text-zinc-700">
                Directory collapsed. Expand to view staff filters and profiles.
              </p>
            )}
          </section>
        ) : null}
        {coordinatorStaff ? (
          <section className="section-card mt-8 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-zinc-950">Call-Out Log</h2>
                <p className="text-sm text-zinc-600">
                  Capture call-outs with validation and keep a recent timeline.
                </p>
              </div>
              <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs text-zinc-600">
                {callOutFeed.length} logged
              </span>
            </div>

            <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmitCallOut}>
              <label className="text-sm font-medium text-zinc-900">
                Call-out shift
                <select
                  value={callOutShiftId}
                  onChange={(event) => {
                    setCallOutShiftId(event.target.value);
                    setCallOutStaffId("");
                    setCallOutError(null);
                  }}
                  className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-950"
                >
                  <option value="">Select a shift</option>
                  {callOutShiftOptions.map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.title} - {formatWeekdayLabel(new Date(shift.startTime))}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-zinc-900">
                Staff member
                <select
                  value={callOutStaffId}
                  onChange={(event) => {
                    setCallOutStaffId(event.target.value);
                    setCallOutError(null);
                  }}
                  className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-950"
                >
                  <option value="">Select staff</option>
                  {callOutStaffOptions.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.firstName} {staff.lastName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-zinc-900 sm:col-span-2">
                Reason
                <textarea
                  value={callOutReason}
                  onChange={(event) => {
                    setCallOutReason(event.target.value);
                    setCallOutError(null);
                  }}
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-950"
                  placeholder="Brief reason for this call-out"
                />
              </label>

              <label className="text-sm font-medium text-zinc-900 sm:col-span-2">
                Notes (optional)
                <textarea
                  value={callOutNotes}
                  onChange={(event) => {
                    setCallOutNotes(event.target.value);
                    setCallOutError(null);
                  }}
                  rows={2}
                  className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-950"
                  placeholder="Optional context for coverage"
                />
              </label>

              {callOutError ? (
                <p className="sm:col-span-2 rounded-2xl bg-rose-100 p-3 text-sm text-rose-800" role="alert">
                  {callOutError}
                </p>
              ) : null}

              <div className="sm:col-span-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetCallOutForm}
                  className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-900 transition hover:border-zinc-950"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  Log call-out
                </button>
              </div>
            </form>

            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-900">Call-out history</h3>
              {callOutFeed.length === 0 ? (
                <p className="rounded-2xl bg-zinc-100 p-4 text-sm text-zinc-700">
                  No call-outs logged yet.
                </p>
              ) : (
                callOutFeed.map((entry) => (
                  <article key={entry.id} className="rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-200">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-zinc-900">
                        {entry.staffName} · {entry.status}
                      </p>
                      <span className="rounded-full bg-zinc-200 px-2.5 py-1 text-xs text-zinc-700">
                        {entry.shiftTitle}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-700">{entry.reason}</p>
                    {entry.notes ? (
                      <p className="mt-2 rounded-lg bg-white px-2.5 py-1.5 text-xs text-zinc-700 ring-1 ring-zinc-200">
                        Notes: {entry.notes}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-zinc-600">
                      Reported {new Date(entry.reportedAt).toLocaleString()}
                    </p>

                    <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-zinc-200">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                        Audit trail
                      </p>
                      <ul className="mt-2 space-y-2">
                        {entry.auditTrail.map((auditEvent) => (
                          <li key={auditEvent.id} className="rounded-lg bg-zinc-50 p-2">
                            <p className="text-xs font-medium text-zinc-800">
                              {auditEvent.action === "reported" ? "Reported" : "Note Added"}
                            </p>
                            <p className="mt-0.5 text-xs text-zinc-700">{auditEvent.detail}</p>
                            <p className="mt-1 text-[11px] text-zinc-500">
                              {auditEvent.actorName} · {new Date(auditEvent.timestamp).toLocaleString()}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : null}
        </div>
        {selectedStaff ? (
          <ModalLayer>
            <div className="fixed inset-0 z-70 flex items-center justify-center bg-zinc-950/60 p-4">
            <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-zinc-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-zinc-950">
                    {selectedStaff.firstName} {selectedStaff.lastName}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-600">
                    {selectedStaff.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStaff(null)}
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:border-zinc-950"
                >
                  Close
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-zinc-100 p-4 text-sm leading-6 text-zinc-700">
                  <p className="font-medium text-zinc-900">Profile</p>
                  <p className="mt-2">Unit: {selectedStaff.department ?? "Unassigned"}</p>
                  <p>Role: {selectedStaff.role}</p>
                  <p>
                    Availability: {selectedStaff.isActive ? "Available" : "Unavailable"}
                  </p>
                  <p>
                    Max weekly hours: {selectedStaff.maxWeeklyHours ?? "Not set"}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4 text-sm leading-6 text-zinc-700">
                  <p className="font-medium text-zinc-900">Skills</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedStaff.skills.length > 0 ? (
                      selectedStaff.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-800 ring-1 ring-zinc-200"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <p>No skills listed.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-zinc-950">
                    Shift History
                  </h3>
                  <p className="text-sm text-zinc-600">
                    Read-only
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  {selectedStaffShiftHistory.length === 0 ? (
                    <p className="rounded-2xl bg-zinc-100 p-4 text-sm text-zinc-700">
                      No shifts found for this staff member.
                    </p>
                  ) : (
                    selectedStaffShiftHistory.map((shift) => (
                      <article
                        key={shift.id}
                        className="rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-200"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="font-medium text-zinc-950">
                            {shift.title}
                          </h4>
                          <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700">
                            {shift.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-zinc-700">
                          {new Date(shift.startTime).toLocaleString()} - {new Date(shift.endTime).toLocaleString()}
                        </p>
                        <p className="mt-1 text-sm text-zinc-600">
                          Location: {shift.location}
                          {shift.department ? ` | Unit: ${shift.department}` : ""}
                        </p>
                        {shift.notes ? (
                          <p className="mt-2 text-sm text-zinc-600">{shift.notes}</p>
                        ) : null}
                      </article>
                    ))
                  )}
                </div>
              </div>
            </div>
            </div>
          </ModalLayer>
        ) : null}
        {selectedGapShift ? (
          <ModalLayer>
            <div className="fixed inset-0 z-70 flex items-center justify-center bg-zinc-950/60 p-4">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-zinc-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-950">Assign Shift Coverage</h2>
                  <p className="mt-1 text-sm text-zinc-600">
                    {selectedGapShift.title} · {formatLocalTime(selectedGapShift.startTime)} - {formatLocalTime(selectedGapShift.endTime)}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {selectedGapShift.location}
                    {selectedGapShift.department ? ` | Unit: ${selectedGapShift.department}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseGapAssignment}
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:border-zinc-950"
                >
                  Close
                </button>
              </div>

              <div className="mt-6 rounded-2xl bg-zinc-100 p-4 text-sm text-zinc-700">
                Remaining slots: {Math.max(0, selectedGapShift.requiredStaffCount - selectedGapShift.assignedStaffIds.length)}
              </div>

              <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                {eligibleStaffForGap.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600">
                    No eligible active staff found for this unit.
                  </p>
                ) : (
                  eligibleStaffForGap.map((staff) => (
                    (() => {
                      const currentHours = staffWeeklyHours.get(staff.id) ?? 0;
                      const projectedHours = currentHours + selectedGapShiftHours;
                      const threshold = staff.maxWeeklyHours ?? 40;
                      const wouldExceed = wouldExceedWeeklyHoursThreshold(
                        currentHours,
                        selectedGapShiftHours,
                        threshold
                      );

                      return (
                    <label
                      key={staff.id}
                      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3"
                    >
                      <input
                        type="radio"
                        name="assignmentStaff"
                        value={staff.id}
                        checked={selectedAssignmentStaffId === staff.id}
                        onChange={(event) => setSelectedAssignmentStaffId(event.target.value)}
                        className="mt-1"
                      />
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          {staff.firstName} {staff.lastName}
                        </p>
                        <p className="text-xs text-zinc-600">
                          {staff.role} · {staff.department ?? "Unassigned"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Weekly hours: {currentHours.toFixed(1)} / {threshold} · Projected: {projectedHours.toFixed(1)}
                        </p>
                        {wouldExceed ? (
                          <p className="mt-1 text-xs font-medium text-rose-700">
                            Overtime warning: exceeds threshold.
                          </p>
                        ) : null}
                      </div>
                    </label>
                      );
                    })()
                  ))
                )}
              </div>

              {selectedAssignmentWouldExceedThreshold ? (
                <p className="mt-4 rounded-2xl bg-rose-100 p-3 text-sm text-rose-800">
                  Assignment blocked: projected weekly hours exceed the threshold.
                </p>
              ) : null}

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseGapAssignment}
                  className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-900 transition hover:border-zinc-950"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignToGap}
                  disabled={!selectedAssignmentStaffId || selectedAssignmentWouldExceedThreshold}
                  className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                >
                  Assign to shift
                </button>
              </div>
            </div>
            </div>
          </ModalLayer>
        ) : null}
        {isPostShiftModalOpen ? (
          <ModalLayer>
            <div className="fixed inset-0 z-70 flex items-center justify-center bg-zinc-950/60 p-4">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-zinc-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-950">Post Future Shift</h2>
                  <p className="mt-1 text-sm text-zinc-600">
                    Create a future shift as a gap or pending opening.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClosePostShiftModal}
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:border-zinc-950"
                >
                  Close
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-zinc-900 sm:col-span-2">
                  Shift title
                  <input
                    type="text"
                    value={postShiftTitle}
                    onChange={(event) => setPostShiftTitle(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-950"
                    placeholder="Morning Coverage"
                  />
                </label>

                <label className="text-sm font-medium text-zinc-900">
                  Start (local)
                  <input
                    type="datetime-local"
                    value={postShiftStartTime}
                    onChange={(event) => setPostShiftStartTime(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-950"
                  />
                </label>

                <label className="text-sm font-medium text-zinc-900">
                  End (local)
                  <input
                    type="datetime-local"
                    value={postShiftEndTime}
                    onChange={(event) => setPostShiftEndTime(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-950"
                  />
                </label>

                <label className="text-sm font-medium text-zinc-900">
                  Location
                  <input
                    type="text"
                    value={postShiftLocation}
                    onChange={(event) => setPostShiftLocation(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-950"
                    placeholder="Main Office"
                  />
                </label>

                <label className="text-sm font-medium text-zinc-900">
                  Unit
                  <input
                    type="text"
                    value={postShiftDepartment}
                    onChange={(event) => setPostShiftDepartment(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-950"
                    placeholder="Operations"
                  />
                </label>

                <label className="text-sm font-medium text-zinc-900">
                  Required staff
                  <input
                    type="number"
                    min={1}
                    value={postShiftRequiredCount}
                    onChange={(event) =>
                      setPostShiftRequiredCount(Number(event.target.value) || 1)
                    }
                    className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-950"
                  />
                </label>

                <label className="text-sm font-medium text-zinc-900">
                  Post as
                  <select
                    value={postShiftMode}
                    onChange={(event) =>
                      setPostShiftMode(event.target.value as PostShiftMode)
                    }
                    className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-950"
                  >
                    <option value="gap">Gap (clickable for assignment)</option>
                    <option value="pending">Pending opening</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-zinc-900 sm:col-span-2">
                  Notes
                  <textarea
                    value={postShiftNotes}
                    onChange={(event) => setPostShiftNotes(event.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-950"
                    placeholder="Optional shift notes"
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClosePostShiftModal}
                  className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-900 transition hover:border-zinc-950"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePostShift}
                  disabled={isPostingShift}
                  className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                >
                  {isPostingShift ? "Posting..." : "Post shift"}
                </button>
              </div>
            </div>
            </div>
          </ModalLayer>
        ) : null}
      </div>
    </main>
      )}
    </AppErrorBoundary>
  );
}