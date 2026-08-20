export type PlannedEntry = {
  hours: number;
  minutes: number;
  days: number;
};

export type WorkHourPaceInput = {
  normalHours: number;
  accumulatedHours: number;
  entries: PlannedEntry[];
};

export type WorkHourPaceResult =
  | { status: "invalid" }
  | { status: "exceeded"; totalPlannedHours: number; excessHours: number }
  | { status: "met"; totalPlannedHours: number }
  | { status: "shortfall"; totalPlannedHours: number; shortfallHours: number };

const MET_TOLERANCE_HOURS = 1e-9;

function isValidNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function isValidNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

export function calculatePlannedWorkHourPace(
  input: WorkHourPaceInput
): WorkHourPaceResult {
  const hasInvalidField =
    !isValidNonNegative(input.normalHours) ||
    !isValidNonNegative(input.accumulatedHours) ||
    input.entries.some(
      (entry) =>
        !isValidNonNegativeInteger(entry.hours) ||
        !isValidNonNegativeInteger(entry.minutes) ||
        !isValidNonNegativeInteger(entry.days)
    );

  if (hasInvalidField) {
    return { status: "invalid" };
  }

  const totalPlannedHours = input.entries.reduce(
    (sum, entry) => sum + (entry.hours + entry.minutes / 60) * entry.days,
    0
  );
  const projectedAccumulatedHours = input.accumulatedHours + totalPlannedHours;
  const diff = projectedAccumulatedHours - input.normalHours;

  if (diff > MET_TOLERANCE_HOURS) {
    return { status: "exceeded", totalPlannedHours, excessHours: diff };
  }

  if (diff >= -MET_TOLERANCE_HOURS) {
    return { status: "met", totalPlannedHours };
  }

  return { status: "shortfall", totalPlannedHours, shortfallHours: -diff };
}
