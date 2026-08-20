import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import Home from "@/app/page";

const STORAGE_KEY = "work-hour-pace:planned-entries";
const EXCLUSION_STORAGE_KEY = "work-hour-pace:exclusion-days";
const CUSTOM_HOLIDAY_STORAGE_KEY = "work-hour-pace:custom-holidays";

beforeEach(() => {
  localStorage.clear();
  // 실제 현재 날짜가 근태일정 첫째날(20일)이면 초기화 확인 팝업이 떠서 무관한 테스트가 깨지므로,
  // 첫째날이 아닌 고정된 날짜를 기본값으로 둔다. 첫째날 동작을 검증하는 테스트는 개별적으로 날짜를 다시 지정한다.
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 7, 25)); // 2026-08-25, 정산기간 8/20~9/19
});

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

function fillTopFields(
  normalHours: string,
  accumulatedHoursPart: string,
  accumulatedMinutesPart = "0"
) {
  fireEvent.change(screen.getByLabelText("정상근무시간(시간)"), {
    target: { value: normalHours },
  });
  fireEvent.change(screen.getByLabelText("누적근무시간 시간"), {
    target: { value: accumulatedHoursPart },
  });
  fireEvent.change(screen.getByLabelText("누적근무시간 분"), {
    target: { value: accumulatedMinutesPart },
  });
}

function fillEntry(index: number, hours: string, minutes: string, days: string) {
  fireEvent.change(screen.getByLabelText(`${index + 1}번째 계획 시간`), {
    target: { value: hours },
  });
  fireEvent.change(screen.getByLabelText(`${index + 1}번째 계획 분`), {
    target: { value: minutes },
  });
  fireEvent.change(screen.getByLabelText(`${index + 1}번째 계획 일수`), {
    target: { value: days },
  });
}

test("계획 추가 버튼을 누르면 새 예상 근무 계획 항목이 나타난다", () => {
  render(<Home />);

  expect(screen.getByLabelText("1번째 계획 시간")).toBeInTheDocument();
  expect(screen.queryByLabelText("2번째 계획 시간")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "계획 추가" }));

  expect(screen.getByLabelText("2번째 계획 시간")).toBeInTheDocument();
});

test("항목의 삭제 버튼을 누르면 해당 항목이 사라진다", () => {
  render(<Home />);

  fireEvent.click(screen.getByRole("button", { name: "계획 추가" }));
  expect(screen.getByLabelText("2번째 계획 시간")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "1번째 계획 삭제" }));

  expect(screen.queryByLabelText("2번째 계획 시간")).not.toBeInTheDocument();
  expect(screen.getByLabelText("1번째 계획 시간")).toBeInTheDocument();
});

test("계산하기 버튼 없이 값을 입력하면 자동으로 결과가 갱신된다", () => {
  render(<Home />);

  fillTopFields("100", "50");
  fillEntry(0, "8", "0", "10");

  expect(screen.getByText(/초과 예상/)).toBeInTheDocument();
  expect(screen.getByText(/목표 대비 30시간 초과/)).toBeInTheDocument();
});

test("아무 값도 입력하지 않아도(모두 0) 오류 없이 충족 예상을 보여준다", () => {
  render(<Home />);

  expect(screen.getByText(/충족 예상/)).toBeInTheDocument();
});

test("음수를 입력하면 계산 대신 오류 메시지를 alert로 보여준다", () => {
  render(<Home />);

  fillTopFields("-1", "50");
  fillEntry(0, "8", "0", "10");

  expect(screen.getByRole("alert")).toHaveTextContent(/오류/);
});

test("localStorage에 항목 형태가 아닌 값이 저장되어 있으면 기본값으로 대체한다", () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([null]));

  render(<Home />);

  expect(screen.getByLabelText("1번째 계획 시간")).toHaveValue(null);
  expect(screen.queryByLabelText("2번째 계획 시간")).not.toBeInTheDocument();
});

test("예상 근무 계획 항목은 저장되어 웹페이지를 다시 불러와도 유지된다", () => {
  const { unmount } = render(<Home />);

  fillEntry(0, "7", "30", "4");
  expect(localStorage.getItem(STORAGE_KEY)).toContain("7");
  unmount();

  render(<Home />);

  expect(screen.getByLabelText("1번째 계획 시간")).toHaveValue(7);
  expect(screen.getByLabelText("1번째 계획 분")).toHaveValue(30);
  expect(screen.getByLabelText("1번째 계획 일수")).toHaveValue(4);
});

test("모든 예상 근무 계획 항목을 삭제하고 저장한 뒤 다시 불러오면 빈 상태 그대로 유지된다", () => {
  const { unmount } = render(<Home />);

  fireEvent.click(screen.getByRole("button", { name: "1번째 계획 삭제" }));
  expect(screen.queryByLabelText("1번째 계획 시간")).not.toBeInTheDocument();
  unmount();

  render(<Home />);

  expect(screen.queryByLabelText("1번째 계획 시간")).not.toBeInTheDocument();
});

test("예상 근무 제외(전일)를 입력하면 유효목표시간이 줄어든 결과를 자동으로 보여준다", () => {
  render(<Home />);

  fillTopFields("100", "50");
  fireEvent.change(screen.getByLabelText("전일(8H)"), {
    target: { value: "2" },
  });

  // 유효목표시간 = 100 - 8*2 = 84, 예상누적 = 50 → 부족 34시간
  expect(screen.getByText(/부족 예상/)).toBeInTheDocument();
  expect(screen.getByText(/목표 대비 34시간 부족/)).toBeInTheDocument();
});

test("예상 근무 제외(반일·반반일)를 함께 입력하면 합계를 반영한다", () => {
  render(<Home />);

  fillTopFields("100", "80");
  fireEvent.change(screen.getByLabelText("반일(4H)"), {
    target: { value: "1" },
  });
  fireEvent.change(screen.getByLabelText("반반일(2H)"), {
    target: { value: "1" },
  });

  // 총제외시간 = 4 + 2 = 6, 유효목표시간 = 94, 예상누적 = 80 → 부족 14시간
  expect(screen.getByText(/부족 예상/)).toBeInTheDocument();
  expect(screen.getByText(/목표 대비 14시간 부족/)).toBeInTheDocument();
});

test("예상 근무 제외 값은 저장되어 웹페이지를 다시 불러와도 유지된다", () => {
  const { unmount } = render(<Home />);

  fireEvent.change(screen.getByLabelText("반일(4H)"), {
    target: { value: "3" },
  });
  expect(localStorage.getItem(EXCLUSION_STORAGE_KEY)).toContain("3");
  unmount();

  render(<Home />);

  expect(screen.getByLabelText("반일(4H)")).toHaveValue(3);
});

test("예상 근무 계획의 총 일수가 남은 근무 일수보다 많으면 경고를 함께 보여준다", () => {
  render(<Home />);

  fillTopFields("100", "0");
  fireEvent.change(screen.getByLabelText("남은 근무 일수(일)"), {
    target: { value: "5" },
  });
  fillEntry(0, "8", "0", "10");

  expect(screen.getByText(/예상 근무 계획의 총 일수\(10일\)가 남은 근무 일수\(5일\)보다 많습니다/)).toBeInTheDocument();
});

test("남은 근무 일수를 비워두면 총 일수와 무관하게 경고를 보여주지 않는다", () => {
  render(<Home />);

  fireEvent.change(screen.getByLabelText("남은 근무 일수(일)"), {
    target: { value: "" },
  });
  fillTopFields("100", "0");
  fillEntry(0, "8", "0", "10");

  expect(screen.queryByText(/보다 많습니다/)).not.toBeInTheDocument();
});

test("예상 근무 계획의 총 일수가 남은 근무 일수 이하면 경고를 보여주지 않는다", () => {
  render(<Home />);

  fillTopFields("100", "0");
  fireEvent.change(screen.getByLabelText("남은 근무 일수(일)"), {
    target: { value: "10" },
  });
  fillEntry(0, "8", "0", "10");

  expect(screen.queryByText(/보다 많습니다/)).not.toBeInTheDocument();
});

test("근태일정 기간 안에 공휴일이 없으면 그 사실을 알려준다", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 7, 20)); // 2026-08-20, 정산기간 8/20~9/19

  render(<Home />);

  // 정산기간(8/20~9/19) 안에는 공휴일이 없다 (8/17 대체공휴일은 범위 이전, 9/24 추석은 범위 이후)
  expect(
    screen.getByText("이번 근태일정 기간에는 공휴일이 없습니다.")
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("list", { name: "근태일 기준 공휴일" })
  ).not.toBeInTheDocument();
});

test("결과는 불릿 포인트 목록으로 상세 내용을 보여준다", () => {
  render(<Home />);

  fillTopFields("100", "50");
  fillEntry(0, "8", "0", "10");

  const list = screen.getByRole("status").querySelector("ul");
  expect(list).not.toBeNull();
  const items = list?.querySelectorAll("li") ?? [];
  expect(items.length).toBeGreaterThanOrEqual(3);
  expect(list).toHaveTextContent("총예상근무시간: 80시간");
  expect(list).toHaveTextContent("예상 근무 제외: 0시간");
  expect(list).toHaveTextContent("목표 대비 30시간 초과");
});

test("초과 예상이면 일수가 가장 많은 계획의 일수를 줄이라고 제안하고, 적용 버튼을 누르면 그 일수에 반영된다", () => {
  render(<Home />);

  fillTopFields("100", "50");
  fillEntry(0, "8", "0", "10");

  // 초과 30시간, 하루 8시간 → 30÷8=3.75 → 반올림 4일 감소 (정확히는 안 맞음)
  expect(
    screen.getByText(
      /제안: 1번째 계획\(하루 8:00\)의 일수를 10일에서 6일로 조정하면 목표에 가장 가깝게 맞춰집니다/
    )
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "제안 적용" }));

  expect(screen.getByLabelText("1번째 계획 일수")).toHaveValue(6);
});

test("부족 예상이고 일수를 조정하면 정확히 맞는 경우 '정확히 맞습니다'라고 제안하고, 적용하면 충족 예상으로 바뀐다", () => {
  render(<Home />);

  fillTopFields("100", "20");
  fillEntry(0, "8", "0", "5");

  // 부족 40시간, 하루 8시간 → 정확히 5일 증가
  expect(
    screen.getByText(
      /제안: 1번째 계획\(하루 8:00\)의 일수를 5일에서 10일로 조정하면 정확히 맞습니다/
    )
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "제안 적용" }));

  expect(screen.getByLabelText("1번째 계획 일수")).toHaveValue(10);
  expect(screen.getByText(/충족 예상/)).toBeInTheDocument();
});

test("예상 근무 계획 항목이 여러 개면 일수가 가장 많은 항목을 대상으로 제안한다", () => {
  render(<Home />);

  fillTopFields("100", "4");
  fillEntry(0, "4", "0", "2");
  fireEvent.click(screen.getByRole("button", { name: "계획 추가" }));
  fillEntry(1, "8", "0", "5");

  // 총예상=4*2+8*5=48, 예상누적=52, 부족=48, 2번째 계획(일수 5일)이 더 많아 대상이 됨
  expect(
    screen.getByText(
      /제안: 2번째 계획\(하루 8:00\)의 일수를 5일에서 11일로 조정하면 정확히 맞습니다/
    )
  ).toBeInTheDocument();
});

test("부족 예상이고 남은 근무 일수가 있으면 하루 평균 계획량을 제안한다", () => {
  render(<Home />);

  fillTopFields("100", "50");
  fireEvent.change(screen.getByLabelText("남은 근무 일수(일)"), {
    target: { value: "5" },
  });

  // 부족 50시간 ÷ 남은근무일수 5일 = 하루 평균 10시간
  expect(
    screen.getByText(/제안: 남은 근무 일수 5일 동안 하루 평균 10시간씩 계획하면 정확히 맞습니다/)
  ).toBeInTheDocument();
});

test("부족 예상이고 남은 근무 일수가 없으면 계획에 추가할 시간을 제안한다", () => {
  render(<Home />);

  fireEvent.change(screen.getByLabelText("남은 근무 일수(일)"), {
    target: { value: "" },
  });
  fillTopFields("100", "50");

  expect(
    screen.getByText(/제안: 예상 근무 계획에 50시간을 추가하면 정확히 맞습니다/)
  ).toBeInTheDocument();
});

test("판정 상태에 따라 결과 영역에 서로 다른 색상 클래스가 적용된다", () => {
  render(<Home />);

  fillTopFields("100", "50");
  fillEntry(0, "8", "0", "10");
  expect(screen.getByRole("status").className).toMatch(/red/);

  fillTopFields("100", "100");
  fillEntry(0, "0", "0", "0");
  expect(screen.getByRole("status").className).toMatch(/green/);

  fillTopFields("100", "0");
  expect(screen.getByRole("status").className).toMatch(/amber/);
});

test("예상 근무 계획 제목 옆에 총 예상 근무시간이 시간:분 형식으로 표시된다", () => {
  render(<Home />);

  fillEntry(0, "8", "30", "2");

  // 총 = (8+30/60)*2 = 17시간 = 17:00
  expect(screen.getByText("총 17:00 · 2일")).toBeInTheDocument();
});

test("예상 근무 계획의 분이 남으면 시간:분 형식에 반영된다", () => {
  render(<Home />);

  fillEntry(0, "1", "45", "1");

  // 총 = 1.75시간 = 1시간 45분
  expect(screen.getByText("총 1:45 · 1일")).toBeInTheDocument();
});

test("예상 근무 계획 제목 옆에 총 일수도 함께 표시되고, 항목이 여러 개면 합계가 반영된다", () => {
  render(<Home />);

  fillEntry(0, "8", "0", "3");
  fireEvent.click(screen.getByRole("button", { name: "계획 추가" }));
  fillEntry(1, "4", "0", "2");

  // 총 시간 = 8*3+4*2 = 32시간, 총 일수 = 3+2 = 5일
  expect(screen.getByText("총 32:00 · 5일")).toBeInTheDocument();
});

test("예상 근무 제외 제목 옆에 총 제외 시간이 표시된다", () => {
  render(<Home />);

  fireEvent.change(screen.getByLabelText("전일(8H)"), {
    target: { value: "1" },
  });
  fireEvent.change(screen.getByLabelText("반일(4H)"), {
    target: { value: "1" },
  });

  // 총 = 8 + 4 = 12시간
  expect(screen.getByText("총 12시간")).toBeInTheDocument();
});

test("남은 근무 일수는 오늘 날짜와 근태일정 기준으로 주말·공휴일을 제외하고 자동으로 채워진다", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 7, 20)); // 2026-08-20, 정산기간 8/20~9/19, 주말 9일 제외 -> 22일

  render(<Home />);

  expect(screen.getByLabelText("남은 근무 일수(일)")).toHaveValue(22);
});

test("근태일정 기간이 8월 초를 포함하면 그 기간의 공휴일을 보여준다", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 7, 5)); // 2026-08-05, 정산기간 7/20~8/19

  render(<Home />);

  const list = screen.getByRole("list", { name: "근태일 기준 공휴일" });
  expect(list).toHaveTextContent("광복절");
  expect(list).toHaveTextContent("광복절 대체공휴일");
});

test("휴일 추가 버튼을 누르면 팝업이 열린다", () => {
  render(<Home />);

  expect(screen.queryByText("휴일 추가")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "+ 휴일 추가" }));

  expect(screen.getByRole("heading", { name: "휴일 추가" })).toBeInTheDocument();
});

test("반복 안함으로 휴일을 추가하면 근태일 기준 공휴일에 나타나고 저장된다", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 7, 22)); // 정산기간 8/20~9/19 (첫째날은 아님)

  render(<Home />);

  fireEvent.click(screen.getByRole("button", { name: "+ 휴일 추가" }));
  fireEvent.change(screen.getByLabelText("이름"), {
    target: { value: "회사 워크숍" },
  });
  fireEvent.change(screen.getByLabelText("날짜"), {
    target: { value: "2026-08-25" },
  });
  fireEvent.click(screen.getByRole("button", { name: "추가" }));

  const list = screen.getByRole("list", { name: "근태일 기준 공휴일" });
  expect(list).toHaveTextContent("8월 25일 회사 워크숍");
  expect(localStorage.getItem(CUSTOM_HOLIDAY_STORAGE_KEY)).toContain(
    "회사 워크숍"
  );
});

test("매년 반복으로 휴일을 추가하면 월/일만으로 근태일 기준 공휴일에 나타난다", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 7, 22)); // 정산기간 8/20~9/19 (첫째날은 아님)

  render(<Home />);

  fireEvent.click(screen.getByRole("button", { name: "+ 휴일 추가" }));
  fireEvent.change(screen.getByLabelText("이름"), {
    target: { value: "창립기념일" },
  });
  fireEvent.click(screen.getByLabelText("매년 반복"));
  fireEvent.change(screen.getByLabelText("월"), { target: { value: "9" } });
  fireEvent.change(screen.getByLabelText("일"), { target: { value: "1" } });
  fireEvent.click(screen.getByRole("button", { name: "추가" }));

  const list = screen.getByRole("list", { name: "근태일 기준 공휴일" });
  expect(list).toHaveTextContent("9월 1일 창립기념일");
});

test("이름을 입력하지 않으면 오류를 보여주고 추가하지 않는다", () => {
  render(<Home />);

  fireEvent.click(screen.getByRole("button", { name: "+ 휴일 추가" }));
  fireEvent.change(screen.getByLabelText("날짜"), {
    target: { value: "2026-08-25" },
  });
  fireEvent.click(screen.getByRole("button", { name: "추가" }));

  expect(screen.getByRole("alert")).toHaveTextContent("이름을 입력해주세요.");
  expect(
    screen.queryByRole("heading", { name: "휴일 추가" })
  ).toBeInTheDocument();
});

test("추가한 휴일은 삭제 버튼으로 지울 수 있고, 기본 공휴일에는 삭제 버튼이 없다", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 7, 22)); // 정산기간 8/20~9/19 (첫째날은 아님)

  render(<Home />);

  fireEvent.click(screen.getByRole("button", { name: "+ 휴일 추가" }));
  fireEvent.change(screen.getByLabelText("이름"), {
    target: { value: "회사 워크숍" },
  });
  fireEvent.change(screen.getByLabelText("날짜"), {
    target: { value: "2026-08-25" },
  });
  fireEvent.click(screen.getByRole("button", { name: "추가" }));

  expect(
    screen.getByRole("button", { name: "회사 워크숍 삭제" })
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "회사 워크숍 삭제" }));

  expect(
    screen.queryByRole("button", { name: "회사 워크숍 삭제" })
  ).not.toBeInTheDocument();
});

test("추가한 휴일은 저장되어 웹페이지를 다시 불러와도 유지된다", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 7, 22)); // 정산기간 8/20~9/19 (첫째날은 아님)

  const { unmount } = render(<Home />);

  fireEvent.click(screen.getByRole("button", { name: "+ 휴일 추가" }));
  fireEvent.change(screen.getByLabelText("이름"), {
    target: { value: "회사 워크숍" },
  });
  fireEvent.change(screen.getByLabelText("날짜"), {
    target: { value: "2026-08-25" },
  });
  fireEvent.click(screen.getByRole("button", { name: "추가" }));
  unmount();

  render(<Home />);

  const list = screen.getByRole("list", { name: "근태일 기준 공휴일" });
  expect(list).toHaveTextContent("8월 25일 회사 워크숍");
});

test("초기화 버튼을 누르면 정상근무시간·누적근무시간·예상 근무 계획·예상 근무 제외가 빈 값으로 초기화된다", () => {
  render(<Home />);

  fillTopFields("100", "50", "30");
  fillEntry(0, "8", "0", "10");
  fireEvent.click(screen.getByRole("button", { name: "계획 추가" }));
  fillEntry(1, "4", "0", "2");
  fireEvent.change(screen.getByLabelText("전일(8H)"), {
    target: { value: "1" },
  });
  fireEvent.change(screen.getByLabelText("반일(4H)"), {
    target: { value: "1" },
  });
  fireEvent.change(screen.getByLabelText("반반일(2H)"), {
    target: { value: "1" },
  });

  fireEvent.click(screen.getByRole("button", { name: "초기화" }));

  expect(screen.getByLabelText("정상근무시간(시간)")).toHaveValue(null);
  expect(screen.getByLabelText("누적근무시간 시간")).toHaveValue(null);
  expect(screen.getByLabelText("누적근무시간 분")).toHaveValue(null);

  expect(screen.getByLabelText("1번째 계획 시간")).toHaveValue(null);
  expect(screen.getByLabelText("1번째 계획 분")).toHaveValue(null);
  expect(screen.getByLabelText("1번째 계획 일수")).toHaveValue(null);
  expect(screen.queryByLabelText("2번째 계획 시간")).not.toBeInTheDocument();

  expect(screen.getByLabelText("전일(8H)")).toHaveValue(null);
  expect(screen.getByLabelText("반일(4H)")).toHaveValue(null);
  expect(screen.getByLabelText("반반일(2H)")).toHaveValue(null);
});

test("초기화 버튼을 누르면 남은 근무 일수는 오늘 날짜 기준으로 다시 계산된다", () => {
  render(<Home />);

  const defaultValue = (
    screen.getByLabelText("남은 근무 일수(일)") as HTMLInputElement
  ).value;

  fireEvent.change(screen.getByLabelText("남은 근무 일수(일)"), {
    target: { value: "999" },
  });
  fireEvent.click(screen.getByRole("button", { name: "초기화" }));

  expect(screen.getByLabelText("남은 근무 일수(일)")).toHaveValue(
    Number(defaultValue)
  );
});

test("근태일정 첫째날에 열면 초기화할지 묻는 팝업이 뜨고, 아니오를 누르면 값이 유지된다", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 7, 20)); // 2026-08-20, 근태일정 첫째날

  render(<Home />);

  expect(
    screen.getByRole("heading", { name: "새 근태일정 시작" })
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "아니오" }));

  expect(
    screen.queryByRole("heading", { name: "새 근태일정 시작" })
  ).not.toBeInTheDocument();
  expect(screen.getByLabelText("1번째 계획 시간")).toBeInTheDocument();
});

test("근태일정 첫째날 팝업에서 예, 초기화를 누르면 예상 근무 계획이 초기화된다", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 7, 20)); // 2026-08-20, 근태일정 첫째날

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([{ hours: "8", minutes: "0", days: "10" }])
  );

  render(<Home />);

  fireEvent.click(screen.getByRole("button", { name: "예, 초기화" }));

  expect(
    screen.queryByRole("heading", { name: "새 근태일정 시작" })
  ).not.toBeInTheDocument();
  expect(screen.getByLabelText("1번째 계획 시간")).toHaveValue(null);
  expect(screen.queryByLabelText("2번째 계획 시간")).not.toBeInTheDocument();
});

test("근태일정 첫째날이 아니면 초기화 팝업이 뜨지 않는다", () => {
  render(<Home />);

  expect(
    screen.queryByRole("heading", { name: "새 근태일정 시작" })
  ).not.toBeInTheDocument();
});
