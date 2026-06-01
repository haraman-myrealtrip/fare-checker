# 운임 자동 조회 Chrome Extension 설치 가이드

## 설치 방법 (개발자 모드)

1. **파일 다운로드**
   - GitHub에서 `extension` 폴더 전체를 다운로드합니다
   - 또는 레포지토리를 클론합니다: `git clone https://github.com/haraman-myrealtrip/fare-checker.git`

2. **Chrome 확장프로그램 페이지 열기**
   - Chrome 주소창에 `chrome://extensions` 입력
   - 또는 메뉴 > 도구 더보기 > 확장 프로그램

3. **개발자 모드 활성화**
   - 우측 상단 "개발자 모드" 토글 ON

4. **확장프로그램 로드**
   - "압축해제된 확장 프로그램을 로드합니다" 클릭
   - `extension` 폴더 선택

5. **완료!**
   - 크롬 툴바에 ✈ 아이콘이 나타납니다

## 사용 방법

1. **SellConnect 로그인** — 먼저 SellConnect에 로그인합니다
2. **확장프로그램 클릭** — 툴바의 ✈ 아이콘 클릭
3. **조건 입력** — 항공사, 구간, 날짜, 클래스 등 입력
4. **엔트리 생성** — 버튼 클릭으로 엔트리 자동 생성
5. **자동 조회 실행** — SellConnect 터미널에 자동으로 입력 & 결과 확인

## Slack 알림 설정 (선택)

- Slack Incoming Webhook URL을 입력하면 에러 발생 시 알림을 받을 수 있습니다
- Webhook URL은 한 번 입력하면 자동 저장됩니다

## 주의사항

- SellConnect 탭이 열려있고 로그인된 상태에서만 자동 조회가 작동합니다
- 조회 중 SellConnect 탭을 닫지 마세요
- PNR 캔슬(TTE/ALL → XI → ER)은 자동으로 실행됩니다
