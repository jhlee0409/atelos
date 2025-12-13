# Stage 2: 스토리 오프닝 (Story Opening) 상세 분석

## 1. 개요

게임 시작 시 플레이어에게 첫 번째 서사를 제공하는 단계입니다.
3단계 구조 (프롤로그 → 사건 발생 → 첫 만남)로 게임을 시작합니다.

**핵심 파일**:
- `lib/game-ai-client.ts`: generateStoryOpening(), generateInitialDilemma()
- `lib/prompt-builder.ts`: buildStoryOpeningPrompt()

---

## 2. Stage 1에서 받는 데이터

| 데이터 | 출처 | 용도 |
|--------|------|------|
| `protagonistKnowledge.metCharacters` | createInitialSaveState | 첫 만남 대상 결정 |
| `npcRelationshipStates` | createInitialSaveState | AI에게 숨겨야 할 관계 |
| `community.survivors` | createInitialSaveState | 오프닝 등장 캐릭터 |
| `actionContext.currentLocation` | createInitialContext | 오프닝 장소 |
| `characterArcs` | createInitialSaveState | 캐릭터 초기 mood |

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

### 4.3 [Stage 2] 구현된 숨겨진 관계 가이드라인

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

### 4.4 [Stage 2] 구현된 주인공 지식 가이드라인

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
    flags_acquired: [],
  },
};
```

---

## 6. 데이터 흐름 (Stage 1 → Stage 2)

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
```

---

## 7. 구현된 개선사항 (커밋 60ae7eb)

| 항목 | 구현 내용 |
|------|----------|
| npcRelationshipStates AI 전달 | prompt-builder.ts에 옵션 추가 |
| protagonistKnowledge AI 전달 | prompt-builder.ts에 옵션 추가 |
| 숨겨진 관계 가이드라인 | AI가 관계 노출 레벨에 따라 서술 제한 |
| 주인공 지식 가이드라인 | AI가 알려진 정보 범위 내에서만 서술 |

---

## 8. 추가 개선 필요사항

### 8.1 잠재적 이슈

| 이슈 | 현재 상태 | 개선 제안 |
|------|----------|----------|
| 오프닝에서 protagonistKnowledge 업데이트 없음 | fullLog만 반환 | 첫 만남 캐릭터를 metCharacters에 추가 필요 |
| characterArcs 오프닝 반영 없음 | 초기화 후 변경 없음 | 첫 만남 moment 기록 고려 |
| storyOpening 폴백 품질 | 시나리오 데이터 기반 단순 텍스트 | 폴백 서사 품질 향상 |
| 오프닝 중 스탯 변화 미지원 | statChanges 항상 비어있음 | 선택적 오프닝 스탯 변화 지원 고려 |

### 8.2 Stage 3 전달 시 누락 가능 데이터

1. **오프닝에서 만난 캐릭터**: metCharacters 업데이트 안됨
   - `firstEncounter`에 등장한 캐릭터가 metCharacters에 없을 수 있음

2. **첫 만남 컨텍스트**: actionContext 업데이트 안됨
   - `characterPresences`가 오프닝 반영 안됨

---

## 9. Stage 3로 전달되는 데이터

### 9.1 오프닝 완료 후 SaveState 상태

```typescript
// GameClient에서 오프닝 후 상태 업데이트
saveState = {
  ...initialState,
  log: storyOpeningResult.fullLog,           // 오프닝 서사
  dilemma: storyOpeningResult.dilemma,       // 첫 선택지
  chatHistory: [
    { type: 'ai', content: fullLog, timestamp },  // 오프닝 채팅 기록
  ],
  // 아래 필드들은 Stage 1 초기화 그대로 유지됨:
  // - protagonistKnowledge (업데이트 안됨 - 개선 필요)
  // - npcRelationshipStates (visibility 그대로)
  // - characterArcs (초기 상태 그대로)
};
```

### 9.2 Stage 3에서 사용할 데이터

| 데이터 | Stage 3 핸들러 용도 |
|--------|-------------------|
| `dilemma` | 첫 선택지 표시 |
| `chatHistory` | 메시지 표시 |
| `actionContext` | AI 프롬프트 맥락 (미변경) |
| `npcRelationshipStates` | AI가 관계 숨김 유지 |
| `protagonistKnowledge` | AI 선택지 생성 범위 제한 |

---

## 10. 검증 체크리스트

- [x] npcRelationshipStates AI 프롬프트 전달 확인
- [x] protagonistKnowledge AI 프롬프트 전달 확인
- [x] 숨겨진 관계 가이드라인 프롬프트 포함 확인
- [x] 주인공 지식 가이드라인 프롬프트 포함 확인
- [ ] 오프닝 후 metCharacters 업데이트 (개선 필요)
- [ ] 오프닝 후 characterArcs 첫 만남 기록 (개선 필요)
- [ ] actionContext 오프닝 반영 (향후 개선)

---

## 11. 코드 참조

| 위치 | 함수/섹션 | 역할 |
|------|----------|------|
| game-ai-client.ts:826-903 | generateStoryOpening() | 3단계 오프닝 생성 |
| game-ai-client.ts:908-914 | hasStoryOpening() | 오프닝 사용 여부 |
| game-ai-client.ts:930-991 | generateInitialDilemma() | 오프닝 or 기존 방식 분기 |
| prompt-builder.ts:588-627 | buildFullPrompt() 내 | 숨겨진 관계/주인공 지식 섹션 |
| prompt-builder.ts:1106-1206+ | buildStoryOpeningPrompt() | 오프닝 전용 프롬프트 |
