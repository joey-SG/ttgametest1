// docs/03 §2 — 플랫폼 API는 반드시 이 인터페이스 뒤로 숨긴다.
// 게임 로직에서 SDK/브라우저 API 직접 호출 금지.

export type AdPlacement = 'revive' | 'double';
export type HapticKind = 'success' | 'fail' | 'combo' | 'select';

export interface Platform {
  /** 보상형 광고. 완주 시에만 true. */
  showRewardedAd(placement: AdPlacement): Promise<boolean>;
  haptic(kind: HapticKind): void;
  saveHighScore(score: number): Promise<void>;
  loadHighScore(): Promise<number>;
  /** 골드·무기 등 영구 데이터 KV 저장 */
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  isTikTokInApp(): boolean;
}
