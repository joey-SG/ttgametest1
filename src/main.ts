import { createPlatform } from './platform';
import { Game } from './game/game';
import { Ui } from './ui';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const platform = createPlatform();
const game = new Game(platform);

// DPR 대응 리사이즈
let w = 0;
let h = 0;
function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2); // 2x 상한 (성능 예산)
  w = window.innerWidth;
  h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// 뷰포트 meta가 없는 임베드 환경(아티팩트 래퍼 등) 대비
if (!document.querySelector('meta[name="viewport"]')) {
  const meta = document.createElement('meta');
  meta.name = 'viewport';
  meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
  document.head.appendChild(meta);
}

// 입력: 탭 하나 (docs/02 — 원탭). UI 버튼/광고 오버레이 위 탭은 무시.
// iOS Safari/임베드 환경에서 window 레벨 pointerdown이 도달하지 않는 경우가 있어
// canvas·window 양쪽에 pointer/touch/click을 모두 걸고 시간 기반으로 중복 제거한다.
// (한 제스처가 pointerdown → touchstart → click 순으로 최대 3번 들어온다)
let lastTapAt = -1000;
function onTapEvent(e: Event): void {
  // 오디오 언락은 모든 제스처에서 (dedup·버튼 가드보다 먼저).
  // iOS는 touchstart를 사용자 제스처로 인정하지 않으므로, 뒤따라오는
  // click(중복 제거 대상이더라도)에서 resume이 성공해야 소리가 난다.
  game.sfx.unlock();
  const target = e.target as HTMLElement | null;
  if (
    target &&
    (target.closest('button') || target.closest('#ad-overlay') || target.closest('#screen-armory') || target.closest('#screen-stats'))
  )
    return;
  const now = performance.now();
  if (now - lastTapAt < 250) return; // 같은 제스처의 중복 이벤트 무시
  lastTapAt = now;
  game.tap();
}
const tapCatcher = document.getElementById('tap-catcher')!;
for (const el of [tapCatcher, canvas, window as unknown as HTMLElement]) {
  el.addEventListener('pointerdown', onTapEvent);
  el.addEventListener('touchstart', onTapEvent, { passive: true });
  el.addEventListener('click', onTapEvent);
}

new Ui(game, () => onTapEvent(new Event('ui-tap')));

// 게임 루프
let last = performance.now();
function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 1 / 20); // 탭 전환 등 큰 dt 클램프
  last = now;
  game.update(dt);
  game.draw(ctx, w, h);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// e2e 검증용 훅 (프로덕션 기능 아님)
declare global {
  interface Window {
    __pulse?: Game;
  }
}
window.__pulse = game;
