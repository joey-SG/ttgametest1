import { CONFIG } from '../config';
import type { Platform } from '../platform';
import { ParticlePool } from '../fx/particles';
import { Shake, Flash, Punch } from '../fx/juice';
import { Sfx } from '../audio';

export type GameState = 'title' | 'playing' | 'gameover';

type Listener = () => void;

// 로컬 지표 (docs/06 §5) — 밸런스 결정의 근거. 서버 없이 KV로만 집계.
export interface Stats {
  sessions: number;
  runs: number;
  sumCombo: number;
  sumLen: number; // 초
  sumScore: number;
  hits: number;
  perfects: number;
  revShown: number; // 부활 버튼이 노출된 게임오버 수
  revAccepted: number; // 광고 완주로 실제 부활한 수
}

const EMPTY_STATS: Stats = {
  sessions: 0,
  runs: 0,
  sumCombo: 0,
  sumLen: 0,
  sumScore: 0,
  hits: 0,
  perfects: 0,
  revShown: 0,
  revAccepted: 0,
};

/**
 * PULSE 코어 (docs/02 §2).
 * 회전 바늘이 링 위의 타겟을 지날 때 탭 → 히트. 빗나가거나 지나치면 게임오버.
 * remaining = 진행 방향으로 타겟 중심까지 남은 각도(rad). 프레임마다 speed*dt만큼 감소.
 * |remaining| <= halfArc 안에서 탭하면 히트, -halfArc 아래로 내려가면 놓친 것.
 */
export class Game {
  state: GameState = 'title';
  score = 0;
  combo = 0;
  // 퍼펙트 연속 스트릭 → 점수 배율. 일반 히트는 배율만 리셋하고 런·콤보는 유지.
  perfectStreak = 0;
  multiplier = 1;
  best = 0;
  newBest = false;
  doubleUsed = false;
  revivesUsed = 0;
  // 죽음 원인 피드백 — "왜 죽었는지" 모르면 불공평하게 느낀다
  deathCause: 'mistap' | 'pass' = 'mistap';
  nearMiss = false; // 존 근처에서 아깝게 빗나감

  // 재화·보물 상자 게이지·무기 (영구: 어댑터 KV로 저장)
  gold = 0;
  chestCharge = 0; // 퍼펙트마다 +1, 만충 시 보물로 자동 소모
  ninjaKills = 0; // 이번 런 닌자 처치 수 (일반 히트만 — 퍼펙트는 상자 획득)
  weaponIdx = 0;
  owned: boolean[] = CONFIG.weapons.map((w) => w.price === 0);

  // 지표: 런 기록은 게임오버 시 스테이징, 부활하면 폐기(런 계속), 다음 런 시작 시 확정
  stats: Stats = { ...EMPTY_STATS };

  // 신규 유저 튜토리얼: 1=초록 존 안내(감속), 2=퍼펙트 안내, 0=끝
  tutorialStage = 0;
  private tutorialSeen = false;
  private pendingRun: { combo: number; len: number; score: number; hits: number; perfects: number } | null = null;
  private runHits = 0;
  private runPerfects = 0;
  private runStartMs = 0;

  // 시뮬레이션
  angle = -Math.PI / 2; // 바늘 절대 각도
  dir = 1;
  speed: number = CONFIG.baseSpeed;
  remaining = Math.PI; // 진행 방향으로 타겟 중심까지 남은 각도
  halfArc: number = CONFIG.baseHalfArc;
  private graceTimer = 0; // 부활 직후 입력/진행 잠금

  // juice
  readonly particles = new ParticlePool();
  readonly shake = new Shake();
  readonly flash = new Flash();
  readonly punch = new Punch();
  readonly sfx = new Sfx();
  private judgeText = '';
  private judgeTimer = 0;
  // 골드 획득 플로팅 텍스트 (+1G 등)
  private floats: { text: string; color: string; x: number; y: number; life: number }[] = [];

  private stateListeners: Listener[] = [];

  constructor(private platform: Platform) {
    void this.platform.loadHighScore().then((v) => (this.best = v));
    void this.platform.getItem('pulse.gold').then((v) => (this.gold = Number(v) || 0));
    void this.platform.getItem('pulse.weapon').then((v) => {
      const i = Number(v);
      if (i >= 0 && i < CONFIG.weapons.length && this.owned[i]) this.weaponIdx = i;
    });
    void this.platform.getItem('pulse.tutorial').then((v) => (this.tutorialSeen = v === '1'));
    void this.platform.getItem('pulse.stats').then((v) => {
      if (v) {
        try {
          this.stats = { ...EMPTY_STATS, ...JSON.parse(v) };
        } catch {
          /* 손상된 저장값 무시 */
        }
      }
      this.stats.sessions += 1;
      this.saveStats();
    });
    void this.platform.getItem('pulse.owned').then((v) => {
      if (!v) return;
      for (const i of v.split(',').map(Number)) if (i >= 0 && i < this.owned.length) this.owned[i] = true;
      // owned 로드 후 장착 무기 재검증
      void this.platform.getItem('pulse.weapon').then((w) => {
        const i = Number(w);
        if (i >= 0 && i < CONFIG.weapons.length && this.owned[i]) this.weaponIdx = i;
      });
    });
  }

  private saveStats(): void {
    void this.platform.setItem('pulse.stats', JSON.stringify(this.stats));
  }

  private commitPendingRun(): void {
    const r = this.pendingRun;
    if (!r) return;
    this.pendingRun = null;
    this.stats.runs += 1;
    this.stats.sumCombo += r.combo;
    this.stats.sumLen += r.len;
    this.stats.sumScore += r.score;
    this.stats.hits += r.hits;
    this.stats.perfects += r.perfects;
    this.saveStats();
  }

  resetStats(): void {
    this.stats = { ...EMPTY_STATS, sessions: 1 };
    this.pendingRun = null;
    this.saveStats();
  }

  private persistEconomy(): void {
    void this.platform.setItem('pulse.gold', String(this.gold));
    void this.platform.setItem('pulse.weapon', String(this.weaponIdx));
    void this.platform.setItem(
      'pulse.owned',
      this.owned.map((o, i) => (o ? i : -1)).filter((i) => i >= 0).join(','),
    );
  }

  /** 무기 구매(미보유+골드 충분) 또는 장착(보유). 성공 시 true. */
  selectWeapon(i: number): boolean {
    if (i < 0 || i >= CONFIG.weapons.length) return false;
    const purchase = !this.owned[i];
    if (purchase) {
      if (this.gold < CONFIG.weapons[i].price) return false;
      this.gold -= CONFIG.weapons[i].price;
      this.owned[i] = true;
    }
    this.weaponIdx = i;
    this.persistEconomy();
    this.platform.haptic('select');
    if (purchase) this.sfx.buy();
    else this.sfx.select();
    return true;
  }

  onStateChange(fn: Listener): void {
    this.stateListeners.push(fn);
  }

  private setState(s: GameState): void {
    this.state = s;
    for (const fn of this.stateListeners) fn();
  }

  private targetAngle(): number {
    return this.angle + this.dir * this.remaining;
  }

  private currentSpeed(): number {
    const { baseSpeed, maxSpeed, speedRamp } = CONFIG;
    return maxSpeed - (maxSpeed - baseSpeed) * Math.exp(-this.combo / speedRamp);
  }

  private currentHalfArc(): number {
    const { baseHalfArc, minHalfArc, arcShrinkRamp, tierArcPenalty } = CONFIG;
    const smooth = minHalfArc + (baseHalfArc - minHalfArc) * Math.exp(-this.combo / arcShrinkRamp);
    // 닌자 단계당 -3% 계단 (docs/07 R2 — 벽이 아니라 라벨 수준)
    return Math.max(minHalfArc, smooth * (1 - this.tierIdx * tierArcPenalty));
  }

  private spawnTarget(far = false): void {
    const { targetMinAhead, targetMaxAhead } = CONFIG;
    this.remaining = far ? targetMaxAhead : targetMinAhead + Math.random() * (targetMaxAhead - targetMinAhead);
    this.halfArc = this.currentHalfArc();
  }

  private multiplierFor(streak: number): number {
    let mult = 1;
    for (const step of CONFIG.multSteps) if (streak >= step) mult += 1;
    return mult;
  }

  /** 현재 닌자 단계 인덱스 (콤보 기준, docs/07 R2) */
  get tierIdx(): number {
    let t = 0;
    for (let i = 0; i < CONFIG.ninjaTiers.length; i++) if (this.combo >= CONFIG.ninjaTiers[i].at) t = i;
    return t;
  }

  start(): void {
    this.score = 0;
    this.combo = 0;
    this.perfectStreak = 0;
    this.multiplier = 1;
    this.newBest = false;
    this.doubleUsed = false;
    this.revivesUsed = 0;
    this.speed = CONFIG.baseSpeed;
    this.dir = 1;
    this.angle = -Math.PI / 2;
    this.graceTimer = 0;
    this.chestCharge = 0;
    this.ninjaKills = 0;
    this.floats.length = 0;
    this.commitPendingRun(); // 직전 런 기록 확정
    this.runHits = 0;
    this.runPerfects = 0;
    this.runStartMs = performance.now();
    this.spawnTarget(true); // 첫 타겟은 여유 있게
    if (!this.tutorialSeen) {
      this.tutorialStage = 1;
      this.speed = CONFIG.baseSpeed * CONFIG.tutorialSpeedScale; // 첫 히트 후 정상 복귀
    }
    this.platform.haptic('select');
    this.sfx.select();
    this.setState('playing');
  }

  /** 화면 탭 (플레이 중 판정). UI 버튼 탭은 여기로 오지 않는다. */
  tap(): void {
    if (this.state === 'title') {
      this.start();
      return;
    }
    if (this.state !== 'playing' || this.graceTimer > 0) return;

    const dist = Math.abs(this.remaining);
    if (dist <= this.halfArc) {
      this.hit(dist <= this.halfArc * CONFIG.perfectFrac);
    } else {
      this.deathCause = 'mistap';
      this.nearMiss = dist <= this.halfArc * 1.6; // 존 코앞에서 빗나감
      this.gameOver();
    }
  }

  private markTutorialSeen(): void {
    this.tutorialStage = 0;
    if (!this.tutorialSeen) {
      this.tutorialSeen = true;
      void this.platform.setItem('pulse.tutorial', '1');
    }
  }

  private hit(perfect: boolean): void {
    const prevTier = this.tierIdx;
    this.combo += 1;
    this.runHits += 1;
    if (perfect) this.runPerfects += 1;
    if (this.tutorialStage === 1) this.tutorialStage = 2; // 기본 탭 익힘 → 퍼펙트 안내
    else if (this.tutorialStage === 2 && (perfect || this.combo >= 4)) this.markTutorialSeen();
    // 퍼펙트 스트릭 → 배율. 일반 히트는 배율만 x1로 리셋 (런·콤보는 유지)
    let multUp = false;
    if (perfect) {
      this.perfectStreak += 1;
      const next = this.multiplierFor(this.perfectStreak);
      multUp = next > this.multiplier;
      this.multiplier = next;
    } else {
      this.perfectStreak = 0;
      this.multiplier = 1;
    }
    // 점수: (기본 + 무기 데미지 보너스) × 배율
    const weaponBonus = CONFIG.weapons[this.weaponIdx].bonus;
    this.score += ((perfect ? CONFIG.scorePerfect : CONFIG.scoreHit) + weaponBonus) * this.multiplier;

    // 골드: 닌자 처치 / 보물 상자 획득, 게이지 만충 시 대박 보상
    let treasure = false;
    if (perfect) {
      this.gold += CONFIG.goldPerPerfect;
      this.spawnFloat(`🎁 +${CONFIG.goldPerPerfect}G`, CONFIG.colors.perfect);
      this.chestCharge += 1;
      if (this.chestCharge >= CONFIG.chestSlots) {
        treasure = true;
        this.chestCharge = 0;
        this.gold += CONFIG.treasureGold;
        this.spawnFloat(`💰 +${CONFIG.treasureGold}G`, CONFIG.colors.perfect);
        this.platform.haptic('combo');
        this.sfx.milestone();
        this.flash.kick(CONFIG.flashPerfect, CONFIG.colors.perfect);
        this.emitBurst(CONFIG.particlesPerfect, CONFIG.colors.perfect);
      }
    } else {
      this.gold += CONFIG.goldPerHit;
      this.ninjaKills += 1;
      this.spawnFloat(`🥷 +${CONFIG.goldPerHit}G`, CONFIG.colors.target);
    }

    // 닌자 단계 상승 (콤보 마일스톤과 동일 시점) — 보너스 골드 + 등장 연출
    const tierUp = this.tierIdx > prevTier;
    if (tierUp) {
      this.gold += CONFIG.tierBonusGold;
      this.spawnFloat(`⬆️ +${CONFIG.tierBonusGold}G`, CONFIG.ninjaTiers[this.tierIdx].color);
    }

    this.speed = this.currentSpeed();
    this.dir *= -1;
    this.spawnTarget();

    const milestone = (CONFIG.comboMilestones as readonly number[]).includes(this.combo);
    if (milestone || multUp) {
      this.platform.haptic('combo');
      this.sfx.milestone();
      this.flash.kick(CONFIG.flashPerfect, tierUp ? CONFIG.ninjaTiers[this.tierIdx].color : CONFIG.colors.perfect);
      this.shake.kick(CONFIG.shakePerfect);
      this.setJudge(tierUp ? `${CONFIG.ninjaTiers[this.tierIdx].name} 등장!` : milestone ? `${this.combo} COMBO!` : `PERFECT ×${this.multiplier}!`);
    } else {
      this.platform.haptic('success');
      if (perfect) this.sfx.perfect(this.combo);
      else this.sfx.hit(this.combo);
      this.flash.kick(perfect ? CONFIG.flashPerfect : CONFIG.flashHit, perfect ? CONFIG.colors.perfect : '#ffffff');
      this.shake.kick(perfect ? CONFIG.shakePerfect : CONFIG.shakeHit);
      if (perfect) this.setJudge('PERFECT!');
    }
    this.punch.kick(perfect || milestone ? 0.18 : 0.1);
    this.emitBurst(perfect ? CONFIG.particlesPerfect : CONFIG.particlesHit, perfect ? CONFIG.colors.perfect : CONFIG.colors.target);
    // 보물은 이번 히트의 판정 텍스트보다 우선 — 유저가 보상을 확실히 인지
    if (treasure) this.setJudge(`💰 보물 상자 5개 오픈! +${CONFIG.treasureGold}G`);
  }

  private gameOver(): void {
    this.platform.haptic('fail');
    this.sfx.fail();
    this.flash.kick(CONFIG.flashFail, CONFIG.colors.fail);
    this.shake.kick(CONFIG.shakeFail);
    this.emitBurst(CONFIG.particlesFail, CONFIG.colors.fail);
    if (this.score > this.best) {
      this.best = this.score;
      this.newBest = true;
      void this.platform.saveHighScore(this.best);
    }
    if (this.combo >= 2) this.markTutorialSeen(); // 기본기를 익혔으면 다음 런부턴 반복 안 함
    this.persistEconomy(); // 이번 런에서 번 골드 저장
    // 런 기록 스테이징 (부활하면 폐기되고 런이 이어짐)
    this.pendingRun = {
      combo: this.combo,
      len: (performance.now() - this.runStartMs) / 1000,
      score: this.score,
      hits: this.runHits,
      perfects: this.runPerfects,
    };
    if (this.revivesUsed < CONFIG.revivesPerRun) this.stats.revShown += 1;
    this.saveStats();
    this.setState('gameover');
  }

  /** 광고 부활 — 완주 시 콤보 유지하고 이어하기. 런당 1회 (docs/02 §3, docs/06) */
  async tryRevive(): Promise<boolean> {
    if (this.revivesUsed >= CONFIG.revivesPerRun) return false;
    const completed = await this.platform.showRewardedAd('revive');
    if (!completed) return false; // 광고 스킵은 횟수를 소모하지 않음
    this.revivesUsed += 1;
    this.pendingRun = null; // 런이 계속되므로 스테이징 폐기
    this.stats.revAccepted += 1;
    this.saveStats();
    this.perfectStreak = 0; // 미스로 죽은 것이므로 배율은 리셋 (콤보는 유지)
    this.multiplier = 1;
    // 복귀 첫 탭은 쉽게: 최대 거리 타겟 + 감속. 첫 히트 후 콤보 속도로 복귀.
    this.speed = this.currentSpeed() * CONFIG.reviveEaseSpeed;
    this.spawnTarget(true);
    this.graceTimer = 0.6;
    this.setJudge('부활!');
    this.platform.haptic('select');
    this.setState('playing');
    return true;
  }

  /** 광고 점수 2배 — 세션당 1회 (docs/02 §3) */
  async tryDouble(): Promise<boolean> {
    if (this.doubleUsed) return false;
    const completed = await this.platform.showRewardedAd('double');
    if (!completed) return false;
    this.doubleUsed = true;
    this.score *= 2;
    if (this.pendingRun) this.pendingRun.score = this.score;
    if (this.score > this.best) {
      this.best = this.score;
      this.newBest = true;
      void this.platform.saveHighScore(this.best);
    }
    return true;
  }

  private setJudge(text: string): void {
    this.judgeText = text;
    this.judgeTimer = 0.7;
  }

  private emitBurst(count: number, color: string): void {
    // 폭발 위치는 draw에서 계산한 최근 바늘 끝 좌표
    this.particles.burst(this.tipX, this.tipY, count, color);
  }

  private spawnFloat(text: string, color: string): void {
    if (this.floats.length >= 10) this.floats.shift();
    this.floats.push({ text, color, x: this.tipX, y: this.tipY - 14, life: 0.9 });
  }

  update(dt: number): void {
    if (this.state === 'playing') {
      if (this.graceTimer > 0) {
        this.graceTimer -= dt;
      } else {
        const step = this.speed * dt;
        this.angle += this.dir * step;
        this.remaining -= step;
        if (this.remaining < -this.halfArc) {
          this.deathCause = 'pass'; // 탭이 늦어 존을 지나침
          this.nearMiss = false;
          this.gameOver();
        }
      }
    } else if (this.state === 'title') {
      this.angle += 0.6 * dt; // 타이틀 앰비언트 회전
    }
    this.particles.update(dt);
    this.shake.update(dt);
    this.flash.update(dt);
    this.punch.update(dt);
    if (this.judgeTimer > 0) this.judgeTimer -= dt;
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.life -= dt;
      f.y -= 46 * dt;
      if (f.life <= 0) this.floats.splice(i, 1);
    }
  }

  // ── 렌더 ──────────────────────────────────────────────
  private tipX = 0;
  private tipY = 0;

  draw(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const C = CONFIG.colors;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h * 0.46;
    const R = Math.min(w, h) * 0.34;

    ctx.save();
    ctx.translate(this.shake.x, this.shake.y);
    ctx.translate(cx, cy);
    ctx.scale(this.punch.scale, this.punch.scale);
    ctx.translate(-cx, -cy);

    // 링
    ctx.lineWidth = Math.max(6, R * 0.055);
    ctx.strokeStyle = C.ring;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    // 타겟 호 (플레이 중에만) — 바늘이 존 안에 있는 동안 밝아짐 ("지금 탭!" 큐)
    if (this.state !== 'title') {
      const ta = this.targetAngle();
      const inZone = this.state === 'playing' && Math.abs(this.remaining) <= this.halfArc;
      ctx.lineCap = 'round';
      ctx.strokeStyle = C.target;
      ctx.shadowColor = C.target;
      ctx.shadowBlur = inZone ? 30 : 16;
      ctx.lineWidth = Math.max(6, R * 0.055) * (inZone ? 1.25 : 1);
      ctx.beginPath();
      ctx.arc(cx, cy, R, ta - this.halfArc, ta + this.halfArc);
      ctx.stroke();
      ctx.lineWidth = Math.max(6, R * 0.055);
      // PERFECT 존
      ctx.strokeStyle = C.perfect;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      const pz = this.halfArc * CONFIG.perfectFrac;
      ctx.arc(cx, cy, R, ta - pz, ta + pz);
      ctx.stroke();
      ctx.lineCap = 'butt';

      // 타겟 캐릭터: 초록 밴드 양쪽에 닌자(단계 색 오라), 퍼펙트 존 중앙엔 보물 상자
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tier = CONFIG.ninjaTiers[this.tierIdx];
      for (const side of [-1, 1]) {
        const na = ta + side * this.halfArc * 0.62;
        const nx = cx + Math.cos(na) * R;
        const ny = cy + Math.sin(na) * R;
        // 단계 색 오라 — 닌자가 강해졌음을 색으로 가시화 (docs/07 R2)
        ctx.fillStyle = tier.color;
        ctx.globalAlpha = 0.3;
        ctx.shadowColor = tier.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(nx, ny, R * 0.085, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.font = `${Math.round(R * 0.11)}px sans-serif`;
        ctx.fillText('🥷', nx, ny);
      }
      ctx.font = `${Math.round(R * 0.11)}px sans-serif`;
      ctx.fillText('🎁', cx + Math.cos(ta) * R, cy + Math.sin(ta) * R);
      ctx.textBaseline = 'alphabetic';
    }

    // 콤보 트레일 (배율 중에는 골드 피버)
    if (this.state === 'playing' && (this.combo >= 5 || this.multiplier > 1)) {
      const trail = Math.min(0.9, 0.25 + this.combo * 0.02);
      const grad =
        this.multiplier > 1
          ? 'hsla(42, 100%, 65%, 0.45)'
          : `hsla(${(160 + this.combo * 3) % 360}, 90%, 65%, 0.35)`;
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(4, R * 0.04);
      ctx.beginPath();
      if (this.dir > 0) ctx.arc(cx, cy, R, this.angle - trail, this.angle);
      else ctx.arc(cx, cy, R, this.angle, this.angle + trail);
      ctx.stroke();
    }

    // 무기(바늘) — 티어별 비주얼, 배율 중에는 골드 피버 광
    this.tipX = cx + Math.cos(this.angle) * (R + 6);
    this.tipY = cy + Math.sin(this.angle) * (R + 6);
    this.drawWeapon(ctx, cx, cy, R, this.state === 'playing' && this.multiplier > 1);

    // 중심점
    ctx.fillStyle = C.needle;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(4, R * 0.04), 0, Math.PI * 2);
    ctx.fill();

    // 점수/콤보 (플레이 중, docs/02 §7 — 작게)
    if (this.state === 'playing') {
      ctx.textAlign = 'center';
      ctx.fillStyle = C.text;
      ctx.font = `800 ${Math.round(R * 0.42)}px -apple-system, sans-serif`;
      ctx.fillText(String(this.score), cx, cy - R * 0.06);
      if (this.combo > 1) {
        // 콤보 색 = 현재 스트릭 종류: 퍼펙트 스트릭 중이면 골드, 아니면 초록
        ctx.fillStyle = this.perfectStreak > 0 ? C.perfect : C.target;
        ctx.font = `700 ${Math.round(R * 0.14)}px -apple-system, sans-serif`;
        ctx.fillText(`x${this.combo} 콤보`, cx, cy + R * 0.22);
      }
      if (this.multiplier > 1) {
        ctx.fillStyle = C.perfect;
        ctx.font = `800 ${Math.round(R * 0.16)}px -apple-system, sans-serif`;
        ctx.fillText(`🎁×${this.multiplier}`, cx, cy + R * 0.42);
      }
    }

    // 튜토리얼 힌트 (첫 런만, 링 아래 깜빡임)
    if (this.state === 'playing' && this.tutorialStage > 0) {
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(performance.now() / 280);
      ctx.fillStyle = this.tutorialStage === 1 ? C.target : C.perfect;
      ctx.textAlign = 'center';
      ctx.font = `700 ${Math.round(R * 0.105)}px -apple-system, sans-serif`;
      ctx.fillText(
        this.tutorialStage === 1 ? '바늘이 초록 존에 오면 탭! 👆' : '가운데 노랑 🎁 = PERFECT! 연속이면 배율 UP',
        cx,
        cy + R + Math.max(34, R * 0.24),
      );
      ctx.globalAlpha = 1;
    }

    // 판정 텍스트
    if (this.judgeTimer > 0 && this.state === 'playing') {
      ctx.globalAlpha = Math.min(1, this.judgeTimer / 0.3);
      ctx.fillStyle = C.perfect;
      ctx.textAlign = 'center';
      ctx.font = `800 ${Math.round(R * 0.17)}px -apple-system, sans-serif`;
      ctx.fillText(this.judgeText, cx, cy - R - 28);
      ctx.globalAlpha = 1;
    }

    this.particles.draw(ctx);

    // 골드 플로팅 텍스트
    ctx.textAlign = 'center';
    for (const f of this.floats) {
      ctx.globalAlpha = Math.min(1, f.life / 0.35);
      ctx.fillStyle = f.color;
      ctx.font = `700 ${Math.round(R * 0.1)}px -apple-system, sans-serif`;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // ── 상단 HUD (흔들림 영향 없음) ──
    // 골드 (항상 표시 — 무기고 동기 부여)
    ctx.textAlign = 'right';
    ctx.fillStyle = C.perfect;
    ctx.font = `700 17px -apple-system, sans-serif`;
    ctx.fillText(`🪙 ${this.gold}`, w - 16, 46);
    // 닌자 처치 카운터 (좌상단, 단계 색 — 숫자로 컴팩트하게)
    if (this.state === 'playing') {
      ctx.textAlign = 'left';
      ctx.fillStyle = CONFIG.ninjaTiers[this.tierIdx].color;
      ctx.fillText(`🥷 ${this.ninjaKills}`, 16, 46);
    }
    // 보물 상자 게이지 (플레이 중) — 끝의 💰가 "다 채우면 받는 것"을 상시 안내
    if (this.state === 'playing') {
      ctx.textAlign = 'center';
      const slots = CONFIG.chestSlots;
      const gap = 30;
      const x0 = w / 2 - (slots * gap) / 2;
      ctx.font = `18px sans-serif`;
      for (let i = 0; i < slots; i++) {
        ctx.globalAlpha = i < this.chestCharge ? 1 : 0.22;
        ctx.fillText('🎁', x0 + i * gap, 46);
      }
      // 목표 아이콘: 마지막 한 칸 남으면 두근두근 펄스
      ctx.globalAlpha =
        this.chestCharge === slots - 1 ? 0.55 + 0.45 * Math.sin(performance.now() / 180) : 0.5;
      ctx.fillText('💰', x0 + slots * gap, 46);
      ctx.globalAlpha = 1;
      if (this.chestCharge === slots - 1) {
        ctx.fillStyle = CONFIG.colors.perfect;
        ctx.font = `700 12px -apple-system, sans-serif`;
        ctx.fillText('🎁 1개 남음!', x0 + slots * gap, 64);
      }
    }

    // 플래시 (흔들림 영향 없이 전체)
    if (this.flash.alpha > 0) {
      ctx.globalAlpha = this.flash.alpha;
      ctx.fillStyle = this.flash.color;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }

  // 무기 비주얼: 중심에서 링 밖까지, 티어별로 다른 모양 (전부 절차적 — 에셋 0)
  private drawWeapon(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, fever: boolean): void {
    const C = CONFIG.colors;
    const cosA = Math.cos(this.angle);
    const sinA = Math.sin(this.angle);
    const at = (r: number) => [cx + cosA * r, cy + sinA * r] as const;
    const line = (r0: number, r1: number, color: string, width: number, glow = 0) => {
      const [x0, y0] = at(r0);
      const [x1, y1] = at(r1);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur = glow;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    };
    const cross = (r: number, len: number, color: string, width: number, glow = 0) => {
      const [x, y] = at(r);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.shadowColor = color;
      ctx.shadowBlur = glow;
      ctx.beginPath();
      ctx.moveTo(x - sinA * len, y + cosA * len);
      ctx.lineTo(x + sinA * len, y - cosA * len);
      ctx.stroke();
    };
    const tip = R + 6;
    const wBase = Math.max(3, R * 0.028);

    // 장식은 자루 중간까지만 — 팁 구간은 항상 곧은 판정선만 남긴다.
    // (팁에 곡률이 있으면 탭 타이밍 기준이 흐려져 UX 마이너스)
    switch (this.weaponIdx) {
      case 1: // 카타나: 은빛 도신 + 츠바(가드) + 갈색 손잡이
        line(0, R * 0.2, '#8b5e34', wBase * 1.6);
        cross(R * 0.2, R * 0.05, '#c9d4e8', wBase);
        line(R * 0.2, tip, '#dfe7f5', wBase * 1.3, 8);
        break;
      case 2: { // 사신 낫: 어두운 자루 + 가죽 그립 + 고정 칼라 + 채워진 초승달 날
        line(0, tip, '#3f4a5e', wBase * 1.5); // 자루 (팁까지 곧게 — 판정선)
        line(R * 0.3, R * 0.46, '#8b5e34', wBase * 2.0); // 가죽 그립
        cross(R * 0.72, R * 0.04, '#8f9bb0', wBase * 1.3); // 날 고정 칼라
        // 날: 밑동(자루 0.72R)에서 진행 방향으로 뻗어 뒤로 휘는 테이퍼 초승달.
        // 최대 반경 ~0.8R — 팁 근처 판정 구간은 항상 비운다.
        const px = -sinA * this.dir;
        const py = cosA * this.dir;
        // 밑동을 자루 0.66R~0.79R 구간에 넓게 붙여 어떤 각도에서도 붙어 보이게
        const ax2 = cx + cosA * R * 0.79;
        const ay2 = cy + sinA * R * 0.79;
        const bx = cx + cosA * R * 0.66;
        const by = cy + sinA * R * 0.66;
        const tx = ax2 + px * R * 0.24 - cosA * R * 0.14;
        const ty = ay2 + py * R * 0.24 - sinA * R * 0.14;
        ctx.fillStyle = '#dfe7f5';
        ctx.shadowColor = '#dfe7f5';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(ax2, ay2); // 윗밑동 (자루 위)
        ctx.quadraticCurveTo(ax2 + px * R * 0.22 + cosA * R * 0.02, ay2 + py * R * 0.22 + sinA * R * 0.02, tx, ty); // 바깥 날등
        ctx.quadraticCurveTo(bx + px * R * 0.12 + cosA * R * 0.02, by + py * R * 0.12 + sinA * R * 0.02, bx, by); // 안쪽 오목 날
        ctx.closePath(); // 자루를 따라 밑동 닫기
        ctx.fill();
        ctx.shadowBlur = 0;
        break;
      }
      case 3: // 광선검: 회색 자루 + 청록 글로우 블레이드
        line(0, R * 0.18, '#7a8598', wBase * 1.8);
        line(R * 0.18, tip, '#31e0ff', wBase * 1.9, 22);
        break;
      case 4: // 크림슨 세이버: 붉은 블레이드 + 크로스가드
        line(0, R * 0.18, '#4c5568', wBase * 1.8);
        line(R * 0.18, tip, '#ff3b5c', wBase * 1.9, 24);
        cross(R * 0.2, R * 0.07, '#ff3b5c', wBase * 1.2, 16);
        break;
    }
    if (fever) {
      // 배율 피버: 무기 위로 골드 오라
      ctx.globalAlpha = 0.4;
      line(R * 0.15, tip, C.perfect, wBase * 2.6, 18);
      ctx.globalAlpha = 1;
    }
    // 판정 코어 라인: 어떤 무기든 중심→팁 끝까지 곧게. 탭 타이밍의 기준선.
    const core = this.weaponIdx === 0 ? (fever ? C.perfect : C.needle) : '#ffffff';
    line(0, tip, core, this.weaponIdx === 0 ? wBase : wBase * 0.55, this.weaponIdx === 0 ? 10 : 4);
    ctx.shadowBlur = 0;
    ctx.lineCap = 'butt';
  }
}
