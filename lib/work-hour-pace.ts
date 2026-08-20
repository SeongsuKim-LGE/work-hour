export type PlannedEntry = {
  hours: number;
  minutes: number;
  days: number;
};

export type ExclusionType = "full" | "half" | "quarter";

export type ExclusionEntry = {
  type: ExclusionType;
  days: number;
};

export type WorkHourPaceInput = {
  normalHours: number;
  accumulatedHours: number;
  entries: PlannedEntry[];
  exclusions?: ExclusionEntry[];
};

export type WorkHourPaceResult =
  | { status: "invalid" }
  | {
      status: "exceeded";
      totalPlannedHours: number;
      totalExclusionHours: number;
      excessHours: number;
    }
  | {
      status: "met";
      totalPlannedHours: number;
      totalExclusionHours: number;
    }
  | {
      status: "shortfall";
      totalPlannedHours: number;
      totalExclusionHours: number;
      shortfallHours: number;
    };

const MET_TOLERANCE_HOURS = 1e-9;

const EXCLUSION_HOURS: Record<ExclusionType, number> = {
  full: 8,
  half: 4,
  quarter: 2,
};

function isValidNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function isValidNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

export function calculatePlannedWorkHourPace(
  input: WorkHourPaceInput
): WorkHourPaceResult {
  const exclusions = input.exclusions ?? [];

  const hasInvalidField =
    !isValidNonNegative(input.normalHours) ||
    !isValidNonNegative(input.accumulatedHours) ||
    input.entries.some(
      (entry) =>
        !isValidNonNegativeInteger(entry.hours) ||
        !isValidNonNegativeInteger(entry.minutes) ||
        !isValidNonNegativeInteger(entry.days)
    ) ||
    exclusions.some((exclusion) => !isValidNonNegativeInteger(exclusion.days));

  if (hasInvalidField) {
    return { status: "invalid" };
  }

  const totalPlannedHours = input.entries.reduce(
    (sum, entry) => sum + (entry.hours + entry.minutes / 60) * entry.days,
    0
  );
  const totalExclusionHours = exclusions.reduce(
    (sum, exclusion) => sum + EXCLUSION_HOURS[exclusion.type] * exclusion.days,
    0
  );
  const effectiveTargetHours = input.normalHours - totalExclusionHours;
  const projectedAccumulatedHours = input.accumulatedHours + totalPlannedHours;
  const diff = projectedAccumulatedHours - effectiveTargetHours;

  if (diff > MET_TOLERANCE_HOURS) {
    return {
      status: "exceeded",
      totalPlannedHours,
      totalExclusionHours,
      excessHours: diff,
    };
  }

  if (diff >= -MET_TOLERANCE_HOURS) {
    return { status: "met", totalPlannedHours, totalExclusionHours };
  }

  return {
    status: "shortfall",
    totalPlannedHours,
    totalExclusionHours,
    shortfallHours: -diff,
  };
}
