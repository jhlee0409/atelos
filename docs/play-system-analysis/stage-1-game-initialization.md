# Stage 1: 게임 초기화 (Game Initialization) 상세 분석

## 1. 개요

게임이 시작될 때 `createInitialSaveState()` 함수가 호출되어 전체 게임 상태를 초기화합니다.
이 단계에서 설정된 값들은 이후 모든 Stage에서 사용되므로 가장 중요한 기반입니다.

**핵심 파일**: `app/game/[scenarioId]/GameClient.tsx` (lines 331-488)

---

## 2. 초기화되는 데이터 구조

### 2.1 SaveState.context (게임 컨텍스트)

| 필드 | 초기값 | 설명 | Stage 2+ 활용 |
|------|--------|------|---------------|
| `scenarioId` | scenario.scenarioId | 시나리오 식별자 | AI 프롬프트에서 참조 |
| `scenarioStats` | scenarioStats 배열에서 추출 | 게임 스탯 상태 | Stage 4에서 증폭 시스템 적용 |
| `flags` | `{}` (빈 객체) | @deprecated | 레거시 호환성 유지 |
| `currentDay` | `1` | 현재 Day | Stage 3에서 Day 전환 처리 |
| `remainingHours` | `(총일수) * 24` | 남은 시간 | 타임업 엔딩 체크 |
| `turnsInCurrentDay` | `0` | @deprecated | 하위 호환성 |
| `actionPoints` | `getActionPointsPerDay(scenario)` | 현재 AP | Stage 3 핸들러에서 소모 |
| `maxActionPoints` | 동일 | 최대 AP | Day 전환 시 충전 |
| `actionsThisDay` | `[]` | 오늘 행동 기록 | Stage 3 시너지 체크 |
| `actionContext` | `createInitialContext()` | 맥락 연결 | Stage 2-3 AI 프롬프트 |
| `worldState` | `createInitialWorldState()` | 월드 상태 | Stage 3 탐색/이벤트 |
| `protagonistKnowledge` | 아래 상세 | 주인공 지식 | **핵심** Stage 2-5 전체 |
| `npcRelationshipStates` | hiddenNPCRelationships 매핑 | NPC 관계 가시성 | Stage 2 AI 프롬프트 |
| `triggeredStoryEvents` | `[]` | 발동된 이벤트 ID | 중복 발동 방지 |

### 2.2 protagonistKnowledge (주인공 지식 시스템)

```typescript
protagonistKnowledge: {
  metCharacters: getInitialMetCharacters(scenario),  // 만난 캐릭터
  discoveredRelationships: [],                        // 발견한 관계
  hintedRelationships: [],                            // 힌트된 관계
  informationPieces: [],                              // 정보 조각
  ...scenario.storyOpening?.initialProtagonistKnowledge,  // 시나리오 정의 초기 지식
}
```

**`getInitialMetCharacters()` 로직**:
| characterIntroductionStyle | 초기 metCharacters |
|---------------------------|-------------------|
| `'immediate'` | 모든 NPC 또는 introSequence 전체 |
| `'gradual'` | introSequence의 order=1 캐릭터만 |
| `'contextual'` (기본) | firstCharacterToMeet 또는 첫 번째 NPC |

### 2.3 SaveState.community (커뮤니티 상태)

| 필드 | 초기값 | 설명 |
|------|--------|------|
| `survivors` | `getInitialSurvivors()` 결과 | 만난 캐릭터만 포함 |
| `hiddenRelationships` | `initialRelationships` 매핑 | 캐릭터 간 관계값 |

### 2.4 기타 SaveState 필드

| 필드 | 초기값 | 설명 |
|------|--------|------|
| `log` | synopsis 기반 | 현재 서사 로그 |
| `chatHistory` | `[]` | 채팅 기록 |
| `dilemma` | 로딩 중 상태 | 현재 딜레마 |
| `characterArcs` | 모든 NPC 초기화 | 캐릭터 발전 추적 |
| `keyDecisions` | `[]` | 주요 결정 기록 |

---

## 3. 헬퍼 함수 분석

### 3.1 createInitialContext() - lib/context-manager.ts

**역할**: ActionContext 초기화 (맥락 연결 시스템)

```typescript
ActionContext {
  currentLocation: scenario.storyOpening?.openingLocation || '본부',
  currentSituation: scenario.synopsis.substring(0, 200),
  todayActions: { explorations: [], dialogues: [], choices: [] },
  discoveredClues: [],
  urgentMatters: [],
  characterPresences: [/* 모든 캐릭터 위치 정보 */],
  availableLocations: [/* 기본 2개 위치 */],
  lastUpdated: { day: 1, actionIndex: 0 },
}
```

### 3.2 createInitialWorldState() - lib/world-state-manager.ts

**역할**: WorldState 초기화 (동적 월드 시스템)

```typescript
WorldState {
  locations: createInitialLocations(scenario),
  discoveries: createInitialDiscoveries(),
  relations: [/* 캐릭터-위치 관계 */],
  pendingEvents: [],
  triggeredEvents: [],
  inventory: [],
  documents: [],
  lastUpdated: { day: 1, actionIndex: 0 },
}
```

### 3.3 getInitialSurvivors()

**역할**: 초기 survivors 목록 생성 (만난 캐릭터만)

```typescript
// metCharacters에 포함된 캐릭터만 survivors에 추가
charactersWithTraits
  .filter((c) => metCharacters.includes(c.characterName))
  .map((c) => ({ name, role, traits, status: 'normal' }))
```

---

## 4. 데이터 흐름도

```
ScenarioData
    │
    ├─→ scenarioStats ─────→ context.scenarioStats
    │
    ├─→ characters ────────→ characterArcs, survivors, characterPresences
    │
    ├─→ initialRelationships → hiddenRelationships
    │
    ├─→ traitPool ─────────→ charactersWithTraits
    │
    ├─→ storyOpening
    │       ├─→ characterIntroductionStyle → getInitialMetCharacters()
    │       ├─→ characterIntroductionSequence → protagonistKnowledge.metCharacters
    │       ├─→ firstCharacterToMeet ────→ protagonistKnowledge.metCharacters
    │       ├─→ hiddenNPCRelationships ──→ npcRelationshipStates
    │       ├─→ initialProtagonistKnowledge → protagonistKnowledge (병합)
    │       └─→ openingLocation ─────────→ actionContext.currentLocation
    │
    ├─→ gameplayConfig ────→ actionPointsPerDay
    │
    └─→ endCondition ──────→ remainingHours
```

---

## 5. Stage 2로 전달되는 핵심 데이터

Stage 2 (스토리 오프닝)에서 필요한 초기화 결과:

| 데이터 | 용도 |
|--------|------|
| `protagonistKnowledge.metCharacters` | 첫 만남 대상 결정 |
| `npcRelationshipStates` | AI에게 숨겨야 할 관계 전달 |
| `community.survivors` | 대화 가능 캐릭터 목록 |
| `actionContext.currentLocation` | 오프닝 장소 |
| `characterArcs` | 캐릭터별 초기 mood/trust |

---

## 6. 구현된 개선사항 (커밋 3d4669b)

| 항목 | 구현 내용 |
|------|----------|
| protagonistKnowledge 초기화 | metCharacters, hintedRelationships, informationPieces 포함 |
| npcRelationshipStates 초기화 | hiddenNPCRelationships에서 visibility 추출 |
| characterIntroductionStyle 지원 | 'immediate', 'gradual', 'contextual' 분기 처리 |
| 시나리오별 AP 설정 | getActionPointsPerDay() 사용 |
| triggeredStoryEvents 추적 | 중복 이벤트 발동 방지 준비 |

---

## 7. 추가 개선 필요사항

### 7.1 잠재적 이슈

| 이슈 | 현재 상태 | 개선 제안 |
|------|----------|----------|
| characterArcs 초기 trustLevel | 항상 0으로 시작 | initialRelationships 값 반영 고려 |
| 'gradual' 스타일에서 order 누락 | order=1 없으면 첫 캐릭터 사용 | 명확한 fallback 로직 문서화 |
| worldState.locations 하드코딩 | 기본 5개 위치 고정 | 시나리오별 커스텀 위치 지원 확장 |
| initialProtagonistKnowledge 병합 | 스프레드 연산자로 덮어쓰기 | 배열 필드 깊은 병합 필요 여부 검토 |

### 7.2 테스트 필요 케이스

1. `characterIntroductionStyle = 'gradual'` + `introSequence` 없는 경우
2. `hiddenNPCRelationships`가 빈 배열인 경우
3. `initialProtagonistKnowledge`와 기본값 필드 충돌 시 동작
4. `storyOpening` 자체가 undefined인 레거시 시나리오

---

## 8. 다음 Stage 연계 정보

### Stage 2 (스토리 오프닝)에서 사용할 데이터:

```typescript
// Stage 2에서 읽어야 할 초기화된 데이터
const {
  protagonistKnowledge,    // AI 프롬프트에 전달
  npcRelationshipStates,   // AI가 숨겨야 할 관계 가이드
  community.survivors,     // 오프닝에 등장 가능한 캐릭터
  actionContext,           // 현재 위치/상황
  characterArcs,           // 캐릭터 초기 상태
} = saveState;

// Stage 2에서 업데이트할 데이터
// - chatHistory: 오프닝 내레이션 추가
// - protagonistKnowledge.metCharacters: 새로 만난 캐릭터 추가
// - characterArcs: 첫 만남 이벤트 기록
```

---

## 9. 검증 체크리스트

- [x] protagonistKnowledge 모든 필드 초기화 확인
- [x] npcRelationshipStates 초기화 확인
- [x] characterIntroductionStyle 3가지 분기 처리 확인
- [x] getActionPointsPerDay() 시나리오 설정 반영 확인
- [ ] characterArcs.trustLevel 초기값 검토 (개선 검토 필요)
- [ ] worldState 커스텀 위치 지원 확장 (향후 개선)
