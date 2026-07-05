import { CONFIG } from './config';
import type { Game } from './game/game';

// DOM 오버레이 화면 (docs/02 §7 — 타이틀 / 게임오버만. Simplicity First)

export class Ui {
  private root = document.getElementById('ui')!;
  private title!: HTMLElement;
  private over!: HTMLElement;
  private armory!: HTMLElement;
  private statsView!: HTMLElement;

  constructor(private game: Game, private requestTap: () => void) {
    this.buildTitle();
    this.buildGameOver();
    this.buildArmory();
    this.buildStats();
    game.onStateChange(() => this.sync());
    this.sync();
  }

  private el(html: string): HTMLElement {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild as HTMLElement;
  }

  private buildTitle(): void {
    this.title = this.el(`
      <div class="screen" id="screen-title">
        <div style="font-size:56px;font-weight:800;letter-spacing:12px;color:#27e8a7;text-shadow:0 0 24px rgba(39,232,167,.5)">PULSE</div>
        <div style="font-size:15px;color:rgba(232,240,255,.55)">바늘이 초록 존을 지날 때, 탭.</div>
        <div style="margin-top:26px;font-size:17px;animation:pulse-blink 1.2s ease-in-out infinite">탭하여 시작</div>
        <div id="title-best" style="font-size:13px;color:rgba(232,240,255,.4)"></div>
        <div style="display:flex;gap:10px;margin-top:14px">
          <button class="btn ghost" id="btn-armory" style="min-width:0;padding:10px 22px">⚔️ 무기고</button>
          <button class="btn ghost" id="btn-stats" style="min-width:0;padding:10px 22px">📊 내 기록</button>
        </div>
      </div>`);
    const style = document.createElement('style');
    style.textContent = '@keyframes pulse-blink{0%,100%{opacity:1}50%{opacity:.35}}';
    document.head.appendChild(style);
    // iOS Safari: window 레벨 이벤트가 막히는 임베드 환경 대비, 요소에 직접 리스너.
    // 어떤 이벤트가 살아있는 환경이든 잡히도록 3종 모두 (중복은 main의 dedup이 제거)
    this.title.style.pointerEvents = 'auto';
    this.title.style.cursor = 'pointer';
    for (const evt of ['pointerdown', 'touchstart', 'click'] as const) {
      this.title.addEventListener(
        evt,
        (e) => {
          if ((e.target as HTMLElement).closest('button')) return; // 무기고 버튼은 시작 아님
          this.requestTap();
        },
        { passive: true },
      );
    }
    this.title.querySelector('#btn-armory')!.addEventListener('click', () => {
      this.game.sfx.unlock();
      this.game.sfx.select();
      this.renderArmory();
      this.armory.classList.add('show');
    });
    this.title.querySelector('#btn-stats')!.addEventListener('click', () => {
      this.game.sfx.unlock();
      this.game.sfx.select();
      this.renderStats();
      this.statsView.classList.add('show');
    });
    this.root.appendChild(this.title);
  }

  private buildGameOver(): void {
    this.over = this.el(`
      <div class="screen" id="screen-over" style="background:rgba(4,6,10,.72)">
        <div id="over-newbest" style="display:none;font-size:15px;font-weight:800;color:#ffd166;letter-spacing:2px">🏆 NEW BEST!</div>
        <div id="over-cause" style="font-size:14px;color:rgba(232,240,255,.55)"></div>
        <div id="over-score" style="font-size:72px;font-weight:800;line-height:1"></div>
        <div id="over-best" style="font-size:14px;color:rgba(232,240,255,.55)"></div>
        <div style="height:8px"></div>
        <button class="btn" id="btn-revive">▶ 광고 보고 부활 (콤보 유지)</button>
        <button class="btn gold" id="btn-double">✦ 광고 보고 점수 2배</button>
        <button class="btn ghost" id="btn-retry">다시하기</button>
        <button class="btn ghost" id="btn-armory-over">⚔️ 무기고</button>
        <button class="btn ghost" id="btn-share">점수 공유</button>
      </div>`);
    this.root.appendChild(this.over);

    const btn = (id: string) => this.over.querySelector<HTMLButtonElement>(`#${id}`)!;
    btn('btn-retry').addEventListener('click', () => this.game.start()); // 0초 재시작
    btn('btn-revive').addEventListener('click', () => void this.game.tryRevive());
    btn('btn-double').addEventListener('click', async () => {
      if (await this.game.tryDouble()) this.sync();
    });
    btn('btn-share').addEventListener('click', () => void this.share());
    btn('btn-armory-over').addEventListener('click', () => {
      this.game.sfx.unlock();
      this.game.sfx.select();
      this.renderArmory();
      this.armory.classList.add('show');
    });
  }

  private buildArmory(): void {
    this.armory = this.el(`
      <div class="screen" id="screen-armory" style="background:rgba(4,6,10,.9);gap:10px">
        <div style="font-size:24px;font-weight:800">⚔️ 무기고</div>
        <div id="armory-gold" style="font-size:15px;color:#ffd166;font-weight:700"></div>
        <div id="armory-list" style="display:flex;flex-direction:column;gap:10px"></div>
        <div id="armory-confirm" style="display:none;flex-direction:column;align-items:center;gap:14px;padding:20px;border-radius:14px;background:rgba(232,240,255,.08)">
          <div id="confirm-text" style="font-size:16px;font-weight:700;line-height:1.5"></div>
          <div style="display:flex;gap:10px">
            <button class="btn" id="btn-buy-yes" style="min-width:0;padding:12px 28px">구매</button>
            <button class="btn ghost" id="btn-buy-no" style="min-width:0;padding:12px 28px">취소</button>
          </div>
        </div>
        <button class="btn ghost" id="btn-armory-close" style="margin-top:8px">닫기</button>
      </div>`);
    this.armory.style.pointerEvents = 'auto'; // 뒤의 탭 캐처로 이벤트가 새지 않게
    this.armory.querySelector('#btn-armory-close')!.addEventListener('click', () => {
      this.armory.classList.remove('show');
    });
    this.armory.querySelector('#btn-buy-no')!.addEventListener('click', () => this.renderArmory());
    this.armory.querySelector('#btn-buy-yes')!.addEventListener('click', () => {
      if (this.confirmIdx < 0) return;
      if (this.game.selectWeapon(this.confirmIdx)) {
        this.renderArmory();
      } else {
        const t = this.armory.querySelector('#confirm-text') as HTMLElement;
        t.textContent = '골드가 부족합니다!';
        t.style.color = '#ff4d6d';
        setTimeout(() => this.renderArmory(), 800);
      }
    });
    this.root.appendChild(this.armory);
  }

  private confirmIdx = -1;

  // 구매 확인 팝업: 목록을 숨기고 확인 카드만 노출
  private showBuyConfirm(i: number): void {
    this.confirmIdx = i;
    const w = CONFIG.weapons[i];
    const t = this.armory.querySelector('#confirm-text') as HTMLElement;
    t.style.color = '';
    t.innerHTML = `${Ui.WEAPON_ICONS[i]} <b>${w.name}</b> 구매할까요?<br>🪙 ${w.price} (보유 ${this.game.gold})`;
    (this.armory.querySelector('#armory-list') as HTMLElement).style.display = 'none';
    (this.armory.querySelector('#armory-confirm') as HTMLElement).style.display = 'flex';
  }

  // 개발 환경에서만 보이는 진단 요소 (튜닝 문구·목표 범위·부활 수락률·초기화).
  // 유저에게는 순수 플레이 기록만 노출한다.
  private static DEV = import.meta.env.DEV;

  private buildStats(): void {
    this.statsView = this.el(`
      <div class="screen" id="screen-stats" style="background:rgba(4,6,10,.9);gap:8px">
        <div style="font-size:24px;font-weight:800">📊 내 기록</div>
        <div id="stats-dev-note" style="font-size:12px;color:rgba(232,240,255,.45)">밸런스 튜닝 근거 (docs/06 §5) · 이 기기에만 저장</div>
        <div id="stats-list" style="display:flex;flex-direction:column;gap:6px;font-size:15px;font-variant-numeric:tabular-nums"></div>
        <div style="display:flex;gap:10px;margin-top:10px">
          <button class="btn ghost" id="btn-stats-reset" style="min-width:0;padding:10px 22px">초기화</button>
          <button class="btn ghost" id="btn-stats-close" style="min-width:0;padding:10px 22px">닫기</button>
        </div>
      </div>`);
    if (!Ui.DEV) {
      (this.statsView.querySelector('#stats-dev-note') as HTMLElement).style.display = 'none';
      (this.statsView.querySelector('#btn-stats-reset') as HTMLElement).style.display = 'none';
    }
    this.statsView.style.pointerEvents = 'auto';
    this.statsView.querySelector('#btn-stats-close')!.addEventListener('click', () => {
      this.statsView.classList.remove('show');
    });
    this.statsView.querySelector('#btn-stats-reset')!.addEventListener('click', () => {
      this.game.resetStats();
      this.renderStats();
    });
    this.root.appendChild(this.statsView);
  }

  private renderStats(): void {
    const s = this.game.stats;
    const avg = (sum: number) => (s.runs ? (sum / s.runs).toFixed(1) : '-');
    const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '-');
    const rows: [string, string][] = [
      ['총 런', `${s.runs}판 (세션 ${s.sessions}회 · 세션당 ${s.sessions ? (s.runs / s.sessions).toFixed(1) : '-'}판)`],
      ['평균 콤보', avg(s.sumCombo)],
      ['평균 런 길이', `${avg(s.sumLen)}초`],
      ['평균 점수', avg(s.sumScore)],
      ['퍼펙트 비율', Ui.DEV ? `${pct(s.perfects, s.hits)} (목표 60~80%)` : pct(s.perfects, s.hits)],
    ];
    if (Ui.DEV) rows.push(['부활 수락률', `${pct(s.revAccepted, s.revShown)} (${s.revAccepted}/${s.revShown})`]);
    this.statsView.querySelector('#stats-list')!.innerHTML = rows
      .map(([k, v]) => `<div style="display:flex;gap:14px;justify-content:space-between;width:min(300px,80vw)"><span style="color:rgba(232,240,255,.55)">${k}</span><span style="font-weight:700">${v}</span></div>`)
      .join('');
  }

  private static WEAPON_ICONS = ['🪡', '🗡️', '🌙', '⚡', '🔥'];

  private renderArmory(): void {
    const g = this.game;
    this.confirmIdx = -1;
    (this.armory.querySelector('#armory-confirm') as HTMLElement).style.display = 'none';
    (this.armory.querySelector('#armory-list') as HTMLElement).style.display = 'flex';
    this.armory.querySelector('#armory-gold')!.textContent = `🪙 ${g.gold}`;
    const list = this.armory.querySelector('#armory-list')!;
    list.innerHTML = '';
    CONFIG.weapons.forEach((w, i) => {
      const owned = g.owned[i];
      const equipped = g.weaponIdx === i;
      const row = this.el(`
        <div class="weapon-row${equipped ? ' equipped' : ''}${owned ? '' : ' locked'}">
          <span style="font-size:22px">${Ui.WEAPON_ICONS[i]}</span>
          <span class="w-name">${w.name}<br><span style="font-weight:400;font-size:12px;color:rgba(232,240,255,.5)">히트당 점수 +${w.bonus}</span></span>
          <span class="w-price">${equipped ? '장착중' : owned ? '장착' : `🪙 ${w.price}`}</span>
        </div>`);
      row.addEventListener('click', () => {
        if (owned) {
          this.game.selectWeapon(i); // 보유 무기는 즉시 장착
          this.renderArmory();
        } else {
          this.showBuyConfirm(i); // 구매는 확인 팝업 경유
        }
      });
      list.appendChild(row);
    });
  }

  private async share(): Promise<void> {
    const text = `PULSE에서 ${this.game.score}점 (최고 ${this.game.best}점)! 나를 이겨봐 ⚡`;
    try {
      if (navigator.share) {
        await navigator.share({ text, url: location.href });
      } else {
        await navigator.clipboard.writeText(`${text} ${location.href}`);
        const b = this.over.querySelector('#btn-share')!;
        b.textContent = '복사됨! ✓';
        setTimeout(() => (b.textContent = '점수 공유'), 1500);
      }
    } catch {
      /* 사용자가 공유 취소 — 무시 */
    }
  }

  private sync(): void {
    const g = this.game;
    this.title.classList.toggle('show', g.state === 'title');
    this.over.classList.toggle('show', g.state === 'gameover');

    if (g.state === 'title') {
      this.title.querySelector('#title-best')!.textContent = g.best > 0 ? `최고 기록 ${g.best}` : '';
    }
    if (g.state === 'gameover') {
      const cause = this.over.querySelector('#over-cause') as HTMLElement;
      if (g.deathCause === 'pass') {
        cause.textContent = '탭이 늦었어요 — 존을 지나쳤어요';
        cause.style.color = 'rgba(232,240,255,.55)';
      } else if (g.nearMiss) {
        cause.textContent = '아깝다! 정말 조금 빗나갔어요 🔥';
        cause.style.color = '#ffd166';
      } else {
        cause.textContent = '타이밍이 빗나갔어요';
        cause.style.color = 'rgba(232,240,255,.55)';
      }
      this.over.querySelector('#over-score')!.textContent = String(g.score);
      this.over.querySelector('#over-best')!.textContent = `최고 기록 ${g.best} · 🪙 ${g.gold}`;
      (this.over.querySelector('#over-newbest') as HTMLElement).style.display = g.newBest ? 'block' : 'none';
      (this.over.querySelector('#btn-double') as HTMLElement).style.display = g.doubleUsed ? 'none' : 'block';
      (this.over.querySelector('#btn-revive') as HTMLElement).style.display =
        g.revivesUsed < CONFIG.revivesPerRun ? 'block' : 'none';
    }
  }
}
