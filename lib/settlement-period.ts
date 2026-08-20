export type SettlementPeriod = {
  start: Date;
  end: Date;
};

export function getSettlementPeriod(today: Date): SettlementPeriod {
  const startsThisMonth = today.getDate() >= 20;
  const start = new Date(
    today.getFullYear(),
    today.getMonth() + (startsThisMonth ? 0 : -1),
    20
  );
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 19);

  return { start, end };
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}`;
}

export function getSettlementPeriodLabel(today: Date): string {
  const { start, end } = getSettlementPeriod(today);
  return `${formatDate(start)} ~ ${formatDate(end)}`;
}
