# ATELOS 게임플레이 프로세스 분석 보고서

**작성일**: 2025-12-09
**목적**: 지속적인 이슈 발생 원인 분석 및 시스템 개선 방안 도출

---

## 목차

1. [개요](#1-개요)
2. [전체 플로우 다이어그램](#2-전체-플로우-다이어그램)
3. [단계별 상세 분석](#3-단계별-상세-분석)
4. [데이터 변환 지점](#4-데이터-변환-지점)
5. [식별된 문제점](#5-식별된-문제점)
6. [근본 원인 분석](#6-근본-원인-분석)
7. [개선 권장사항](#7-개선-권장사항)
8. [우선순위별 수정 계획](#8-우선순위별-수정-계획)

---

## 1. 개요

### 1.1 현재 상황

여러 차례의 개선 작업에도 불구하고 다음과 같은 이슈가 반복적으로 발생:

| 이슈 유형 | 발생 빈도 | 심각도 |
|-----------|-----------|--------|
| 잘못된 스탯 ID 반환 | 높음 | 치명적 |
| 영어 관계 키 반환 | 높음 | 높음 |
| 서사 품질 저하 | 중간 | 중간 |
| 한국어 비율 부족 | 중간 | 중간 |
| 유니코드 문자 혼입 | 낮음 | 낮음 |

### 1.2 분석 범위

```
시나리오 로딩 → 초기 상태 생성 → AI 프롬프트 구성 → Gemini API 호출
→ 응답 파싱 → 유효성 검증 → 상태 업데이트 → 렌더링
```

---

## 2. 전체 플로우 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ATELOS 게임플레이 프로세스                          │
└─────────────────────────────────────────────────────────────────────────────┘

[1. 시나리오 로딩]
     │
     ▼
┌─────────────────┐    Firebase/Mock
│ /game/[id] page │ ◄──────────────── getScenario(id)
└────────┬────────┘
         │ ScenarioData
         ▼
[2. 초기 상태 생성]
         │
┌────────┴────────────────────────────────────────┐
│ createInitialSaveState(scenario)                │
│  ├─ scenarioStats[] → stats{}                   │  ◄─── 변환점 #1
│  ├─ flagDictionary[] → flags{}                  │  ◄─── 변환점 #2
│  ├─ initialRelationships[] → hiddenRelationships{} │ ◄─── 변환점 #3
│  ├─ characters[] → charactersWithTraits[]       │  ◄─── 변환점 #4
│  └─ characterArcs[] 초기화                       │
└────────┬────────────────────────────────────────┘
         │ SaveState
         ▼
[3. 초기 딜레마 생성]
         │
┌────────┴────────────────────────────────────────┐
│ generateInitialDilemma()                        │
│  ├─ getOptimalAISettings(day=1)                 │
│  ├─ buildOptimizedGamePrompt() 또는 V2          │  ◄─── 변환점 #5
│  └─ callGeminiAPI()                             │
└────────┬────────────────────────────────────────┘
         │
         ▼
[4. AI 응답 처리]
         │
┌────────┴────────────────────────────────────────┐
│ 응답 파싱 체인 (5단계 + 폴백)                     │
│  ├─ JSON.parse() 시도                           │
│  ├─ 마크다운 추출 시도                           │
│  ├─ 이스케이프 수정 시도                         │
│  ├─ JSON 구조 복구 시도                         │
│  └─ 정규식 필드 추출 (최종 폴백)                 │  ◄─── 변환점 #6
└────────┬────────────────────────────────────────┘
         │ AIResponse (raw)
         ▼
[5. 유효성 검증]
         │
┌────────┴────────────────────────────────────────┐
│ cleanAndValidateAIResponse()                    │
│  ├─ detectAndCleanLanguageMixing()              │  ◄─── 검증점 #1
│  ├─ validateKoreanContent()                     │  ◄─── 검증점 #2
│  ├─ validateChoiceFormat()                      │  ◄─── 검증점 #3
│  ├─ validateStatChanges()                       │  ◄─── 검증점 #4
│  └─ cleanNarrativeFormatting()                  │
└────────┬────────────────────────────────────────┘
         │ AIResponse (cleaned)
         ▼
[6. 상태 업데이트]
         │
┌────────┴────────────────────────────────────────┐
│ updateSaveState()                               │
│  ├─ 스탯 ID 매핑 + 증폭                         │  ◄─── 변환점 #7
│  ├─ 관계 키 정규화 + 적용                       │  ◄─── 변환점 #8
│  ├─ 플래그 획득 처리                            │  ◄─── 변환점 #9
│  └─ 캐릭터 아크 업데이트                         │
└────────┬────────────────────────────────────────┘
         │ SaveState (updated)
         ▼
[7. 엔딩 체크 (Day 5+)]
         │
┌────────┴────────────────────────────────────────┐
│ checkEndingConditions()                         │
│  ├─ checkStatCondition()                        │  ◄─── 검증점 #5
│  ├─ checkFlagCondition()                        │  ◄─── 검증점 #6
│  └─ checkSurvivorCountCondition()               │
└────────┬────────────────────────────────────────┘
         │
         ▼
[8. UI 렌더링]
```

---

## 3. 단계별 상세 분석

### 3.1 시나리오 로딩 단계

**파일**: `app/game/[scenarioId]/page.tsx`

```typescript
// 서버 사이드에서 시나리오 페치
const scenario = await getScenario(scenarioId);
```

**입력**: 시나리오 ID (예: "ZERO_HOUR", "SEVEN_DAYS_AWAKENING")

**출력**: ScenarioData 객체
```typescript
{
  scenarioId: string;
  title: string;
  scenarioStats: [
    { id: "cityChaos", name: "도시 혼란도", min: 0, max: 100, initialValue: 35 },
    { id: "communityCohesion", name: "공동체 응집력", ... },
    ...
  ],
  flagDictionary: [
    { flagName: "FLAG_ESCAPE_VEHICLE_SECURED", description: "탈출 수단 확보", type: "boolean", initial: false },
    ...
  ],
  characters: [
    { characterName: "박준경", roleName: "리더", backstory: "...", ... },
    ...
  ],
  initialRelationships: [
    { personA: "박준경", personB: "한서아", value: 15 },
    ...
  ]
}
```

**잠재적 문제점**:
- 시나리오마다 다른 스탯 ID 사용 (ZERO_HOUR: cityChaos, SEVEN_DAYS: cityStability)
- 프롬프트 템플릿이 이를 동적으로 처리하지 못하면 잘못된 ID 사용

---

### 3.2 초기 상태 생성 단계

**파일**: `app/game/[scenarioId]/GameClient.tsx` (lines 48-148)

#### 3.2.1 스탯 변환

```typescript
// 배열 → 객체 변환
const scenarioStats = scenario.scenarioStats.reduce(
  (acc, stat) => {
    acc[stat.id] = stat.initialValue ?? stat.current;  // ◄─── stat.id를 키로 사용
    return acc;
  },
  {} as { [key: string]: number },
);

// 결과: { "cityChaos": 35, "communityCohesion": 60, ... }
```

**핵심**: `stat.id`가 키로 사용되므로 AI도 동일한 ID를 사용해야 함

#### 3.2.2 관계 변환

```typescript
const hiddenRelationships = scenario.initialRelationships.reduce(
  (acc, rel) => {
    const key = `${rel.personA}-${rel.personB}`;  // ◄─── 한글 이름 조합
    acc[key] = rel.value;
    return acc;
  },
  {} as { [key: string]: number },
);

// 결과: { "박준경-한서아": 15, "강철민-박준경": -20, ... }
```

**핵심**: 관계 키는 **반드시 한글 캐릭터 이름**이어야 함

#### 3.2.3 캐릭터 아크 초기화

```typescript
characterArcs: charactersWithTraits
  .filter((c) => c.characterName !== '(플레이어)')
  .map((c) => ({
    characterName: c.characterName,
    moments: [],
    currentMood: 'anxious' as const,  // ◄─── 모든 캐릭터 동일한 초기 무드
    trustLevel: 0,
  })),
```

**문제점**: 캐릭터 특성(trait)이 초기 무드에 반영되지 않음

---

### 3.3 프롬프트 구성 단계

**파일들**:
- `lib/prompt-builder.ts` (표준)
- `lib/prompt-builder-optimized.ts` (최적화 v2)
- `mocks/UniversalMasterSystemPrompt.ts` (마스터 템플릿)

#### 3.3.1 토큰 예산에 따른 프롬프트 선택

```
토큰 예산 20,000 기준:
├─ 잔여 < 5,000: ultra-lite (~150 토큰)
├─ 잔여 < 10,000: optimized v2 (~400 토큰)
├─ Day 1-2: lite (~800 토큰)
├─ Day 3-5: full (~2,500 토큰)
└─ Day 6+: detailed (~3,000 토큰)
```

#### 3.3.2 스탯 ID 목록 주입 (최근 수정됨)

```typescript
// prompt-builder.ts (line 508-510)
const statIdList = scenario.scenarioStats
  .map((stat) => `- "${stat.id}": ${stat.name}`)
  .join('\n');

// 결과:
// - "cityChaos": 도시 혼란도
// - "communityCohesion": 공동체 응집력
// - "survivalFoundation": 생존의 기반
```

이 목록이 `{{STAT_ID_LIST}}`로 프롬프트에 삽입됨

#### 3.3.3 마스터 프롬프트 핵심 지시사항

```
## AVAILABLE STAT IDs (USE THESE EXACT IDs IN statChanges.scenarioStats)
{{STAT_ID_LIST}}

## STAT CHANGE GUIDELINES (CRITICAL)
- ONLY use stat IDs from AVAILABLE STAT IDS section above
- Do NOT invent new stat IDs or use generic names like "cityChaos"

## RELATIONSHIP FORMAT (CRITICAL)
- USE KOREAN NAMES: For hiddenRelationships_change, use Korean character names ONLY
- Example: {"pair": "김민준-정태수", "change": -10} ✓
- BAD: {"pair": "Kim Minjun-Jung Taesu", "change": -10} ✗
```

---

### 3.4 AI 응답 파싱 단계

**파일**: `lib/gemini-client.ts` (lines 236-329)

#### 파싱 전략 체인

```
1. 기본 JSON.parse()
   ↓ 실패시
2. 마크다운 코드블록 추출 (```json ... ```)
   ↓ 실패시
3. 이스케이프 시퀀스 수정 (\x, \(, \) 등)
   ↓ 실패시
4. JSON 구조 복구 (누락된 쉼표, 괄호 추가)
   ↓ 실패시
5. 핵 옵션 (모든 백슬래시 제거)
   ↓ 실패시
6. 정규식 필드 추출 (폴백)
```

#### 예상 응답 형식

```json
{
  "log": "한국어 서사 (200-300+ 자)",
  "dilemma": {
    "prompt": "상황 설명 (80-150자)",
    "choice_a": "선택지 (~한다로 끝남, 15-50자)",
    "choice_b": "선택지 (~한다로 끝남, 15-50자)"
  },
  "statChanges": {
    "scenarioStats": {
      "cityChaos": -10,
      "communityCohesion": 15
    },
    "survivorStatus": [],
    "hiddenRelationships_change": [
      { "pair": "박준경-한서아", "change": -5 }
    ],
    "flags_acquired": ["FLAG_ESCAPE_VEHICLE_SECURED"]
  }
}
```

---

### 3.5 유효성 검증 단계

**파일**: `lib/game-ai-client.ts` (lines 335-477)

#### 검증 항목

| 검증 | 임계값 | 실패 시 처리 |
|------|--------|--------------|
| 언어 혼합 | 아랍어/태국어/힌디어 포함 | 해당 문자 제거, 경고 로그 |
| 한국어 비율 | < 50% | 경고 로그, 게임 계속 |
| 한국어 비율 | < 10% | 하드 실패 (폴백 작동) |
| 선택지 길이 | 15-80자 | 경고 로그, 그대로 표시 |
| 선택지 어미 | ~한다/~이다 | 경고 로그, 그대로 표시 |
| 스탯 변화량 | ±40 초과 | ±40으로 클램핑 |

#### 서사 정리 (cleanNarrativeFormatting)

```typescript
// 제거 대상
- 스탯 ID 노출: "cityChaos", "communityCohesion"
- 스탯 이름 노출: "도시 혼란도", "생존의 기반"
- 빈 괄호: "()", "( )"
- 수치 노출: "(20)", "75%"
```

---

### 3.6 상태 업데이트 단계

**파일**: `app/game/[scenarioId]/GameClient.tsx` (lines 188-309)

#### 3.6.1 스탯 ID 매핑

```typescript
const mapStatNameToId = (statName: string): string => {
  // 1. 정확한 ID 매칭
  if (scenario.scenarioStats.find((s) => s.id === statName)) {
    return statName;
  }

  // 2. 한글 이름으로 찾기
  const statByName = scenario.scenarioStats.find((s) => s.name === statName);
  if (statByName) return statByName.id;

  // 3. 레거시 매핑 폴백
  // ...

  // 4. 원본 반환 (경고 로그)
  console.warn(`⚠️ 알 수 없는 스탯 ID: ${statName}`);
  return statName;
};
```

**문제점**: AI가 잘못된 ID를 반환하면 매핑 실패 → 스탯 변경 무시됨

#### 3.6.2 스탯 증폭 로직

```typescript
const percentage = ((currentValue - min) / (max - min)) * 100;

let amplificationFactor: number;
if (percentage <= 25 || percentage >= 75) {
  amplificationFactor = 1.2;  // 극단값: 완만한 변화
} else {
  amplificationFactor = 2.0;  // 중간값: 극적인 변화
}

const amplifiedChange = Math.round(originalChange * amplificationFactor);
```

#### 3.6.3 관계 키 처리

```typescript
// 지원 형식
1. { "pair": "캐릭터A-캐릭터B", "change": -5 }
2. { "personA": "캐릭터A", "personB": "캐릭터B", "change": -5 }
3. "캐릭터A-캐릭터B: -5" (문자열)

// 정규화
- 플레이어 참조 통일: "플레이어", "리더", "player" → "(플레이어)"
- 키 정렬: "한서아-박준경" → "박준경-한서아" (알파벳순)
- 값 클램핑: [-100, 100]
```

---

## 4. 데이터 변환 지점

### 변환 지점 요약

| # | 위치 | 입력 | 출력 | 위험도 |
|---|------|------|------|--------|
| 1 | 스탯 초기화 | scenarioStats[] | stats{} | 낮음 |
| 2 | 플래그 초기화 | flagDictionary[] | flags{} | 낮음 |
| 3 | 관계 초기화 | relationships[] | hiddenRelationships{} | 중간 |
| 4 | 캐릭터 특성 | characters + traits | charactersWithTraits | 낮음 |
| 5 | 프롬프트 구성 | SaveState + Scenario | systemPrompt + userPrompt | **높음** |
| 6 | 응답 파싱 | Raw text | AIResponse | **높음** |
| 7 | 스탯 적용 | AI scenarioStats | 실제 stats | **높음** |
| 8 | 관계 적용 | AI relationships | hiddenRelationships | **높음** |
| 9 | 플래그 적용 | AI flags_acquired | flags{} | 중간 |

### 고위험 변환 지점 상세

#### 변환 지점 #5: 프롬프트 구성

**문제**: AI가 프롬프트의 지시사항을 무시할 수 있음

```
입력: scenario.scenarioStats = [
  { id: "heroismOrVillainy", name: "영웅/악당 성향" },
  { id: "cityStability", name: "도시 안정도" }
]

프롬프트에 주입:
VALID STAT IDs: "heroismOrVillainy"(영웅/악당 성향), "cityStability"(도시 안정도)

AI가 반환할 수 있는 것:
✓ 정상: { "heroismOrVillainy": 10 }
✗ 오류: { "cityChaos": 10 }  ← 다른 시나리오의 ID
✗ 오류: { "heroVillainAlignment": 10 }  ← 유사하지만 다른 ID
```

#### 변환 지점 #7: 스탯 적용

**문제**: 잘못된 ID가 오면 조용히 무시됨

```
AI 응답: { "cityChaos": -10 }
시나리오 스탯: ["heroismOrVillainy", "cityStability", ...]

매핑 시도:
1. scenario.scenarioStats.find(s => s.id === "cityChaos") → null
2. scenario.scenarioStats.find(s => s.name === "cityChaos") → null
3. 레거시 매핑 → null (새 시나리오)
4. 결과: 스탯 변경 무시됨 (console.warn만 출력)
```

#### 변환 지점 #8: 관계 적용

**문제**: 영어 이름이 오면 매칭 실패

```
AI 응답: { "pair": "Jung Taesu-Kim Minjun", "change": -5 }
실제 관계 키: "정태수-김민준"

결과:
- "Jung Taesu-Kim Minjun" 키로 새 관계 생성됨
- 기존 "정태수-김민준" 관계는 변경되지 않음
- 게임 상태에 중복 관계 데이터 존재
```

---

## 5. 식별된 문제점

### 5.1 치명적 문제 (게임플레이 직접 영향)

#### P1-1: 스탯 ID 불일치

**증상**: AI가 시나리오에 정의되지 않은 스탯 ID 반환
**원인**:
- Gemini가 프롬프트의 VALID STAT IDs 지시를 무시
- 이전 학습 데이터에서 cityChaos 등 일반적인 ID 학습
**영향**: 스탯 변경이 적용되지 않아 게임 밸런스 붕괴

#### P1-2: 관계 키 형식 불일치

**증상**: AI가 영어 로마자 이름 또는 잘못된 형식 반환
**원인**:
- Gemini가 한글 이름 대신 영어 음역 사용
- 캐릭터 이름에 하이픈이 포함된 경우 파싱 오류
**영향**: 관계 변경이 적용되지 않거나 중복 데이터 생성

### 5.2 높은 문제 (사용자 경험 영향)

#### P2-1: 서사 품질 불안정

**증상**:
- 서사 길이 부족 (200자 미만)
- 감정 표현 부족
- 스탯/수치 노출
**원인**:
- 토큰 예산 부족 시 ultra-lite 프롬프트 사용
- Gemini의 불안정한 응답 품질
**영향**: 몰입감 저하

#### P2-2: 선택지 형식 불량

**증상**:
- 선택지가 너무 짧거나 김
- ~한다/~이다 어미 누락
- 시스템 ID 노출 ([ACTION_ID])
**원인**: 프롬프트 지시사항 미준수
**영향**: 게임 UI 품질 저하

### 5.3 중간 문제 (기능적 이슈)

#### P3-1: 캐릭터 아크 초기화 문제

**증상**: 모든 캐릭터가 'anxious' 무드로 시작
**원인**: 캐릭터 특성이 초기 무드에 반영되지 않음
**영향**: 캐릭터 설정과 표현 불일치

#### P3-2: 시간 진행 불명확

**증상**: 시간이 진행되어야 할 때 안 되거나 반대 상황
**원인**: shouldAdvanceTime 휴리스틱 불완전
**영향**: 게임 진행 속도 불일치

### 5.4 낮은 문제 (마이너 이슈)

#### P4-1: 문서와 코드 불일치

**증상**: CLAUDE.md의 증폭 계수와 실제 코드 다름
- 문서: 1.5x / 3.0x
- 코드: 1.2x / 2.0x
**영향**: 개발자 혼란

#### P4-2: 유니코드 문자 혼입

**증상**: 아랍어, 태국어 등 이상한 문자가 서사에 포함
**원인**: Gemini의 다국어 학습 데이터 영향
**영향**: 시각적 불쾌감 (자동 제거되지만)

---

## 6. 근본 원인 분석

### 6.1 아키텍처 레벨

```
┌────────────────────────────────────────────────────────────────┐
│                        근본 원인 트리                           │
└────────────────────────────────────────────────────────────────┘

[지속적 이슈 발생]
     │
     ├──► [원인 1: AI 응답 불확실성]
     │         │
     │         ├── Gemini이 프롬프트 지시를 완벽히 따르지 않음
     │         ├── 토큰 제한으로 컨텍스트 손실
     │         └── 학습 데이터 편향 (cityChaos 등 일반적 ID 선호)
     │
     ├──► [원인 2: 느슨한 검증]
     │         │
     │         ├── 잘못된 스탯 ID가 경고만 출력하고 통과
     │         ├── 관계 키 형식 오류가 조용히 무시됨
     │         └── 선택지 품질 문제가 블로킹되지 않음
     │
     ├──► [원인 3: 폴백 부재]
     │         │
     │         ├── 스탯 매핑 실패 시 대안 없음
     │         ├── 관계 매핑 실패 시 대안 없음
     │         └── 품질 실패 시 재시도 없음
     │
     └──► [원인 4: 시나리오별 차이 미처리]
               │
               ├── 하드코딩된 스탯 ID 잔존 (일부 수정됨)
               ├── 시나리오별 캐릭터 이름 형식 차이
               └── 시나리오별 플래그 명명 규칙 차이
```

### 6.2 핵심 취약점

#### 취약점 1: "희망적 파싱"

현재 시스템은 AI 응답이 올바르다고 가정하고, 오류를 조용히 무시:

```typescript
// 현재 코드 패턴
if (mappedStatId === undefined) {
  console.warn(`알 수 없는 스탯: ${statName}`);
  return;  // ← 조용히 건너뜀
}
```

**문제**: 사용자는 스탯 변경이 적용되지 않았는지 알 수 없음

#### 취약점 2: 단방향 매핑만 존재

```
시나리오 → 프롬프트: ✓ 스탯 ID 목록 전달
AI 응답 → 검증: ✗ 유효한 스탯 ID인지 확인 부재
```

**문제**: AI가 프롬프트에 없는 ID를 반환해도 감지 안 됨

#### 취약점 3: 재시도 로직 부재

```typescript
// 현재 플로우
try {
  const response = await generateGameResponse(...);
  // 응답 품질 체크
  if (response.log.length < 200) {
    console.warn('서사 길이 부족');  // 경고만 출력
  }
  return response;  // 부족해도 반환
} catch (error) {
  return generateFallback();  // 폴백만 있음
}
```

**문제**: 품질 문제는 재시도 없이 그대로 사용됨

---

## 7. 개선 권장사항

### 7.1 즉시 적용 (핫픽스)

#### R1-1: 스탯 ID 화이트리스트 검증 추가

**파일**: `lib/game-ai-client.ts`

```typescript
// 제안 코드
const validateStatIds = (
  scenarioStats: { scenarioStats: Record<string, number> },
  validStatIds: string[]
): { valid: Record<string, number>, invalid: string[] } => {
  const valid: Record<string, number> = {};
  const invalid: string[] = [];

  for (const [key, value] of Object.entries(scenarioStats.scenarioStats)) {
    if (validStatIds.includes(key)) {
      valid[key] = value;
    } else {
      invalid.push(key);
    }
  }

  if (invalid.length > 0) {
    console.error(`❌ 유효하지 않은 스탯 ID 감지: ${invalid.join(', ')}`);
    console.error(`✓ 유효한 스탯 ID: ${validStatIds.join(', ')}`);
  }

  return { valid, invalid };
};
```

#### R1-2: 관계 키 사전 검증 추가

```typescript
const validateRelationshipKeys = (
  relationships: RelationshipChange[],
  validCharacterNames: string[]
): { valid: RelationshipChange[], invalid: RelationshipChange[] } => {
  const valid: RelationshipChange[] = [];
  const invalid: RelationshipChange[] = [];

  for (const rel of relationships) {
    const names = rel.pair.split('-');
    const allValid = names.every(name =>
      validCharacterNames.includes(name) || name === '(플레이어)'
    );

    if (allValid) {
      valid.push(rel);
    } else {
      invalid.push(rel);
      console.error(`❌ 유효하지 않은 관계 키: ${rel.pair}`);
    }
  }

  return { valid, invalid };
};
```

### 7.2 단기 개선 (1-2주)

#### R2-1: 응답 품질 기반 재시도

```typescript
const generateGameResponseWithRetry = async (
  ...params,
  maxRetries = 2
): Promise<AIResponse> => {
  let lastResponse: AIResponse | null = null;
  let bestQuality = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await generateGameResponse(...params);
    const quality = assessResponseQuality(response);

    if (quality.score > bestQuality) {
      lastResponse = response;
      bestQuality = quality.score;
    }

    if (quality.score >= 0.8) {  // 80% 이상이면 바로 반환
      return response;
    }

    if (attempt < maxRetries) {
      console.log(`⚠️ 품질 점수 ${quality.score}, 재시도 ${attempt + 1}/${maxRetries}`);
    }
  }

  return lastResponse || generateFallback();
};
```

#### R2-2: 스탯 ID 자동 수정 시도

```typescript
const attemptStatIdCorrection = (
  wrongId: string,
  validStatIds: string[]
): string | null => {
  // 1. 대소문자 무시 매칭
  const caseInsensitive = validStatIds.find(
    id => id.toLowerCase() === wrongId.toLowerCase()
  );
  if (caseInsensitive) return caseInsensitive;

  // 2. 부분 문자열 매칭
  const partial = validStatIds.find(
    id => id.includes(wrongId) || wrongId.includes(id)
  );
  if (partial) return partial;

  // 3. 레벤슈타인 거리 (유사도)
  const similar = findMostSimilar(wrongId, validStatIds, 0.7);
  if (similar) return similar;

  return null;
};
```

### 7.3 중기 개선 (1-2개월)

#### R3-1: 구조화된 출력 스키마 도입

Gemini API의 JSON 스키마 기능 활용:

```typescript
const responseSchema = {
  type: "object",
  properties: {
    log: { type: "string", minLength: 200 },
    dilemma: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        choice_a: { type: "string", pattern: ".*(한다|이다)$" },
        choice_b: { type: "string", pattern: ".*(한다|이다)$" }
      },
      required: ["prompt", "choice_a", "choice_b"]
    },
    statChanges: {
      type: "object",
      properties: {
        scenarioStats: {
          type: "object",
          additionalProperties: { type: "number", minimum: -40, maximum: 40 }
        }
      }
    }
  },
  required: ["log", "dilemma", "statChanges"]
};

// API 호출 시
generationConfig: {
  responseMimeType: 'application/json',
  responseSchema: responseSchema  // 스키마 강제
}
```

#### R3-2: 다단계 프롬프트 파이프라인

```
현재: 단일 프롬프트 → 전체 응답

제안:
1단계: 서사 생성 프롬프트 → log 생성
2단계: 딜레마 생성 프롬프트 (서사 컨텍스트 포함) → dilemma 생성
3단계: 게임 상태 업데이트 프롬프트 (서사+딜레마 컨텍스트) → statChanges 생성

장점:
- 각 단계별 검증 가능
- 실패한 단계만 재시도
- 토큰 효율성 향상
```

#### R3-3: 캐릭터 이름 정규화 레이어

```typescript
class CharacterNameNormalizer {
  private nameMap: Map<string, string> = new Map();

  constructor(characters: Character[]) {
    for (const char of characters) {
      const koreanName = char.characterName;
      // 한글 → 정규화
      this.nameMap.set(koreanName, koreanName);
      // 영어 로마자 → 한글 (자동 생성 또는 시나리오에 정의)
      const romanized = romanize(koreanName);
      this.nameMap.set(romanized, koreanName);
      this.nameMap.set(romanized.toLowerCase(), koreanName);
    }
  }

  normalize(name: string): string {
    return this.nameMap.get(name) || name;
  }
}
```

---

## 8. 우선순위별 수정 계획

### Phase 1: 긴급 수정 (이번 주)

| 작업 | 파일 | 예상 시간 | 위험도 |
|------|------|-----------|--------|
| 스탯 ID 화이트리스트 검증 | game-ai-client.ts | 2h | 낮음 |
| 관계 키 사전 검증 | GameClient.tsx | 2h | 낮음 |
| 검증 실패 시 구체적 로그 | game-ai-client.ts | 1h | 낮음 |

### Phase 2: 안정화 (다음 주)

| 작업 | 파일 | 예상 시간 | 위험도 |
|------|------|-----------|--------|
| 스탯 ID 자동 수정 시도 | game-ai-client.ts | 3h | 중간 |
| 품질 기반 재시도 (1회) | game-ai-client.ts | 4h | 중간 |
| 문서 업데이트 | CLAUDE.md | 1h | 낮음 |

### Phase 3: 개선 (2-4주)

| 작업 | 파일 | 예상 시간 | 위험도 |
|------|------|-----------|--------|
| JSON 스키마 검증 도입 | gemini-client.ts | 6h | 중간 |
| 캐릭터 이름 정규화 | 새 파일 + GameClient | 4h | 중간 |
| 캐릭터 아크 초기화 개선 | GameClient.tsx | 2h | 낮음 |

### Phase 4: 최적화 (1-2개월)

| 작업 | 파일 | 예상 시간 | 위험도 |
|------|------|-----------|--------|
| 다단계 프롬프트 파이프라인 | 새 아키텍처 | 20h | 높음 |
| 응답 캐싱 시스템 | 새 파일 | 8h | 중간 |
| A/B 테스트 프레임워크 | 새 파일 | 12h | 높음 |

---

## 부록: 체크리스트

### 배포 전 검증 항목

- [ ] 모든 시나리오에서 스탯 ID 매핑 테스트
- [ ] 모든 캐릭터 이름으로 관계 키 테스트
- [ ] Day 1 ~ Day 7 전체 플로우 테스트
- [ ] 토큰 예산 극한 상황 테스트 (ultra-lite 모드)
- [ ] 네트워크 오류 시 폴백 동작 테스트
- [ ] 엔딩 조건 충족 테스트

### 모니터링 지표

- AI 응답 파싱 성공률
- 스탯 ID 매핑 실패율
- 관계 키 매핑 실패율
- 평균 서사 길이
- 선택지 형식 준수율
- 게임 세션당 폴백 발생 횟수

---

**보고서 작성**: Claude Code
**버전**: 1.0
**최종 수정**: 2025-12-09
