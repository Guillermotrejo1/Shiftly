export type StaffRole = "manager" | "supervisor" | "employee";

export type ShiftStatus =
  | "draft"
  | "open"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";

export type AssignmentStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled";

export type CallOutStatus = "reported" | "approved" | "covered" | "closed";

export type AlertType =
  | "call_out"
  | "unfilled_shift"
  | "schedule_change"
  | "overtime"
  | "general";

export type AlertSeverity = "low" | "medium" | "high" | "critical";

export interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: StaffRole;
  department?: string;
  skills: string[];
  isActive: boolean;
  maxWeeklyHours?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Shift {
  id: string;
  title: string;
  location: string;
  department?: string;
  startTime: string;
  endTime: string;
  requiredStaffCount: number;
  assignedStaffIds: string[];
  status: ShiftStatus;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  shiftId: string;
  staffId: string;
  assignedBy: string;
  status: AssignmentStatus;
  assignedAt: string;
  respondedAt?: string;
  notes?: string;
}

export interface CallOut {
  id: string;
  shiftId: string;
  staffId: string;
  reason: string;
  status: CallOutStatus;
  reportedAt: string;
  approvedBy?: string;
  coveredByStaffId?: string;
  notes?: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  relatedShiftId?: string;
  relatedStaffId?: string;
  isRead: boolean;
  createdAt: string;
}