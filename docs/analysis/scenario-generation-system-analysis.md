# 시나리오 생성 시스템 분석 보고서

> 작성일: 2025-12-12
> 목적: 추후 플로우 단계별 상세 분석 및 고도화를 위한 1차 분석
>
> ⚠️ **v1.4 업데이트 노트**: `flagDictionary` 생성 카테고리는 deprecated됨.
> Dynamic Ending System에서 `ActionHistory`로 플래그 추적이 대체됨.

---

## 1. 시스템 개요

### 1.1 아키텍처 요약

ATELOS의 시나리오 생성 시스템은 **AI 기반 다단계 워크플로우**로, 사용자의 아이디어를 완전한 인터랙티브 내러티브 게임 시나리오로 변환합니다.

```
사용자 아이디어 → 6단계 위저드 → 15개 AI 생성 카테고리 → ScenarioData → Firestore
```

### 1.2 핵심 구성 요소

| 구성 요소 | 파일 경로 | 역할 |
|-----------|-----------|------|
| 위저드 페이지 | `app/admin/new/page.tsx` | 진입점, 인증, 라우팅 |
| 위저드 컴포넌트 | `components/admin/ScenarioWizard.tsx` | 6단계 UI, 상태 관리 |
| AI 생성기 | `components/admin/AIScenarioGenerator.tsx` | 개별 카테고리 생성 UI |
| 메인 API | `app/api/admin/ai-generate/route.ts` | 15개 카테고리 처리 |
| 시놉시스 API | `app/api/admin/ai-generate/synopsis/route.ts` | 시놉시스 전용 생성 |
| 클라이언트 | `lib/ai-scenario-generator.ts` | API 호출 래퍼 |
| 타입 정의 | `types/index.ts` | ScenarioData 구조 |

### 1.3 AI 모델 설정

- **모델**: `gemini-2.5-flash-lite`
- **응답 형식**: `application/json` (스키마 강제)
- **온도**: 카테고리별 0.3~0.9 (구조적 vs 창의적)
- **토큰 제한**: 카테고리별 1000~4000

---

## 2. 6단계 위저드 플로우

### 2.1 플로우 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                    ScenarioWizard 6단계                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: 아이디어 (初)                                           │
│  ├── 입력: 자유 텍스트 아이디어                                    │
│  ├── 선택: 톤 (12종), 길이 (short/medium/long)                   │
│  └── 생성: idea_suggestions → 아이디어 제안                       │
│                        ↓                                        │
│  Step 2: 시놉시스 (概要)                                         │
│  ├── 입력: 선택된 아이디어 + 톤 + 세팅                            │
│  └── 생성: synopsis API → title, scenarioId, synopsis, genre    │
│                        ↓                                        │
│  Step 3: 캐릭터 (キャラクター)                                    │
│  ├── 생성 (병렬):                                                │
│  │   ├── characters → 2-4 캐릭터                                │
│  │   ├── relationships → 관계 매트릭스                           │
│  │   └── traits → 버프/디버프 특성                               │
│  └── 표시: 캐릭터 카드 + 관계도                                   │
│                        ↓                                        │
│  Step 4: 시스템 (システム)                                       │
│  ├── 생성 (병렬):                                                │
│  │   ├── stats → 4-6 스탯                                       │
│  │   └── locations → 탐험 장소 [DEPRECATED]                     │
│  └── 표시: 스탯 목록 + 초기값                                     │
│                        ↓                                        │
│  Step 5: 스토리 오프닝 (オープニング)                             │
│  ├── 생성 (병렬 6개):                                            │
│  │   ├── story_opening → 3단계 오프닝                            │
│  │   ├── character_introductions → 캐릭터 등장 순서              │
│  │   ├── hidden_relationships → 숨겨진 NPC 관계                 │
│  │   ├── character_revelations → 신뢰도 기반 정보 공개           │
│  │   ├── gameplay_config → 게임플레이 설정                       │
│  │   └── emergent_narrative → 동적 스토리 트리거                 │
│  └── 표시: 각 구성 요소 요약                                      │
│                        ↓                                        │
│  Step 6: 완료 (完了)                                             │
│  ├── 표시: 통계 요약                                             │
│  └── 액션: "시나리오에 적용" → createScenario()                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 단계별 상세

#### Step 1: 아이디어 (初)

**입력 요소:**
- 자유 텍스트 아이디어 (필수 아님)
- 톤 선택: dramatic, dark, hopeful, thriller, comedic, mysterious, romantic, action, melancholic, satirical, epic, intimate
- 길이 선택: short (100-200자), medium (200-400자), long (400-600자)
- 세팅 (선택적)

**AI 생성:**
- 카테고리: `idea_suggestions`
- 온도: 0.9 (매우 창의적)
- 빈 입력 허용 (아이디어가 없어도 제안 생성)

#### Step 2: 시놉시스 (概要)

**전용 API 사용:** `/api/admin/ai-generate/synopsis`

**출력 구조:**
```typescript
{
  title: string,                    // 20자 내외 한국어 제목
  scenarioId: string,               // UPPERCASE_WITH_UNDERSCORES
  synopsis: string,                 // 200-600자 (길이에 따라)
  playerGoal: string,               // 100자 이내 목표
  genre: string[],                  // 3-5개 장르 태그
  coreKeywords: string[],           // #으로 시작하는 5-7개 키워드
  setting: {
    time: string,
    place: string,
    atmosphere: string
  },
  suggestedThemes: string[],        // 제안 테마
  conflictType: string,             // 핵심 갈등 유형
  narrativeHooks: string[],         // 서사 훅
  targetDays: number                // 게임 일수 (길이에서 추론)
}
```

#### Step 3: 캐릭터 (キャラクター)

**병렬 생성 3개:**

1. **characters** (온도: 0.75)
   - 컨텍스트: genre, title, synopsis
   - 출력: 2-4 캐릭터 (roleId, characterName, backstory, suggestedTraits)

2. **relationships** (온도: 0.5)
   - 컨텍스트: existingCharacters
   - 출력: 양방향 관계 매트릭스 (-100 ~ +100)

3. **traits** (온도: 0.5)
   - 컨텍스트: characters, scenario
   - 출력: buffs[], debuffs[] 특성 풀

#### Step 4: 시스템 (システム)

**병렬 생성 2개:**

1. **stats** (온도: 0.3)
   - 컨텍스트: genre, scenario
   - 출력: 4-6 스탯 (id, name, min, max, initialValue, polarity)

2. **locations** [DEPRECATED]
   - 현재 동적 위치 시스템으로 대체됨
   - 레거시 호환성을 위해 유지

#### Step 5: 스토리 오프닝 (オープニング)

**병렬 생성 6개:**

| 카테고리 | 온도 | 핵심 출력 |
|----------|------|-----------|
| story_opening | 0.75 | prologue, incitingIncident, firstEncounter |
| character_introductions | 0.65 | 캐릭터별 등장 순서와 첫인상 |
| hidden_relationships | 0.6 | NPC 간 숨겨진 관계 2-4개 |
| character_revelations | 0.65 | 신뢰도 기반 정보 공개 레이어 |
| gameplay_config | 0.4 | 게임 밸런스 설정값 |
| emergent_narrative | 0.7 | 동적 스토리 트리거 3-6개 |

#### Step 6: 완료 (完了)

**최종 조립:**
```typescript
const scenario: Partial<ScenarioData> = {
  // Step 2에서
  scenarioId, title, synopsis, playerGoal, genre, coreKeywords,

  // Step 3에서
  characters, initialRelationships, traitPool,

  // Step 4에서
  scenarioStats, locations,

  // Step 5에서
  storyOpening, gameplayConfig,

  // 자동 설정
  posterImageUrl: '',
  status: 'in_progress',
  dynamicEndingConfig: {
    enabled: true,
    endingDay: targetDays || 7,
    warningDays: 2,
    goalType: 'manual',
    evaluationCriteria: {...},
    narrativeGuidelines: '',
    endingToneHints: [...]
  }
};
```

---

## 3. 15개 AI 생성 카테고리 상세

### 3.1 카테고리 매트릭스

| # | 카테고리 | 온도 | 토큰 | 빈 입력 | 컨텍스트 의존성 |
|---|----------|------|------|---------|-----------------|
| 1 | scenario_overview | 0.8 | 2000 | ✗ | 없음 |
| 2 | characters | 0.75 | 4000 | ✗ | genre, title, synopsis |
| 3 | relationships | 0.5 | 3000 | ✗ | existingCharacters |
| 4 | stats | 0.3 | 2000 | ✗ | genre, scenario |
| 5 | endings | 0.6 | 4000 | ✗ | **existingStats (CRITICAL)** |
| 6 | traits | 0.5 | 3000 | ✗ | characters, scenario |
| 7 | keywords | 0.6 | 1000 | ✗ | scenario |
| 8 | genre | 0.4 | 1000 | ✗ | scenario |
| 9 | idea_suggestions | 0.9 | 2000 | ✓ | 없음 |
| 10 | story_opening | 0.75 | 3000 | ✗ | characters, scenario |
| 11 | character_introductions | 0.65 | 3000 | ✗ | existingCharacters |
| 12 | hidden_relationships | 0.6 | 4000 | ✗ | existingCharacters |
| 13 | character_revelations | 0.65 | 4000 | ✗ | existingCharacters |
| 14 | gameplay_config | 0.4 | 3000 | ✓ | existingStats |
| 15 | emergent_narrative | 0.7 | 4000 | ✓ | characters, stats |

### 3.2 주요 검증 규칙

#### endings (카테고리 5) - CRITICAL

```
⚠️ 엔딩 조건의 모든 statId는 반드시 existingStats에 존재해야 함
⚠️ 같은 스탯에 충돌하는 조건 불가 (>=80 AND <=20)
⚠️ 성공/실패 엔딩 균형 필요
```

#### story_opening (카테고리 10)

```
⚠️ firstCharacterToMeet은 반드시 existingCharacters에 존재해야 함
⚠️ protagonistSetup.name은 모든 NPC 이름과 달라야 함
   - 충돌 시 시스템이 자동으로 이름 제거 (AI가 대명사 사용)
```

#### character_introductions (카테고리 11)

```
⚠️ 모든 characterName은 existingCharacters와 정확히 일치해야 함
⚠️ order 값은 1부터 순차적이어야 함
⚠️ 중복 캐릭터 불가
```

#### hidden_relationships (카테고리 12)

```
⚠️ characterA, characterB 모두 existingCharacters에 존재해야 함
⚠️ 2-4개 관계 권장
```

#### gameplay_config (카테고리 14)

```
⚠️ routeScores의 모든 statId는 existingStats에 존재해야 함
⚠️ 비율값은 0-1 범위, 논리적 순서 (activation < ending < 1.0)
⚠️ actionPointsPerDay는 2-5 범위
```

---

## 4. 프롬프트 구조

### 4.1 XML 기반 프롬프트 템플릿

```xml
<role>인터랙티브 내러티브 게임 시나리오 전문가</role>

<task>주어진 입력을 바탕으로 {카테고리}를 생성합니다</task>

<guidelines>
  <guideline>구체적인 지침 1</guideline>
  <guideline>구체적인 지침 2</guideline>
  ...
</guidelines>

<constraints>
  <constraint>반드시 지켜야 할 제약 1</constraint>
  <constraint>반드시 지켜야 할 제약 2</constraint>
</constraints>

<example>
{
  "예시 JSON 출력"
}
</example>
```

### 4.2 컨텍스트 주입

```xml
<scenario_context>
  <genre>포스트아포칼립스, SF</genre>
  <title>제로 아워</title>
  <synopsis>좀비 바이러스가 창궐한 대한민국...</synopsis>
  <existing_characters>박준영, 김서연, 이민호</existing_characters>
  <existing_stats>morale, resources, cityChaos</existing_stats>
</scenario_context>
```

### 4.3 JSON 스키마 강제

```typescript
const model = client.getGenerativeModel({
  model: 'gemini-2.5-flash-lite',
  generationConfig: {
    temperature,
    maxOutputTokens,
    responseMimeType: 'application/json',
    responseSchema  // 카테고리별 스키마
  },
  systemInstruction: systemPrompt
});
```

---

## 5. 데이터 흐름 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                     데이터 흐름                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  사용자 입력                                                 │
│      ↓                                                      │
│  ┌─────────────────┐                                        │
│  │  ScenarioWizard │                                        │
│  │  (상태 관리)     │                                        │
│  └────────┬────────┘                                        │
│           ↓                                                 │
│  ┌─────────────────────────────────────────────────┐        │
│  │  generateWithAI() / generateSynopsis()          │        │
│  │  lib/ai-scenario-generator.ts                   │        │
│  └────────────────────┬────────────────────────────┘        │
│                       ↓                                     │
│  ┌─────────────────────────────────────────────────┐        │
│  │  API Routes                                     │        │
│  │  /api/admin/ai-generate/route.ts                │        │
│  │  /api/admin/ai-generate/synopsis/route.ts       │        │
│  └────────────────────┬────────────────────────────┘        │
│                       ↓                                     │
│  ┌─────────────────────────────────────────────────┐        │
│  │  Gemini API                                     │        │
│  │  - 프롬프트 구성                                  │        │
│  │  - JSON 스키마 강제                               │        │
│  │  - 응답 생성                                      │        │
│  └────────────────────┬────────────────────────────┘        │
│                       ↓                                     │
│  ┌─────────────────────────────────────────────────┐        │
│  │  응답 파싱 및 검증                                │        │
│  │  - JSON 파싱 (폴백 처리)                          │        │
│  │  - 구조 검증                                      │        │
│  │  - 토큰 사용량 로깅                               │        │
│  └────────────────────┬────────────────────────────┘        │
│                       ↓                                     │
│  ┌─────────────────────────────────────────────────┐        │
│  │  ScenarioWizard 상태 업데이트                    │        │
│  │  - synopsisResult                               │        │
│  │  - characterResult                              │        │
│  │  - relationshipResult                           │        │
│  │  - ... 등                                        │        │
│  └────────────────────┬────────────────────────────┘        │
│                       ↓                                     │
│  ┌─────────────────────────────────────────────────┐        │
│  │  최종 조립 (handleComplete)                      │        │
│  │  ScenarioData 객체 생성                          │        │
│  └────────────────────┬────────────────────────────┘        │
│                       ↓                                     │
│  ┌─────────────────────────────────────────────────┐        │
│  │  Firestore 저장                                  │        │
│  │  createScenario()                               │        │
│  └────────────────────┬────────────────────────────┘        │
│                       ↓                                     │
│  /admin/{scenarioId} 에디터로 리다이렉트                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. 에러 처리 및 복구

### 6.1 클라이언트 측

```typescript
// JSON 파싱 폴백
try {
  parsed = JSON.parse(text);
} catch {
  const cleaned = text
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '');
  parsed = JSON.parse(cleaned);
}

// 네트워크 에러
if (!response.ok) {
  const error = await response.json();
  throw new Error(error.error || 'Generation failed');
}
```

### 6.2 서버 측

- API 키 존재 확인
- 카테고리 유효성 검증
- 입력 길이/형식 검증
- JSON 스키마로 응답 형식 보장
- 폴백 JSON 정리 (마크다운 제거)

---

## 7. 향후 분석 대상 (고도화 포인트)

### 7.1 식별된 개선 영역

| 영역 | 현재 상태 | 잠재적 개선 |
|------|-----------|-------------|
| 위치 시스템 | DEPRECATED | 완전 제거 또는 동적 시스템으로 마이그레이션 |
| 엔딩 검증 | 런타임만 | 생성 시점 검증 강화 |
| 병렬 생성 | 부분적 | 더 많은 병렬화 가능 |
| 컨텍스트 전달 | 수동 | 자동 의존성 그래프 기반 |
| 프롬프트 캐싱 | 없음 | 공통 시스템 프롬프트 캐싱 |

### 7.2 단계별 상세 분석 필요 항목

1. **프롬프트 엔지니어링 분석**
   - 각 카테고리별 프롬프트 효과성
   - 온도 설정 최적화
   - 예시 품질 개선

2. **검증 시스템 강화**
   - 생성 시점 교차 검증
   - 의미론적 일관성 검사
   - 자동 수정 제안

3. **UX 개선**
   - 단계 간 편집 기능
   - 부분 재생성
   - 미리보기 강화

4. **성능 최적화**
   - 토큰 사용량 최적화
   - 캐싱 전략
   - 병렬 처리 확대

---

## 8. 부록: 주요 타입 정의

### 8.1 ScenarioData 핵심 필드

```typescript
interface ScenarioData {
  // 기본 정보
  scenarioId: string;
  title: string;
  synopsis: string;
  playerGoal: string;
  genre: string[];
  coreKeywords: string[];
  posterImageUrl: string;
  status: 'in_progress' | 'active' | 'archived';

  // 캐릭터 시스템
  characters: Character[];
  initialRelationships: Relationship[];
  traitPool: { buffs: Trait[]; debuffs: Trait[] };

  // 게임 시스템
  scenarioStats: ScenarioStat[];
  flagDictionary: Flag[];
  endingArchetypes: EndingArchetype[];
  endCondition: EndCondition;

  // 스토리 오프닝 (2025 Enhanced)
  storyOpening?: StoryOpening;

  // 게임플레이 설정
  gameplayConfig?: GameplayConfig;

  // 동적 엔딩
  dynamicEndingConfig?: DynamicEndingConfig;

  // 위치 (Deprecated)
  locations?: Location[];
}
```

### 8.2 생성 컨텍스트

```typescript
interface GenerationContext {
  genre?: string[];
  title?: string;
  synopsis?: string;
  existingCharacters?: string[];
  existingStats?: string[];
  totalDays?: number;
}
```

---

*이 보고서는 시나리오 생성 시스템의 1차 분석 결과입니다. 추후 각 단계별 상세 분석을 위한 기초 자료로 활용됩니다.*
