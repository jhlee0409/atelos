# Dynamic Ending System (동적 결말 시스템) 설계 문서

> **Version**: 1.0.0
> **Created**: 2025-12-11
> **Status**: Implementation In Progress

## 1. 시스템 개요

### 1.1 문제 정의

기존 ATELOS 엔딩 시스템의 한계:
- 사전 정의된 `EndingArchetype[]`로 인한 예측 가능성
- `systemConditions` 조합 폭발 (스탯 × 플래그 × 관계)
- 밸런싱 난이도 (특정 루트만 도달 가능/불가능)
- 창작자의 모든 가능성 예측 부담

### 1.2 해결 방안

**Goal-Driven Dynamic Ending System**:
- 플레이어 행동 기록(ActionHistory) 수집
- 설정된 일수(endingDay) 도달 시 AI가 동적 결말 생성
- SDT(자기결정이론) 기반 만족스러운 결말 보장

### 1.3 핵심 원칙

| 원칙 | 설명 | 구현 방법 |
|------|------|----------|
| **자율성(Autonomy)** | 플레이어 선택이 결말에 반영됨을 체감 | ActionHistory 분석 → 결말 반영 |
| **유능감(Competence)** | 달성감, 성장 경험 제공 | 목표 달성도 명시적 평가 |
| **관계성(Relatedness)** | 캐릭터와의 관계가 결말에 영향 | 관계 변화 추적 → 캐릭터 운명 반영 |

---

## 2. 아키텍처

### 2.1 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                        게임 진행 중                              │
├─────────────────────────────────────────────────────────────────┤
│  Day 1 → Day 2 → Day 3 → ... → Day (endingDay - warningDays)   │
│                                       ↓                         │
│                              "결말이 다가옵니다" 경고            │
│                                       ↓                         │
│                              Day endingDay                      │
│                                       ↓                         │
│                         ┌─────────────────────┐                 │
│                         │   ActionHistory     │                 │
│                         │   분석 및 종합      │                 │
│                         └──────────┬──────────┘                 │
│                                    ↓                            │
│                         ┌─────────────────────┐                 │
│                         │  AI 동적 결말 생성  │                 │
│                         │  (SDT 기반 평가)    │                 │
│                         └──────────┬──────────┘                 │
│                                    ↓                            │
│                         ┌─────────────────────┐                 │
│                         │  DynamicEndingResult │                │
│                         │  - 제목, 내러티브   │                 │
│                         │  - 목표 달성도      │                 │
│                         │  - 캐릭터 운명      │                 │
│                         │  - 플레이어 유산    │                 │
│                         └─────────────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 ScenarioData 변경

**제거 대상:**
```typescript
// ❌ 제거
endingArchetypes: EndingArchetype[];
flagDictionary: FlagData[];  // → 단순화 (선택적 유지)
emergentNarrative: EmergentNarrativeConfig;  // → 동적 시스템으로 대체
```

**추가 대상:**
```typescript
// ✅ 추가
dynamicEndingConfig: DynamicEndingConfig;
```

### 2.3 SaveState 확장

```typescript
interface SaveState {
  // 기존 필드 유지
  stats: Record<string, number>;
  relationships: Record<string, number>;
  // ...

  // ✅ 새로 추가
  actionHistory: ActionHistoryEntry[];
  endingTriggered?: boolean;
  dynamicEnding?: DynamicEndingResult;
}
```

---

## 3. 타입 정의

### 3.1 ActionHistoryEntry

```typescript
export interface ActionHistoryEntry {
  /** 행동이 발생한 일차 */
  day: number;

  /** ISO 타임스탬프 */
  timestamp: string;

  /** 행동 유형 */
  actionType: 'choice' | 'dialogue' | 'exploration' | 'freeText';

  /** 플레이어가 선택/입력한 내용 */
  content: string;

  /** 대상 (캐릭터명 또는 장소명) */
  target?: string;

  /** 행동의 결과 */
  consequence: {
    /** 변경된 스탯들 */
    statsChanged: { statId: string; delta: number; newValue: number }[];

    /** 변경된 관계들 */
    relationshipsChanged: { character: string; delta: number; newValue: number }[];

    /** 발생한 주요 이벤트/발견 */
    significantEvents: string[];
  };

  /** AI가 생성한 내러티브 요약 (200자 이내) */
  narrativeSummary: string;

  /** 행동의 도덕적 성격 (AI 평가) */
  moralAlignment?: 'selfless' | 'pragmatic' | 'selfish' | 'neutral';
}
```

### 3.2 DynamicEndingConfig

```typescript
export interface DynamicEndingConfig {
  /** 동적 엔딩 시스템 활성화 여부 */
  enabled: boolean;

  /** 결말 트리거 일차 (예: 7, 10, 14) */
  endingDay: number;

  /** 경고 시작 일수 (endingDay - warningDays부터 경고) */
  warningDays: number;

  /** 목표 유형 */
  goalType: 'manual' | 'ai-assisted';

  /**
   * AI 결말 생성 시 평가 기준
   * SDT 이론 기반: autonomy, competence, relatedness
   */
  evaluationCriteria: {
    /** 목표 달성도 평가 가중치 (0-1) */
    goalWeight: number;

    /** 관계 품질 평가 가중치 (0-1) */
    relationshipWeight: number;

    /** 도덕적 일관성 평가 가중치 (0-1) */
    moralWeight: number;

    /** 서사적 완결성 평가 가중치 (0-1) */
    narrativeWeight: number;
  };

  /** AI 결말 생성 가이드라인 */
  narrativeGuidelines: string;

  /** 장르별 결말 톤 (AI 참고용) */
  endingToneHints: string[];
}
```

### 3.3 DynamicEndingResult

```typescript
export type GoalAchievementLevel =
  | 'triumph'      // 완벽한 성공
  | 'success'      // 성공
  | 'partial'      // 부분 성공
  | 'pyrrhic'      // 피로스의 승리 (대가를 치른 성공)
  | 'failure'      // 실패
  | 'subverted'    // 예상과 다른 결과 (but meaningful)
  | 'tragic';      // 비극적 결말

export interface CharacterFate {
  /** 캐릭터 이름 */
  name: string;

  /** 최종 관계 수치 */
  finalRelationship: number;

  /** 캐릭터의 운명 */
  fate: string;

  /** 플레이어와의 마지막 장면 */
  finalScene?: string;
}

export interface DynamicEndingResult {
  /** 결말 제목 */
  title: string;

  /** 결말 내러티브 (500-1000자) */
  narrative: string;

  /** 목표 달성도 */
  goalAchievement: GoalAchievementLevel;

  /** 목표 달성 설명 */
  goalExplanation: string;

  /** 각 캐릭터의 운명 */
  characterFates: CharacterFate[];

  /** 플레이어의 유산/영향 */
  playerLegacy: string;

  /** 에필로그 (선택적) */
  epilogue?: string;

  /** SDT 만족도 점수 (AI 내부 평가용) */
  sdtScores: {
    autonomy: number;      // 0-100: 플레이어 선택 반영도
    competence: number;    // 0-100: 성취감/유능감
    relatedness: number;   // 0-100: 관계적 만족도
  };

  /** 결말 생성 근거 (디버깅용) */
  reasoning: string;
}
```

---

## 4. SDT 기반 프롬프트 설계

### 4.1 시스템 프롬프트 (세계 최고 수준)

```
<role>
당신은 인터랙티브 내러티브 게임의 결말을 생성하는 마스터 스토리텔러입니다.
Self-Determination Theory(자기결정이론)에 기반하여 플레이어에게
심리적으로 만족스러운 결말을 제공합니다.
</role>

<sdt_framework>
## 자기결정이론(SDT) 핵심 원칙

### 1. 자율성 (Autonomy) - 가장 중요
- 플레이어의 모든 선택이 결말에 의미있게 반영되어야 합니다
- "내 선택이 이 결과를 만들었다"는 인과관계가 명확해야 합니다
- 결말은 플레이어 행동 패턴의 자연스러운 귀결이어야 합니다

### 2. 유능감 (Competence)
- 플레이어의 노력과 전략이 인정받아야 합니다
- 실패하더라도 "무엇을 배웠는지" 명확해야 합니다
- 목표 달성도가 구체적으로 설명되어야 합니다

### 3. 관계성 (Relatedness)
- 캐릭터들과의 관계가 결말의 핵심 요소여야 합니다
- 각 캐릭터의 운명이 플레이어와의 관계에 따라 결정됩니다
- 의미있는 이별, 재회, 또는 관계의 변화가 묘사되어야 합니다
</sdt_framework>

<ending_quality_standards>
## 결말 품질 기준

### 필수 요소
1. **인과적 명확성**: 결말의 모든 요소가 플레이어 행동에서 도출
2. **감정적 해소**: 긴장의 해소와 카타르시스 제공
3. **서사적 완결**: 열린 스레드의 자연스러운 마무리
4. **캐릭터 정의**: 각 캐릭터의 명확한 결말

### 금지 사항 (CRITICAL)
1. ❌ 플레이어 행동과 무관한 임의의 결말
2. ❌ 설명 없는 급작스러운 전개
3. ❌ 캐릭터의 갑작스러운 성격 변화
4. ❌ "그냥 그렇게 되었다" 식의 모호한 결말
5. ❌ 플레이어를 혼란스럽게 하는 열린 결말
6. ❌ 의문을 남기는 미해결 요소
</ending_quality_standards>

<narrative_techniques>
## 고급 서사 기법

### 결말 유형별 접근
- **승리/성공**: 성취를 축하하되, 여정의 의미도 강조
- **실패**: 교훈과 의미를 부여, 비극적 아름다움
- **피로스의 승리**: 대가의 무게와 가치의 충돌
- **전복**: 예상과 다르지만 돌아보면 필연적인 결말

### 톤 관리
- 장르에 맞는 결말 톤 유지
- 감정의 적절한 클라이맥스와 해소
- 여운을 남기되 혼란을 주지 않는 마무리
</narrative_techniques>
```

### 4.2 유저 프롬프트 템플릿

```
<request>
다음 플레이어의 게임 기록을 분석하고, SDT 원칙에 기반한
만족스러운 결말을 생성해주세요.
</request>

<scenario_context>
제목: ${title}
시놉시스: ${synopsis}
장르: ${genre.join(', ')}
플레이어 목표: ${playerGoal}
총 플레이 일수: ${endingDay}
</scenario_context>

<characters>
${characters.map(c => `- ${c.characterName} (${c.roleName}): ${c.backstory}`).join('\n')}
</characters>

<action_history>
${actionHistory.map(a => `
[Day ${a.day}] ${a.actionType}: ${a.content}
- 대상: ${a.target || '없음'}
- 스탯 변화: ${a.consequence.statsChanged.map(s => `${s.statId} ${s.delta > 0 ? '+' : ''}${s.delta}`).join(', ') || '없음'}
- 관계 변화: ${a.consequence.relationshipsChanged.map(r => `${r.character} ${r.delta > 0 ? '+' : ''}${r.delta}`).join(', ') || '없음'}
- 주요 이벤트: ${a.consequence.significantEvents.join(', ') || '없음'}
- 요약: ${a.narrativeSummary}
- 도덕적 성격: ${a.moralAlignment || '미평가'}
`).join('\n')}
</action_history>

<final_state>
최종 스탯:
${Object.entries(finalStats).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

최종 관계:
${Object.entries(finalRelationships).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
</final_state>

<evaluation_weights>
목표 달성: ${evaluationCriteria.goalWeight * 100}%
관계 품질: ${evaluationCriteria.relationshipWeight * 100}%
도덕적 일관성: ${evaluationCriteria.moralWeight * 100}%
서사적 완결: ${evaluationCriteria.narrativeWeight * 100}%
</evaluation_weights>

<narrative_guidelines>
${narrativeGuidelines}
</narrative_guidelines>

<critical_requirements>
1. 결말은 반드시 플레이어 행동의 자연스러운 결과여야 합니다
2. 각 캐릭터의 운명은 플레이어와의 관계도에 따라 결정됩니다
3. 목표 달성도는 실제 행동 기록을 기반으로 정확히 평가합니다
4. 플레이어에게 의문이나 혼란을 주는 요소를 절대 포함하지 마세요
5. 모든 주요 스레드가 해결되어야 합니다
6. 한국어로 작성하세요
</critical_requirements>
```

---

## 5. API 명세

### 5.1 엔딩 생성 API

**Endpoint**: `POST /api/generate-ending`

**Request Body**:
```typescript
interface GenerateEndingRequest {
  scenarioId: string;
  scenario: {
    title: string;
    synopsis: string;
    genre: string[];
    playerGoal: string;
    characters: CharacterData[];
  };
  dynamicEndingConfig: DynamicEndingConfig;
  actionHistory: ActionHistoryEntry[];
  finalState: {
    stats: Record<string, number>;
    relationships: Record<string, number>;
    day: number;
  };
}
```

**Response Body**:
```typescript
interface GenerateEndingResponse {
  success: boolean;
  ending?: DynamicEndingResult;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}
```

---

## 6. 구현 체크리스트

### Phase 1: 타입 및 기반 (Day 1)
- [ ] `types/index.ts`에 새 타입 추가
  - [ ] `ActionHistoryEntry`
  - [ ] `DynamicEndingConfig`
  - [ ] `DynamicEndingResult`
  - [ ] `CharacterFate`
  - [ ] `GoalAchievementLevel`
- [ ] `ScenarioData` 타입 확장

### Phase 2: ActionHistory 수집 (Day 2)
- [ ] `GameClient.tsx` 수정
  - [ ] `actionHistory` 상태 추가
  - [ ] `handlePlayerChoice`에 기록 로직
  - [ ] `handleDialogueSelect`에 기록 로직
  - [ ] `handleExplore`에 기록 로직
  - [ ] `handleFreeTextSubmit`에 기록 로직
- [ ] AI 응답에서 `narrativeSummary` 추출

### Phase 3: 엔딩 생성 API (Day 3)
- [ ] `app/api/generate-ending/route.ts` 생성
  - [ ] SDT 기반 시스템 프롬프트
  - [ ] JSON 스키마 정의
  - [ ] Gemini API 호출
  - [ ] 응답 검증

### Phase 4: Admin UI (Day 4)
- [ ] `DynamicEndingConfigContent.tsx` 생성
  - [ ] enabled 토글
  - [ ] endingDay 설정
  - [ ] warningDays 설정
  - [ ] evaluationCriteria 가중치 설정
  - [ ] narrativeGuidelines 입력
- [ ] `ScenarioEditor` 통합

### Phase 5: 엔딩 표시 (Day 5)
- [ ] `GameClient/DynamicEndingDisplay.tsx` 생성
  - [ ] 결말 제목 및 내러티브
  - [ ] 목표 달성도 시각화
  - [ ] 캐릭터 운명 표시
  - [ ] SDT 점수 (디버그 모드)
- [ ] 엔딩 트리거 로직 통합

### Phase 6: ScenarioWizard 통합 (Day 6)
- [ ] 기존 엔딩 관련 제거
- [ ] DynamicEndingConfig 기본값 설정
- [ ] 목표 AI 보조 생성 옵션

### Phase 7: 테스트 및 검증 (Day 7)
- [ ] 빌드 검증
- [ ] 타입 검증
- [ ] 엔딩 생성 품질 테스트
- [ ] SDT 만족도 평가

---

## 7. 마이그레이션 가이드

### 7.1 기존 시나리오 변환

```typescript
function migrateScenario(oldScenario: OldScenarioData): NewScenarioData {
  return {
    ...oldScenario,

    // 기존 엔딩 참조용으로만 유지
    legacyEndingArchetypes: oldScenario.endingArchetypes,

    // 새 동적 엔딩 설정
    dynamicEndingConfig: {
      enabled: true,
      endingDay: oldScenario.endCondition?.days || 7,
      warningDays: 2,
      goalType: 'manual',
      evaluationCriteria: {
        goalWeight: 0.3,
        relationshipWeight: 0.3,
        moralWeight: 0.2,
        narrativeWeight: 0.2,
      },
      narrativeGuidelines: generateGuidelinesFromArchetypes(
        oldScenario.endingArchetypes
      ),
      endingToneHints: oldScenario.genre,
    },
  };
}
```

---

## 8. 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0.0 | 2025-12-11 | 초기 설계 문서 작성 |
