import { describe, expect, test } from "vitest";

import { getRemainingWorkDays } from "@/lib/remaining-work-days";

describe("getRemainingWorkDays", () => {
  test("주말을 제외하고 남은 근무 일수를 센다", () => {
    // 2026-08-20(목) ~ 2026-08-23(일): 목,금,토,일 중 주말 2일 제외 -> 2일
    const result = getRemainingWorkDays(
      new Date(2026, 7, 20),
      new Date(2026, 7, 23)
    );

    expect(result).toBe(2);
  });

  test("공휴일도 제외하고 센다", () => {
    // 2026-08-14(금) ~ 2026-08-17(월): 8/15 광복절(토), 8/16(일), 8/17 대체공휴일(월) 모두 제외 -> 금요일 하루만 남음
    const result = getRemainingWorkDays(
      new Date(2026, 7, 14),
      new Date(2026, 7, 17)
    );

    expect(result).toBe(1);
  });

  test("정산기간 전체(8/20~9/19)에서 주말을 제외한다", () => {
    const result = getRemainingWorkDays(
      new Date(2026, 7, 20),
      new Date(2026, 8, 19)
    );

    expect(result).toBe(22);
  });

  test("시작일이 종료일보다 늦으면 0을 반환한다", () => {
    const result = getRemainingWorkDays(
      new Date(2026, 7, 25),
      new Date(2026, 7, 20)
    );

    expect(result).toBe(0);
  });
});
