# TikTok 무한 아케이드 게임 — 개발 문서 & Fable 핸드오프

TikTok에서 바이럴 가능한 **무한(endless) 원탭 아케이드 게임 "PULSE"**를 만들기 위한
기획·기술·배포 문서 저장소. 이 문서 세트가 완성되면 **Claude Fable**(`claude-fable-5`)
세션이 이어받아 실제 게임을 구현·배포한다.

## 제품 요약

> 원탭 정밀 리듬 아케이드. 무한 재도전, 강한 이펙트 + iPhone 햅틱, 깔끔·심플,
> **보상형 광고로 부활**해 계속 플레이. HTML5로 웹 데모 + TikTok Mini Game 배포.

## 문서 지도

| 문서 | 내용 |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | Karpathy 4원칙 기반 개발 규칙 + 프로젝트 성공 기준 |
| [`docs/01-market-research.md`](./docs/01-market-research.md) | TikTok 시장·주류 장르·유저 성향·타겟 |
| [`docs/02-game-design.md`](./docs/02-game-design.md) | 게임 컨셉·코어 루프·수익화·juice 스펙 |
| [`docs/03-tech-architecture.md`](./docs/03-tech-architecture.md) | HTML5 스택·플랫폼 어댑터·광고·**iPhone 햅틱**·성능 |
| [`docs/04-deployment.md`](./docs/04-deployment.md) | 웹 데모 + TikTok Mini Game 배포 절차 |
| [`docs/05-fable-handoff.md`](./docs/05-fable-handoff.md) | **Fable 세션 시작용 핸드오프 (먼저 읽기)** |

## 다음 단계

1. 이 문서들을 검토한다.
2. **Claude Fable로 새 세션을 시작**하고 `docs/05-fable-handoff.md`의 시작 프롬프트를 사용한다.
3. Fable이 M1→M5 마일스톤을 따라 구현·배포한다.

## 방법론

- **CLAUDE.md**: [Andrej Karpathy의 CLAUDE.md 4원칙](https://github.com/multica-ai/andrej-karpathy-skills) (메뉴로 사용, 프로젝트에 맞게 재작성).
- **개발 프로세스**: [moai-adk](https://github.com/modu-ai/moai-adk)의 SPEC-First 관점 — 코딩 전 무엇을/누구를 위해를 먼저 확정.
