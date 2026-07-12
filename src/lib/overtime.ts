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

export function calculateProjectedWeeklyHours(
  currentWeeklyHours: number,
  shiftHoursToAssign: number
) {
  if (currentWeeklyHours < 0) {
    throw new Error("currentWeeklyHours cannot be negative");
  }

  if (shiftHoursToAssign < 0) {
    throw new Error("shiftHoursToAssign cannot be negative");
  }

  return currentWeeklyHours + shiftHoursToAssign;
}

export function wouldExceedWeeklyHoursThreshold(
  currentWeeklyHours: number,
  shiftHoursToAssign: number,
  weeklyHoursThreshold = 40
) {
  if (weeklyHoursThreshold < 0) {
    throw new Error("weeklyHoursThreshold cannot be negative");
  }

  const projectedHours = calculateProjectedWeeklyHours(
    currentWeeklyHours,
    shiftHoursToAssign
  );

  return projectedHours > weeklyHoursThreshold;
}