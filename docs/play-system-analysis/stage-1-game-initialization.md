# Stage 1: 게임 초기화 (Game Initialization) 상세 분석

## 1. 개요

게임이 시작될 때 `createInitialSaveState()` 함수가 호출되어 전체 게임 상태를 초기화합니다.
이 단계에서 설정된 값들은 이후 모든 Stage에서 사용되므로 가장 중요한 기반입니다.

**핵심 파일**: `app/game/[scenarioId]/GameClient.tsx` (lines 387-556)

**테스트 파일**: `tests/unit/game-initialization.test.ts` (19개 테스트)

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

**[구현 완료]** 배열 깊은 병합으로 중복 없이 초기화됨

```typescript
// GameClient.tsx:493-510
protagonistKnowledge: (() => {
  const baseMetCharacters = getInitialMetCharacters(scenario);
  const initialKnowledge = scenario.storyOpening?.initialProtagonistKnowledge;

  return {
    // metCharacters: 기본값 + 시나리오 정의값 병합 (중복 제거)
    metCharacters: [
      ...new Set([
        ...baseMetCharacters,
        ...(initialKnowledge?.metCharacters || []),
      ]),
    ],
    // 나머지 배열 필드: 시나리오 값 그대로 사용
    discoveredRelationships: initialKnowledge?.discoveredRelationships || [],
    hintedRelationships: initialKnowledge?.hintedRelationships || [],
    informationPieces: initialKnowledge?.informationPieces || [],
  };
})(),
```

**`getInitialMetCharacters()` 로직**:
| characterIntroductionStyle | 초기 metCharacters | 비고 |
|---------------------------|-------------------|------|
| `'immediate'` | 모든 NPC 또는 introSequence 전체 | order 순 정렬 |
| `'gradual'` | introSequence의 order=1 캐릭터 | order=1 없으면 경고 로그 + 첫 항목 ★ |
| `'contextual'` (기본) | firstCharacterToMeet 또는 첫 번째 NPC | 기본 동작 |

### 2.3 SaveState.characterArcs (캐릭터 발전 추적)

**[구현 완료]** trustLevel이 initialRelationships에서 초기화됨

**[2025-12-13 추가]** 주인공 식별 시스템으로 NPC만 필터링

```typescript
// GameClient.tsx:596-605
// [주인공 식별] filterNPCs로 주인공 이름 또는 (플레이어) 모두 제외
characterArcs: filterNPCs(charactersWithTraits, scenario)
  .map((c) => ({
    characterName: c.characterName,
    moments: [],
    currentMood: 'anxious' as const,
    trustLevel: getInitialTrustLevel(c.characterName, scenario), // ★ 개선됨
  })),
```

**`getInitialTrustLevel()` 헬퍼** (GameClient.tsx:316-328):
```typescript
const getInitialTrustLevel = (characterName: string, scenario: ScenarioData): number => {
  // initialRelationships에서 플레이어-캐릭터 관계 찾기
  // 주인공은 "(플레이어)" 또는 실제 이름(protagonistSetup.name)일 수 있음
  const playerRelation = scenario.initialRelationships?.find(
    (rel) =>
      (isProtagonist(rel.personA, scenario) && rel.personB === characterName) ||
      (isProtagonist(rel.personB, scenario) && rel.personA === characterName)
  );
  return playerRelation?.value ?? 0;
};
```

### 2.4 SaveState.community (커뮤니티 상태)

| 필드 | 초기값 | 설명 |
|------|--------|------|
| `survivors` | `getInitialSurvivors()` 결과 | 만난 캐릭터만 포함 |
| `hiddenRelationships` | `initialRelationships` 매핑 | 캐릭터 간 관계값 |

### 2.5 기타 SaveState 필드

| 필드 | 초기값 | 설명 |
|------|--------|------|
| `log` | synopsis 기반 | 현재 서사 로그 |
| `chatHistory` | `[]` | 채팅 기록 |
| `dilemma` | 로딩 중 상태 | 현재 딜레마 |
| `keyDecisions` | `[]` | 주요 결정 기록 |

---

## 3. 주인공 식별 시스템 (Protagonist Identification) ★ 신규

**[2025-12-13 추가]** 시나리오에서 주인공을 `(플레이어)` 또는 실제 이름으로 설정할 수 있도록 지원

### 3.1 배경

기존 시스템은 주인공을 항상 `(플레이어)`라는 이름으로만 인식했습니다. 하지만 시나리오에서 `storyOpening.protagonistSetup.name = "강하늘"` 처럼 실제 이름을 설정하면, 시스템이 주인공을 NPC로 취급하는 문제가 발생했습니다.

**발생했던 문제:**
- 주인공이 `characterArcs`에 NPC로 포함됨
- 주인공이 `metCharacters`에 "자기 자신을 만났다"로 기록됨
- 주인공과 "대화"했다고 기록되는 비정상 동작

### 3.2 헬퍼 함수 (GameClient.tsx:202-251)

```typescript
// 시나리오에서 주인공 이름 가져오기
const getProtagonistName = (scenario: ScenarioData): string | null => {
  return scenario.storyOpening?.protagonistSetup?.name || null;
};

// 캐릭터가 주인공인지 확인
// "(플레이어)" 또는 protagonistSetup.name과 일치하면 주인공
const isProtagonist = (characterName: string, scenario: ScenarioData): boolean => {
  if (characterName === '(플레이어)') return true;
  const protagonistName = getProtagonistName(scenario);
  return protagonistName !== null && characterName === protagonistName;
};

// NPC 캐릭터만 필터링 (주인공 제외)
const filterNPCs = (characters: Character[], scenario: ScenarioData): Character[] => {
  return characters.filter((c) => !isProtagonist(c.characterName, scenario));
};

// 주인공 캐릭터 가져오기
const getProtagonistCharacter = (scenario: ScenarioData): Character | undefined => {
  return scenario.characters.find((c) => isProtagonist(c.characterName, scenario));
};
```

### 3.3 적용 위치

| 위치 | 기존 코드 | 변경 후 |
|------|----------|---------|
| `characterArcs` 초기화 | `.filter((c) => c.characterName !== '(플레이어)')` | `filterNPCs(charactersWithTraits, scenario)` |
| `getInitialMetCharacters()` | `.filter((c) => c.characterName !== '(플레이어)')` | `filterNPCs(scenario.characters, scenario)` |
| `getInitialTrustLevel()` | `rel.personA === '(플레이어)'` | `isProtagonist(rel.personA, scenario)` |
| `extractImpactedCharacters()` | `.filter((name) => name !== '(플레이어)')` | `filterNPCs(scenario.characters, scenario)` |
| `updateSaveState()` NPC 감지 | `.filter((c) => c.characterName !== '(플레이어)')` | `filterNPCs(scenario.characters, scenario)` |

### 3.4 prompt-builder.ts 동일 적용

AI 프롬프트 생성에서도 동일한 시스템 적용:

```typescript
// lib/prompt-builder.ts:66-84
const getProtagonistName = (scenario: ScenarioData): string | null => {...};
const isProtagonist = (characterName: string, scenario: ScenarioData): boolean => {...};
const filterNPCsForPrompt = (characters: Character[], scenario: ScenarioData): Character[] => {...};
```

---

## 4. 헬퍼 함수 분석

### 4.1 getInitialMetCharacters() - GameClient.tsx:264-303

**역할**: 캐릭터 소개 스타일에 따라 초기에 만난 캐릭터 목록 생성

**[구현 완료]** 'gradual' 스타일 fallback 명확화

```typescript
// 'gradual' 스타일에서 order=1이 없는 경우 경고 로그 출력
if (introStyle === 'gradual' && introSequence && introSequence.length > 0) {
  const firstInSequence = introSequence.find((s) => s.order === 1);
  if (firstInSequence) {
    return [firstInSequence.characterName];
  }
  // [Stage 1 개선 #3] order=1이 없으면 경고 로그 출력 후 첫 번째 항목 사용
  console.warn(
    `⚠️ [getInitialMetCharacters] 'gradual' 스타일에서 order=1인 캐릭터가 없습니다. ` +
    `첫 번째 시퀀스 항목을 사용합니다: ${introSequence[0].characterName}`
  );
  return [introSequence[0].characterName];
}
```

### 3.2 getStoryOpeningWithDefaults() - GameClient.tsx:286-302

**[신규 추가]** storyOpening undefined 케이스 통합 처리

```typescript
const getStoryOpeningWithDefaults = (scenario: ScenarioData): ScenarioData['storyOpening'] => {
  const defaults = {
    characterIntroductionStyle: 'contextual' as const,
    npcRelationshipExposure: 'hidden' as const,
  };

  if (!scenario.storyOpening) {
    return defaults;
  }

  return {
    ...defaults,
    ...scenario.storyOpening,
  };
};
```

### 3.3 createInitialContext() - lib/context-manager.ts

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

### 3.4 createInitialWorldState() - lib/world-state-manager.ts

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

### 3.5 getInitialSurvivors() - GameClient.tsx:307-320

**역할**: 초기 survivors 목록 생성 (만난 캐릭터만)

```typescript
// metCharacters에 포함된 캐릭터만 survivors에 추가
charactersWithTraits
  .filter((c) => metCharacters.includes(c.characterName))
  .map((c) => ({ name, role, traits, status: 'normal' }))
```

---

## 5. 데이터 흐름도

```
ScenarioData
    │
    ├─→ scenarioStats ─────→ context.scenarioStats
    │
    ├─→ characters ────────→ characterArcs, survivors, characterPresences
    │
    ├─→ initialRelationships
    │       ├─→ hiddenRelationships
    │       └─→ characterArcs.trustLevel ★ [Stage 1 개선 #1]
    │
    ├─→ traitPool ─────────→ charactersWithTraits
    │
    ├─→ storyOpening (getStoryOpeningWithDefaults로 기본값 보장)
    │       ├─→ characterIntroductionStyle → getInitialMetCharacters()
    │       │       └─→ 'gradual' fallback 경고 로그 ★ [Stage 1 개선 #3]
    │       ├─→ characterIntroductionSequence → protagonistKnowledge.metCharacters
    │       ├─→ firstCharacterToMeet ────→ protagonistKnowledge.metCharacters
    │       ├─→ hiddenNPCRelationships ──→ npcRelationshipStates
    │       ├─→ initialProtagonistKnowledge → protagonistKnowledge (깊은 병합) ★ [Stage 1 개선 #2]
    │       └─→ openingLocation ─────────→ actionContext.currentLocation
    │
    ├─→ gameplayConfig ────→ actionPointsPerDay
    │
    └─→ endCondition ──────→ remainingHours

★ = Stage 1 개선으로 추가/변경된 데이터 흐름
```

---

## 6. Stage 2로 전달되는 핵심 데이터

Stage 2 (스토리 오프닝)에서 필요한 초기화 결과:

| 데이터 | 용도 | Stage 1 개선 영향 |
|--------|------|------------------|
| `protagonistKnowledge.metCharacters` | 첫 만남 대상 결정 | #2 배열 병합으로 중복 없음 |
| `npcRelationshipStates` | AI에게 숨겨야 할 관계 전달 | - |
| `community.survivors` | 대화 가능 캐릭터 목록 | - |
| `actionContext.currentLocation` | 오프닝 장소 | #4 기본값 보장 |
| `characterArcs` | 캐릭터별 초기 mood/trust | #1 trustLevel 초기화 |

---

## 7. 구현된 개선사항

### 7.1 커밋 3d4669b (초기 구현)

| 항목 | 구현 내용 |
|------|----------|
| protagonistKnowledge 초기화 | metCharacters, hintedRelationships, informationPieces 포함 |
| npcRelationshipStates 초기화 | hiddenNPCRelationships에서 visibility 추출 |
| characterIntroductionStyle 지원 | 'immediate', 'gradual', 'contextual' 분기 처리 |
| 시나리오별 AP 설정 | getActionPointsPerDay() 사용 |
| triggeredStoryEvents 추적 | 중복 이벤트 발동 방지 준비 |

### 7.2 Stage 1 개선 (이전 커밋)

| # | 이슈 | 해결 내용 | 영향 Stage |
|---|------|----------|-----------|
| #1 | characterArcs.trustLevel 항상 0 | `getInitialTrustLevel()` 헬퍼 추가, initialRelationships 참조 | Stage 3, 5 |
| #2 | initialProtagonistKnowledge 스프레드 덮어쓰기 | 배열 깊은 병합 (Set으로 중복 제거) | Stage 2, 5 |
| #3 | 'gradual' 스타일 order=1 누락 시 무응답 | 경고 로그 출력 + 첫 번째 항목 fallback | Stage 2 |
| #4 | storyOpening undefined 체크 산발적 | `getStoryOpeningWithDefaults()` 통합 헬퍼 | 전체 |

### 7.3 주인공 식별 시스템 추가 (2025-12-13) ★ 신규

| # | 이슈 | 해결 내용 | 영향 Stage |
|---|------|----------|-----------|
| #5 | 주인공이 실제 이름일 때 NPC로 취급 | `isProtagonist()`, `filterNPCs()` 헬퍼 추가 | **전체** |
| #6 | characterArcs에 주인공 포함됨 | `filterNPCs()` 로 초기화 시 주인공 제외 | Stage 3, 4, 5 |
| #7 | getInitialTrustLevel 주인공 미인식 | `isProtagonist()` 로 관계 확인 | Stage 1, 3 |
| #8 | prompt-builder에서 주인공 NPC 취급 | `filterNPCsForPrompt()` 추가 | Stage 2, 3 |

---

## 8. 추가 개선 필요사항 (향후)

### 8.1 잠재적 이슈

| 이슈 | 현재 상태 | 우선순위 |
|------|----------|---------|
| ~~worldState.locations 하드코딩~~ | ✅ **해결됨** - `scenario.locations` 지원 | - |
| characterArcs.currentMood 항상 'anxious' | 시나리오별 커스텀 불가 | 낮음 |
| getStoryOpeningWithDefaults() 미사용 | 헬퍼는 있으나 직접 호출 위치 확장 필요 | 중간 |

**해결된 이슈 상세**:
- `worldState.locations`: `lib/world-state-manager.ts`의 `createInitialLocations()`에서 `scenario.locations` 배열이 있으면 해당 위치를 사용, 없으면 기본 5개 위치 사용

### 8.2 향후 확장 고려사항

1. ~~**시나리오별 초기 위치 설정**: `gameplayConfig.initialLocations` 추가~~ → 이미 `scenario.locations`로 지원됨
2. **캐릭터별 초기 mood 설정**: `storyOpening.characterInitialMoods` 추가
3. **동적 AP 계산**: 장르/난이도에 따른 초기 AP 조정

---

## 9. 다음 Stage 연계 정보

### Stage 2 (스토리 오프닝)에서 사용할 데이터:

```typescript
// Stage 2에서 읽어야 할 초기화된 데이터
const {
  protagonistKnowledge,    // AI 프롬프트에 전달 (배열 병합됨)
  npcRelationshipStates,   // AI가 숨겨야 할 관계 가이드
  community.survivors,     // 오프닝에 등장 가능한 캐릭터
  actionContext,           // 현재 위치/상황
  characterArcs,           // 캐릭터 초기 상태 (trustLevel 초기화됨)
} = saveState;

// Stage 2에서 업데이트할 데이터
// - chatHistory: 오프닝 내레이션 추가
// - protagonistKnowledge.metCharacters: 새로 만난 캐릭터 추가
// - characterArcs: 첫 만남 이벤트 기록
```

---

## 10. 검증 체크리스트

### 기존 검증 (완료)
- [x] protagonistKnowledge 모든 필드 초기화 확인
- [x] npcRelationshipStates 초기화 확인
- [x] characterIntroductionStyle 3가지 분기 처리 확인
- [x] getActionPointsPerDay() 시나리오 설정 반영 확인

### Stage 1 개선 검증 (완료)
- [x] #1 characterArcs.trustLevel이 initialRelationships 값 반영
- [x] #2 protagonistKnowledge.metCharacters 배열 깊은 병합 + 중복 제거
- [x] #3 'gradual' 스타일 order=1 누락 시 경고 로그 + fallback
- [x] #4 getStoryOpeningWithDefaults() 헬퍼 함수 추가

### 주인공 식별 검증 (2025-12-13 추가) ★ 신규
- [x] #5 `isProtagonist()` 함수가 `(플레이어)` 및 실제 이름 모두 인식
- [x] #6 `characterArcs` 초기화 시 주인공 제외 확인
- [x] #7 `getInitialTrustLevel()` 주인공-NPC 관계 정확히 인식
- [x] #8 `prompt-builder.ts`에서 주인공 NPC 필터링 동작

### 테스트 커버리지
- [x] `tests/unit/game-initialization.test.ts` - 19개 테스트 통과
  - characterArcs.trustLevel 초기값 테스트 (3개)
  - initialProtagonistKnowledge 배열 병합 테스트 (5개)
  - 'gradual' 스타일 fallback 테스트 (4개)
  - storyOpening undefined 통합 폴백 테스트 (3개)
  - characterIntroductionStyle 전체 분기 테스트 (4개)
- [x] 빌드 및 262개 전체 테스트 통과 확인

---

## 11. 코드 참조

| 위치 | 함수/섹션 | 역할 |
|------|----------|------|
| GameClient.tsx:202-251 | 주인공 식별 시스템 | **[2025-12-13 신규]** isProtagonist, filterNPCs 등 |
| GameClient.tsx:264-303 | getInitialMetCharacters() | 초기 만난 캐릭터 목록 생성 |
| GameClient.tsx:316-328 | getInitialTrustLevel() | 초기 신뢰도 가져오기 (isProtagonist 사용) |
| GameClient.tsx:331-354 | getStoryOpeningWithDefaults() | storyOpening 기본값 병합 |
| GameClient.tsx:356-369 | getInitialSurvivors() | 초기 survivors 목록 생성 |
| GameClient.tsx:437-608 | createInitialSaveState() | 전체 게임 상태 초기화 |
| GameClient.tsx:543-558 | protagonistKnowledge 초기화 | 배열 깊은 병합 |
| GameClient.tsx:596-605 | characterArcs 초기화 | **[개선]** filterNPCs로 주인공 제외 |
| lib/prompt-builder.ts:66-84 | filterNPCsForPrompt() | **[2025-12-13 신규]** AI 프롬프트용 NPC 필터링 |
