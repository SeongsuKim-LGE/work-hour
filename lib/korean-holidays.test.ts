import { describe, expect, test } from "vitest";

import {
  getHolidaysInRange,
  getKoreanHolidaysForMonth,
} from "@/lib/korean-holidays";

describe("getKoreanHolidaysForMonth", () => {
  test("2026년 8월의 공휴일 목록을 반환한다", () => {
    const result = getKoreanHolidaysForMonth(2026, 8);

    expect(result).toEqual([
      { date: "2026-08-15", name: "광복절" },
      { date: "2026-08-17", name: "광복절 대체공휴일" },
    ]);
  });

  test("공휴일이 없는 달은 빈 배열을 반환한다", () => {
    const result = getKoreanHolidaysForMonth(2026, 11);

    expect(result).toEqual([]);
  });

  test("2027년 크리스마스가 토요일이라 12월 27일 대체공휴일도 포함한다", () => {
    const result = getKoreanHolidaysForMonth(2027, 12);

    expect(result).toEqual([
      { date: "2027-12-25", name: "크리스마스" },
      { date: "2027-12-27", name: "크리스마스 대체공휴일" },
    ]);
  });

  test("설날처럼 여러 날에 걸친 공휴일도 각각 포함한다", () => {
    const result = getKoreanHolidaysForMonth(2026, 2);

    expect(result).toEqual([
      { date: "2026-02-16", name: "설날 연휴" },
      { date: "2026-02-17", name: "설날" },
      { date: "2026-02-18", name: "설날 연휴" },
    ]);
  });
});

describe("getHolidaysInRange", () => {
  test("정산기간(월 경계를 넘는 범위) 내의 공휴일만 반환한다", () => {
    // 2026-08-20 ~ 2026-09-19: 8/17 대체공휴일은 범위 밖(이전), 9/24 추석은 범위 밖(이후)
    const result = getHolidaysInRange(
      new Date(2026, 7, 20),
      new Date(2026, 8, 19)
    );

    expect(result).toEqual([]);
  });

  test("범위 내에 있는 공휴일은 정확히 포함한다", () => {
    // 2026-08-01 ~ 2026-08-20: 8/15 광복절, 8/17 대체공휴일 포함, 8/20은 범위 끝
    const result = getHolidaysInRange(
      new Date(2026, 7, 1),
      new Date(2026, 7, 20)
    );

    expect(result).toEqual([
      { date: "2026-08-15", name: "광복절" },
      { date: "2026-08-17", name: "광복절 대체공휴일" },
    ]);
  });

  test("시작일과 종료일 경계값도 포함한다", () => {
    const result = getHolidaysInRange(
      new Date(2026, 7, 15),
      new Date(2026, 7, 15)
    );

    expect(result).toEqual([{ date: "2026-08-15", name: "광복절" }]);
  });
});
