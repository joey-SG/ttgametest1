# 07 · 리서치 노트 (조사 자료 관리 — 계속 업데이트)

> 기능/밸런스 결정 전에 수행한 조사를 여기 쌓는다. 결정 자체는 `docs/06`의
> 의사결정 로그에, 근거 조사는 이 문서에. 항목마다 날짜와 출처를 남긴다.

---

## R1. 스트릭 배율 vs 퍼펙트-온리 콤보 (2026-07-04)

- Beatstar: 스트릭이 배율을 올리고, 깨지면 배율만 하락 — 곡은 계속. "완벽 추구"의
  무한 반복이 재플레이 동력. 별 4~5개는 스트릭 유지 없이는 불가 → 상급자 목표.
- 하이퍼캐주얼 타이밍 게임: 비퍼펙트가 20~40% 나오는 난이도가 재미의 최적점.
  퍼펙트가 흔하면 보상감 소멸, 드물면 좌절.
- **적용**: 초록=생존/노랑=보상 2단 판정 + 3/6/10 스트릭 배율 (docs/02 §4.5).
- 출처: [Beatstar Scores/Medals](https://support.beatstar.com/hc/en-us/articles/360014203618-Song-Difficulty-Scores-and-Medals),
  [Why Beatstar is hard to stop playing](https://medium.com/@brano.pancura1/3-reasons-why-beatstar-is-so-hard-to-stop-playing-f48a043fbc28),
  [Top 10 Hyper Casual Mechanics](https://mobilefreetoplay.com/top-10-game-mechanics-for-hyper-casual-games/)

## R2. 적(닌자) 단계 진행 & 보스 케이던스 (2026-07-04)

### Knife Hit — 보스 스테이지 모델
- **5스테이지마다 보스**. 보스 처치 시 전용 나이프(수집 보상) 지급 → 주기적
  마일스톤이 "다음 보스까지만 더"를 만든다.
- 엔드리스에서도 보스가 랜덤 등급(Common/Rare/Legendary)으로 등장 → 반복 플레이 유인.

### 적 티어 가시화 (색 등급 사다리)
- RPG 관행: 회색(일반)→초록→블루(레어)→퍼플→골드. 색만으로 "강해졌다"가 즉시 읽힘.
- 후반 강화 적("고블린 챔피언" 패턴)은 새 티어로 표시하는 것이 표준 — 스탯만 올리고
  표시가 없으면 "불공평", 표시가 있으면 "진행".
- 가시적 진행 지표가 있는 게임이 참여도 ~45% 높다는 보고. 마이크로 목표(다음 단계
  도달)는 리텐션을 최대 ~25% 올린다는 보고.
- 난이도 체감: 너무 어렵거나 시시하면 첫 20분 내 58% 이탈 — 티어는 난이도 상승을
  "공정한 단계"로 재포장하는 장치다.

### 결론 (적용 방향)
- 닌자 단계 = **콤보 기준 스테이지** (10/25/50/100/200 — 기존 마일스톤과 통합).
  색 사다리: 그림자(회색)→블루→퍼플→레드→골드→섀도우 마스터.
- 난이도는 기존 속도/존 곡선이 주도하고, 티어는 **단계당 존 폭 -3%의 가벼운 계단**만
  추가 (티어가 벽이 아니라 라벨이 되도록). 단계 진입 시 보너스 골드 + 강한 연출.
- 리텐션 기대 효과: (1) 비가시적 난이도 램프가 가시적 진행으로 재포장, (2) "다음
  닌자 색까지"라는 근접 목표, (3) "골드 닌자 찍음" 공유 소재.
- 출처: [Knife Hit Bosses (Fandom)](https://knife-hit.fandom.com/wiki/Bosses),
  [Knife Hit Stages](https://knife-hit.fandom.com/wiki/Stages),
  [Game Progression Systems](https://gamedesignskills.com/game-design/game-progression/),
  [Enemy Scaling Techniques](https://medium.com/@dalemensik413/my-favorite-enemy-scaling-techniques-in-video-games-be27f1bf22ed),
  [Difficulty & Retention](https://moldstud.com/articles/p-the-impact-of-game-difficulty-on-mobile-game-retention-rates-strategies-for-success),
  [Retention Strategies](https://segwise.ai/blog/boost-mobile-game-retention-strategies)

## 특색(차별화) 후보 — 벤치마크 완성 후 착수

> 원칙: 검증된 조합이 먼저 완성되고 지표가 안정된 뒤에만 얹는다 (docs/06 §2).

- [ ] 닌자 단계별 특수 패턴 1개씩 (예: 레드부터 가끔 페이크 존 — 탭하면 안 되는 잔상)
- [ ] 보물 상자 오픈 시 랜덤 보상 테이블 (골드 외 희귀 무기 조각 — Knife Hit 나이프 수집 대응)
- [ ] 콤보 리듬에 맞춘 사운드 피치 상승을 음악 스케일로 (오래 살수록 멜로디 완성)
