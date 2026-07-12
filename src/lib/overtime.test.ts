import {
  calculateOvertimeHours,
  calculateProjectedWeeklyHours,
  wouldExceedWeeklyHoursThreshold,
} from "@/lib/overtime";

describe("calculateOvertimeHours", () => {
  it("returns 0 when hours are below the regular limit", () => {
    expect(calculateOvertimeHours(32)).toBe(0);
  });

  it("returns 0 when hours match the regular limit", () => {
    expect(calculateOvertimeHours(40)).toBe(0);
  });

  it("returns only the overtime hours when hours exceed the regular limit", () => {
    expect(calculateOvertimeHours(46)).toBe(6);
  });

  it("supports a custom regular-hours limit", () => {
    expect(calculateOvertimeHours(10, 8)).toBe(2);
  });
});

describe("calculateProjectedWeeklyHours", () => {
  it("adds current weekly hours and shift hours", () => {
    expect(calculateProjectedWeeklyHours(34, 8)).toBe(42);
  });

  it("throws when current weekly hours are negative", () => {
    expect(() => calculateProjectedWeeklyHours(-1, 8)).toThrow(
      "currentWeeklyHours cannot be negative"
    );
  });

  it("throws when shift hours are negative", () => {
    expect(() => calculateProjectedWeeklyHours(34, -1)).toThrow(
      "shiftHoursToAssign cannot be negative"
    );
  });
});

describe("wouldExceedWeeklyHoursThreshold", () => {
  it("returns false when projected hours are under threshold", () => {
    expect(wouldExceedWeeklyHoursThreshold(30, 8, 40)).toBe(false);
  });

  it("returns false when projected hours equal threshold", () => {
    expect(wouldExceedWeeklyHoursThreshold(32, 8, 40)).toBe(false);
  });

  it("returns true when projected hours exceed threshold", () => {
    expect(wouldExceedWeeklyHoursThreshold(36, 8, 40)).toBe(true);
  });

  it("defaults threshold to 40 when not provided", () => {
    expect(wouldExceedWeeklyHoursThreshold(39, 2)).toBe(true);
  });

  it("throws when threshold is negative", () => {
    expect(() => wouldExceedWeeklyHoursThreshold(30, 8, -1)).toThrow(
      "weeklyHoursThreshold cannot be negative"
    );
  });
});