# 플레이 시스템 상세 분석 문서

## 개요

이 문서는 ATELOS 게임의 플레이 시스템을 5단계로 분석하고, 각 단계에서 구현된 개선사항과 추가 개선 필요사항을 정리합니다.

**분석 일자**: 2025-12-13
**관련 커밋**: 3d4669b ~ 76371dd

---

## 문서 목록

| 단계 | 파일 | 핵심 파일 | 커밋 |
|------|------|----------|------|
| Stage 1 | [stage-1-game-initialization.md](./stage-1-game-initialization.md) | GameClient.tsx:331-488 | 3d4669b |
| Stage 2 | [stage-2-story-opening.md](./stage-2-story-opening.md) | game-ai-client.ts, prompt-builder.ts | 60ae7eb |
| Stage 3 | [stage-3-main-game-loop.md](./stage-3-main-game-loop.md) | GameClient.tsx 핸들러들 | 5e501f4 |
| Stage 4 | [stage-4-ai-response-processing.md](./stage-4-ai-response-processing.md) | GameClient.tsx:535-1233 | 1b11b62 |
| Stage 5 | [stage-5-ending-system.md](./stage-5-ending-system.md) | generate-ending/route.ts | 76371dd |

---

## 데이터 흐름 전체 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Stage 1: 게임 초기화                                                        │
│                                                                             │
│   ScenarioData ──→ createInitialSaveState() ──→ SaveState                  │
│                          │                                                  │
│                          ├─→ protagonistKnowledge (metCharacters 초기화)   │
│                          ├─→ npcRelationshipStates (visibility: hidden)    │
│                          ├─→ actionContext (초기 맥락)                     │
│                          ├─→ worldState (초기 월드)                        │
│                          └─→ characterArcs (초기 상태)                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Stage 2: 스토리 오프닝                                                      │
│                                                                             │
│   hasStoryOpening() → generateStoryOpening() → StoryOpeningResult          │
│                                │                                            │
│                                ├─→ AI 프롬프트에 전달:                      │
│                                │     - npcRelationshipStates               │
│                                │     - protagonistKnowledge                │
│                                │                                            │
│                                ├─→ chatHistory에 오프닝 서사 추가          │
│                                │                                            │
│                                ├─→ metCharacters 업데이트 ★               │
│                                ├─→ characterArcs 첫 만남 moment ★         │
│                                └─→ actionContext 오프닝 반영 ★            │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Stage 3: 메인 게임 루프                                                     │
│                                                                             │
│   ┌─────────────────┬──────────────────┬──────────────────┐                │
│   │ handlePlayerChoice │ handleDialogueSelect │ handleExplore    │         │
│   └─────────────────┴──────────────────┴──────────────────┘                │
│              │                  │                  │                        │
│              ├──────────────────┼──────────────────┤                        │
│              │                  │                  │                        │
│              ▼                  ▼                  ▼                        │
│   ┌────────────────────────────────────────────────────────┐               │
│   │ 공통 처리:                                              │               │
│   │   1. AP 체크 → 시너지 보너스 적용                       │               │
│   │   2. AI 응답 생성                                       │               │
│   │   3. protagonistKnowledge.informationPieces 추가 ★     │               │
│   │   4. ActionHistory 기록                                 │               │
│   │   5. 맥락 업데이트                                      │               │
│   │   6. AP 소모 / Day 전환                                 │               │
│   │   7. Dynamic Ending 체크 ★                             │               │
│   │   8. 레거시 엔딩 체크                                   │               │
│   └────────────────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Stage 4: AI 응답 처리                                                       │
│                                                                             │
│   updateSaveState(currentState, aiResponse, scenario)                      │
│              │                                                              │
│              ├─→ 스탯 증폭 시스템 (1.2x ~ 2.0x)                            │
│              ├─→ 관계 변화 파싱 (다양한 형식 지원)                         │
│              ├─→ 플래그 획득 처리                                          │
│              ├─→ characterArcs 업데이트                                    │
│              ├─→ 새로 만난 캐릭터 자동 감지 → metCharacters ★             │
│              ├─→ locations_discovered → informationPieces ★               │
│              └─→ NPC 관계 힌트 감지 → npcRelationshipStates ★             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Stage 5: 엔딩 시스템                                                        │
│                                                                             │
│   ┌────────────────────────────────────────────────────────┐               │
│   │ Dynamic Ending (dynamicEndingConfig.enabled)           │               │
│   │                                                         │               │
│   │   generateDynamicEnding() → /api/generate-ending       │               │
│   │                  │                                      │               │
│   │                  └─→ discoveredInfo 추출 ★             │               │
│   │                        - metCharacters                  │               │
│   │                        - hintedRelationships            │               │
│   │                        - informationPieces (최근 20개) │               │
│   │                        - revealedNPCRelations           │               │
│   │                                                         │               │
│   │   → AI가 SDT 기반 만족스러운 결말 생성                 │               │
│   └────────────────────────────────────────────────────────┘               │
│                                                                             │
│   ┌────────────────────────────────────────────────────────┐               │
│   │ Legacy Ending (deprecated)                              │               │
│   │                                                         │               │
│   │   checkEndingConditions() → EndingArchetype             │               │
│   │   - required_stat 조건                                  │               │
│   │   - survivor_count 조건                                 │               │
│   └────────────────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────────────────┘
```

★ = Stage 2-5에서 구현된 개선사항

---

## 주요 데이터 타입 연계

### protagonistKnowledge 흐름

| Stage | 업데이트 위치 | 업데이트 내용 |
|-------|-------------|-------------|
| 1 | createInitialSaveState | metCharacters 초기화 |
| 2 | 오프닝 완료 시 ★ | metCharacters에 첫 만남 캐릭터 추가 |
| 3 | handleDialogueSelect, handleExplore | informationPieces 추가 |
| 4 | updateSaveState | metCharacters 자동 추가, locations_discovered, hintedRelationships |
| 5 | generateDynamicEnding | discoveredInfo로 추출 → AI 프롬프트 |

### npcRelationshipStates 흐름

| Stage | 업데이트 위치 | 업데이트 내용 |
|-------|-------------|-------------|
| 1 | createInitialSaveState | visibility: hidden 초기화 |
| 2 | prompt-builder.ts | AI 프롬프트에 가이드라인 추가 |
| 3 | (미업데이트) | - |
| 4 | updateSaveState | 두 캐릭터 언급 시 visibility: hinted |
| 5 | generateDynamicEnding | revealedNPCRelations로 추출 |

---

## 구현된 개선사항 요약

### 커밋 3d4669b (Stage 1 - 초기)
- protagonistKnowledge 초기화 (metCharacters, hintedRelationships, informationPieces)
- npcRelationshipStates 초기화
- characterIntroductionStyle 3가지 분기 처리

### Stage 1 개선 (현재 커밋)
- **#1** characterArcs.trustLevel: initialRelationships에서 플레이어-캐릭터 관계값 반영
- **#2** protagonistKnowledge.metCharacters: 배열 깊은 병합 + 중복 제거 (Set 사용)
- **#3** 'gradual' 스타일 fallback: order=1 누락 시 경고 로그 + 첫 항목 사용
- **#4** storyOpening undefined: `getStoryOpeningWithDefaults()` 통합 헬퍼 추가
- **테스트**: `tests/unit/game-initialization.test.ts` 19개 테스트 추가

### 커밋 60ae7eb (Stage 2 - 초기)
- prompt-builder.ts에 npcRelationshipStates 옵션 추가
- prompt-builder.ts에 protagonistKnowledge 옵션 추가
- AI 프롬프트에 숨겨진 관계 가이드라인, 주인공 지식 섹션 추가

### Stage 2 개선 (현재 커밋)
- **#1** characterArcs 첫 만남 moment: 오프닝에서 만난 캐릭터의 characterArcs에 첫 만남 moment 추가
- **#2** actionContext 오프닝 반영: incitingIncident → currentSituation, 첫 대화 기록 추가
- **기존 구현 확인**: metCharacters 업데이트 (이미 구현됨, 문서만 업데이트)
- **테스트**: `tests/unit/story-opening.test.ts` 17개 테스트 추가

### 커밋 5e501f4 (Stage 3 - 초기)
- handleExplore에 시너지 보너스 체크 추가
- handleDialogueSelect, handleExplore에 protagonistKnowledge.informationPieces 업데이트
- handleDialogueSelect, handleExplore에 Dynamic Ending 체크 추가
- 3개 핸들러 엔딩 체크 일관성 확보

### Stage 3 개선 (현재 커밋)
- **#1** metCharacters 자동 추가: handleDialogueSelect에서 대화한 캐릭터 metCharacters에 자동 추가
- **#2** keyDecisions 대화 기록: infoGained 있을 때 중요 대화로 keyDecisions에 기록
- **#2** keyDecisions 탐색 기록: 발견물(newDiscoveries) 있을 때 keyDecisions에 기록
- **테스트**: `tests/unit/main-game-loop.test.ts` 12개 테스트 추가

### 커밋 1b11b62 (Stage 4 - 초기)
- locations_discovered → protagonistKnowledge.informationPieces 추가
- NPC 관계 힌트 감지 (두 캐릭터 동시 언급 시)
- npcRelationshipStates.visibility → 'hinted' 자동 전환
- protagonistKnowledge.hintedRelationships 자동 추가

### Stage 4 개선 (현재 커밋)
- **#1** hinted → revealed 전환: 이미 hinted인 관계가 재언급되면 revealed로 전환
- **#1** 명시적 키워드 감지: 관계 키워드(사이, 형제, 연인 등) 감지 시 바로 revealed
- **#2** discoveredRelationships 사용: revealed 상태 시 discoveredRelationships에 추가
- **테스트**: `tests/unit/ai-response-processing.test.ts` 13개 테스트 추가

### 커밋 76371dd (Stage 5 - 초기)
- generateDynamicEnding에서 discoveredInfo 추출
- generate-ending API에 discoveredInfo 파라미터 추가
- 프롬프트에 discovered_knowledge 섹션 추가

### Stage 5 개선 (현재 커밋)
- **#1** characterArcs 엔딩 프롬프트 반영: trustLevel, moments, currentMood를 엔딩 API에 전달
- **#1** character_arcs 프롬프트 섹션: 캐릭터별 발전 기록을 AI 프롬프트에 포함
- **테스트**: `tests/unit/dynamic-ending.test.ts` 11개 테스트 추가

---

## 추가 개선 필요사항 (우선순위별)

### 높음 (기능 완성도)

| 이슈 | 현재 상태 | Stage |
|------|----------|-------|
| ~~handleDialogueSelect 대화 캐릭터 metCharacters 미추가~~ | ✅ **해결됨** - Stage 3 개선 #1 | 3 |
| ~~discoveredRelationships 미사용~~ | ✅ **해결됨** - Stage 4 개선 #2 | 4, 5 |
| ~~힌트 → 공개 전환 없음~~ | ✅ **해결됨** - Stage 4 개선 #1 | 4 |

### 중간 (일관성 개선)

| 이슈 | 현재 상태 | Stage |
|------|----------|-------|
| ~~characterArcs.trustLevel 초기값~~ | ✅ **해결됨** - Stage 1 개선 #1 | 1 |
| ~~오프닝 후 metCharacters 업데이트 없음~~ | ✅ **해결됨** - 기존 구현 확인, 문서 업데이트 | 2 |
| ~~characterArcs 첫 만남 moment 없음~~ | ✅ **해결됨** - Stage 2 개선 #1 | 2 |
| ~~actionContext 오프닝 미반영~~ | ✅ **해결됨** - Stage 2 개선 #2 | 2 |
| ~~keyDecisions 대화/탐색 미기록~~ | ✅ **해결됨** - Stage 3 개선 #2 | 3 |
| ~~characterArcs 엔딩 프롬프트 반영~~ | ✅ **해결됨** - Stage 5 개선 #1 | 5 |

### 낮음 (향후 확장)

| 이슈 | 현재 상태 | Stage |
|------|----------|-------|
| ~~worldState 커스텀 위치 확장~~ | ✅ **해결됨** - `scenario.locations` 지원 | 1 |
| ~~actionContext.urgentMatters 활용~~ | ✅ **해결됨** - 스탯 40% 이하 시 자동 추가 | 3 |
| ~~informationPieces 중복 제거~~ | ✅ **해결됨** - ID 기반 중복 체크 | 3, 4 |

**모든 이슈 해결 완료!**

---

## 테스트 검증 체크리스트

```
✅ 완료된 검증
├── pnpm build 성공
├── pnpm test 262개 테스트 통과 (Stage 1: 19개, Stage 2: 17개, Stage 3: 12개, Stage 4: 13개, Stage 5: 11개, 남은 이슈: 10개)
├── 3개 핸들러 Dynamic Ending 체크 일관성
├── 3개 핸들러 시너지 보너스 적용
├── protagonistKnowledge.informationPieces 업데이트
├── npcRelationshipStates 힌트 감지
├── discoveredInfo 엔딩 API 전달
├── [Stage 1] characterArcs.trustLevel 초기값 테스트 (3개)
├── [Stage 1] initialProtagonistKnowledge 배열 병합 테스트 (5개)
├── [Stage 1] 'gradual' 스타일 fallback 테스트 (4개)
├── [Stage 1] storyOpening undefined 통합 폴백 테스트 (3개)
├── [Stage 1] characterIntroductionStyle 전체 분기 테스트 (4개)
├── [Stage 2] 첫 만남 캐릭터 결정 테스트 (3개)
├── [Stage 2] characterArcs 첫 만남 moment 테스트 (4개)
├── [Stage 2] actionContext 오프닝 반영 테스트 (5개)
├── [Stage 2] protagonistKnowledge 업데이트 테스트 (4개)
├── [Stage 2] 오프닝 완료 시 상태 통합 테스트 (1개)
├── [Stage 3] handleDialogueSelect metCharacters 자동 추가 테스트 (4개)
├── [Stage 3] keyDecisions 대화 기록 테스트 (3개)
├── [Stage 3] keyDecisions 탐색 기록 테스트 (3개)
├── [Stage 3] keyDecisions 최대 개수 유지 테스트 (1개)
├── [Stage 3] 대화 후 상태 통합 테스트 (1개)
├── [Stage 4] hidden → hinted 전환 테스트 (3개)
├── [Stage 4] hinted → revealed 전환 테스트 (3개)
├── [Stage 4] 명시적 관계 키워드 감지 테스트 (3개)
├── [Stage 4] discoveredRelationships 업데이트 테스트 (3개)
├── [Stage 4] 전체 상태 전환 통합 테스트 (1개)
├── [Stage 5] characterArcs 데이터 추출 테스트 (4개)
├── [Stage 5] character_arcs 프롬프트 섹션 생성 테스트 (6개)
├── [Stage 5] characterArcs 전체 흐름 통합 테스트 (1개)
├── [남은 이슈] urgentMatters 업데이트 로직 테스트 (4개)
├── [남은 이슈] informationPieces 중복 제거 테스트 (5개)
└── [남은 이슈] 통합 테스트 (1개)

❌ 추가 검증 필요
├── hiddenNPCRelationships 빈 배열 시나리오
├── 레거시 시나리오 (storyOpening 없음) 실제 플레이 테스트
└── 동적 엔딩 SDT 점수 품질 평가
```

---

## 사용 방법

각 Stage 문서를 순서대로 읽으면서:
1. **데이터 흐름 이해**: 어떤 데이터가 어디서 생성되고 어디로 전달되는지
2. **구현된 개선사항 확인**: 각 커밋에서 무엇이 추가되었는지
3. **추가 개선 필요사항 검토**: 누락된 로직이나 불일치 확인
4. **코드 참조**: 실제 코드 위치를 확인하며 이해

---

## 관련 문서

- [CLAUDE.md](../../CLAUDE.md): 프로젝트 전체 가이드
- [types/index.ts](../../types/index.ts): 타입 정의
- [lib/gameplay-config.ts](../../lib/gameplay-config.ts): 게임플레이 설정 유틸리티
