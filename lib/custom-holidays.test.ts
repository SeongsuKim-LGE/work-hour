import { describe, expect, test } from "vitest";

import { getCustomHolidaysInRange, type CustomHoliday } from "@/lib/custom-holidays";

describe("getCustomHolidaysInRange", () => {
  test("반복 안함 휴일은 지정된 연-월-일이 범위 안에 있을 때만 포함한다", () => {
    const holidays: CustomHoliday[] = [
      { id: "h1", name: "회사 워크숍", repeat: "none", year: 2026, month: 8, day: 25 },
    ];

    expect(
      getCustomHolidaysInRange(holidays, new Date(2026, 7, 20), new Date(2026, 8, 19))
    ).toEqual([{ id: "h1", date: "2026-08-25", name: "회사 워크숍" }]);

    expect(
      getCustomHolidaysInRange(holidays, new Date(2026, 8, 20), new Date(2026, 9, 19))
    ).toEqual([]);
  });

  test("매년 반복 휴일은 범위가 걸친 모든 연도에 대해 적용한다", () => {
    const holidays: CustomHoliday[] = [
      { id: "h2", name: "창립기념일", repeat: "yearly", year: null, month: 1, day: 5 },
    ];

    // 정산기간이 12월~1월에 걸치는 경우, 1/5가 범위 안에 있으면 포함
    expect(
      getCustomHolidaysInRange(holidays, new Date(2026, 11, 20), new Date(2027, 0, 19))
    ).toEqual([{ id: "h2", date: "2027-01-05", name: "창립기념일" }]);

    // 범위 밖이면 포함하지 않음
    expect(
      getCustomHolidaysInRange(holidays, new Date(2026, 7, 20), new Date(2026, 8, 19))
    ).toEqual([]);
  });

  test("여러 휴일을 날짜순으로 정렬해서 반환한다", () => {
    const holidays: CustomHoliday[] = [
      { id: "h3", name: "나중 일정", repeat: "none", year: 2026, month: 8, day: 28 },
      { id: "h4", name: "먼저 일정", repeat: "none", year: 2026, month: 8, day: 22 },
    ];

    expect(
      getCustomHolidaysInRange(holidays, new Date(2026, 7, 20), new Date(2026, 8, 19))
    ).toEqual([
      { id: "h4", date: "2026-08-22", name: "먼저 일정" },
      { id: "h3", date: "2026-08-28", name: "나중 일정" },
    ]);
  });
});
