# 03 · 기술 아키텍처

목표: **HTML5** 단일 코드베이스로 (1) 웹 데모(Netlify/Vercel)와 (2) TikTok Mini Game
제출을 모두 커버한다. 플랫폼 종속 기능(광고·햅틱·로그인)은 **어댑터 계층**으로 격리한다.

---

## 1. 권장 스택 (가볍게)

| 영역 | 선택 | 이유 |
|---|---|---|
| 번들러 | **Vite** | 빠른 dev/build, 정적 HTML5 산출 용이 |
| 언어 | **TypeScript** | 어댑터 인터페이스 계약을 타입으로 고정 |
| 렌더 | **Canvas 2D** (또는 초경량 PixiJS) | 원탭 아케이드엔 2D면 충분, 용량↓, 60fps 쉬움 |
| 상태 | 순수 함수 게임 루프 + 간단한 state machine | 추상화 최소(Simplicity First) |
| 에셋 | 절차적/벡터 우선 | **< 50MB** 준수 |

> Fable은 손에 익은 대안(예: 순수 Canvas + no-framework)을 선택해도 된다.
> 단 **HTML5 산출 + 50MB 미만 + 60fps**라는 성공 기준은 고정.

---

## 2. 플랫폼 어댑터 계층 (핵심 설계)

플랫폼 API를 직접 부르지 말고 아래 인터페이스 뒤로 숨긴다.
웹에서는 폴백 구현, TikTok 인앱에서는 실제 SDK 구현으로 런타임 스왑.

```ts
// src/platform/types.ts
export interface Platform {
  showRewardedAd(placement: 'revive' | 'double'): Promise<boolean>; // 완주 시 true
  haptic(kind: 'success' | 'fail' | 'combo' | 'select'): void;
  saveHighScore(score: number): Promise<void>;
  loadHighScore(): Promise<number>;
  isTikTokInApp(): boolean;
}
```

- `src/platform/web.ts` — 브라우저/데모용 폴백.
- `src/platform/tiktok.ts` — `TTMinis.game` SDK 래핑 (인앱에서만 로드).
- `src/platform/index.ts` — 런타임 감지 후 적절한 구현 반환.

### 2.1 보상형 광고 (TikTok Mini Games SDK)

- TikTok 인앱: `TTMinis.game`의 Rewarded Video Ads API 사용. 콜백의 boolean(완주 여부)으로만 보상 지급.
- 웹 폴백: 실제 광고 없음 → 확인 모달 또는 3초 카운트다운으로 대체(개발/데모용).

```ts
// tiktok.ts (개념 예시)
async showRewardedAd(placement) {
  const completed = await TTMinis.game.showRewardedVideoAd({ placement });
  return completed === true;
}
```

### 2.2 iPhone 햅틱 (중요·플랫폼별 상이)

iOS Safari는 **Web Vibration API를 지원하지 않는다**. 실장 전략:

1. **TikTok 인앱(iOS)**: TikTok Mini Games SDK가 제공하는 햅틱/디바이스 API를 우선 사용. (인앱 웹뷰는 네이티브 브릿지 사용 가능)
2. **iOS Safari 웹 데모**: `ios-haptics` 유형의 **`<input type="checkbox" switch>` 토글 트릭**으로 시스템 햅틱 유발.
   - ⚠️ iOS 17.4~26.4에서 동작, **iOS 26.5에서 Apple이 패치**하여 최신 버전은 안 될 수 있음. 반드시 기능 감지 후 폴백.
3. **Android 웹**: 표준 `navigator.vibrate()` 사용.
4. **미지원 환경**: 조용히 no-op. 햅틱 없어도 비주얼 juice로 손맛 유지.

```ts
// web.ts (개념 예시 — 실제 구현은 기능 감지/폴백 포함)
haptic(kind) {
  if (this.isAndroid && navigator.vibrate) navigator.vibrate(PATTERNS[kind]);
  else if (this.iosHapticAvailable) this.iosSwitchHaptic(kind); // checkbox switch 트릭
  // else: no-op
}
```

> 원칙: 햅틱은 **향상(enhancement)**이지 필수 의존이 아니다. 없으면 게임은 여전히 완전 동작.

### 2.3 점수 저장

- 웹: `localStorage`.
- TikTok 인앱: SDK 스토리지/서버 API. (MVP는 로컬로 시작, 필요 시 서버 연동)

---

## 3. 성능 예산

- 목표 **60fps** (저사양 모바일 포함). 프레임당 할당(GC 압박) 최소화 — 파티클 풀링.
- 초기 로드 최소화: 코드 스플리팅, TikTok SDK는 인앱에서만 지연 로드.
- 총 패키지 **< 50MB** (권장은 훨씬 작게). 이미지보다 절차적 그래픽 우선.

## 4. 디렉터리 (제안)

```
/
├── index.html
├── src/
│   ├── main.ts            # 부트스트랩
│   ├── game/              # 게임 루프·상태·엔티티·이펙트
│   ├── fx/                # 파티클/셰이크/플래시 (juice)
│   └── platform/          # 어댑터: types / web / tiktok / index
├── public/                # 최소 정적 에셋
└── docs/
```

## 5. 코드 규칙

- 플랫폼 API를 게임 로직에서 **직접 호출 금지** → 반드시 `Platform` 인터페이스 경유.
- 매직 넘버는 `config.ts`로 모아 밸런싱 조정 용이하게.
- Surgical: 한 번에 한 기능. 무관한 리팩터링 금지.

---

### 출처

- [Develop Your Mini Game — TikTok for Developers](https://developers.tiktok.com/doc/develop-your-mini-game)
- [Mini Games Monetization (Rewarded Ads) — TikTok for Developers](https://developers.tiktok.com/doc/mini-games-monetization)
- [The Game Developer's Guide to TikTok Mini Games — BigSpy](https://bigspy.com/blog/game-developers-guide-tiktok-mini-games)
- [I Open-Sourced an OSS Library for Arbitrary Haptic Feedback in iOS Safari — Medium](https://medium.com/@posaune0423/i-open-sourced-an-oss-library-for-arbitrary-haptic-feedback-in-ios-safari-5b8ca74a5f05)
- [Vibration API: Browser Support & Limitations — TestMu AI](https://www.testmuai.com/learning-hub/vibration-api-browser-support/)
