import { CONFIG } from '../config';

// 파티클 풀 — 프레임당 할당 없음 (docs/03 §3, GC 압박 최소화)
interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 남은 수명 (s)
  ttl: number; // 총 수명 (s)
  size: number;
  color: string;
}

export class ParticlePool {
  private pool: Particle[] = [];

  constructor() {
    for (let i = 0; i < CONFIG.maxParticles; i++) {
      this.pool.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, ttl: 1, size: 0, color: '' });
    }
  }

  burst(x: number, y: number, count: number, color: string, speed = 260): void {
    let spawned = 0;
    for (const p of this.pool) {
      if (spawned >= count) break;
      if (p.active) continue;
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.35 + Math.random() * 0.65);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * v;
      p.vy = Math.sin(angle) * v;
      p.ttl = p.life = 0.35 + Math.random() * 0.45;
      p.size = 2 + Math.random() * 3.5;
      p.color = color;
      spawned++;
    }
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 2.2 * dt; // 감속
      p.vy *= 1 - 2.2 * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.ttl);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
