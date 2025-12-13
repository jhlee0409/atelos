# 행동 게이지 시스템 구현 분석 리포트

> 작성일: 2025-12-10
> 목적: 현재 ATELOS 시스템 분석 및 행동 게이지 시스템 적용 방안
>
> ⚠️ **v1.4 업데이트 노트**: `flags` 관련 내용은 deprecated됨.
> Dynamic Ending System에서 `ActionHistory`로 대체됨.

---

## 1. 현재 시스템 분석

### 1.1 Day 전환 로직 (현재)

**파일**: `app/game/[scenarioId]/GameClient.tsx:546-608`

```typescript
// 현재 구현
const MIN_TURNS_PER_DAY = 2;

// Day 전환 조건
if (enoughTurns && shouldProgress) {
  newSaveState.context.currentDay += 1;
  newSaveState.context.turnsInCurrentDay = 0;
}

// shouldProgress 조건:
// 1. AI가 shouldAdvanceTime: true를 보내거나
// 2. 중요 이벤트(플래그 획득) 발생하거나
// 3. turnsInCurrentDay >= 3
```

**문제점**:
- Day 전환 시점이 불명확하고 예측 불가
- AI 응답에 의존적 (shouldAdvanceTime)
- 플레이어가 남은 행동 횟수를 알 수 없음
- dialogue/exploration이 Day 전환에 영향을 주지 않음

### 1.2 SaveState 구조 (현재)

**파일**: `types/index.ts:190-224`

```typescript
export interface SaveState {
  context: {
    scenarioId: string;
    scenarioStats: { [key: string]: number };
    flags: { [key: string]: boolean | number };
    currentDay?: number;
    remainingHours?: number;
    turnsInCurrentDay?: number;  // <-- 행동 게이지로 대체 필요
  };
  // ...
}
```

### 1.3 행동 유형별 현재 처리

| 행동 유형 | 핸들러 함수 | Day 전환 영향 | AI 호출 |
|-----------|-------------|---------------|---------|
| Main Choice | `handlePlayerChoice` | O (턴 증가) | O |
| Dialogue | `handleDialogueSelect` | X | O (간단) |
| Exploration | `handleExplore` | X | O (간단) |
| Free Text | `handleFreeTextSubmit` | O (같은 로직) | O |

**핵심 문제**: Dialogue와 Exploration이 "무료" 행동으로 무한 반복 가능

### 1.4 TimelineProgress 컴포넌트

**파일**: `components/client/GameClient/TimelineProgress.tsx:12-17`

```typescript
// 현재: 턴 수 기반 시간대 결정
const getTimeOfDay = (turnsInDay: number) => {
  if (turnsInDay <= 1) return 'morning';
  if (turnsInDay <= 2) return 'afternoon';
  if (turnsInDay <= 3) return 'evening';
  return 'night';
};
```

→ **행동 게이지 시스템에서**: 잔여 AP 기반으로 변경 필요

---

## 2. 필요한 변경 사항

### 2.1 타입 정의 변경

**파일**: `types/index.ts`

```typescript
// 새로 추가할 타입
export interface ActionGaugeConfig {
  baseActionPoints: number;      // 기본 일일 행동 포인트 (기본: 3)
  actionCosts: {
    choice: number;              // 메인 선택 비용 (기본: 1)
    dialogue: number;            // 대화 비용 (기본: 1)
    exploration: number;         // 탐색 비용 (기본: 1)
    freeText: number;            // 자유 입력 비용 (기본: 1)
  };
}

// SaveState 변경
export interface SaveState {
  context: {
    // 기존 필드...

    // 제거 예정
    // turnsInCurrentDay?: number;

    // 새로 추가
    actionPoints?: number;           // 현재 잔여 행동 포인트
    maxActionPoints?: number;        // 해당 일 최대 행동 포인트
    actionsThisDay?: ActionRecord[]; // 오늘 수행한 행동 기록
  };
  // ...
}

// 행동 기록 타입
export interface ActionRecord {
  actionType: 'choice' | 'dialogue' | 'exploration' | 'freeText';
  timestamp: number;
  target?: string;           // 캐릭터명 또는 장소명
  cost: number;              // 소모된 AP
  result?: {
    statChanges?: Record<string, number>;
    flagsAcquired?: string[];
    relationshipChanges?: Record<string, number>;
  };
}
```

### 2.2 GameClient.tsx 변경 사항

#### 2.2.1 초기 상태 생성 변경

**현재 코드**: `GameClient.tsx:56-156`

```typescript
// 변경 전
const createInitialSaveState = (scenario: ScenarioData): SaveState => {
  return {
    context: {
      // ...
      currentDay: 1,
      turnsInCurrentDay: 0,  // 제거
    },
    // ...
  };
};

// 변경 후
const ACTION_POINTS_PER_DAY = 3;

const createInitialSaveState = (scenario: ScenarioData): SaveState => {
  return {
    context: {
      // ...
      currentDay: 1,
      actionPoints: ACTION_POINTS_PER_DAY,
      maxActionPoints: ACTION_POINTS_PER_DAY,
      actionsThisDay: [],
    },
    // ...
  };
};
```

#### 2.2.2 행동 포인트 소모 함수 추가

```typescript
// 새로 추가할 유틸 함수
const consumeActionPoint = (
  saveState: SaveState,
  actionType: 'choice' | 'dialogue' | 'exploration' | 'freeText',
  target?: string
): { newState: SaveState; shouldAdvanceDay: boolean } => {
  const newState = JSON.parse(JSON.stringify(saveState));
  const currentAP = newState.context.actionPoints ?? ACTION_POINTS_PER_DAY;
  const cost = 1; // 모든 행동 1 AP (Phase 1)

  // 행동 기록 추가
  if (!newState.context.actionsThisDay) {
    newState.context.actionsThisDay = [];
  }
  newState.context.actionsThisDay.push({
    actionType,
    timestamp: Date.now(),
    target,
    cost,
  });

  // AP 소모
  newState.context.actionPoints = currentAP - cost;

  // Day 전환 체크
  const shouldAdvanceDay = newState.context.actionPoints <= 0;

  if (shouldAdvanceDay) {
    newState.context.currentDay = (newState.context.currentDay || 1) + 1;
    newState.context.actionPoints = ACTION_POINTS_PER_DAY;
    newState.context.maxActionPoints = ACTION_POINTS_PER_DAY;
    newState.context.actionsThisDay = [];

    // Day 전환 메시지
    newState.chatHistory.push({
      type: 'system',
      content: `Day ${newState.context.currentDay} 시작 - 새로운 하루가 밝았습니다. [행동력 ${ACTION_POINTS_PER_DAY}회 충전]`,
      timestamp: Date.now(),
    });
  }

  return { newState, shouldAdvanceDay };
};
```

#### 2.2.3 handlePlayerChoice 수정

**현재 코드**: `GameClient.tsx:989-1259`

```typescript
// 변경 전 (기존 턴 기반 로직)
const handlePlayerChoice = async (choiceDetails: string) => {
  // ... AI 호출 ...
  const updatedSaveState = updateSaveState(newSaveState, cleanedResponse, scenario);
  // updateSaveState 내부에서 turnsInCurrentDay 증가 및 Day 전환 처리
};

// 변경 후 (행동 게이지 기반)
const handlePlayerChoice = async (choiceDetails: string) => {
  // 1. AP 체크
  const currentAP = saveState.context.actionPoints ?? ACTION_POINTS_PER_DAY;
  if (currentAP <= 0) {
    setError('오늘의 행동력을 모두 사용했습니다.');
    return;
  }

  // ... AI 호출 ...

  // 2. AP 소모 및 Day 전환 체크
  const { newState: stateWithAP, shouldAdvanceDay } = consumeActionPoint(
    updatedSaveState,
    'choice',
    choiceDetails
  );

  // 3. 상태 업데이트
  setSaveState(stateWithAP);

  // 4. 엔딩 체크 (Day 5 이후)
  // ... 기존 엔딩 체크 로직 ...
};
```

#### 2.2.4 handleDialogueSelect 수정

**현재 코드**: `GameClient.tsx:1262-1331`

```typescript
// 변경 전: Day 전환에 영향 없음
const handleDialogueSelect = async (characterName: string, topic: DialogueTopic) => {
  // ... 대화 생성 및 적용 ...
  setSaveState(newSaveState);
  setGameMode('choice');
};

// 변경 후: AP 소모
const handleDialogueSelect = async (characterName: string, topic: DialogueTopic) => {
  // 1. AP 체크
  const currentAP = saveState.context.actionPoints ?? ACTION_POINTS_PER_DAY;
  if (currentAP <= 0) {
    setError('오늘의 행동력을 모두 사용했습니다.');
    return;
  }

  // ... 대화 생성 및 적용 ...

  // 2. AP 소모 및 Day 전환
  const { newState, shouldAdvanceDay } = consumeActionPoint(
    newSaveState,
    'dialogue',
    characterName
  );

  setSaveState(newState);
  setGameMode('choice');

  // 3. Day 전환 후 엔딩 체크
  if (shouldAdvanceDay) {
    checkEndingAfterDayAdvance(newState);
  }
};
```

#### 2.2.5 handleExplore 수정

**현재 코드**: `GameClient.tsx:1334-1411`

```typescript
// 변경 후: AP 소모
const handleExplore = async (location: ExplorationLocation) => {
  // 1. AP 체크
  const currentAP = saveState.context.actionPoints ?? ACTION_POINTS_PER_DAY;
  if (currentAP <= 0) {
    setError('오늘의 행동력을 모두 사용했습니다.');
    return;
  }

  // ... 탐색 생성 및 적용 ...

  // 2. AP 소모 및 Day 전환
  const { newState, shouldAdvanceDay } = consumeActionPoint(
    newSaveState,
    'exploration',
    location.locationId
  );

  setSaveState(newState);
  setGameMode('choice');

  // 3. Day 전환 후 엔딩 체크
  if (shouldAdvanceDay) {
    checkEndingAfterDayAdvance(newState);
  }
};
```

### 2.3 updateSaveState 함수 수정

**파일**: `GameClient.tsx:203-835`

현재 `updateSaveState` 함수 내의 Day 전환 로직(line 547-608) 제거 필요:

```typescript
// 제거할 부분 (line 547-608)
// 시간 진행 로직 개선 - 여러 대화 후 하루가 진행되도록
const MIN_TURNS_PER_DAY = 2;
// ... 전체 블록 제거 ...
```

대신 `consumeActionPoint` 함수에서 Day 전환을 중앙 관리

### 2.4 UI 컴포넌트 변경

#### 2.4.1 StatsBar에 AP 표시 추가

**파일**: `components/client/GameClient/StatsBar.tsx`

```typescript
// 새로 추가할 컴포넌트
const ActionPointsDisplay = ({
  current,
  max
}: {
  current: number;
  max: number;
}) => {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-zinc-400">AP</span>
      <div className="flex gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-4 h-4 rounded-full border",
              i < current
                ? "bg-blue-500 border-blue-400"
                : "bg-zinc-800 border-zinc-700"
            )}
          />
        ))}
      </div>
      {current === 1 && (
        <span className="text-[10px] text-orange-400 ml-1">
          마지막 행동!
        </span>
      )}
    </div>
  );
};
```

#### 2.4.2 TimelineProgress 수정

**파일**: `components/client/GameClient/TimelineProgress.tsx`

```typescript
// 변경 전: turnsInDay 기반
const getTimeOfDay = (turnsInDay: number) => {
  if (turnsInDay <= 1) return 'morning';
  // ...
};

// 변경 후: 잔여 AP 기반
const getTimeOfDay = (
  currentAP: number,
  maxAP: number
): 'morning' | 'afternoon' | 'evening' | 'night' => {
  const usedAP = maxAP - currentAP;
  const ratio = usedAP / maxAP;

  if (ratio === 0) return 'morning';
  if (ratio <= 0.33) return 'afternoon';
  if (ratio <= 0.66) return 'evening';
  return 'night';
};
```

#### 2.4.3 ChoiceButtons에 AP 비용 표시

**파일**: `components/client/GameClient/ChoiceButtons.tsx`

```typescript
// 각 행동 버튼에 AP 비용 표시 추가
<button
  onClick={() => handlePlayerChoice(saveState.dilemma.choice_a)}
  disabled={isLoading || currentAP <= 0}
>
  <span className="absolute top-1 right-1 text-[10px] text-blue-400">
    -1 AP
  </span>
  {choice}
</button>

// 행동력 부족 시 비활성화 및 안내
{currentAP <= 0 && (
  <div className="text-center text-sm text-orange-400 mt-2">
    오늘의 행동력을 모두 사용했습니다. 다음 날이 시작됩니다...
  </div>
)}
```

### 2.5 엔딩 체커 연동

**파일**: `lib/ending-checker.ts`

변경 불필요 - 기존 로직 유지:
- Day 5 이후 엔딩 조건 체크
- Day 7 초과 시 시간제한 엔딩

행동 게이지로 Day가 자동 증가하므로 기존 엔딩 체크 로직과 자연스럽게 연동

---

## 3. 데이터 마이그레이션

### 3.1 기존 SaveState 호환성

```typescript
// 마이그레이션 유틸 함수
const migrateToActionGaugeSystem = (oldState: SaveState): SaveState => {
  const newState = { ...oldState };

  // turnsInCurrentDay → actionPoints 변환
  if (newState.context.turnsInCurrentDay !== undefined) {
    // 기존 턴 수를 역산하여 잔여 AP 계산
    const usedTurns = newState.context.turnsInCurrentDay;
    const remainingAP = Math.max(0, ACTION_POINTS_PER_DAY - usedTurns);

    newState.context.actionPoints = remainingAP;
    newState.context.maxActionPoints = ACTION_POINTS_PER_DAY;
    newState.context.actionsThisDay = [];

    // 기존 필드 제거
    delete newState.context.turnsInCurrentDay;
  }

  return newState;
};
```

---

## 4. 구현 순서 권장

### Phase 1: 기본 구조 (필수)
1. `types/index.ts`에 새 타입 추가
2. `GameClient.tsx`에 `consumeActionPoint` 함수 추가
3. `createInitialSaveState` 수정
4. `handlePlayerChoice` 수정 (AP 소모 로직)
5. 기본 UI에 AP 표시

### Phase 2: 전체 행동 통합
6. `handleDialogueSelect` AP 소모 적용
7. `handleExplore` AP 소모 적용
8. `handleFreeTextSubmit` AP 소모 적용
9. `updateSaveState`에서 기존 Day 전환 로직 제거

### Phase 3: UI 개선
10. `TimelineProgress` AP 기반 시간대 표시
11. `ChoiceButtons` AP 비용 표시
12. AP 부족 시 UX (자동 Day 전환 또는 확인창)

### Phase 4: 고급 기능 (선택)
13. 행동 기록 (`actionsThisDay`) 활용
14. 가변 AP 시스템 (스탯 기반 보너스)
15. 행동 패턴 기반 엔딩 분기

---

## 5. 영향 받는 파일 목록

| 파일 | 변경 유형 | 우선순위 |
|------|----------|----------|
| `types/index.ts` | 타입 추가 | 1 |
| `app/game/[scenarioId]/GameClient.tsx` | 핵심 로직 변경 | 1 |
| `components/client/GameClient/StatsBar.tsx` | AP 표시 추가 | 2 |
| `components/client/GameClient/ChoiceButtons.tsx` | AP 비용 표시 | 2 |
| `components/client/GameClient/TimelineProgress.tsx` | 시간대 계산 변경 | 3 |
| `components/client/GameClient/CharacterDialoguePanel.tsx` | AP 체크 추가 | 2 |
| `components/client/GameClient/ExplorationPanel.tsx` | AP 체크 추가 | 2 |
| `lib/ending-checker.ts` | 변경 없음 | - |

---

## 6. 테스트 시나리오

### 6.1 기본 플로우 테스트
1. 게임 시작 → AP 3/3 확인
2. 메인 선택 → AP 2/3 확인
3. 대화 → AP 1/3 확인
4. 탐색 → AP 0/3 → Day 전환 확인
5. Day 2 시작 → AP 3/3 리셋 확인

### 6.2 Day 전환 테스트
1. Day 5 도달 → 엔딩 조건 체크 확인
2. Day 7 완료 → 시간제한 엔딩 트리거 확인

### 6.3 엣지 케이스
1. AP 0일 때 행동 시도 → 적절한 에러/안내
2. 기존 세이브 데이터 로드 → 마이그레이션 확인
3. 브라우저 새로고침 → 상태 유지 확인

---

## 7. 예상 이슈 및 해결책

### 7.1 AI 응답의 shouldAdvanceTime

**이슈**: 기존 AI 프롬프트에 `shouldAdvanceTime` 포함
**해결**: 프롬프트에서 해당 필드 제거 또는 무시 처리

### 7.2 시간대 표시 불일치

**이슈**: 기존 `turnsInCurrentDay` 기반 시간대 계산
**해결**: `TimelineProgress`에서 AP 기반으로 완전 전환

### 7.3 세이브/로드 호환성

**이슈**: 기존 세이브 데이터에 `actionPoints` 없음
**해결**: `migrateToActionGaugeSystem` 함수로 자동 마이그레이션

---

## 8. 결론

행동 게이지 시스템 도입을 위해 필요한 변경 사항을 정리했습니다.

**핵심 변경점**:
1. `turnsInCurrentDay` → `actionPoints` 전환
2. 모든 행동(선택/대화/탐색)에 AP 소모 적용
3. AP 0 도달 시 자동 Day 전환
4. UI에 잔여 AP 명시적 표시

**예상 소요 시간**:
- Phase 1 (기본 구조): 2-3시간
- Phase 2 (전체 통합): 1-2시간
- Phase 3 (UI 개선): 1-2시간
- Phase 4 (고급 기능): 추후 결정

**권장**: Phase 1-2까지 우선 구현 후 플레이테스트 진행
