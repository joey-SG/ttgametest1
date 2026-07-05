import type { AdPlacement, HapticKind, Platform } from './types';

// Android: 표준 Vibration API 패턴 (ms)
const VIBRATE_PATTERNS: Record<HapticKind, number | number[]> = {
  success: 12,
  fail: [60, 40, 80],
  combo: [15, 30, 25],
  select: 8,
};

const HS_KEY = 'pulse.highscore';

/**
 * 웹 데모용 폴백 구현 (docs/03 §2).
 * - 광고: 3초 카운트다운 오버레이로 대체.
 * - 햅틱: Android는 navigator.vibrate, iOS Safari는 checkbox switch 트릭
 *   (iOS 17.4+, 최신 iOS에서 패치됐을 수 있으므로 실패해도 무해한 no-op).
 * - 저장: localStorage.
 */
export class WebPlatform implements Platform {
  private isAndroid = /Android/i.test(navigator.userAgent);
  private isIOS =
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  private hapticLabel: HTMLLabelElement | null = null;

  constructor() {
    if (this.isIOS) this.setupIOSHaptic();
  }

  // iOS Safari에는 Vibration API가 없다. <input type="checkbox" switch>를
  // label.click()으로 토글하면 시스템 햅틱이 울리는 트릭을 사용한다.
  private setupIOSHaptic(): void {
    try {
      const label = document.createElement('label');
      label.style.cssText = 'position:fixed;width:0;height:0;overflow:hidden;pointer-events:none';
      label.ariaHidden = 'true';
      // label.click()이 합성한 click이 게임의 전역 탭 리스너에 도달하면
      // 유령 탭으로 판정되므로 여기서 전파를 끊는다.
      label.addEventListener('click', (e) => e.stopPropagation());
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      label.appendChild(input);
      document.body.appendChild(label);
      this.hapticLabel = label;
    } catch {
      this.hapticLabel = null;
    }
  }

  haptic(kind: HapticKind): void {
    try {
      if (this.isAndroid && navigator.vibrate) {
        navigator.vibrate(VIBRATE_PATTERNS[kind]);
      } else if (this.hapticLabel) {
        this.hapticLabel.click();
        // 강한 이벤트는 이중 클릭으로 강조
        if (kind === 'fail' || kind === 'combo') {
          setTimeout(() => this.hapticLabel?.click(), 70);
        }
      }
      // 미지원: 조용히 no-op — 햅틱은 향상이지 필수가 아니다.
    } catch {
      /* no-op */
    }
  }

  // 웹 데모: 실제 광고 대신 카운트다운 오버레이. 완료 시 true, 스킵 시 false.
  showRewardedAd(_placement: AdPlacement): Promise<boolean> {
    const overlay = document.getElementById('ad-overlay')!;
    const count = document.getElementById('ad-count')!;
    const skip = document.getElementById('ad-skip')!;
    return new Promise((resolve) => {
      let remaining = 3;
      count.textContent = String(remaining);
      overlay.classList.add('show');
      const finish = (completed: boolean) => {
        clearInterval(timer);
        skip.removeEventListener('click', onSkip);
        overlay.classList.remove('show');
        resolve(completed);
      };
      const onSkip = () => finish(false);
      skip.addEventListener('click', onSkip);
      const timer = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) finish(true);
        else count.textContent = String(remaining);
      }, 1000);
    });
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* 프라이빗 모드 등 — 무시 */
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  async saveHighScore(score: number): Promise<void> {
    try {
      localStorage.setItem(HS_KEY, String(score));
    } catch {
      /* 프라이빗 모드 등 — 무시 */
    }
  }

  async loadHighScore(): Promise<number> {
    try {
      return Number(localStorage.getItem(HS_KEY)) || 0;
    } catch {
      return 0;
    }
  }

  isTikTokInApp(): boolean {
    return false;
  }
}
