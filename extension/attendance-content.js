const EXTRACT_REQUEST = "EXTRACT_ATTENDANCE_STATUS";

function waitForAttendanceStatus() {
  return new Promise((resolve) => {
    const deadline = Date.now() + 10000;
    const tryExtract = () => {
      try {
        resolve({
          ok: true,
          status: globalThis.WorkHourStatusExtractor.extractAttendanceStatus(document),
        });
      } catch (error) {
        if (Date.now() < deadline) {
          setTimeout(tryExtract, 300);
          return;
        }
        resolve({
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "근태 현황을 읽지 못했습니다. 로그인과 달력 화면을 확인해주세요.",
        });
      }
    };
    tryExtract();
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== EXTRACT_REQUEST) return false;
  waitForAttendanceStatus().then(sendResponse);
  return true;
});
