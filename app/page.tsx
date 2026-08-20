"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculatePlannedWorkHourPace,
  type WorkHourPaceResult,
} from "@/lib/work-hour-pace";

const STORAGE_KEY = "work-hour-pace:planned-entries";

type EntryFields = { id: string; hours: string; minutes: string; days: string };

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

function parseHours(raw: string): number {
  return raw.trim() === "" ? NaN : Number(raw);
}

function formatHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function resultMessage(result: WorkHourPaceResult): string {
  switch (result.status) {
    case "invalid":
      return "입력 오류: 정상근무시간, 누적근무시간, 예상 근무 계획 항목을 모두 0 이상의 숫자로 입력해주세요.";
    case "exceeded":
      return `초과 예상: 이 계획대로면 총예상근무시간 ${formatHours(result.totalPlannedHours)}시간으로, 정상근무시간을 ${formatHours(result.excessHours)}시간 초과합니다.`;
    case "met":
      return `충족 예상: 이 계획대로면 총예상근무시간 ${formatHours(result.totalPlannedHours)}시간으로, 정상근무시간을 정확히 채웁니다.`;
    case "shortfall":
      return `부족 예상: 이 계획대로면 총예상근무시간 ${formatHours(result.totalPlannedHours)}시간으로, 정상근무시간보다 ${formatHours(result.shortfallHours)}시간 부족합니다.`;
  }
}

export default function Home() {
  const [normalHours, setNormalHours] = useState("");
  const [accumulatedHours, setAccumulatedHours] = useState("");
  const [entries, setEntries] = useState<EntryFields[]>([
    { id: "entry-initial", hours: "", minutes: "", days: "" },
  ]);
  const [hydrated, setHydrated] = useState(false);
  const [result, setResult] = useState<WorkHourPaceResult | null>(null);
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
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, hydrated]);

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

  function handleCalculate() {
    setResult(
      calculatePlannedWorkHourPace({
        normalHours: parseHours(normalHours),
        accumulatedHours: parseHours(accumulatedHours),
        entries: entries.map((entry) => ({
          hours: parseHours(entry.hours),
          minutes: parseHours(entry.minutes),
          days: parseHours(entry.days),
        })),
      })
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-md flex-col gap-6 py-16 px-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          근무시간 배분 계산기
        </h1>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="normal-hours">정상근무시간</Label>
            <Input
              id="normal-hours"
              type="number"
              min="0"
              step="any"
              value={normalHours}
              onChange={(event) => setNormalHours(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="accumulated-hours">누적근무시간</Label>
            <Input
              id="accumulated-hours"
              type="number"
              min="0"
              step="any"
              value={accumulatedHours}
              onChange={(event) => setAccumulatedHours(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Label>예상 근무 계획</Label>

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

        <Button onClick={handleCalculate}>계산하기</Button>

        {result && (
          <p role={result.status === "invalid" ? "alert" : "status"}>
            {resultMessage(result)}
          </p>
        )}
      </main>
    </div>
  );
}
