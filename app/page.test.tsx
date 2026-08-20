import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test } from "vitest";

import Home from "@/app/page";

const STORAGE_KEY = "work-hour-pace:planned-entries";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

function fillTopFields(normalHours: string, accumulatedHours: string) {
  fireEvent.change(screen.getByLabelText("정상근무시간"), {
    target: { value: normalHours },
  });
  fireEvent.change(screen.getByLabelText("누적근무시간"), {
    target: { value: accumulatedHours },
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

test("예상누적근무시간이 정상근무시간보다 크면 초과 예상 판정을 보여준다", () => {
  render(<Home />);

  fillTopFields("100", "50");
  fillEntry(0, "8", "0", "10");
  fireEvent.click(screen.getByRole("button", { name: "계산하기" }));

  expect(screen.getByText(/초과 예상/)).toBeInTheDocument();
  expect(screen.getByText(/30시간/)).toBeInTheDocument();
});

test("음수를 입력하면 계산 대신 오류 메시지를 alert로 보여준다", () => {
  render(<Home />);

  fillTopFields("-1", "50");
  fillEntry(0, "8", "0", "10");
  fireEvent.click(screen.getByRole("button", { name: "계산하기" }));

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
