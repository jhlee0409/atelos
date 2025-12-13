# ATELOS 플레이 시스템 상세 분석 보고서

**분석 일자**: 2025-12-13
**버전**: v1.3

---

## 목차

1. [게임 초기화 단계](#1-게임-초기화-단계)
2. [스토리 오프닝 단계](#2-스토리-오프닝-단계)
3. [메인 게임 루프](#3-메인-게임-루프)
4. [AI 응답 처리](#4-ai-응답-처리)
5. [엔딩 판정 시스템](#5-엔딩-판정-시스템)
6. [종합 개선 계획](#6-종합-개선-계획)

---

## 1. 게임 초기화 단계

### 1.1 현재 구현 상태

| 초기화 항목 | 상태 | 출처 |
|------------|------|------|
| `scenarioStats` | ✅ 완료 | 시나리오 initialValue |
| `characterArcs` | ✅ 완료 | 모든 NPC 생성 |
| `survivors` | ✅ 완료 | metCharacters 기반 |
| `actionContext` | ✅ 완료 | createInitialContext() |
| `worldState` | ✅ 완료 | createInitialWorldState() |
| `protagonistKnowledge` | ⚠️ 불완전 | 일부 필드만 |
| `npcRelationshipStates` | ❌ 미초기화 | 타입만 정의 |
| `triggeredStoryEvents` | ❌ 미초기화 | 타입만 정의 |

### 1.2 발견된 문제점

**🔴 심각**
1. `npcRelationshipStates` 미초기화 - 숨겨진 NPC 관계 가시성 추적 불가
2. `triggeredStoryEvents` 미초기화 - 이머전트 내러티브 트리거 불가
3. `protagonistKnowledge` 불완전 - initialProtagonistKnowledge 미적용

**🟡 중간**
4. `characterIntroductionSequence` 첫 번째만 사용 (order=1만)
5. `community.hiddenRelationships` 이름 혼동 (실제로는 일반 관계도)

### 1.3 개선 코드 예시

```typescript
// createInitialSaveState 수정
context: {
  // 기존 필드...

  // 추가 필요
  npcRelationshipStates: scenario.storyOpening?.hiddenNPCRelationships?.map(rel => ({
    relationId: rel.relationId,
    visibility: rel.visibility || 'hidden'
  })) || [],

  triggeredStoryEvents: [],

  protagonistKnowledge: {
    metCharacters: getInitialMetCharacters(scenario),
    discoveredRelationships: [],
    hintedRelationships: [],
    informationPieces: [],
    ...scenario.storyOpening?.initialProtagonistKnowledge,
  },
}
```

---

## 2. 스토리 오프닝 단계

### 2.1 현재 3단계 구조

```
1. Prologue (프롤로그) - 주인공의 평범한 일상
       ↓
2. Inciting Incident (촉발 사건) - 일상을 깨뜨리는 순간
       ↓
3. First Encounter (첫 만남) - 첫 캐릭터와의 만남
       ↓
4. First Dilemma (첫 딜레마) - 첫 선택지
```

### 2.2 발견된 문제점

**🔴 심각**
1. `protagonistKnowledge` 오프닝 후 미추적 - metCharacters 업데이트 안 됨
2. 2025 Enhanced 기능 미구현:
   - hiddenNPCRelationships 초기화 안 됨
   - characterRevelations 초기화 안 됨
   - emergentNarrative 초기화 안 됨
3. 주인공 정보(protagonistSetup) 게임 진행 중 미사용

**🟡 중간**
4. `npcRelationshipExposure` 옵션 무시됨
5. `characterIntroductionSequence` 강제 안 됨 (순서 무시 가능)

### 2.3 AI 프롬프트에서 사용하는 정보

| 정보 | 사용 여부 | 위치 |
|------|----------|------|
| protagonistSetup | ✅ 오프닝만 | prompt-builder.ts:1214-1227 |
| characterIntroductionSequence | ⚠️ 첫 번째만 | prompt-builder.ts:1082-1112 |
| hiddenNPCRelationships | 📝 지시만 | prompt-builder.ts:1121-1142 |
| characterRevelations | 📝 지시만 | prompt-builder.ts:1145-1171 |
| emergentNarrative | 📝 힌트만 | prompt-builder.ts:1173-1185 |

---

## 3. 메인 게임 루프

### 3.1 4개 핸들러 비교

| 기능 | handleChoice | handleDialogue | handleExplore | 비고 |
|------|-------------|----------------|---------------|------|
| **동적 AP** | ✅ 결정적 순간 | ✅ 신뢰도 기반 | ✅ 재방문/위험 | 정상 |
| **시너지** | ✅ 탐색→선택 | ✅ 탐색→대화 | ❌ **누락** | 🔴 수정 필요 |
| **콤보** | 📝 프롬프트만 | ❌ | ❌ | 보상 불확실 |
| **ActionContext** | ✅ 현재 턴 후 | ✅ 현재 턴 후 | ✅ 현재 턴 후 | 정상 |
| **회상 시스템** | ✅ keyDecisions | ❌ | ❌ | 선택만 기록 |
| **AP 비용 UI** | ❌ 미표시 | ❌ 미표시 | ❌ 미표시 | 🟡 개선 필요 |

### 3.2 Action Engagement System 적용 현황

**구현됨:**
- `calculateDynamicAPCost()` - 동적 AP 비용 계산
- `getActionSynergy()` - 행동 시너지 (2개 핸들러만)
- `generateDynamicDialogueTopics()` - 동적 대화 주제

**미구현:**
- `handleExplore`에서 시너지 미적용
- 콤보 보너스가 AI 프롬프트에만 있음 (코드 보상 없음)
- AP 비용 정보 UI 미표시

### 3.3 ActionContext 동기화 문제

```
현재 흐름:
1. AI 호출 (이전 턴의 actionContext)
2. AI 응답 처리
3. updateContextAfter*() 호출
4. 새 saveState에 반영

문제: 같은 턴 내 연쇄 행동(dialogue → choice)의 정보가
      다음 행동의 AI에 즉시 반영되지 않음
```

---

## 4. AI 응답 처리

### 4.1 파싱 전략 (5단계 폴백)

```
1. 기본 전처리 (+ 기호 제거)
   ↓
2. 마크다운 제거 (```json```)
   ↓
3. 이스케이프 시퀀스 수정
   ↓
4. JSON 복구 시도 (쉼마, 괄호)
   ↓
5. 특수문자 완전 제거
   ↓
(최후) 정규식 기반 필드 추출
```

### 4.2 상태 업데이트 흐름

```
1. 기본 설정 (깊은 복사)
   ↓
2. AI 응답 저장 (log, dilemma)
   ↓
3. 스탯 처리 (동적 증폭)
   ↓
4. 캐릭터 상태 업데이트
   ↓
5. 관계도 업데이트
   ↓
6. 플래그 처리
   ↓
7. 캐릭터 아크 업데이트
   ↓
8. 새 캐릭터 감지 (v1.2)
   ↓
9. 장소 발견 처리
   ↓
10. 변화 요약 생성
```

### 4.3 발견된 문제점

**🔴 심각**
1. 응답 검증 부족 - 선택지 3개 강제 안 됨
2. 스탯 ID 매핑 실패 시 무시 - 스탯 업데이트 누락

**🟡 중간**
3. 관계도 값 추론 고정값 (±5) - 미묘한 변화 표현 불가
4. 캐릭터 이름 충돌 처리 미흡
5. chatHistory 무한 증가 - 메모리 이슈

### 4.4 동적 증폭 시스템

```typescript
// 극단값 (0-25%, 75-100%): 약한 증폭 (1.2x)
// 중간값 (25-75%): 강한 증폭 (2.0x)

목적:
- 스탯이 극단값에서 급격히 변하지 않도록 보호
- 중간값에서 더 극적인 변화로 긴장감 조성
```

---

## 5. 엔딩 판정 시스템

### 5.1 두 가지 시스템 공존

| 항목 | 레거시 시스템 | 동적 엔딩 시스템 |
|------|-------------|----------------|
| 활성화 조건 | 기본 | `dynamicEndingConfig.enabled` |
| 조건 체크 | 스탯/플래그 | ActionHistory + SDT |
| 구현 상태 | ✅ 완료 | ⚠️ 트리거 미구현 |
| 유연성 | 낮음 | 높음 |

### 5.2 레거시 시스템 체크 타이밍

```typescript
엔딩 체크 가능 일차 = Math.ceil(총일수 * endingCheckRatio)

기본값 (7일 게임):
- routeActivationDay = Day 3 (40%)
- endingCheckDay = Day 5 (70%)
```

### 5.3 발견된 문제점

**🔴 심각**
1. 동적 엔딩 자동 트리거 미구현 - API 호출 코드 없음
2. ActionHistory가 엔딩 결정에 미반영 (레거시)
3. 플래그 조건 미지원 (systemConditions)

**🟡 중간**
4. 시간 초과 엔딩 로직 3개 핸들러에 중복
5. 엔딩 우선순위 제어 불가

### 5.4 엔딩 체크 플로우

```
[canCheckEnding 체크]
├─ dynamicEndingConfig.enabled
│   └─ YES → ❌ 미구현 (API 호출 필요)
└─ NO (레거시)
    └─ checkEndingConditions()
        ├─ 엔딩 발견 → 게임 종료
        └─ 엔딩 없음 → 시간 초과 체크
            ├─ 시간 초과 → 3단계 폴백
            └─ 계속 진행
```

---

## 6. 종합 개선 계획

### 6.1 우선순위별 개선 항목

#### 🔴 P0 - 즉시 수정 필요 (Week 1)

| # | 항목 | 영향 | 예상 시간 |
|---|------|------|----------|
| 1 | `handleExplore` 시너지 추가 | 게임플레이 일관성 | 2h |
| 2 | AI 응답 검증 함수 추가 | 선택지 품질 보장 | 3h |
| 3 | 스탯 ID 매핑 엄격화 | 스탯 업데이트 누락 방지 | 2h |
| 4 | `npcRelationshipStates` 초기화 | 숨겨진 관계 시스템 | 1h |
| 5 | `triggeredStoryEvents` 초기화 | 이머전트 내러티브 | 1h |

#### 🟡 P1 - 중요 개선 (Week 2)

| # | 항목 | 영향 | 예상 시간 |
|---|------|------|----------|
| 6 | 동적 엔딩 자동 트리거 구현 | 동적 엔딩 활성화 | 4h |
| 7 | `protagonistKnowledge` 동적 추적 | AI 맥락 품질 | 3h |
| 8 | AP 비용 UI 표시 | UX 개선 | 2h |
| 9 | 콤보 보너스 코드 구현 | 전략적 깊이 | 3h |
| 10 | 시간 초과 엔딩 로직 통합 | 코드 중복 제거 | 2h |

#### 🟢 P2 - 부가 개선 (Week 3+)

| # | 항목 | 영향 | 예상 시간 |
|---|------|------|----------|
| 11 | `chatHistory` 압축/관리 | 성능 최적화 | 3h |
| 12 | `characterIntroductionSequence` UI 강제 | 캐릭터 소개 순서 | 3h |
| 13 | ActionContext 동기화 개선 | AI 맥락 즉시성 | 4h |
| 14 | 관계도 값 추론 개선 | 미묘한 변화 표현 | 2h |
| 15 | 레거시 플래그 조건 지원 | 엔딩 조건 확장 | 2h |

### 6.2 단계별 구현 계획

```
Phase 1 (Week 1): 핵심 버그 수정
├── handleExplore 시너지 추가
├── AI 응답 검증 함수
├── 스탯 ID 매핑 엄격화
└── 미초기화 필드 수정

Phase 2 (Week 2): 시스템 완성
├── 동적 엔딩 자동 트리거
├── protagonistKnowledge 추적
├── AP 비용 UI 표시
└── 콤보 보너스 코드화

Phase 3 (Week 3+): 최적화 & 확장
├── chatHistory 관리
├── characterIntroductionSequence 강제
├── ActionContext 동기화
└── 기타 개선 사항
```

### 6.3 파일별 수정 필요 사항

| 파일 | 수정 내용 | 우선순위 |
|------|----------|----------|
| `GameClient/index.tsx` | handleExplore 시너지, 초기화 필드 추가, 동적 엔딩 트리거 | P0-P1 |
| `lib/gemini-client.ts` | AI 응답 검증 함수 추가 | P0 |
| `lib/prompt-builder.ts` | protagonistKnowledge 전달 | P1 |
| `lib/action-engagement-system.ts` | 콤보 보너스 코드화 | P1 |
| `components/client/GameClient/ChoiceButtons.tsx` | AP 비용 표시 | P1 |
| `components/client/GameClient/CharacterDialoguePanel.tsx` | AP 비용 표시 | P1 |
| `components/client/GameClient/ExplorationPanel.tsx` | AP 비용 표시 | P1 |

### 6.4 측정 지표

개선 효과를 측정하기 위한 지표:

| 지표 | 현재 | 목표 | 측정 방법 |
|------|------|------|----------|
| AI 응답 검증 통과율 | 측정 안 됨 | 95%+ | 검증 로그 분석 |
| 스탯 업데이트 성공률 | 측정 안 됨 | 99%+ | 매핑 실패 로그 |
| 콤보 감지 정확도 | AI 의존 | 100% | 코드 기반 |
| 동적 엔딩 트리거율 | 0% | 100% | API 호출 로그 |

---

## 부록: 코드 위치 빠른 참조

### A. 초기화 관련
- `GameClient.tsx:251-385` - createInitialSaveState
- `context-manager.ts:1-100` - createInitialContext
- `world-state-manager.ts:1-150` - createInitialWorldState

### B. 핸들러 관련
- `GameClient.tsx:1370-1762` - handlePlayerChoice
- `GameClient.tsx:1765-1975` - handleDialogueSelect
- `GameClient.tsx:1973-2240` - handleExplore

### C. AI 관련
- `gemini-client.ts:231-324` - JSON 파싱
- `prompt-builder.ts:1-800` - 프롬프트 빌드
- `GameClient.tsx:432-1068` - updateSaveState

### D. 엔딩 관련
- `ending-checker.ts:1-85` - 조건 체크
- `gameplay-config.ts:122-167` - 타이밍 계산
- `/api/generate-ending/route.ts` - 동적 엔딩 API
