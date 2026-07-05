// 밸런싱/튜닝 값 전부 여기로 모은다 (docs/03 §5)

export const CONFIG = {
  // 회전 속도 (rad/s)
  baseSpeed: 2.2,
  maxSpeed: 7.0,
  // 히트마다 속도 증가: speed = max - (max-base) * exp(-combo/speedRamp)
  // 28: 초반 완만·천장 유지 (docs/06 §3 — 1차 튜닝, 지표로 재검증)
  speedRamp: 28,

  // 타겟 호 절반 폭 (rad)
  baseHalfArc: 0.30,
  minHalfArc: 0.13,
  arcShrinkRamp: 38, // 콤보에 따른 축소 속도 (초반 관대)
  perfectFrac: 0.32, // 타겟 중심 이 비율 안이면 PERFECT (도전적이어야 배율이 의미 있음)

  // 새 타겟은 진행 방향으로 이만큼 앞에 생성 (rad)
  targetMinAhead: Math.PI * 0.45,
  targetMaxAhead: Math.PI * 1.45,

  // 점수
  scoreHit: 1,
  scorePerfect: 2,
  comboMilestones: [10, 25, 50, 100, 200],
  // 퍼펙트 연속(스트릭) → 점수 배율 (Beatstar 모델: 배율이 깨져도 런은 계속)
  // 스트릭 3/6/10 도달 시 x2/x3/x4
  multSteps: [3, 6, 10],

  // 닌자 단계 (docs/07 R2): 콤보 기준 스테이지, 색 등급 사다리로 강함을 가시화.
  // 마일스톤과 동일 콤보에서 진입 — "다음 닌자 색까지"가 근접 목표가 된다.
  ninjaTiers: [
    { at: 0, name: '그림자 닌자', color: '#9aa7b8' },
    { at: 10, name: '블루 닌자', color: '#4da3ff' },
    { at: 25, name: '퍼플 닌자', color: '#b06bff' },
    { at: 50, name: '레드 닌자', color: '#ff4d6d' },
    { at: 100, name: '골드 닌자', color: '#ffd166' },
    { at: 200, name: '섀도우 마스터', color: '#31e0ff' },
  ],
  tierArcPenalty: 0.03, // 단계당 존 폭 -3% (곡선 위 가벼운 계단 — 벽이 아니라 라벨)
  tierBonusGold: 5, // 단계 진입 보너스

  // 부활 직후 첫 타겟: 최대 거리 + 이 배율로 느리게. 첫 히트 후 콤보 속도로 복귀.
  reviveEaseSpeed: 0.6,
  // 런당 광고 부활 허용 횟수 (벤치마크 표준: 1회 — 무한 부활은 점수 가치를 파괴)
  revivesPerRun: 1,

  // 신규 유저 튜토리얼: 첫 런 속도 배율 (첫 히트 후 정상 속도 복귀)
  tutorialSpeedScale: 0.55,

  // 재화(골드)
  goldPerHit: 1, // 닌자 처치
  goldPerPerfect: 2, // 보물 상자 획득
  treasureGold: 15, // 게이지 만충 보물
  chestSlots: 5, // 상단 보물 상자 게이지 칸 수

  // 무기: bonus = 히트당 추가 점수("데미지"). 비주얼은 game.ts drawWeapon.
  // 첫 구매(카타나)는 5~8판 내 도달 — 첫 진행 훅은 빨라야 한다 (Knife Hit 첫 나이프)
  weapons: [
    { name: '기본 바늘', price: 0, bonus: 0 },
    { name: '카타나', price: 100, bonus: 1 },
    { name: '사신 낫', price: 350, bonus: 2 },
    { name: '광선검', price: 800, bonus: 3 },
    { name: '크림슨 세이버', price: 1500, bonus: 4 },
  ],

  // juice
  shakeFail: 14,
  shakeHit: 3,
  shakePerfect: 6,
  flashHit: 0.16,
  flashPerfect: 0.3,
  flashFail: 0.45,
  particlesHit: 14,
  particlesPerfect: 26,
  particlesFail: 48,
  maxParticles: 320,

  colors: {
    bg: '#0a0e14',
    ring: '#1c2430',
    needle: '#e8f0ff',
    target: '#27e8a7',
    perfect: '#ffd166',
    fail: '#ff4d6d',
    text: '#e8f0ff',
    dim: 'rgba(232,240,255,0.55)',
  },
} as const;
