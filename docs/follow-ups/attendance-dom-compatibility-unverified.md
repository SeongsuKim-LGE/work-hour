# 실제 근태 달력에서 현황 가져오기 호환성이 검증되지 않음

**Symptom**: 확장 프로그램 추출기는 실제 화면 캡처의 문구를 재현한 테스트용 DOM에서 동작하지만 실제 `attendance.lge.com` 페이지에서 정상근무시간과 누적근무시간을 가져오는지는 확인되지 않았다.

**Observed evidence**: 2026-08-20 Codex 인앱 브라우저에서 `https://attendance.lge.com/home/calendar/my-calendar`과 `http://localhost:3000` 접근을 시도했으나 브라우저 보안 정책이 두 URL 사용을 거부했다.

**Suspected cause**: 실제 근태 페이지 접근 제한으로 DOM 구조와 비동기 렌더링 시점을 관찰할 수 없었으며, 현재 추출기는 화면 캡처에서 확인한 `정상근무시간`과 `누적근무` 텍스트를 기준으로 동작한다.

**What was tried**: 실제 사이트 접근 없이 캡처의 라벨 및 단위 배치를 재현한 시간 추출 테스트와, 필수 값을 찾지 못하면 기존 입력값을 유지하는 실패 처리를 구현했다. 실제 사이트 선택자 호환성은 확인하지 못했다.

**Proposed next step**: 사용자가 `extension` 폴더를 Chrome에 설치한 뒤 로그인된 근태 화면에서 가져오기를 실행하고, 실패하면 개인 정보가 제거된 정상근무시간 및 누적근무 항목의 DOM 구조를 확보해 `extension/extractor.js` 선택자를 조정한다.
