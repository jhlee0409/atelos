# Stage 2: 스토리 오프닝 (Story Opening) 상세 분석

## 1. 개요

게임 시작 시 플레이어에게 첫 번째 서사를 제공하는 단계입니다.
3단계 구조 (프롤로그 → 사건 발생 → 첫 만남)로 게임을 시작합니다.

**핵심 파일**:
- `lib/game-ai-client.ts`: generateStoryOpening(), generateInitialDilemma()
- `lib/prompt-builder.ts`: buildStoryOpeningPrompt() + 주인공 식별 헬퍼 (★ 2025-12-13)
- `lib/prompt-enhancers.ts`: 프롬프트 품질 강화 시스템 (★ 2025-12-13)
- `app/game/[scenarioId]/GameClient.tsx`: 오프닝 완료 후 상태 업데이트 (lines 1566-1662)

**테스트 파일**: `tests/unit/story-opening.test.ts` (17개 테스트)

---

## 2. Stage 1에서 받는 데이터

| 데이터 | 출처 | 용도 | Stage 1 개선 영향 |
|--------|------|------|------------------|
| `protagonistKnowledge.metCharacters` | createInitialSaveState | 첫 만남 대상 결정 | #2 배열 병합 |
| `npcRelationshipStates` | createInitialSaveState | AI에게 숨겨야 할 관계 | - |
| `community.survivors` | createInitialSaveState | 오프닝 등장 캐릭터 | - |
| `actionContext.currentLocation` | createInitialContext | 오프닝 장소 | #4 기본값 보장 |
| `characterArcs` | createInitialSaveState | 캐릭터 초기 mood | #1 trustLevel 초기화 |

---

## 3. 스토리 오프닝 생성 흐름

### 3.1 진입점 결정

```typescript
// game-ai-client.ts:930
if (hasStoryOpening(scenario)) {
  // 3단계 스토리 오프닝 시스템 사용
  return await generateStoryOpening(scenario, characters);
} else {
  // 기존 방식 (단순 초기 딜레마)
  return generateGameResponse(saveState, initialPlayerAction, scenario);
}
```

### 3.2 hasStoryOpening() 조건

```typescript
// scenario에 다음 중 하나 이상 존재해야 함:
- storyOpening.prologue
- storyOpening.incitingIncident
- storyOpening.protagonistSetup
```

### 3.3 generateStoryOpening() 처리

```
ScenarioData.storyOpening
    │
    ├──→ buildStoryOpeningPrompt() ─→ AI 프롬프트 생성
    │
    ├──→ callGeminiAPI() ──────────→ AI 응답
    │
    ├──→ parseGeminiJsonResponse() ─→ JSON 파싱
    │
    └──→ cleanNarrativeFormatting() ─→ 언어 정리
            │
            └──→ StoryOpeningResult {
                  prologue,
                  incitingIncident,
                  firstEncounter,
                  dilemma,
                  fullLog
                }
```

---

## 4. AI 프롬프트 구성 (buildStoryOpeningPrompt)

### 4.1 프롬프트 구조

| 섹션 | 내용 | 조건 |
|------|------|------|
| 기본 설정 | 톤, 시간, 장르 | 항상 |
| 1:1 캐릭터 소개 시퀀스 | 첫 만남 캐릭터 정보 | characterIntroductionSequence 존재 시 |
| 숨겨진 NPC 관계 | 관계 노출 금지 가이드 | npcRelationshipExposure='hidden' 또는 hiddenNPCRelationships 존재 |
| 점진적 캐릭터 공개 | 첫 만남 시 공개 가능 정보 | characterRevelations 존재 시 |
| 주인공-NPC 이름 충돌 | 1인칭 서술로 자동 처리 | protagonistSetup.name과 NPC 이름 충돌 시 |

### 4.2 첫 캐릭터 결정 로직

```typescript
// 우선순위:
1. characterIntroductionSequence에서 order=1인 캐릭터
2. storyOpening.firstCharacterToMeet
3. NPCs의 첫 번째 캐릭터

// 결과:
firstCharacter → 오프닝의 firstEncounter에 등장
```

### 4.3 구현된 숨겨진 관계 가이드라인

```typescript
// prompt-builder.ts:588-603
if (options.npcRelationshipStates && options.npcRelationshipStates.length > 0) {
  const hiddenRelations = options.npcRelationshipStates.filter(r => r.visibility === 'hidden');
  const hintedRelations = options.npcRelationshipStates.filter(r => r.visibility === 'hinted');

  hiddenRelationshipSection = `
### [Stage 2] NPC 관계 노출 가이드라인 ###
**숨겨진 관계 (${hiddenRelations.length}개)**: 절대 언급 금지
**힌트된 관계 (${hintedRelations.length}개)**: 미묘한 암시만 가능
**공개된 관계 (${revealedRelations.length}개)**: 자유롭게 언급
`;
}
```

### 4.4 구현된 주인공 지식 가이드라인

```typescript
// prompt-builder.ts:605-627
if (options.protagonistKnowledge) {
  const pk = options.protagonistKnowledge;
  // 최근 알게 된 정보 요약 (최대 5개)
  const recentInfo = pk.informationPieces?.slice(-5).map(i => `- ${i.content}`).join('\n');

  protagonistKnowledgeSection = `
### [Stage 2] 주인공이 알고 있는 정보 ###
만난 캐릭터: ${metCount}명 | 알려진 관계: ${discoveredRelCount}개

**AI 지시**: 주인공이 모르는 정보는 선택지나 서술에 포함하지 마세요.
`;
}
```

### 4.5 [2025-12-13] 주인공 식별 시스템

프롬프트 생성 시 NPC만 필터링하여 전달:

```typescript
// prompt-builder.ts:66-84 - 주인공 식별 헬퍼 함수
const getProtagonistNameForPrompt = (scenario: ScenarioData): string | null => {
  return scenario.storyOpening?.protagonistSetup?.name || null;
};

const isProtagonistForPrompt = (characterName: string, scenario: ScenarioData): boolean => {
  if (characterName === '(플레이어)') return true;
  const protagonistName = getProtagonistNameForPrompt(scenario);
  return protagonistName !== null && characterName === protagonistName;
};

const filterNPCsForPrompt = (characters: Character[], scenario: ScenarioData): Character[] => {
  return characters.filter((c) => !isProtagonistForPrompt(c.characterName, scenario));
};
```

**적용 위치**:
- `buildStoryOpeningPrompt()` 내 캐릭터 목록 생성 시
- `buildLitePrompt()`, `buildDialoguePrompt()`, `buildExplorationPrompt()` 등 모든 프롬프트 함수

### 4.6 [2025-12-13] 프롬프트 품질 강화 시스템

`lib/prompt-enhancers.ts`를 통한 품질 개선:

- **Choice Diversity**: 테마별 선택지 균형
- **Character Balancing**: 캐릭터 등장 빈도 조정
- **Theme Rotation**: 서사 단계별 테마 가중치
- **Context Bridge**: 이전 씬과의 연결성 유지

```typescript
// prompt-builder.ts에서 통합 사용
import { generateEnhancedPromptGuidelines } from './prompt-enhancers';
```

---

## 5. 스토리 오프닝 결과 구조

### 5.1 StoryOpeningResult

```typescript
interface StoryOpeningResult {
  prologue: string;         // 프롤로그 (평화로운 일상)
  incitingIncident: string; // 사건 발생 (긴장 고조)
  firstEncounter: string;   // 첫 만남 (첫 캐릭터 등장)
  dilemma: {
    prompt: string;
    choice_a: string;       // 적극적
    choice_b: string;       // 신중한
    choice_c: string;       // 대기
  };
  fullLog: string;          // 3단계 결합
}
```

### 5.2 AIResponse로 변환

```typescript
// game-ai-client.ts:958-968
return {
  log: storyOpening.fullLog,
  dilemma: storyOpening.dilemma,
  statChanges: {
    scenarioStats: {},           // 오프닝에서는 스탯 변화 없음
    survivorStatus: [],
    hiddenRelationships_change: [],
    // [v1.4 REMOVED] flags_acquired - ActionHistory로 대체됨
  },
};
```

---

## 6. 오프닝 완료 후 상태 업데이트

### 6.1 [구현 완료] protagonistKnowledge 업데이트

```typescript
// GameClient.tsx:1571-1589
// metCharacters 업데이트 (이미 포함되어 있지 않은 경우만)
const updatedMetCharacters = metCharacterName && !currentMetCharacters.includes(metCharacterName)
  ? [...currentMetCharacters, metCharacterName]
  : currentMetCharacters;

// 첫 만남에서 얻은 기본 정보 기록
const newInformationPieces = [
  ...initialInformationPieces,
  {
    id: `opening_meet_${metCharacterName}`,
    content: `${metCharacterName}을(를) 처음 만났다.`,
    source: 'story_opening',
    discoveredAt: { day: 1, action: 'opening' },
  },
];
```

### 6.2 [Stage 2 개선 #1] characterArcs 첫 만남 moment 기록

```typescript
// GameClient.tsx:1591-1613
const updatedCharacterArcs = metCharacterName
  ? (initialState.characterArcs || []).map((arc) => {
      if (arc.characterName === metCharacterName) {
        return {
          ...arc,
          moments: [
            ...arc.moments,
            {
              day: 1,
              type: 'relationship' as const,
              description: `${metCharacterName}과(와) 처음 만났다.`,
              relatedCharacter: '(플레이어)',
              impact: 'positive' as const,
            },
          ],
        };
      }
      return arc;
    })
  : initialState.characterArcs;
```

### 6.3 [Stage 2 개선 #2] actionContext 오프닝 반영

```typescript
// GameClient.tsx:1615-1632
const updatedActionContext = {
  ...initialState.context.actionContext,
  // 현재 상황을 오프닝 상황으로 업데이트
  currentSituation: storyOpening.incitingIncident || initialState.context.actionContext?.currentSituation,
  // 첫 만남 대화 기록 추가
  todayActions: metCharacterName
    ? {
        ...initialState.context.actionContext?.todayActions,
        dialogues: [
          ...(initialState.context.actionContext?.todayActions?.dialogues || []),
          { characterName: metCharacterName, topic: 'first_encounter' },
        ],
      }
    : initialState.context.actionContext?.todayActions,
};
```

---

## 7. 데이터 흐름 (Stage 1 → Stage 2 → Stage 3)

```
Stage 1 초기화
    │
    ├─→ protagonistKnowledge ──→ [Stage 2 AI 프롬프트]
    │       └─ metCharacters     "주인공이 아는 정보"
    │
    ├─→ npcRelationshipStates ─→ [Stage 2 AI 프롬프트]
    │       └─ visibility        "숨겨야 할 관계"
    │
    ├─→ community.survivors ───→ characters 파라미터
    │
    └─→ storyOpening 설정 ─────→ buildStoryOpeningPrompt()
            ├─ characterIntroductionSequence
            ├─ hiddenNPCRelationships
            └─ characterRevelations
                    │
                    ▼
            StoryOpeningResult
                    │
                    ▼
            오프닝 완료 후 상태 업데이트 ★
                    │
                    ├─→ protagonistKnowledge.metCharacters 추가 ✅
                    ├─→ protagonistKnowledge.informationPieces 추가 ✅
                    ├─→ characterArcs.moments 추가 ★ [Stage 2 개선 #1]
                    ├─→ actionContext.currentSituation 업데이트 ★ [Stage 2 개선 #2]
                    └─→ actionContext.todayActions.dialogues 추가 ★ [Stage 2 개선 #2]
                            │
                            ▼
                        Stage 3로 전달

★ = Stage 2 개선으로 추가된 데이터 흐름
```

---

## 8. 구현된 개선사항

### 8.1 커밋 60ae7eb (초기 구현)

| 항목 | 구현 내용 |
|------|----------|
| npcRelationshipStates AI 전달 | prompt-builder.ts에 옵션 추가 |
| protagonistKnowledge AI 전달 | prompt-builder.ts에 옵션 추가 |
| 숨겨진 관계 가이드라인 | AI가 관계 노출 레벨에 따라 서술 제한 |
| 주인공 지식 가이드라인 | AI가 알려진 정보 범위 내에서만 서술 |

### 8.2 기존 구현 (GameClient.tsx 내)

| 항목 | 구현 내용 |
|------|----------|
| metCharacters 업데이트 | 첫 만남 캐릭터 추가 |
| informationPieces 추가 | 첫 만남 정보 기록 |

### 8.3 Stage 2 개선 (현재 커밋)

| # | 이슈 | 해결 내용 | 영향 Stage |
|---|------|----------|-----------|
| #1 | characterArcs 오프닝 반영 없음 | 첫 만남 캐릭터에 `type: 'relationship'` moment 추가 | Stage 3, 5 |
| #2 | actionContext 오프닝 미반영 | currentSituation 업데이트, todayActions.dialogues 추가 | Stage 3 |

---

## 9. 추가 개선 필요사항 (향후)

### 9.1 잠재적 이슈

| 이슈 | 현재 상태 | 우선순위 |
|------|----------|---------|
| storyOpening 폴백 품질 | 시나리오 데이터 기반 단순 텍스트 | 낮음 |
| 오프닝 중 스탯 변화 미지원 | statChanges 항상 비어있음 | 낮음 |
| characterPresences 오프닝 반영 | 캐릭터 위치 정보 미업데이트 | 낮음 |

### 9.2 향후 확장 고려사항

1. **오프닝 스탯 변화**: 프롤로그 선택에 따른 초기 스탯 조정
2. **다중 캐릭터 첫 만남**: 여러 캐릭터를 한번에 만나는 오프닝 지원
3. **오프닝 분기**: 플레이어 선택에 따른 다른 오프닝 경로

---

## 10. Stage 3로 전달되는 데이터

### 10.1 오프닝 완료 후 SaveState 상태

```typescript
// GameClient에서 오프닝 후 상태 업데이트
saveState = {
  ...initialState,
  log: storyOpeningResult.fullLog,           // 오프닝 서사
  dilemma: storyOpeningResult.dilemma,       // 첫 선택지
  chatHistory: [...],                        // 3단계 오프닝 메시지
  context: {
    ...initialState.context,
    protagonistKnowledge: {
      metCharacters: [..., firstCharacterName],      // ✅ 업데이트됨
      informationPieces: [..., firstMeetInfo],       // ✅ 업데이트됨
    },
    actionContext: {
      currentSituation: incitingIncident,            // ★ [Stage 2 개선 #2]
      todayActions: { dialogues: [firstMeet] },      // ★ [Stage 2 개선 #2]
    },
  },
  characterArcs: [
    { moments: [firstEncounterMoment] },             // ★ [Stage 2 개선 #1]
  ],
};
```

### 10.2 Stage 3에서 사용할 데이터

| 데이터 | Stage 3 핸들러 용도 | Stage 2 개선 영향 |
|--------|-------------------|------------------|
| `dilemma` | 첫 선택지 표시 | - |
| `chatHistory` | 메시지 표시 | - |
| `actionContext` | AI 프롬프트 맥락 | #2 currentSituation, todayActions |
| `npcRelationshipStates` | AI가 관계 숨김 유지 | - |
| `protagonistKnowledge` | AI 선택지 생성 범위 제한 | - |
| `characterArcs` | 캐릭터 상태 표시 | #1 첫 만남 moment |

---

## 11. 검증 체크리스트

### 기존 검증 (완료)
- [x] npcRelationshipStates AI 프롬프트 전달 확인
- [x] protagonistKnowledge AI 프롬프트 전달 확인
- [x] 숨겨진 관계 가이드라인 프롬프트 포함 확인
- [x] 주인공 지식 가이드라인 프롬프트 포함 확인
- [x] 오프닝 후 metCharacters 업데이트

### Stage 2 개선 검증 (완료)
- [x] #1 오프닝 후 characterArcs 첫 만남 moment 기록
- [x] #2 actionContext.currentSituation 오프닝 반영
- [x] #2 actionContext.todayActions.dialogues 첫 만남 기록

### 테스트 커버리지
- [x] `tests/unit/story-opening.test.ts` - 17개 테스트 통과
  - 첫 만남 캐릭터 결정 테스트 (3개)
  - characterArcs 첫 만남 moment 테스트 (4개)
  - actionContext 오프닝 반영 테스트 (5개)
  - protagonistKnowledge 업데이트 테스트 (4개)
  - 통합 테스트 (1개)

---

## 12. 코드 참조

| 위치 | 함수/섹션 | 역할 |
|------|----------|------|
| game-ai-client.ts:826-903 | generateStoryOpening() | 3단계 오프닝 생성 |
| game-ai-client.ts:908-914 | hasStoryOpening() | 오프닝 사용 여부 |
| game-ai-client.ts:930-991 | generateInitialDilemma() | 오프닝 or 기존 방식 분기 |
| prompt-builder.ts:588-627 | buildFullPrompt() 내 | 숨겨진 관계/주인공 지식 섹션 |
| prompt-builder.ts:1106-1206+ | buildStoryOpeningPrompt() | 오프닝 전용 프롬프트 |
| GameClient.tsx:1566-1576 | 첫 만남 캐릭터 결정 | order=1 또는 firstCharacterToMeet |
| GameClient.tsx:1571-1589 | protagonistKnowledge 업데이트 | metCharacters, informationPieces |
| GameClient.tsx:1591-1613 | characterArcs 업데이트 | [개선 #1] 첫 만남 moment |
| GameClient.tsx:1615-1632 | actionContext 업데이트 | [개선 #2] currentSituation, todayActions |
