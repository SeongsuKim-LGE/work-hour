export type CustomHolidayRepeat = "none" | "yearly";

export type CustomHoliday = {
  id: string;
  name: string;
  repeat: CustomHolidayRepeat;
  year: number | null;
  month: number;
  day: number;
};

export type CustomHolidayOccurrence = {
  id: string;
  date: string;
  name: string;
};

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getCustomHolidaysInRange(
  customHolidays: CustomHoliday[],
  start: Date,
  end: Date
): CustomHolidayOccurrence[] {
  const startKey = toDateKey(
    start.getFullYear(),
    start.getMonth() + 1,
    start.getDate()
  );
  const endKey = toDateKey(end.getFullYear(), end.getMonth() + 1, end.getDate());

  const occurrences: CustomHolidayOccurrence[] = [];

  for (const holiday of customHolidays) {
    if (holiday.repeat === "none") {
      if (holiday.year === null) continue;
      const key = toDateKey(holiday.year, holiday.month, holiday.day);
      if (key >= startKey && key <= endKey) {
        occurrences.push({ id: holiday.id, date: key, name: holiday.name });
      }
      continue;
    }

    for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
      const key = toDateKey(year, holiday.month, holiday.day);
      if (key >= startKey && key <= endKey) {
        occurrences.push({ id: holiday.id, date: key, name: holiday.name });
      }
    }
  }

  return occurrences.sort((a, b) => a.date.localeCompare(b.date));
}
