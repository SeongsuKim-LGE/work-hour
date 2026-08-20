import { getHolidaysInRange } from "@/lib/korean-holidays";

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function getRemainingWorkDays(today: Date, periodEnd: Date): number {
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(
    periodEnd.getFullYear(),
    periodEnd.getMonth(),
    periodEnd.getDate()
  );

  if (cursor > end) return 0;

  const holidayDates = new Set(
    getHolidaysInRange(cursor, end).map((holiday) => holiday.date)
  );

  let count = 0;
  while (cursor <= end) {
    const key = toDateKey(cursor);
    if (!isWeekend(cursor) && !holidayDates.has(key)) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
}
