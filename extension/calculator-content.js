const REQUEST_EVENT = "work-hour-calc:request-attendance-status";
const RESULT_EVENT = "work-hour-calc:attendance-status-result";

window.addEventListener(REQUEST_EVENT, () => {
  chrome.runtime.sendMessage({ type: "IMPORT_ATTENDANCE_STATUS" }, (result) => {
    if (chrome.runtime.lastError) {
      window.dispatchEvent(
        new CustomEvent(RESULT_EVENT, {
          detail: { ok: false, error: "확장 프로그램 연결에 실패했습니다." },
        })
      );
      return;
    }
    window.dispatchEvent(new CustomEvent(RESULT_EVENT, { detail: result }));
  });
});
