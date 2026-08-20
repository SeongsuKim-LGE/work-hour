(function attachAttendanceStatusExtractor(root) {
  function parseRequiredHours(text, label, options = {}) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const unit = options.requireUnit === false ? "(?:\\s*시간)?" : "\\s*시간";
    const match = text.match(
      new RegExp(`${escapedLabel}\\s*[:：]?\\s*(\\d+(?:\\.\\d+)?)${unit}`)
    );
    if (!match) throw new Error(`${label}을 찾지 못했습니다.`);
    return Number(match[1]);
  }

  function extractAttendanceStatus(document) {
    const text = document.body?.textContent || "";
    const normalHours = parseRequiredHours(text, "정상근무시간", {
      requireUnit: false,
    });
    const accumulatedLabel = /누적근무시간/.test(text)
      ? "누적근무시간"
      : "누적근무";
    const accumulatedTotalHours = parseRequiredHours(text, accumulatedLabel);
    const accumulatedMinutesMatch = text.match(
      /누적근무(?:시간)?\s*[:：]?\s*\d+(?:\.\d+)?\s*시간\s*(\d+)\s*분/
    );
    const accumulatedMinutes = accumulatedMinutesMatch
      ? Number(accumulatedMinutesMatch[1])
      : Math.round((accumulatedTotalHours % 1) * 60);

    return {
      normalHours,
      accumulatedHours: Math.floor(accumulatedTotalHours),
      accumulatedMinutes,
    };
  }

  root.WorkHourStatusExtractor = { extractAttendanceStatus };
})(globalThis);
