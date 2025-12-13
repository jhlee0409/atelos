# Stage 5: 엔딩 시스템 (Ending System) 상세 분석

## 1. 개요

게임 종료 조건을 판단하고 결말을 생성하는 단계입니다.
두 가지 엔딩 시스템이 공존합니다:

| 시스템 | 트리거 조건 | 생성 방식 |
|--------|------------|----------|
| **레거시 엔딩** | `dynamicEndingConfig.enabled = false` | 스탯 조건 매칭 (deprecated) |
| **동적 엔딩** | `dynamicEndingConfig.enabled = true` | AI가 ActionHistory 기반 생성 (v1.4 권장) |

**핵심 파일**:
- `lib/ending-checker.ts`: 레거시 엔딩 조건 체크 (deprecated)
- `app/api/generate-ending/route.ts`: 동적 엔딩 생성 API
- `app/game/[scenarioId]/GameClient.tsx`: generateDynamicEnding()

**관련 시스템** (★ 2025-12-13):
- 주인공 식별 시스템: characterArcs에서 NPC만 추출하여 엔딩에 반영
- 프롬프트 품질 강화: `lib/prompt-enhancers.ts`로 엔딩 서사 품질 개선

---

## 2. Stage 4에서 받는 데이터

| 데이터 | Stage 4 결과 | Stage 5 용도 |
|--------|-------------|-------------|
| `context.scenarioStats` | 증폭 적용된 스탯 | 레거시 엔딩 조건 체크 |
| `actionHistory` | 전체 행동 기록 (v1.4) | 동적 엔딩 AI 프롬프트 ★ |
| `protagonistKnowledge` | 발견 정보 | 동적 엔딩 AI 프롬프트 ★ |
| `npcRelationshipStates` | 관계 가시성 | 동적 엔딩 AI 프롬프트 ★ |
| `characterArcs` | 캐릭터 발전 | 엔딩 결과 표시 |

---

## 3. 엔딩 체크 흐름

### 3.1 핸들러에서의 엔딩 체크 순서

```
핸들러 완료 후
    │
    ├─→ 1. Dynamic Ending 체크 (우선)
    │       if (dynamicEndingConfig.enabled)
    │           if (currentDay >= endingDay && !dynamicEnding && !isGeneratingEnding)
    │               → generateDynamicEnding()
    │               → return (기존 엔딩 체크 스킵)
    │
    ├─→ 2. 레거시 엔딩 체크
    │       if (canCheckEnding(currentDay, scenario) && !dynamicEndingConfig.enabled)
    │           → checkEndingConditions()
    │
    └─→ 3. 시간제한 엔딩 체크
            if (scenario.endCondition.type === 'time_limit')
                if (currentDay > timeLimit)
                    → ENDING_TIME_UP 또는 DEFAULT_TIME_UP
```

### 3.2 핸들러 일관성 (Stage 3에서 구현)

| 체크 항목 | handlePlayerChoice | handleDialogueSelect | handleExplore |
|---------|-------------------|---------------------|---------------|
| Dynamic Ending 체크 | ✅ | ✅ [Stage 3] | ✅ [Stage 3] |
| 레거시 엔딩 체크 | ✅ | ✅ [Stage 3] | ✅ [Stage 3] |
| 시간제한 엔딩 체크 | ✅ | ✅ [Stage 3] | ✅ [Stage 3] |

---

## 4. 레거시 엔딩 시스템

### 4.1 ending-checker.ts (deprecated)

```typescript
// 엔딩 조건 체크
checkEndingConditions(playerState, endingArchetypes, survivorCount)

// 조건 타입
- required_stat: { statId, comparison, value }
- survivor_count: { comparison, value }
// [v1.4 REMOVED] required_flag - Dynamic Ending System에서 ActionHistory로 대체
```

### 4.2 조건 비교 연산자

| 연산자 | 의미 |
|--------|------|
| `>=` | 이상 |
| `<=` | 이하 |
| `==` | 같음 |
| `>` | 초과 |
| `<` | 미만 |
| `!=` | 다름 |

### 4.3 시간제한 엔딩 폴백

```typescript
// 시간 초과 시 엔딩 결정 우선순위
1. checkEndingConditions() 재시도
2. ENDING_TIME_UP (시나리오 정의)
3. DEFAULT_TIME_UP (하드코딩 폴백)
```

---

## 5. 동적 엔딩 시스템 (SDT 기반)

### 5.1 DynamicEndingConfig

```typescript
interface DynamicEndingConfig {
  enabled: boolean;
  endingDay: number;               // 엔딩 생성 Day
  warningDays: number;             // 경고 표시 시작 Day
  evaluationCriteria: {
    goalWeight: number;            // 목표 달성 가중치
    relationshipWeight: number;    // 관계 품질 가중치
    moralWeight: number;           // 도덕적 일관성 가중치
    narrativeWeight: number;       // 서사적 완결 가중치
  };
  narrativeGuidelines: string;     // 결말 서사 가이드
  endingToneHints: string[];       // 톤 힌트
}
```

### 5.2 generateDynamicEnding() - GameClient.tsx

```typescript
const generateDynamicEnding = async (currentState: SaveState, history: ActionHistoryEntry[]) => {
  // [Stage 5] 주인공 지식 및 NPC 관계 상태 추출
  const discoveredInfo = {
    metCharacters: protagonistKnowledge?.metCharacters || [],
    discoveredRelationships: protagonistKnowledge?.discoveredRelationships || [],
    hintedRelationships: protagonistKnowledge?.hintedRelationships || [],
    informationPieces: protagonistKnowledge?.informationPieces?.map(p => p.content).slice(-20) || [],
    revealedNPCRelations: npcRelationshipStates
      ?.filter(r => r.visibility !== 'hidden')
      .map(r => `${r.relationId}(${r.visibility})`) || [],
  };

  // API 호출
  fetch('/api/generate-ending', {
    body: JSON.stringify({
      scenario, dynamicEndingConfig, actionHistory,
      finalState: { stats, relationships, day },
      discoveredInfo,  // [Stage 5] 추가
    }),
  });
};
```

### 5.3 generate-ending/route.ts API

**시스템 프롬프트 (SDT 기반)**:
- 자율성 (Autonomy): 플레이어 선택이 결말에 반영
- 유능감 (Competence): 노력과 전략이 인정
- 관계성 (Relatedness): 캐릭터 관계가 핵심 요소

**유저 프롬프트 구성**:
```
<scenario_context>           시나리오 정보
<characters>                 캐릭터 정보
<player_behavior_analysis>   행동 통계, 도덕적 패턴, 캐릭터 상호작용
<action_history>             전체 행동 기록
<final_state>                최종 스탯/관계
<evaluation_weights>         평가 가중치
<narrative_guidelines>       서사 가이드라인
<ending_tone_hints>          톤 힌트
<discovered_knowledge>       [Stage 5] 발견된 정보 ★
```

### 5.4 [Stage 5] discovered_knowledge 섹션

```
<discovered_knowledge>
## [Stage 5] 플레이어가 발견한 정보

### 만난 캐릭터
박준경, 한서아, ...

### 알게 된 NPC 관계
- 직접 발견: 박준경-한서아
- 힌트 얻음: 이재현-김도윤
- 공개된 관계: 한서아-이재현(revealed)

### 획득한 정보 조각 (최근 20개)
1. 박준경에게서 들은 이야기: ...
2. 저장고 탐색에서 발견: ...
...

**참고**: 위 정보는 플레이어가 직접 발견한 것입니다.
결말에서 이 정보를 활용하여 플레이어의 탐색과 대화 노력을 보상해주세요.
</discovered_knowledge>
```

---

## 6. 엔딩 결과 구조

### 6.1 DynamicEndingResult

```typescript
interface DynamicEndingResult {
  title: string;                 // 결말 제목
  narrative: string;             // 결말 서사 (500-1000자)
  goalAchievement: GoalAchievementLevel; // 목표 달성도
  goalExplanation: string;       // 달성 설명
  characterFates: Array<{
    name: string;
    finalRelationship: number;
    fate: string;
    finalScene?: string;
    relationshipJourney?: string;
  }>;
  playerLegacy: string;          // 플레이어 유산
  epilogue?: string;             // 에필로그
  sdtScores: {
    autonomy: number;            // 자율성 점수
    competence: number;          // 유능감 점수
    relatedness: number;         // 관계성 점수
  };
  reasoning: string;             // 내부 분석
}
```

### 6.2 GoalAchievementLevel

| 레벨 | 의미 |
|------|------|
| `triumph` | 완벽한 성공 |
| `success` | 성공 |
| `partial` | 부분 성공 |
| `pyrrhic` | 피로스의 승리 |
| `failure` | 실패 |
| `subverted` | 전복 |
| `tragic` | 비극 |

---

## 7. 데이터 흐름 (전체 Stage 연계)

```
Stage 1: 초기화
    │
    └─→ protagonistKnowledge 초기화 (metCharacters)
    └─→ npcRelationshipStates 초기화 (visibility: hidden)
            │
Stage 2: 오프닝
    │
    └─→ 첫 캐릭터 만남 서사
            │
Stage 3: 메인 루프
    │
    ├─→ actionHistory 누적
    ├─→ protagonistKnowledge.informationPieces 추가
    └─→ 매 행동 후 엔딩 체크
            │
Stage 4: AI 응답 처리
    │
    ├─→ metCharacters 자동 추가
    ├─→ npcRelationshipStates.visibility 업데이트
    └─→ hintedRelationships 추가
            │
Stage 5: 엔딩
    │
    ├─→ discoveredInfo 추출
    │       ├─→ metCharacters
    │       ├─→ discoveredRelationships
    │       ├─→ hintedRelationships
    │       ├─→ informationPieces (최근 20개)
    │       └─→ revealedNPCRelations
    │
    └─→ AI 엔딩 생성 → DynamicEndingResult
```

---

## 8. 구현된 개선사항

### 8.1 커밋 76371dd (초기)

| 항목 | 이전 상태 | Stage 5 구현 |
|------|----------|-------------|
| discoveredInfo API 전달 | 없음 | protagonistKnowledge + npcRelationshipStates 요약 |
| generate-ending 프롬프트 | 행동 히스토리만 | discovered_knowledge 섹션 추가 |
| 엔딩에서 발견 정보 활용 | 없음 | AI가 플레이어 탐색/대화 노력 보상 |

### 8.2 Stage 5 개선 (현재)

| 개선 | 설명 | 위치 |
|------|------|------|
| **#1** characterArcs 추출 | characterArcs에서 trustLevel, moments, currentMood 추출 | GameClient.tsx:1425-1433 |
| **#1** characterArcs API 전달 | 동적 엔딩 API에 characterArcs 요약 전달 | GameClient.tsx:1457 |
| **#1** character_arcs 프롬프트 섹션 | 캐릭터별 발전 기록을 AI 프롬프트에 포함 | generate-ending/route.ts:352-369 |

**테스트**: `tests/unit/dynamic-ending.test.ts` 11개 테스트 추가

---

## 9. 추가 개선 필요사항

### 9.1 잠재적 이슈

| 이슈 | 현재 상태 | 개선 제안 |
|------|----------|----------|
| informationPieces 중복 | 동일 정보 여러 번 추가 가능 | ID 기반 중복 제거 |
| ~~discoveredRelationships 미사용~~ | ✅ **해결됨** - Stage 4 개선 #2 | - |
| 레거시 엔딩과 동적 엔딩 혼용 | 조건 분기만 | 마이그레이션 가이드 필요 |
| ~~characterFates와 characterArcs 연동~~ | ✅ **해결됨** - Stage 5 개선 #1 | - |

### 9.2 엔딩 품질 개선 고려사항

1. ~~**캐릭터 아크 반영**: characterArcs의 moments, trustLevel을 엔딩 프롬프트에 포함~~ → ✅ **해결됨** - Stage 5 개선 #1
2. **관계 발견 보상 강화**: hinted → revealed 전환이 엔딩에서 드라마틱하게 표현
3. **정보 조각 연결**: informationPieces가 엔딩에서 "복선 회수"로 활용

---

## 10. 검증 체크리스트

- [x] 3개 핸들러 Dynamic Ending 체크 일관성 확인
- [x] 3개 핸들러 레거시 엔딩 체크 일관성 확인
- [x] generateDynamicEnding에서 discoveredInfo 추출 확인
- [x] generate-ending API에서 discoveredInfo 수신 확인
- [x] 프롬프트에 discovered_knowledge 섹션 포함 확인
- [x] **[Stage 5 개선 #1]** characterArcs 데이터 추출 (trustLevel, moments, currentMood)
- [x] **[Stage 5 개선 #1]** characterArcs API 전달
- [x] **[Stage 5 개선 #1]** 프롬프트에 character_arcs 섹션 포함
- [ ] informationPieces 중복 제거 (향후 개선)

---

## 11. 코드 참조

| 위치 | 함수/섹션 | 역할 |
|------|----------|------|
| GameClient.tsx:1394-1472 | generateDynamicEnding() | 동적 엔딩 생성 요청 |
| GameClient.tsx:1425-1433 | characterArcs 추출 | [Stage 5 개선 #1] characterArcs 요약 생성 |
| GameClient.tsx:2020-2025 | handlePlayerChoice 엔딩 체크 | 레거시/동적 엔딩 분기 |
| ending-checker.ts:29-85 | checkEndingConditions() | 레거시 엔딩 조건 체크 |
| generate-ending/route.ts:91-181 | SDT_SYSTEM_PROMPT | SDT 기반 시스템 프롬프트 |
| generate-ending/route.ts:187-370 | buildUserPrompt() | 유저 프롬프트 생성 |
| generate-ending/route.ts:335-350 | discovered_knowledge 섹션 | [Stage 5] 발견 정보 |
| generate-ending/route.ts:352-369 | character_arcs 섹션 | [Stage 5 개선 #1] 캐릭터 아크 정보 |
