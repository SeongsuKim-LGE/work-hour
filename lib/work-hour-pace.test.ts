import { describe, expect, test } from "vitest";

import { calculatePlannedWorkHourPace } from "@/lib/work-hour-pace";

describe("calculatePlannedWorkHourPace", () => {
  test("예상누적근무시간이 정상근무시간을 넘으면 초과 예상 상태와 초과 시간을 반환한다", () => {
    const result = calculatePlannedWorkHourPace({
      normalHours: 100,
      accumulatedHours: 50,
      entries: [{ hours: 8, minutes: 0, days: 10 }],
    });

    expect(result).toEqual({
      status: "exceeded",
      totalPlannedHours: 80,
      excessHours: 30,
    });
  });

  test("예상누적근무시간이 정상근무시간과 정확히 같으면 충족 예상 상태를 반환한다", () => {
    const result = calculatePlannedWorkHourPace({
      normalHours: 100,
      accumulatedHours: 20,
      entries: [{ hours: 8, minutes: 0, days: 10 }],
    });

    expect(result).toEqual({ status: "met", totalPlannedHours: 80 });
  });

  test("예상누적근무시간이 정상근무시간보다 작으면 부족 예상 상태와 부족 시간을 반환한다", () => {
    const result = calculatePlannedWorkHourPace({
      normalHours: 100,
      accumulatedHours: 20,
      entries: [{ hours: 5, minutes: 0, days: 10 }],
    });

    expect(result).toEqual({
      status: "shortfall",
      totalPlannedHours: 50,
      shortfallHours: 30,
    });
  });

  test("여러 예상 근무 계획 항목의 합계를 반영한다", () => {
    const result = calculatePlannedWorkHourPace({
      normalHours: 100,
      accumulatedHours: 0,
      entries: [
        { hours: 8, minutes: 30, days: 3 },
        { hours: 6, minutes: 0, days: 2 },
      ],
    });

    expect(result).toEqual({ status: "shortfall", totalPlannedHours: 37.5, shortfallHours: 62.5 });
  });

  test("분(分)이 59를 넘으면 시간으로 환산해 합산한다", () => {
    const result = calculatePlannedWorkHourPace({
      normalHours: 100,
      accumulatedHours: 0,
      entries: [{ hours: 1, minutes: 90, days: 1 }],
    });

    expect(result).toEqual({ status: "shortfall", totalPlannedHours: 2.5, shortfallHours: 97.5 });
  });

  test("예상 근무 계획 항목이 없으면 총예상근무시간을 0으로 취급한다", () => {
    const result = calculatePlannedWorkHourPace({
      normalHours: 100,
      accumulatedHours: 100,
      entries: [],
    });

    expect(result).toEqual({ status: "met", totalPlannedHours: 0 });
  });

  test("정상근무시간, 누적근무시간, 또는 항목의 시간·분·일수 중 하나라도 음수이면 입력 오류 상태를 반환한다", () => {
    expect(
      calculatePlannedWorkHourPace({
        normalHours: -1,
        accumulatedHours: 0,
        entries: [],
      })
    ).toEqual({ status: "invalid" });

    expect(
      calculatePlannedWorkHourPace({
        normalHours: 100,
        accumulatedHours: -1,
        entries: [],
      })
    ).toEqual({ status: "invalid" });

    expect(
      calculatePlannedWorkHourPace({
        normalHours: 100,
        accumulatedHours: 0,
        entries: [{ hours: -1, minutes: 0, days: 1 }],
      })
    ).toEqual({ status: "invalid" });

    expect(
      calculatePlannedWorkHourPace({
        normalHours: 100,
        accumulatedHours: 0,
        entries: [{ hours: 0, minutes: -1, days: 1 }],
      })
    ).toEqual({ status: "invalid" });

    expect(
      calculatePlannedWorkHourPace({
        normalHours: 100,
        accumulatedHours: 0,
        entries: [{ hours: 0, minutes: 0, days: -1 }],
      })
    ).toEqual({ status: "invalid" });
  });

  test("여러 항목 합계가 부동소수점 오차로 목표와 근소하게 어긋나도 충족 예상으로 판정한다", () => {
    const result = calculatePlannedWorkHourPace({
      normalHours: 0.1,
      accumulatedHours: 0,
      entries: [
        { hours: 0, minutes: 1, days: 1 },
        { hours: 0, minutes: 5, days: 1 },
      ],
    });

    expect(result.status).toEqual("met");
  });

  test("항목의 시간·분·일수가 정수가 아니면 입력 오류 상태를 반환한다", () => {
    expect(
      calculatePlannedWorkHourPace({
        normalHours: 100,
        accumulatedHours: 0,
        entries: [{ hours: 8.5, minutes: 0, days: 1 }],
      })
    ).toEqual({ status: "invalid" });

    expect(
      calculatePlannedWorkHourPace({
        normalHours: 100,
        accumulatedHours: 0,
        entries: [{ hours: 0, minutes: 30.5, days: 1 }],
      })
    ).toEqual({ status: "invalid" });

    expect(
      calculatePlannedWorkHourPace({
        normalHours: 100,
        accumulatedHours: 0,
        entries: [{ hours: 0, minutes: 0, days: 1.5 }],
      })
    ).toEqual({ status: "invalid" });
  });

  test("정상근무시간, 누적근무시간, 또는 항목의 시간·분·일수 중 하나라도 숫자가 아니면(NaN) 입력 오류 상태를 반환한다", () => {
    expect(
      calculatePlannedWorkHourPace({
        normalHours: NaN,
        accumulatedHours: 0,
        entries: [],
      })
    ).toEqual({ status: "invalid" });

    expect(
      calculatePlannedWorkHourPace({
        normalHours: 100,
        accumulatedHours: 0,
        entries: [{ hours: NaN, minutes: 0, days: 1 }],
      })
    ).toEqual({ status: "invalid" });
  });
});
