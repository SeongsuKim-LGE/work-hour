---
title: 공휴일 표시 렌더 타이밍 및 근무제외 타입 검증 미비
---

두 가지 자잘한 미검증 지점:
1. `HolidaySection`(`app/page.tsx`)이 렌더 시점에 `new Date()`를 직접 호출함. 월 경계 부근에서 서버 렌더와 클라이언트 하이드레이션의 "이번 달" 판단이 어긋나면 하이드레이션 불일치나 깜빡임이 생길 수 있음(참고 표시 전용이라 계산에는 영향 없음).
2. `calculatePlannedWorkHourPace`(`lib/work-hour-pace.ts`)가 `exclusion.days`는 검증하지만 `exclusion.type`이 "full"/"half"/"quarter" 중 하나인지는 검증하지 않음. UI(라디오 버튼)로는 도달 불가능하지만, 다른 호출자가 잘못된 type을 넘기면 `EXCLUSION_HOURS[type]`이 `undefined`가 되어 결과가 NaN으로 새어나감.
