export function calculateOvertimeHours(
  totalHoursWorked: number,
  regularHoursLimit = 40
) {
  if (totalHoursWorked < 0) {
    throw new Error("totalHoursWorked cannot be negative");
  }

  if (regularHoursLimit < 0) {
    throw new Error("regularHoursLimit cannot be negative");
  }

  return Math.max(0, totalHoursWorked - regularHoursLimit);
}