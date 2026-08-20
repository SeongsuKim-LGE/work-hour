const ATTENDANCE_URL = "https://attendance.lge.com/home/calendar/my-calendar";

function waitForTabComplete(tabId) {
  return new Promise((resolve) => {
    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, 15000);
  });
}

async function openAttendanceTab() {
  const existing = await chrome.tabs.query({ url: `${ATTENDANCE_URL}*` });
  if (existing.length > 0 && typeof existing[0].id === "number") {
    await chrome.tabs.update(existing[0].id, { active: true });
    return existing[0].id;
  }
  const tab = await chrome.tabs.create({ url: ATTENDANCE_URL, active: true });
  if (typeof tab.id !== "number") throw new Error("근태 페이지를 열지 못했습니다.");
  await waitForTabComplete(tab.id);
  return tab.id;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "IMPORT_ATTENDANCE_STATUS") return false;
  (async () => {
    try {
      const calculatorTabId = sender.tab?.id;
      const tabId = await openAttendanceTab();
      const result = await chrome.tabs.sendMessage(tabId, {
        type: "EXTRACT_ATTENDANCE_STATUS",
      });
      if (result?.ok && typeof calculatorTabId === "number") {
        await chrome.tabs.update(calculatorTabId, { active: true });
      }
      sendResponse(result);
    } catch {
      sendResponse({
        ok: false,
        error: "근태 현황을 읽지 못했습니다. 열린 페이지에서 로그인한 뒤 다시 시도해주세요.",
      });
    }
  })();
  return true;
});
