# Stage 3: 메인 게임 루프 (Main Game Loop) 상세 분석

## 1. 개요

플레이어의 행동을 처리하는 3개의 핵심 핸들러입니다.
모든 핸들러는 동일한 패턴을 따라야 시스템 일관성이 유지됩니다.

**핵심 파일**:
- `app/game/[scenarioId]/GameClient.tsx` - 핸들러 및 주인공 식별 헬퍼 (★ 2025-12-13)
- `lib/prompt-builder.ts` - AI 프롬프트 생성
- `lib/prompt-enhancers.ts` - 프롬프트 품질 강화 시스템 (★ 2025-12-13)

| 핸들러 | 라인 | 역할 |
|--------|------|------|
| `handlePlayerChoice` | 1597-1989 | 선택지/자유 입력 처리 |
| `handleDialogueSelect` | 1992-2232 | 캐릭터 대화 처리 |
| `handleExplore` | 2235-2595 | 장소 탐색 처리 |

### 1.1 [2025-12-13] 주인공 식별 시스템

핸들러에서 NPC만 처리하기 위한 헬퍼 함수:

```typescript
// GameClient.tsx:202-251 - 주인공 식별 헬퍼
const getProtagonistName = (scenario: ScenarioData): string | null => {
  return scenario.storyOpening?.protagonistSetup?.name || null;
};

const isProtagonist = (characterName: string, scenario: ScenarioData): boolean => {
  if (characterName === '(플레이어)') return true;
  const protagonistName = getProtagonistName(scenario);
  return protagonistName !== null && characterName === protagonistName;
};

const filterNPCs = (characters: Character[], scenario: ScenarioData): Character[] => {
  return characters.filter((c) => !isProtagonist(c.characterName, scenario));
};
```

**적용 위치**:
- `characterArcs` 초기화 시 주인공 제외
- `getInitialTrustLevel()` 주인공 체크
- `extractImpactedCharacters()` NPC 필터링
- `metCharacters` 업데이트 시 NPC만 추가

---

## 2. Stage 2에서 받는 데이터

| 데이터 | Stage 2 결과 | Stage 3 용도 |
|--------|-------------|-------------|
| `saveState.dilemma` | 첫 선택지 | 선택 UI 표시 |
| `saveState.chatHistory` | 오프닝 서사 | 메시지 표시 |
| `protagonistKnowledge` | 초기 상태 | AI 프롬프트/업데이트 |
| `npcRelationshipStates` | 초기 가시성 | AI 프롬프트 |
| `actionContext` | 초기 맥락 | AI 프롬프트/업데이트 |
| `characterArcs` | 초기 상태 | 신뢰도/무드 업데이트 |

---

## 3. 핸들러 공통 패턴

### 3.1 처리 순서

```
1. AP 부족 체크 (hasInsufficientAP)
2. 로딩 상태 설정
3. 채팅 히스토리에 플레이어 행동 추가
4. AI 응답 생성 (generateXXX)
5. 시너지 보너스 적용 (getActionSynergy)
6. 채팅 히스토리에 AI 응답 추가
7. 상태 업데이트 (스탯, 관계, 아크)
8. protagonistKnowledge 업데이트 ★ [Stage 3 구현]
9. ActionHistory 기록 (addToActionHistory)
10. 맥락 업데이트 (updateContextAfterXXX)
11. AP 소모 및 Day 전환 (consumeActionPoint)
12. Dynamic Ending 체크 ★ [Stage 3 구현]
13. 기존 엔딩 체크 (canCheckEnding → checkEndingConditions)
14. 시간제한 엔딩 체크
15. 로딩 상태 해제
```

### 3.2 [Stage 3] 구현된 일관성 개선

| 항목 | 이전 상태 | Stage 3 구현 |
|------|----------|-------------|
| 시너지 보너스 | handlePlayerChoice만 적용 | 3개 핸들러 모두 적용 |
| protagonistKnowledge 업데이트 | 없음 | 3개 핸들러에서 informationPieces 추가 |
| Dynamic Ending 체크 | handlePlayerChoice만 | 3개 핸들러 모두 일관되게 체크 |
| 기존 엔딩 체크 | 불일치 | 모두 `canCheckEnding(currentDay, scenario)` 사용 |

---

## 4. 핸들러별 상세 분석

### 4.1 handlePlayerChoice (lines 1597-1989)

**처리 행동**: 선택지 클릭, 자유 입력 (isCustomInput=true)

**고유 로직**:
```typescript
// 주요 결정 기록 (회상 시스템)
recordKeyDecision() → keyDecisions 배열에 추가

// 시너지 보너스 (lastAction → 'choice')
if (synergy?.mechanicEffect?.statBonus && cleanedResponse.statChanges?.scenarioStats) {
  // 첫 번째 양수 스탯에 보너스 적용
}

// ActionHistory 기록
addToActionHistory('choice', choiceDetails, {...}, ..., isCustomInput);
```

**protagonistKnowledge 업데이트**:
- handlePlayerChoice에서는 직접 업데이트 없음
- updateSaveState()에서 간접 업데이트 (Stage 4에서 분석)

### 4.2 handleDialogueSelect (lines 1992-2232)

**처리 행동**: 캐릭터 대화 선택

**고유 로직**:
```typescript
// 시너지 보너스 (lastAction → 'dialogue')
if (synergy?.mechanicEffect?.trustBonus) {
  bonusRelationshipChange = synergy.mechanicEffect.trustBonus;
}

// 관계 변화 + 시너지 적용
const totalRelationshipChange = dialogueResponse.relationshipChange + bonusRelationshipChange;

// 캐릭터 아크 업데이트
arc.trustLevel += totalRelationshipChange;
arc.currentMood = dialogueResponse.mood;
```

**[Stage 3] protagonistKnowledge 업데이트** (lines 2073-2094):
```typescript
if (newSaveState.context.protagonistKnowledge && dialogueResponse.infoGained) {
  const newInfoPiece = {
    id: `dialogue_info_${characterName}_${Date.now()}`,
    content: dialogueResponse.infoGained,
    source: { type: 'dialogue', characterName },
    discoveredAt: { day: currentDay, turn },
  };
  newSaveState.context.protagonistKnowledge.informationPieces.push(newInfoPiece);
}
```

### 4.3 handleExplore (lines 2235-2595)

**처리 행동**: 장소 탐색

**고유 로직**:
```typescript
// WorldState 탐색 처리
const worldStateResult = processExploration(worldState, location.locationId, saveState);

// 시너지 보너스 (lastAction → 'exploration')
if (synergy?.mechanicEffect?.statBonus) { /* 스탯 보너스 */ }
if (synergy?.mechanicEffect?.infoUnlock) { synergyClueBonusApplied = true; }

// 발견물 처리
for (const discovery of worldStateResult.newDiscoveries) {
  // 스탯 변화 적용
  // 채팅 기록에 발견 알림 추가
}
```

**[Stage 3] protagonistKnowledge 업데이트** (lines 2394-2441):
```typescript
// 1. AI 생성 정보 추가
if (protagonistKnowledge && explorationResult.rewards.infoGained) {
  newInfoPiece = { id: `exploration_info_${locationId}_${timestamp}`, ... };
  protagonistKnowledge.informationPieces.push(newInfoPiece);
}

// 2. WorldState 발견물 추가
if (protagonistKnowledge && worldStateResult?.newDiscoveries.length) {
  for (const discovery of newDiscoveries) {
    newInfoPiece = { id: `discovery_${discovery.id}_${timestamp}`, ... };
    protagonistKnowledge.informationPieces.push(newInfoPiece);
  }
}
```

---

## 5. 데이터 흐름 (Stage 2 → Stage 3)

```
Stage 2 완료 상태
    │
    ├──→ dilemma ─────────→ [UI] ChoiceButtons
    │
    ├──→ saveState ────────→ [핸들러들]
    │       │
    │       ├─→ actionContext ──→ AI 프롬프트
    │       ├─→ protagonistKnowledge ──→ AI 프롬프트, 업데이트 대상
    │       ├─→ npcRelationshipStates ──→ AI 프롬프트
    │       └─→ characterArcs ──→ 대화 시 업데이트
    │
    └──→ 사용자 행동 ──────→ handleXXX() 호출
                              │
                              ├──→ AI 응답 생성
                              ├──→ 상태 업데이트
                              ├──→ protagonistKnowledge 업데이트 ★
                              └──→ 엔딩 체크
```

---

## 6. 구현된 개선사항

### 6.1 커밋 5e501f4 (초기)

| 항목 | handlePlayerChoice | handleDialogueSelect | handleExplore |
|------|-------------------|---------------------|---------------|
| 시너지 보너스 체크 | ✅ 기존 | ✅ 기존 | ✅ **추가됨** |
| protagonistKnowledge 업데이트 | ❌ (Stage 4 담당) | ✅ **추가됨** | ✅ **추가됨** |
| Dynamic Ending 체크 | ✅ 기존 | ✅ **추가됨** | ✅ **추가됨** |
| 기존 엔딩 조건 통일 | ✅ canCheckEnding | ✅ canCheckEnding | ✅ canCheckEnding |
| 시간제한 엔딩 체크 | ✅ 기존 | ✅ **추가됨** | ✅ **추가됨** |

### 6.2 Stage 3 개선 (현재)

| 개선 | 설명 | 위치 |
|------|------|------|
| **#1** metCharacters 자동 추가 | 대화한 캐릭터가 metCharacters에 없으면 자동 추가 | handleDialogueSelect:2235-2245 |
| **#2** keyDecisions 대화 기록 | infoGained 있을 때 중요 대화로 keyDecisions에 기록 | handleDialogueSelect:2213-2232 |
| **#2** keyDecisions 탐색 기록 | 발견물(newDiscoveries) 있을 때 keyDecisions에 기록 | handleExplore:2592-2612 |

**테스트**: `tests/unit/main-game-loop.test.ts` 12개 테스트 추가

### 6.3 남은 이슈 해결 (추가 커밋)

| 개선 | 설명 | 위치 |
|------|------|------|
| **#3** urgentMatters 자동 업데이트 | 스탯 40% 이하 시 위험 경고 자동 추가 | GameClient.tsx:1333-1358 (updateSaveState) |
| **#4** informationPieces 중복 제거 | ID 기반 중복 체크 헬퍼 함수 | GameClient.tsx:602-615 (addInformationPiece) |

**urgentMatters 로직**:
```typescript
// updateSaveState() 내부
const CRITICAL_THRESHOLD = 0.4; // 40% 이하면 위험
for (const [statId, value] of Object.entries(newStats)) {
  const percentage = (value - range.min) / (range.max - range.min);
  if (percentage <= CRITICAL_THRESHOLD) {
    urgentMatters.push(`${statName} 위험 수준 (${Math.round(percentage * 100)}%)`);
  }
}
```

**informationPieces 중복 제거 로직**:
```typescript
// addInformationPiece() 헬퍼 함수
const addInformationPiece = (pieces, newPiece) => {
  const exists = pieces.some((p) => p.id === newPiece.id);
  if (exists) {
    console.log(`📝 중복 정보 무시: ${newPiece.id}`);
    return false;
  }
  pieces.push(newPiece);
  return true;
};
```

**테스트**: `tests/unit/remaining-issues.test.ts` 10개 테스트 추가

---

## 7. 추가 개선 필요사항

### 7.1 잠재적 이슈

| 이슈 | 현재 상태 | 개선 제안 |
|------|----------|----------|
| ~~metCharacters 자동 추가 없음~~ | ✅ **해결됨** - Stage 3 개선 #1 | - |
| discoveredRelationships 업데이트 없음 | 모든 핸들러에서 미구현 | NPC 관계 힌트 발견 시 업데이트 (Stage 4에서 일부 구현) |
| ~~keyDecisions 대화/탐색 미기록~~ | ✅ **해결됨** - Stage 3 개선 #2 | - |
| ~~actionContext.urgentMatters 미사용~~ | ✅ **해결됨** - 스탯 40% 이하 시 자동 추가 | - |
| ~~informationPieces 중복 추가~~ | ✅ **해결됨** - ID 기반 중복 체크 | - |

### 7.2 핸들러 간 차이점 (일관성 검토 필요)

| 항목 | handlePlayerChoice | handleDialogueSelect | handleExplore |
|------|-------------------|---------------------|---------------|
| updateSaveState() 호출 | ✅ 있음 | ❌ 없음 (직접 업데이트) | ❌ 없음 (직접 업데이트) |
| characterArcs 업데이트 | updateSaveState 위임 | 직접 업데이트 | 업데이트 없음 |
| 언어 검증 | cleanAndValidateAIResponse | 없음 | 없음 |

**참고**: handleDialogueSelect, handleExplore에서 updateSaveState()를 호출하지 않는 것은
각 핸들러가 특화된 응답(dialogueResponse, explorationResult)을 처리하기 때문.
그러나 일부 로직(NPC 관계 힌트 감지 등)은 Stage 4의 updateSaveState()에서만 동작함.

---

## 8. Stage 4로 전달되는 데이터

### 8.1 Stage 3 완료 후 SaveState 변화

```typescript
// 핸들러 처리 후 변화되는 필드
saveState = {
  ...previousState,
  chatHistory: [..., newMessages],        // 행동 + 응답 추가
  context: {
    ...context,
    scenarioStats: { ...updated },        // 스탯 변화 적용
    currentDay: newDay (if advanced),     // Day 전환 시
    actionPoints: remaining,               // AP 소모 후
    actionsThisDay: [..., newAction],     // 행동 기록 추가
    actionContext: updated,               // 맥락 업데이트
    protagonistKnowledge: {
      ...knowledge,
      metCharacters: [..., newCharacter], // ★ Stage 3 개선 #1: 대화 시 추가
      informationPieces: [..., newPieces], // ★ Stage 3에서 추가
    },
  },
  community: {
    hiddenRelationships: { ...updated },  // 관계 변화 적용
  },
  characterArcs: [...updated],            // 대화 시 업데이트
  keyDecisions: [..., newDecision],       // ★ Stage 3 개선 #2: 선택/대화/탐색 시 추가
};
```

### 8.2 Stage 4에서 처리할 데이터

| 데이터 | Stage 4 처리 |
|--------|-------------|
| AI 응답 (aiResponse) | updateSaveState()에서 스탯 증폭, 관계 변화 적용 |
| chatHistory | 변화 요약 메시지 추가 |
| protagonistKnowledge | NPC 관계 힌트 감지 시 hintedRelationships 추가 |
| npcRelationshipStates | 관계 언급 감지 시 visibility 업데이트 |

---

## 9. 검증 체크리스트

- [x] 3개 핸들러 모두 시너지 보너스 적용 확인
- [x] handleDialogueSelect protagonistKnowledge 업데이트 확인
- [x] handleExplore protagonistKnowledge 업데이트 확인
- [x] Dynamic Ending 체크 3개 핸들러 일관성 확인
- [x] 기존 엔딩 체크 조건 통일 확인
- [x] 시간제한 엔딩 체크 3개 핸들러 확인
- [x] **[Stage 3 개선 #1]** metCharacters 자동 추가 (handleDialogueSelect)
- [x] **[Stage 3 개선 #2]** keyDecisions 대화 기록 (infoGained 있을 때)
- [x] **[Stage 3 개선 #2]** keyDecisions 탐색 기록 (발견물 있을 때)
- [ ] discoveredRelationships 핸들러 업데이트 (Stage 4 부분 구현)

---

## 10. 코드 참조

| 위치 | 함수/섹션 | 역할 |
|------|----------|------|
| GameClient.tsx:1597-1989 | handlePlayerChoice | 선택 처리 |
| GameClient.tsx:1992-2232 | handleDialogueSelect | 대화 처리 |
| GameClient.tsx:2235-2595 | handleExplore | 탐색 처리 |
| GameClient.tsx:90-182 | consumeActionPoint | AP 소모/Day 전환 |
| GameClient.tsx:187-199 | hasInsufficientAP | AP 부족 체크 |
| action-engagement-system.ts | getActionSynergy | 시너지 보너스 계산 |
