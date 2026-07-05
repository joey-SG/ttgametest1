import type { AdPlacement, HapticKind, Platform } from './types';

// TikTok Mini Games SDK 전역 (인앱 웹뷰에서만 존재)
declare global {
  interface Window {
    TTMinis?: {
      game: {
        showRewardedVideoAd(opts: { placement: string }): Promise<boolean>;
        vibrate?(kind: string): void;
        setStorage?(key: string, value: string): Promise<void>;
        getStorage?(key: string): Promise<string | null>;
      };
    };
  }
}

const HS_KEY = 'pulse.highscore';

/**
 * TikTok 인앱 구현 (docs/03 §2.1).
 * SDK 자리 확보용 래퍼 — 실제 API 시그니처는 제출 단계에서 SDK 문서에 맞춰 조정한다.
 * 모든 호출은 가드되어 SDK 부재/실패 시 안전하게 동작한다.
 */
export class TikTokPlatform implements Platform {
  private get sdk() {
    return window.TTMinis?.game;
  }

  async showRewardedAd(placement: AdPlacement): Promise<boolean> {
    try {
      const completed = await this.sdk?.showRewardedVideoAd({ placement });
      return completed === true; // 완주했을 때만 보상 (docs/02 §3)
    } catch {
      return false;
    }
  }

  haptic(kind: HapticKind): void {
    try {
      this.sdk?.vibrate?.(kind);
    } catch {
      /* no-op */
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await this.sdk?.setStorage?.(key, value);
    } catch {
      /* no-op */
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      return (await this.sdk?.getStorage?.(key)) ?? null;
    } catch {
      return null;
    }
  }

  async saveHighScore(score: number): Promise<void> {
    try {
      await this.sdk?.setStorage?.(HS_KEY, String(score));
    } catch {
      /* no-op */
    }
  }

  async loadHighScore(): Promise<number> {
    try {
      return Number(await this.sdk?.getStorage?.(HS_KEY)) || 0;
    } catch {
      return 0;
    }
  }

  isTikTokInApp(): boolean {
    return true;
  }
}

export function isTikTokRuntime(): boolean {
  return typeof window !== 'undefined' && !!window.TTMinis;
}
