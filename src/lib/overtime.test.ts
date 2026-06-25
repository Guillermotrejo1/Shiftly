import { calculateOvertimeHours } from "@/lib/overtime";

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