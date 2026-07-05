# 01 · TikTok 게임 시장 리서치 (2026)

리서치 수행일: 2026-07-04. moai-adk의 SPEC-First 관점(먼저 무엇을/누구를 위해 만드는지 정의)에 따라
개발 전 시장·유저·타겟을 확정한다.

---

## 1. TikTok에서 게임이 소비되는 방식

TikTok의 유저 행동 특성이 게임 선택을 지배한다:

- **빠른 발견 (fast discovery)** — 피드 스크롤 중 우연히 노출.
- **짧은 집중 시간 (short attention span)** — 첫 3~5초에 붙잡지 못하면 이탈.
- **즉시 플레이 (instant play)** — 다운로드/로딩 대기 없이 바로 시작.
- **광고 기반 수익 (ad-driven monetization)** — 무료 진입 + 보상형 광고가 표준.

→ 그래서 **하이퍼캐주얼 / 퍼즐 / 아케이드(.io)**가 구조적으로 유리하다.

## 2. 주류 장르 (2026 Day-1 ROI 기준 상위)

| 장르 | 왜 통하나 | 이 프로젝트 적합도 |
|---|---|---|
| **하이퍼캐주얼** | 짧은 세션, 바이럴 용이, 즉시 이해 | ★★★★★ |
| **퍼즐** | "one more try" 루프가 강력, 세션 짧음, 보편적 이해 | ★★★★☆ |
| **아케이드/.io** | 경쟁·점수 경쟁으로 스티키 | ★★★★☆ |
| **전략(타워디펜스 등)** | "쉽게 배우고 어렵게 마스터", 스티키하지만 세션 김 | ★★☆☆☆ |
| 시뮬레이션 | 장기 리텐션 좋지만 진입 무겁고 세션 김 | ★★☆☆☆ |

**핵심 인사이트**: TikTok에서 가장 강력한 무기는 **"한 번 더(one more try)" 루프**다.
짧고, 즉시 이해되고, 실패가 아프지 않으며, 재시작이 0초여야 한다.

## 3. 바이럴 트렌드 참고

- 스낵형 퀴즈, 픽셀 영토전, 물리 기반 마블 레이스 등 **한 장면으로 이해되는** 게임이 클립화된다.
- 결과 화면(점수/랭킹/근접 실패)이 스크린샷·짧은 영상으로 공유될 때 유기적 유입이 발생.

---

## 4. 타겟 유저 정의 (SPEC)

### 4.1 페르소나

- **Primary — "피드 서퍼" (13~24세)**: TikTok을 킬링타임으로 소비. 참을성 낮고, 즉각적 도파민(이펙트·햅틱·점수)에 반응. 친구와 점수 경쟁·공유를 즐김.
- **Secondary — "리텐션 러너" (18~30세)**: 짧은 자투리 시간에 반복 플레이. "내 최고 점수 갱신"이 동기. 보상형 광고 시청에 거부감 낮음.

### 4.2 유저 성향 → 설계 요구사항 매핑

| 유저 성향 | 설계로 번역 |
|---|---|
| 참을성 낮음 | 튜토리얼 0, 3초 내 조작 이해, 재시작 0초 |
| 즉각적 도파민 원함 | 강한 이펙트(파티클/셰이크/색) + **iPhone 햅틱** |
| 실패에 민감 | 게임오버가 "벌"이 아니라 "다시 도전 초대"가 되게 |
| 공유·경쟁 욕구 | 점수 공유 화면, 근접 실패 강조, 콤보 하이라이트 |
| 무료 선호, 광고 수용 | **보상형 광고로 부활/이어하기** = 수익화이자 리텐션 장치 |

### 4.3 타겟 지표 (성공 기준)

- 첫 세션에서 평균 **3회 이상 재시도**(one-more-try 작동 증거).
- 게임오버 중 **보상형 광고 시청 전환** 발생 (부활/2배 보상).
- D1 리텐션·세션당 플레이 횟수를 북극성 지표로 관찰.

---

## 5. 결론 (개발 방향 확정)

> **무한(endless) 하이퍼캐주얼 아케이드**, 원탭 조작, 강한 juice + iPhone 햅틱,
> **보상형 광고로 무한 이어하기**, 결과 화면으로 공유 유도.

구체 게임 컨셉은 `docs/02-game-design.md` 참고.

---

### 출처

- [Which Game Genres Have the Most Potential for TikTok Mini Games? — Ecomdy Media](https://ecomdymedia.com/blog/which-game-genres-have-the-most-potential-for-tiktok-mini-games)
- [Top 15 Viral TikTok Games 2026 — Filmora](https://filmora.wondershare.com/tiktok/tiktok-games.html)
- [TikTok Mini Game Market Trends 2025-2033 — Data Insights Market](https://www.datainsightsmarket.com/reports/tiktok-mini-game-1948387)
- [Overview of TikTok Mini Games — TikTok for Developers](https://developers.tiktok.com/doc/mini-games-overview)
