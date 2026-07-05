// 화면 흔들림 / 플래시 / 스케일 펀치 (docs/02 §5)

export class Shake {
  private intensity = 0;
  x = 0;
  y = 0;

  kick(amount: number): void {
    this.intensity = Math.max(this.intensity, amount);
  }

  update(dt: number): void {
    if (this.intensity < 0.1) {
      this.intensity = this.x = this.y = 0;
      return;
    }
    this.x = (Math.random() * 2 - 1) * this.intensity;
    this.y = (Math.random() * 2 - 1) * this.intensity;
    this.intensity *= Math.exp(-8 * dt);
  }
}

export class Flash {
  alpha = 0;
  color = '#ffffff';

  kick(alpha: number, color = '#ffffff'): void {
    if (alpha > this.alpha) {
      this.alpha = alpha;
      this.color = color;
    }
  }

  update(dt: number): void {
    this.alpha = Math.max(0, this.alpha - 2.4 * dt);
  }
}

/** 히트 순간 링/텍스트가 "펑" 커졌다 돌아오는 스케일 펀치 */
export class Punch {
  scale = 1;

  kick(amount = 0.12): void {
    this.scale = 1 + amount;
  }

  update(dt: number): void {
    this.scale += (1 - this.scale) * Math.min(1, 12 * dt);
  }
}
