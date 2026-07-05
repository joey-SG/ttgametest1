// 절차적 SFX — 오디오 파일 0개 (docs/02 §6, 용량 최소화)
// 무음 환경에서도 게임이 완성되도록 사운드는 순수 향상 요소로만 쓴다.

export class Sfx {
  private ctx: AudioContext | null = null;

  /** 첫 사용자 제스처에서 호출 (iOS 오디오 정책) */
  unlock(): void {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  }

  /** 히트 — 콤보 오를수록 피치 상승 (docs/02 §5) */
  hit(combo: number): void {
    const freq = 420 * Math.pow(2, Math.min(combo, 24) / 24);
    this.tone(freq, 0.09, 'sine', 0.22);
  }

  perfect(combo: number): void {
    const freq = 520 * Math.pow(2, Math.min(combo, 24) / 24);
    this.tone(freq, 0.1, 'sine', 0.25);
    this.tone(freq * 1.5, 0.14, 'sine', 0.18, 0.045);
  }

  fail(): void {
    this.tone(220, 0.22, 'sawtooth', 0.2);
    this.tone(140, 0.3, 'sawtooth', 0.18, 0.07);
  }

  milestone(): void {
    this.tone(660, 0.12, 'sine', 0.22);
    this.tone(880, 0.12, 'sine', 0.2, 0.08);
    this.tone(1320, 0.18, 'sine', 0.16, 0.16);
  }

  select(): void {
    this.tone(600, 0.05, 'sine', 0.12);
  }

  /** 무기 구매 — 동전 아르페지오 */
  buy(): void {
    this.tone(700, 0.07, 'sine', 0.2);
    this.tone(1050, 0.09, 'sine', 0.18, 0.06);
    this.tone(1400, 0.14, 'sine', 0.16, 0.12);
  }
}
