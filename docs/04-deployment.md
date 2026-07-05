# 04 · 배포 (Deployment)

"배포까지 가능하게"가 목표다. 두 트랙으로 배포한다:
**(A) 웹 데모** — 즉시 플레이 링크로 반복 검증·공유. **(B) TikTok Mini Game** — 실제 제출.

---

## A. 웹 데모 배포 (즉시 검증용)

빠르게 플레이 가능한 링크를 만들어 손맛/이펙트/햅틱을 실기기(iPhone)에서 확인한다.

### 절차
1. `npm run build` → `dist/` 정적 산출물 생성. (성공 기준: 빌드 성공 + `dist` < 50MB)
2. 정적 호스팅에 배포:
   - **Netlify** 또는 **Vercel** (이 환경에 MCP 커넥터 연결됨 — 세션 내 배포 가능).
   - 또는 GitHub Pages.
3. 배포 URL을 **iPhone Safari**에서 열어 확인:
   - 로딩·첫 입력 반응 / 코어 루프 / 이펙트 / **햅틱 동작 여부**(iOS 버전 주의) / 광고 폴백.

### iPhone 실기 체크리스트
- [ ] iPhone Safari에서 정상 로드 & 60fps 체감.
- [ ] 성공/실패/콤보에서 햅틱이 울리는가 (iOS 26.5+는 안 울릴 수 있음 → 폴백 정상 동작 확인).
- [ ] 세로 화면, 노치/세이프에어리어 대응.
- [ ] 게임오버 → 광고 폴백 → 부활 흐름이 끊김 없이 동작.

---

## B. TikTok Mini Game 배포 (제출)

### 사전 준비
- **TikTok for Developers** 계정 및 앱 등록 (developers.tiktok.com).
- Mini Games 프로그램 접근 권한.

### 절차 (요약)
1. **HTML5 산출물** 준비 — 최종 파일이 HTML5 호환, 패키지 **< 50MB**.
2. **TikTok Minis Adapter로 래핑** — `TTMinis.game` SDK 연동(광고·햅틱·저장).
   - `src/platform/tiktok.ts` 구현이 인앱에서 로드되는지 확인.
3. **보상형 광고 연동 검증** — Rewarded Video Ads 콜백(boolean 완주 여부)으로만 보상 지급.
4. 개발자 콘솔에서 **패키지 업로드 → 테스트(인앱 프리뷰) → 심사 제출**.
5. 심사 통과 후 게시.

### 제출 전 게이트 (성공 기준)
- [ ] 패키지 < 50MB.
- [ ] 인앱 프리뷰에서 광고·햅틱·저장이 SDK 경로로 정상 동작.
- [ ] 웹 폴백 코드가 인앱 SDK 코드로 올바르게 스왑됨(`isTikTokInApp()` 감지).
- [ ] 정상 플레이 경로에서 `console.error` 없음.

> Unity/Cocos로 만든 경우 WebGL로 export 후 TikTok Minis Adapter로 래핑하는 경로도 지원되나,
> 이 프로젝트는 용량·성능상 **경량 Canvas HTML5**를 기본 채택한다.

---

## C. CI/배포 자동화 (선택)

- `main`(또는 데모 브랜치) push 시 웹 데모 자동 배포(Netlify/Vercel).
- TikTok 제출용 패키지 산출은 별도 `npm run build:tiktok` 스크립트로 분리 권장.

---

### 출처

- [Build your mini game independently — TikTok for Developers](https://developers.tiktok.com/doc/mini-games-development-stage)
- [How to develop TikTok Mini Games — TikTok for Business](https://ads.tiktok.com/help/article/how-to-develop-tiktok-mini-games)
- [TikTok begins pilot testing HTML5 mini-games — TechCrunch](https://techcrunch.com/2022/07/28/tiktok-begins-pilot-testing-html5-mini-games-with-a-handful-of-partners/)
