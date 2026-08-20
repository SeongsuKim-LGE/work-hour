import { describe, expect, test } from "vitest";

import {
  getSettlementPeriod,
  getSettlementPeriodLabel,
} from "@/lib/settlement-period";

describe("getSettlementPeriod", () => {
  test("정산기간의 시작일과 종료일을 Date로 반환한다", () => {
    const { start, end } = getSettlementPeriod(new Date(2026, 7, 20));

    expect(start).toEqual(new Date(2026, 7, 20));
    expect(end).toEqual(new Date(2026, 8, 19));
  });
});

describe("getSettlementPeriodLabel", () => {
  test("오늘이 20일 이후면 이번 달 20일부터 다음 달 19일까지를 반환한다", () => {
    expect(getSettlementPeriodLabel(new Date(2026, 7, 20))).toBe(
      "2026. 8. 20 ~ 2026. 9. 19"
    );
  });

  test("오늘이 20일 이전이면 지난달 20일부터 이번 달 19일까지를 반환한다", () => {
    expect(getSettlementPeriodLabel(new Date(2026, 7, 19))).toBe(
      "2026. 7. 20 ~ 2026. 8. 19"
    );
  });

  test("연말·연초 경계를 넘어가도 연도가 올바르게 바뀐다", () => {
    expect(getSettlementPeriodLabel(new Date(2026, 11, 25))).toBe(
      "2026. 12. 20 ~ 2027. 1. 19"
    );
    expect(getSettlementPeriodLabel(new Date(2026, 0, 5))).toBe(
      "2025. 12. 20 ~ 2026. 1. 19"
    );
  });
});
