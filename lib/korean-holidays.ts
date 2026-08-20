export type KoreanHoliday = {
  date: string;
  name: string;
};

// 관공서의 공휴일에 관한 규정 기준. 근로자의 날(5/1)은 근로기준법상 유급휴일일 뿐
// 관공서 공휴일이 아니므로 제외한다. 2025~2027년만 담은 정적 목록이라 그 이후는
// 갱신이 필요하다 (spec.md의 Assumptions/Remaining risks 참고).
const KOREAN_HOLIDAYS: KoreanHoliday[] = [
  // 2025
  { date: "2025-01-01", name: "신정" },
  { date: "2025-01-27", name: "임시공휴일" },
  { date: "2025-01-28", name: "설날 연휴" },
  { date: "2025-01-29", name: "설날" },
  { date: "2025-01-30", name: "설날 연휴" },
  { date: "2025-03-01", name: "삼일절" },
  { date: "2025-03-03", name: "삼일절 대체공휴일" },
  { date: "2025-05-05", name: "어린이날·부처님오신날" },
  { date: "2025-05-06", name: "어린이날·부처님오신날 대체공휴일" },
  { date: "2025-06-06", name: "현충일" },
  { date: "2025-08-15", name: "광복절" },
  { date: "2025-10-03", name: "개천절" },
  { date: "2025-10-05", name: "추석 연휴" },
  { date: "2025-10-06", name: "추석" },
  { date: "2025-10-07", name: "추석 연휴" },
  { date: "2025-10-08", name: "추석 대체공휴일" },
  { date: "2025-10-09", name: "한글날" },
  { date: "2025-12-25", name: "크리스마스" },
  // 2026
  { date: "2026-01-01", name: "신정" },
  { date: "2026-02-16", name: "설날 연휴" },
  { date: "2026-02-17", name: "설날" },
  { date: "2026-02-18", name: "설날 연휴" },
  { date: "2026-03-01", name: "삼일절" },
  { date: "2026-03-02", name: "삼일절 대체공휴일" },
  { date: "2026-05-05", name: "어린이날" },
  { date: "2026-05-24", name: "부처님오신날" },
  { date: "2026-05-25", name: "부처님오신날 대체공휴일" },
  { date: "2026-06-03", name: "전국동시지방선거일" },
  { date: "2026-06-06", name: "현충일" },
  { date: "2026-07-17", name: "제헌절" },
  { date: "2026-08-15", name: "광복절" },
  { date: "2026-08-17", name: "광복절 대체공휴일" },
  { date: "2026-09-24", name: "추석 연휴" },
  { date: "2026-09-25", name: "추석" },
  { date: "2026-09-26", name: "추석 연휴" },
  { date: "2026-10-03", name: "개천절" },
  { date: "2026-10-05", name: "개천절 대체공휴일" },
  { date: "2026-10-09", name: "한글날" },
  { date: "2026-12-25", name: "크리스마스" },
  // 2027
  { date: "2027-01-01", name: "신정" },
  { date: "2027-02-06", name: "설날 연휴" },
  { date: "2027-02-07", name: "설날" },
  { date: "2027-02-08", name: "설날 연휴" },
  { date: "2027-02-09", name: "설날 대체공휴일" },
  { date: "2027-03-01", name: "삼일절" },
  { date: "2027-05-05", name: "어린이날" },
  { date: "2027-05-13", name: "부처님오신날" },
  { date: "2027-06-06", name: "현충일" },
  { date: "2027-07-17", name: "제헌절" },
  { date: "2027-08-15", name: "광복절" },
  { date: "2027-08-16", name: "광복절 대체공휴일" },
  { date: "2027-09-14", name: "추석 연휴" },
  { date: "2027-09-15", name: "추석" },
  { date: "2027-09-16", name: "추석 연휴" },
  { date: "2027-10-03", name: "개천절" },
  { date: "2027-10-04", name: "개천절 대체공휴일" },
  { date: "2027-10-09", name: "한글날" },
  { date: "2027-10-11", name: "한글날 대체공휴일" },
  { date: "2027-12-25", name: "크리스마스" },
  { date: "2027-12-27", name: "크리스마스 대체공휴일" },
];

export function getKoreanHolidaysForMonth(
  year: number,
  month: number
): KoreanHoliday[] {
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  return KOREAN_HOLIDAYS.filter((holiday) => holiday.date.startsWith(prefix));
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getHolidaysInRange(start: Date, end: Date): KoreanHoliday[] {
  const startKey = toDateKey(start);
  const endKey = toDateKey(end);

  const holidays: KoreanHoliday[] = [];
  const monthCursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (monthCursor <= end) {
    holidays.push(
      ...getKoreanHolidaysForMonth(
        monthCursor.getFullYear(),
        monthCursor.getMonth() + 1
      )
    );
    monthCursor.setMonth(monthCursor.getMonth() + 1);
  }

  return holidays.filter(
    (holiday) => holiday.date >= startKey && holiday.date <= endKey
  );
}
