"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getCustomHolidaysInRange,
  type CustomHoliday,
  type CustomHolidayRepeat,
} from "@/lib/custom-holidays";
import { getHolidaysInRange } from "@/lib/korean-holidays";
import { getRemainingWorkDays } from "@/lib/remaining-work-days";
import { getSettlementPeriod, getSettlementPeriodLabel } from "@/lib/settlement-period";
import {
  calculatePlannedWorkHourPace,
  type WorkHourPaceResult,
} from "@/lib/work-hour-pace";

const STORAGE_KEY = "work-hour-pace:planned-entries";
const EXCLUSION_STORAGE_KEY = "work-hour-pace:exclusion-days";
const CUSTOM_HOLIDAY_STORAGE_KEY = "work-hour-pace:custom-holidays";

type EntryFields = { id: string; hours: string; minutes: string; days: string };

type ExclusionDaysFields = { full: string; half: string; quarter: string };

function isEntryFieldsShape(
  value: unknown
): value is { hours: string; minutes: string; days: string } {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.hours === "string" &&
    typeof record.minutes === "string" &&
    typeof record.days === "string"
  );
}

function isExclusionDaysShape(value: unknown): value is ExclusionDaysFields {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.full === "string" &&
    typeof record.half === "string" &&
    typeof record.quarter === "string"
  );
}

function isCustomHolidayShape(value: unknown): value is CustomHoliday {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    (record.repeat === "none" || record.repeat === "yearly") &&
    (record.year === null || typeof record.year === "number") &&
    typeof record.month === "number" &&
    typeof record.day === "number"
  );
}

function parseHours(raw: string): number {
  return raw.trim() === "" ? 0 : Number(raw);
}

function formatHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatHoursAsClock(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${wholeHours}:${String(minutes).padStart(2, "0")}`;
}

function getDefaultRemainingWorkDays(): string {
  const today = new Date();
  const { end } = getSettlementPeriod(today);
  return String(getRemainingWorkDays(today, end));
}

type ResultDisplay = {
  headline: string;
  role: "status" | "alert";
  colorClasses: string;
  details: string[];
};

function buildResultDisplay(result: WorkHourPaceResult): ResultDisplay {
  if (result.status === "invalid") {
    return {
      headline: "입력 오류",
      role: "alert",
      colorClasses:
        "border-destructive/40 bg-destructive/10 text-destructive",
      details: ["값은 0 이상의 숫자로 입력해주세요."],
    };
  }

  const details = [
    `총예상근무시간: ${formatHours(result.totalPlannedHours)}시간`,
    `예상 근무 제외: ${formatHours(result.totalExclusionHours)}시간`,
  ];

  if (result.status === "exceeded") {
    details.push(`목표 대비 ${formatHours(result.excessHours)}시간 초과`);
    return {
      headline: "초과 예상",
      role: "status",
      colorClasses:
        "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
      details,
    };
  }

  if (result.status === "met") {
    details.push("목표를 정확히 채웁니다.");
    return {
      headline: "충족 예상",
      role: "status",
      colorClasses:
        "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300",
      details,
    };
  }

  details.push(`목표 대비 ${formatHours(result.shortfallHours)}시간 부족`);
  return {
    headline: "부족 예상",
    role: "status",
    colorClasses:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    details,
  };
}

type Suggestion =
  | { kind: "day-adjustment"; text: string; targetIndex: number; newDays: number }
  | { kind: "text"; text: string };

function buildSuggestion(
  result: WorkHourPaceResult,
  entries: { hours: number; minutes: number; days: number }[],
  remainingWorkDaysRaw: string
): Suggestion | null {
  if (result.status === "invalid" || result.status === "met") return null;

  const gapHours =
    result.status === "exceeded" ? result.excessHours : result.shortfallHours;

  let targetIndex = -1;
  let maxDays = -1;
  entries.forEach((entry, index) => {
    if (entry.days > maxDays) {
      maxDays = entry.days;
      targetIndex = index;
    }
  });

  if (targetIndex !== -1) {
    const target = entries[targetIndex];
    const perDayHours = target.hours + target.minutes / 60;
    if (perDayHours > 0) {
      const roundedDeltaDays = Math.round(gapHours / perDayHours);
      if (roundedDeltaDays > 0) {
        const newDays =
          result.status === "exceeded"
            ? Math.max(0, target.days - roundedDeltaDays)
            : target.days + roundedDeltaDays;
        const appliedDeltaDays =
          result.status === "exceeded"
            ? target.days - newDays
            : newDays - target.days;
        const isExact =
          Math.abs(appliedDeltaDays * perDayHours - gapHours) < 1e-9;
        const verb = isExact
          ? "정확히 맞습니다"
          : "목표에 가장 가깝게 맞춰집니다";
        return {
          kind: "day-adjustment",
          text: `제안: ${targetIndex + 1}번째 계획(하루 ${formatHoursAsClock(perDayHours)})의 일수를 ${target.days}일에서 ${newDays}일로 조정하면 ${verb}.`,
          targetIndex,
          newDays,
        };
      }
    }
  }

  if (result.status === "exceeded") {
    return {
      kind: "text",
      text: `제안: 예상 근무 계획을 ${formatHours(gapHours)}시간 줄이면 정확히 맞습니다.`,
    };
  }

  const remainingWorkDays = parseHours(remainingWorkDaysRaw);
  if (remainingWorkDays > 0) {
    return {
      kind: "text",
      text: `제안: 남은 근무 일수 ${remainingWorkDays}일 동안 하루 평균 ${formatHours(gapHours / remainingWorkDays)}시간씩 계획하면 정확히 맞습니다.`,
    };
  }
  return {
    kind: "text",
    text: `제안: 예상 근무 계획에 ${formatHours(gapHours)}시간을 추가하면 정확히 맞습니다.`,
  };
}

export default function Home() {
  const [normalHours, setNormalHours] = useState("");
  const [accumulatedHoursPart, setAccumulatedHoursPart] = useState("");
  const [accumulatedMinutesPart, setAccumulatedMinutesPart] = useState("");
  const [remainingWorkDays, setRemainingWorkDays] = useState(
    getDefaultRemainingWorkDays
  );
  const [entries, setEntries] = useState<EntryFields[]>([
    { id: "entry-initial", hours: "", minutes: "", days: "" },
  ]);
  const [exclusionDays, setExclusionDays] = useState<ExclusionDaysFields>({
    full: "",
    half: "",
    quarter: "",
  });
  const [hydrated, setHydrated] = useState(false);
  const nextNewEntryId = useRef(0);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(isEntryFieldsShape)) {
          // localStorage는 서버 렌더링 시 존재하지 않아 마운트 후 이 효과에서만 읽을 수 있다.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setEntries(
            parsed.map((entry, i) => ({ id: `entry-hydrated-${i}`, ...entry }))
          );
        }
      } catch {
        // 저장된 값이 손상된 경우 기본값을 유지한다.
      }
    }

    const savedExclusionDays = window.localStorage.getItem(EXCLUSION_STORAGE_KEY);
    if (savedExclusionDays) {
      try {
        const parsed: unknown = JSON.parse(savedExclusionDays);
        if (isExclusionDaysShape(parsed)) {
          setExclusionDays(parsed);
        }
      } catch {
        // 저장된 값이 손상된 경우 기본값을 유지한다.
      }
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      EXCLUSION_STORAGE_KEY,
      JSON.stringify(exclusionDays)
    );
  }, [exclusionDays, hydrated]);

  function updateEntry(
    index: number,
    field: keyof Omit<EntryFields, "id">,
    value: string
  ) {
    setEntries((current) =>
      current.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      )
    );
  }

  function addEntry() {
    const id = `entry-new-${nextNewEntryId.current}`;
    nextNewEntryId.current += 1;
    setEntries((current) => [
      ...current,
      { id, hours: "", minutes: "", days: "" },
    ]);
  }

  function removeEntry(index: number) {
    setEntries((current) => current.filter((_, i) => i !== index));
  }

  const parsedEntries = entries.map((entry) => ({
    hours: parseHours(entry.hours),
    minutes: parseHours(entry.minutes),
    days: parseHours(entry.days),
  }));

  const result = calculatePlannedWorkHourPace({
    normalHours: parseHours(normalHours),
    accumulatedHours:
      parseHours(accumulatedHoursPart) + parseHours(accumulatedMinutesPart) / 60,
    entries: parsedEntries,
    exclusions: [
      { type: "full" as const, days: parseHours(exclusionDays.full) },
      { type: "half" as const, days: parseHours(exclusionDays.half) },
      { type: "quarter" as const, days: parseHours(exclusionDays.quarter) },
    ],
  });

  const totalPlannedHours = entries.reduce(
    (sum, entry) =>
      sum +
      (parseHours(entry.hours) + parseHours(entry.minutes) / 60) *
        parseHours(entry.days),
    0
  );
  const totalExclusionHours =
    parseHours(exclusionDays.full) * 8 +
    parseHours(exclusionDays.half) * 4 +
    parseHours(exclusionDays.quarter) * 2;

  const totalPlannedDays = entries.reduce(
    (sum, entry) => sum + parseHours(entry.days),
    0
  );
  const dayWarning =
    remainingWorkDays.trim() !== "" &&
    totalPlannedDays > parseHours(remainingWorkDays)
      ? `주의: 예상 근무 계획의 총 일수(${totalPlannedDays}일)가 남은 근무 일수(${parseHours(remainingWorkDays)}일)보다 많습니다.`
      : null;

  const display = buildResultDisplay(result);
  const suggestion = buildSuggestion(result, parsedEntries, remainingWorkDays);

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-md flex-col gap-6 py-16 px-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          근무시간 배분 계산기
        </h1>

        <SettlementPeriodBanner />

        <div className="flex flex-col gap-3">
          <Label>현황</Label>
          <div className="grid grid-cols-[6.5rem_minmax(0,1fr)_minmax(0,1fr)_6.5rem] gap-x-3 gap-y-1.5 rounded-lg border border-border p-3">
            <Label
              htmlFor="normal-hours"
              className="whitespace-nowrap text-xs font-normal text-muted-foreground"
            >
              정상근무시간(시간)
            </Label>
            <span className="col-span-2 text-xs text-muted-foreground">
              누적근무시간(시간)
            </span>
            <Label
              htmlFor="remaining-work-days"
              className="whitespace-nowrap text-xs font-normal text-muted-foreground"
            >
              남은 근무 일수(일)
            </Label>

            <span />
            <span className="text-xs text-muted-foreground">시간</span>
            <span className="text-xs text-muted-foreground">분</span>
            <span />

            <Input
              id="normal-hours"
              type="number"
              min="0"
              step="any"
              value={normalHours}
              onChange={(event) => setNormalHours(event.target.value)}
            />
            <Input
              aria-label="누적근무시간 시간"
              type="number"
              min="0"
              step="1"
              value={accumulatedHoursPart}
              onChange={(event) => setAccumulatedHoursPart(event.target.value)}
            />
            <Input
              aria-label="누적근무시간 분"
              type="number"
              min="0"
              step="1"
              value={accumulatedMinutesPart}
              onChange={(event) =>
                setAccumulatedMinutesPart(event.target.value)
              }
            />
            <Input
              id="remaining-work-days"
              type="number"
              min="0"
              step="1"
              value={remainingWorkDays}
              onChange={(event) => setRemainingWorkDays(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Label>예상 근무 계획</Label>
            <span className="text-sm text-muted-foreground">
              총 {formatHoursAsClock(totalPlannedHours)} · {totalPlannedDays}일
            </span>
          </div>

          {entries.map((entry, index) => (
            <div
              key={entry.id}
              className="flex items-end gap-2 rounded-lg border border-border p-3"
            >
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">시간</span>
                <Input
                  aria-label={`${index + 1}번째 계획 시간`}
                  type="number"
                  min="0"
                  step="1"
                  value={entry.hours}
                  onChange={(event) =>
                    updateEntry(index, "hours", event.target.value)
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">분</span>
                <Input
                  aria-label={`${index + 1}번째 계획 분`}
                  type="number"
                  min="0"
                  step="1"
                  value={entry.minutes}
                  onChange={(event) =>
                    updateEntry(index, "minutes", event.target.value)
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">일수</span>
                <Input
                  aria-label={`${index + 1}번째 계획 일수`}
                  type="number"
                  min="0"
                  step="1"
                  value={entry.days}
                  onChange={(event) =>
                    updateEntry(index, "days", event.target.value)
                  }
                />
              </div>

              <Button
                type="button"
                variant="outline"
                aria-label={`${index + 1}번째 계획 삭제`}
                onClick={() => removeEntry(index)}
              >
                삭제
              </Button>
            </div>
          ))}

          <Button type="button" variant="secondary" onClick={addEntry}>
            계획 추가
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Label>예상 근무 제외</Label>
            <span className="text-sm text-muted-foreground">
              총 {formatHours(totalExclusionHours)}시간
            </span>
          </div>

          <div className="flex gap-3 rounded-lg border border-border p-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exclusion-full">전일(8H)</Label>
              <Input
                id="exclusion-full"
                type="number"
                min="0"
                step="1"
                value={exclusionDays.full}
                onChange={(event) =>
                  setExclusionDays((current) => ({
                    ...current,
                    full: event.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exclusion-half">반일(4H)</Label>
              <Input
                id="exclusion-half"
                type="number"
                min="0"
                step="1"
                value={exclusionDays.half}
                onChange={(event) =>
                  setExclusionDays((current) => ({
                    ...current,
                    half: event.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exclusion-quarter">반반일(2H)</Label>
              <Input
                id="exclusion-quarter"
                type="number"
                min="0"
                step="1"
                value={exclusionDays.quarter}
                onChange={(event) =>
                  setExclusionDays((current) => ({
                    ...current,
                    quarter: event.target.value,
                  }))
                }
              />
            </div>
          </div>
        </div>

        <div
          role={display.role}
          className={`rounded-lg border p-4 ${display.colorClasses}`}
        >
          <p className="text-lg font-bold">{display.headline}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {display.details.map((detail, index) => (
              <li key={index}>{detail}</li>
            ))}
          </ul>
        </div>

        {suggestion && (
          <div className="rounded-lg border border-dashed border-border p-4">
            <p className="text-sm">{suggestion.text}</p>
            {suggestion.kind === "day-adjustment" && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() =>
                  updateEntry(
                    suggestion.targetIndex,
                    "days",
                    String(suggestion.newDays)
                  )
                }
              >
                제안 적용
              </Button>
            )}
          </div>
        )}

        {dayWarning && (
          <p role="alert" className="text-destructive">
            {dayWarning}
          </p>
        )}

        <HolidaySection />
      </main>
    </div>
  );
}

function SettlementPeriodBanner() {
  const label = getSettlementPeriodLabel(new Date());

  return <p className="text-sm text-muted-foreground">근태일정: {label}</p>;
}

function HolidaySection() {
  const { start, end } = getSettlementPeriod(new Date());
  const builtinHolidays = getHolidaysInRange(start, end);

  const [customHolidays, setCustomHolidays] = useState<CustomHoliday[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRepeat, setNewRepeat] = useState<CustomHolidayRepeat>("none");
  const [newDate, setNewDate] = useState("");
  const [newMonth, setNewMonth] = useState("");
  const [newDay, setNewDay] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const nextNewHolidayId = useRef(0);

  useEffect(() => {
    const saved = window.localStorage.getItem(CUSTOM_HOLIDAY_STORAGE_KEY);
    if (saved) {
      try {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(isCustomHolidayShape)) {
          // localStorage는 서버 렌더링 시 존재하지 않아 마운트 후 이 효과에서만 읽을 수 있다.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setCustomHolidays(parsed);
        }
      } catch {
        // 저장된 값이 손상된 경우 기본값을 유지한다.
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      CUSTOM_HOLIDAY_STORAGE_KEY,
      JSON.stringify(customHolidays)
    );
  }, [customHolidays, hydrated]);

  const customOccurrences = getCustomHolidaysInRange(customHolidays, start, end);

  const merged = [
    ...builtinHolidays.map((holiday) => ({
      date: holiday.date,
      name: holiday.name,
      id: null as string | null,
    })),
    ...customOccurrences.map((occurrence) => ({
      date: occurrence.date,
      name: occurrence.name,
      id: occurrence.id,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  function resetForm() {
    setNewName("");
    setNewRepeat("none");
    setNewDate("");
    setNewMonth("");
    setNewDay("");
    setFormError(null);
  }

  function handleAddHoliday() {
    if (newName.trim() === "") {
      setFormError("이름을 입력해주세요.");
      return;
    }

    const id = `custom-holiday-${nextNewHolidayId.current}`;

    if (newRepeat === "none") {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(newDate);
      if (!match) {
        setFormError("날짜를 선택해주세요.");
        return;
      }
      const [, yearStr, monthStr, dayStr] = match;
      nextNewHolidayId.current += 1;
      setCustomHolidays((current) => [
        ...current,
        {
          id,
          name: newName.trim(),
          repeat: "none",
          year: Number(yearStr),
          month: Number(monthStr),
          day: Number(dayStr),
        },
      ]);
    } else {
      const month = Number(newMonth);
      const day = Number(newDay);
      if (!Number.isInteger(month) || month < 1 || month > 12) {
        setFormError("월은 1~12 사이로 입력해주세요.");
        return;
      }
      if (!Number.isInteger(day) || day < 1 || day > 31) {
        setFormError("일은 1~31 사이로 입력해주세요.");
        return;
      }
      nextNewHolidayId.current += 1;
      setCustomHolidays((current) => [
        ...current,
        { id, name: newName.trim(), repeat: "yearly", year: null, month, day },
      ]);
    }

    resetForm();
    setIsDialogOpen(false);
  }

  function removeCustomHoliday(id: string) {
    setCustomHolidays((current) => current.filter((holiday) => holiday.id !== id));
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <Label>근태일 기준 공휴일</Label>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger
            render={<Button type="button" variant="secondary" size="sm" />}
          >
            + 휴일 추가
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>휴일 추가</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-holiday-name">이름</Label>
                <Input
                  id="new-holiday-name"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                />
              </div>

              <fieldset className="flex flex-col gap-1.5">
                <legend className="text-xs text-muted-foreground">반복</legend>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="radio"
                      name="new-holiday-repeat"
                      aria-label="반복 안함"
                      checked={newRepeat === "none"}
                      onChange={() => setNewRepeat("none")}
                    />
                    반복 안함
                  </label>
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="radio"
                      name="new-holiday-repeat"
                      aria-label="매년 반복"
                      checked={newRepeat === "yearly"}
                      onChange={() => setNewRepeat("yearly")}
                    />
                    매년 반복
                  </label>
                </div>
              </fieldset>

              {newRepeat === "none" ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-holiday-date">날짜</Label>
                  <input
                    id="new-holiday-date"
                    type="date"
                    value={newDate}
                    onChange={(event) => setNewDate(event.target.value)}
                    className="h-9 rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                  />
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="new-holiday-month">월</Label>
                    <Input
                      id="new-holiday-month"
                      type="number"
                      min="1"
                      max="12"
                      step="1"
                      value={newMonth}
                      onChange={(event) => setNewMonth(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="new-holiday-day">일</Label>
                    <Input
                      id="new-holiday-day"
                      type="number"
                      min="1"
                      max="31"
                      step="1"
                      value={newDay}
                      onChange={(event) => setNewDay(event.target.value)}
                    />
                  </div>
                </div>
              )}

              {formError && (
                <p role="alert" className="text-sm text-destructive">
                  {formError}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" onClick={handleAddHoliday}>
                추가
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {merged.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          이번 근태일정 기간에는 공휴일이 없습니다.
        </p>
      ) : (
        <ul aria-label="근태일 기준 공휴일" className="flex flex-col gap-1 text-sm">
          {merged.map((holiday) => {
            const [, month, day] = holiday.date.split("-").map(Number);
            return (
              <li
                key={`${holiday.date}-${holiday.name}`}
                className="flex items-center justify-between gap-2"
              >
                <span>
                  {month}월 {day}일 {holiday.name}
                </span>
                {holiday.id && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`${holiday.name} 삭제`}
                    onClick={() => removeCustomHoliday(holiday.id as string)}
                  >
                    삭제
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
