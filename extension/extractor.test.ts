import { expect, test } from "vitest";

import "./extractor.js";

type AttendanceStatus = {
  normalHours: number;
  accumulatedHours: number;
  accumulatedMinutes: number;
};

type Extractor = {
  extractAttendanceStatus(document: Document, today: Date): AttendanceStatus;
};

const extractor = (globalThis as typeof globalThis & {
  WorkHourStatusExtractor: Extractor;
}).WorkHourStatusExtractor;

test("근태 화면의 정상근무시간과 누적근무시간을 시간·분으로 읽는다", () => {
  document.body.innerHTML = `
    <section>
      <p>정상근무시간 <strong>160시간</strong></p>
      <p>누적근무시간 <strong>81시간 30분</strong></p>
    </section>
    <div data-date="2026-08-26"></div>
  `;

  expect(
    extractor.extractAttendanceStatus(document, new Date("2026-08-25T12:00:00+09:00"))
  ).toMatchObject({
    normalHours: 160,
    accumulatedHours: 81,
    accumulatedMinutes: 30,
  });
});

test("실제 근태 화면의 누적근무·정상근무시간 표기를 읽는다", () => {
  document.body.innerHTML = `
    <section>
      <p>누적근무 <strong>8 시간 0 분</strong></p>
      <div>정상근무시간 <span>176</span> 최대근무시간 230</div>
    </section>
    <div data-date="2026-08-20">8시간 교육(8h)</div>
    <div data-date="2026-08-21"></div>
  `;

  expect(
    extractor.extractAttendanceStatus(document, new Date("2026-08-20T10:25:00+09:00"))
  ).toMatchObject({
    normalHours: 176,
    accumulatedHours: 8,
    accumulatedMinutes: 0,
  });
});
