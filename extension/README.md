# Chrome 확장 프로그램 설치

1. Chrome에서 `chrome://extensions`를 연다.
2. 오른쪽 위의 `개발자 모드`를 켠다.
3. `압축해제된 확장 프로그램을 로드합니다`를 누른다.
4. 이 저장소의 `extension` 폴더를 선택한다.
5. 계산기에서 `가져오기`를 누른다.

확장 프로그램은 `attendance.lge.com`의 표시 내용을 읽어 로컬 계산기에 전달합니다. 로그인 정보는 읽거나 저장하지 않으며 근태 데이터를 수정하지 않습니다.

계산기는 `https://work-hour-jet.vercel.app/`, `http://localhost/`, `http://127.0.0.1/`에서 연결할 수 있습니다. 허용 주소가 변경되면 `manifest.json`의 `host_permissions`와 계산기용 `content_scripts.matches`를 함께 갱신해야 합니다.
