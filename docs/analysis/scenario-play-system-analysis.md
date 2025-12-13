# 시나리오 플레이 시스템 분석 보고서

> 작성일: 2025-12-12
> 목적: 생성된 시나리오가 플레이될 때의 진행 방식 분석
>
> ⚠️ **v1.4 업데이트 노트**: `flags_acquired`, `flagDictionary` → `ActionHistory`로 대체됨.
> Dynamic Ending System 도입으로 플래그 기반 엔딩 조건이 deprecated됨.

---

## 1. 시스템 개요

### 1.1 아키텍처 요약

ATELOS의 게임 플레이 시스템은 **AI 기반 인터랙티브 내러티브 엔진**으로, 생성된 시나리오를 기반으로 플레이어의 선택에 따라 동적으로 스토리를 전개합니다.

```
시나리오 로드 → 초기화 → 스토리 오프닝 → 메인 게임 루프 → 엔딩
                                    ↑__________________|
```

### 1.2 핵심 구성 요소

| 구성 요소 | 파일 경로 | 역할 |
|-----------|-----------|------|
| 게임 클라이언트 | `components/client/GameClient/index.tsx` | 메인 게임 오케스트레이터 (2378줄) |
| AI 클라이언트 | `lib/gemini-client.ts` | Gemini API 래퍼 |
| 프롬프트 빌더 | `lib/prompt-builder.ts` | AI 프롬프트 구성 |
| 게임 빌더 | `lib/game-builder.ts` | 초기 게임 상태 생성 |
| 엔딩 체커 | `lib/ending-checker.ts` | 엔딩 조건 평가 |
| 게임플레이 설정 | `lib/gameplay-config.ts` | 동적 설정 유틸리티 |
| 내러티브 엔진 | `lib/ai-narrative-engine.ts` | 고급 서사 시스템 |
| 액션 참여 시스템 | `lib/action-engagement-system.ts` | 시너지/콤보 시스템 |
| API 엔드포인트 | `app/api/gemini/route.ts` | 메인 AI API |

### 1.3 게임 모드

| 모드 | 설명 | 핸들러 |
|------|------|--------|
| `choice` | 기본 선택지 모드 | `handlePlayerChoice()` |
| `dialogue` | 캐릭터 대화 모드 | `handleDialogueSelect()` |
| `exploration` | 장소 탐험 모드 | `handleExplore()` |

---

## 2. 게임 상태 구조

### 2.1 SaveState 전체 구조

```typescript
interface SaveState {
  // 컨텍스트 정보
  context: ActionContext;         // Day, AP, 현재 상황

  // 커뮤니티 정보
  community: {
    survivors: Survivor[];        // 생존자 목록
    relationships: Relationship[]; // 관계 상태
  };

  // 서사 정보
  log: string;                    // 현재 서사 텍스트
  dilemma: {
    prompt: string;               // 상황 설명
    choice_a: string;             // 선택지 A
    choice_b: string;             // 선택지 B
    choice_c?: string;            // 선택지 C (선택적)
  };
  chatHistory: ChatMessage[];     // 전체 대화 기록

  // 스탯 정보
  stats: Record<string, number>;  // { statId: value }

  // 캐릭터 발전
  characterArcs: CharacterArc[];  // 캐릭터별 발전 추적

  // 결정 기록
  keyDecisions: KeyDecision[];    // 주요 결정 히스토리

  // 월드 상태 (Phase 6)
  worldState?: WorldState;        // 동적 세계 상태

  // 주인공 지식 (Phase 7)
  protagonistKnowledge?: ProtagonistKnowledge;
}
```

### 2.2 ActionContext 구조

```typescript
interface ActionContext {
  currentDay: number;             // 현재 Day
  actionPoints: number;           // 남은 AP
  maxActionPoints: number;        // 하루 최대 AP
  currentSituation: string;       // "큰 통로에서"
  discoveredClues: DiscoveredClue[];  // 발견한 단서
  characterPresences: CharacterPresence[];  // 캐릭터 위치
  todayActions: {
    explorations: ExplorationRecord[];
    dialogues: DialogueRecord[];
    choices: ChoiceRecord[];
  };
  importantInfoPieces: string[];  // 중요 정보
}
```

### 2.3 CharacterArc 구조

```typescript
interface CharacterArc {
  characterName: string;
  trustLevel: number;             // -100 ~ +100
  currentMood: 'hopeful' | 'anxious' | 'angry' | 'resigned' | 'determined';
  moments: {
    day: number;
    type: string;
    description: string;
    impact: 'positive' | 'negative' | 'neutral';
  }[];
}
```

---

## 3. 게임 플로우 다이어그램

### 3.1 전체 게임 플로우

```
┌─────────────────────────────────────────────────────────────────┐
│                      게임 전체 플로우                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 시나리오 로드                                                │
│     └── Firebase에서 ScenarioData 가져오기                       │
│                        ↓                                        │
│  2. 초기 상태 생성 (createInitialSaveState)                      │
│     ├── 스탯 초기화 (id, initialValue, min/max)                  │
│     ├── 캐릭터 + 랜덤 특성 배정                                   │
│     ├── 숨겨진 관계 설정                                          │
│     ├── ActionContext 생성                                       │
│     ├── CharacterArcs 생성                                       │
│     ├── WorldState 생성                                          │
│     └── ProtagonistKnowledge 초기화                              │
│                        ↓                                        │
│  3. 스토리 오프닝 (storyOpening이 있는 경우)                      │
│     ├── Phase 1: Prologue (평범한 일상)                          │
│     ├── Phase 2: Inciting Incident (사건 발생)                   │
│     └── Phase 3: First Encounter (첫 NPC 만남)                   │
│                        ↓                                        │
│  4. 초기 딜레마 생성                                              │
│     └── AI로 첫 선택 상황 생성 OR 폴백 선택지 사용                 │
│                        ↓                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              5. 메인 게임 루프                            │    │
│  │  ┌─────────────────────────────────────────────────────┐│    │
│  │  │  플레이어 액션 선택                                  ││    │
│  │  │  (choice / dialogue / exploration)                  ││    │
│  │  └──────────────────────┬──────────────────────────────┘│    │
│  │                         ↓                               │    │
│  │  ┌─────────────────────────────────────────────────────┐│    │
│  │  │  AP 검증 → AI 응답 생성 → 상태 업데이트               ││    │
│  │  └──────────────────────┬──────────────────────────────┘│    │
│  │                         ↓                               │    │
│  │  ┌─────────────────────────────────────────────────────┐│    │
│  │  │  AP 소모 → Day 체크 → 엔딩 체크                      ││    │
│  │  └──────────────────────┬──────────────────────────────┘│    │
│  │                         ↓                               │    │
│  │              엔딩 조건 미충족 시 루프 반복                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                        ↓                                        │
│  6. 엔딩 처리                                                    │
│     ├── 레거시: EndingArchetype 조건 기반                        │
│     └── 동적: AI가 ActionHistory 기반 엔딩 생성                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 단일 액션 처리 플로우

```
┌─────────────────────────────────────────────────────────────────┐
│                   단일 액션 처리 플로우                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  플레이어 액션                                                   │
│      ↓                                                          │
│  1. AP 검증                                                     │
│     ├── 동적 비용 계산 (신뢰도, 익숙도 기반)                      │
│     └── AP 부족 시 액션 불가                                     │
│      ↓                                                          │
│  2. 채팅 기록에 플레이어 메시지 추가                              │
│      ↓                                                          │
│  3. AI 응답 생성                                                 │
│     ├── 프롬프트 구성 (prompt-builder.ts)                        │
│     │   ├── 시스템 프롬프트 (페르소나, 장르, 지침)                │
│     │   └── 유저 프롬프트 (컨텍스트, 액션, 상태)                  │
│     ├── Gemini API 호출                                          │
│     └── JSON 응답 파싱                                           │
│      ↓                                                          │
│  4. 응답 검증                                                    │
│     ├── 언어 품질 체크 (>50% 한국어)                             │
│     ├── JSON 구조 검증                                           │
│     └── 필요시 자동 정리                                         │
│      ↓                                                          │
│  5. 상태 업데이트 (updateSaveState)                              │
│     ├── 스탯 변경 (증폭 적용)                                    │
│     ├── 관계 변경                                                │
│     ├── 플래그 획득                                              │
│     ├── 발견 정보 추가                                           │
│     ├── 캐릭터 아크 업데이트                                     │
│     └── WorldState 업데이트                                      │
│      ↓                                                          │
│  6. 액션 기록                                                    │
│     ├── ActionHistory에 추가 (동적 엔딩용)                       │
│     ├── KeyDecision에 기록 (플래시백용)                          │
│     └── ChangeSummary 계산                                       │
│      ↓                                                          │
│  7. AP 소모                                                     │
│     ├── 동적 비용 적용                                           │
│     └── actionsThisDay에 추가                                    │
│      ↓                                                          │
│  8. Day 진행 체크                                                │
│     └── AP ≤ 0 이면:                                            │
│         ├── currentDay + 1                                      │
│         ├── AP → maxAP 리셋                                     │
│         ├── actionsThisDay 리셋                                  │
│         ├── ActionContext 업데이트                               │
│         └── WorldState Day 진행                                  │
│      ↓                                                          │
│  9. 엔딩 체크                                                    │
│     ├── canCheckEnding() 확인                                    │
│     ├── 조건 평가                                                │
│     └── 엔딩 트리거 시 게임 종료                                  │
│      ↓                                                          │
│  10. UI 업데이트                                                 │
│      ├── 서사 표시                                               │
│      ├── 변경 요약 표시                                          │
│      └── 새 딜레마 표시                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 4개 메인 핸들러 상세

### 4.1 handlePlayerChoice() - 선택 처리

```typescript
// 플로우
1. AP 검증 (동적 비용: climax 단계 1.5, 기본 1.0)
2. 플레이어 메시지 채팅 기록에 추가
3. generateGameResponse() 호출
4. 응답 검증 (언어, JSON)
5. updateSaveState()로 상태 업데이트
6. 액션 시너지 적용
7. KeyDecision 기록
8. AP 소모 + Day 체크
9. 엔딩 체크

// 특징
- 미리 정의된 선택지 + 자유 텍스트 입력 지원
- 시너지 보너스 적용
- 서사 콜백을 위한 결정 기록
```

### 4.2 handleDialogueSelect() - 대화 처리

```typescript
// 플로우
1. AP 검증 (신뢰도 기반 동적 비용)
   - 신뢰도 ≥60: 0.5 AP
   - 신뢰도 ≤-30: 1.5 AP
   - 기본: 1.0 AP
2. generateDialogueResponse() 호출
3. 플레이어 질문 + 캐릭터 응답 채팅에 추가
4. 관계 변경 적용
5. 획득 정보 처리
6. 캐릭터 아크 업데이트 (기분, 모멘트)
7. AP 소모 + Day/엔딩 체크

// 특징
- 신뢰도 기반 동적 AP 비용
- 문맥적 대화 주제 생성
- 다중 대화 카테고리 (info, advice, relationship, personal)
- 숨겨진 정보 언락 가능
```

### 4.3 handleExplore() - 탐험 처리

```typescript
// 플로우
1. AP 검증 (위치/익숙도 기반 동적 비용)
   - 익숙한 장소: 0.5 AP
   - 위험한 장소 (후반): 1.5 AP
   - 기본: 1.0 AP
2. processExploration()으로 WorldState 처리
3. generateExplorationResult()로 AI 서사 생성
4. 발견 아이템 WorldState에 추가
5. 위치 상태 변경 (explored, destroyed, blocked)
6. 스탯 보상 적용
7. AP 소모 + Day/엔딩 체크

// 특징
- Day와 발견에 따른 동적 위치
- WorldState와 통합된 세계 진행
- 구체적 발견 (아이템, 문서, 장비)
- 위치 상태 추적
```

### 4.4 공통 패턴

모든 핸들러가 따르는 동일 패턴:
```
AP 검증 → 액션 실행 → 상태 업데이트 → AP 소모 → Day 체크 → 엔딩 체크
```

---

## 5. AI 프롬프트 시스템

### 5.1 복잡도 레벨

| 레벨 | 토큰 | 절약률 | 용도 |
|------|------|--------|------|
| Minimal | ~300 | 90% | 기본 응답 |
| Lite | ~800 | 60% | 최적 품질/효율 (권장) |
| Full | ~2000 | 0% | 완전한 컨텍스트 |
| Detailed | 가변 | - | 특수 분석 |

### 5.2 시스템 프롬프트 구조

```
1. 스토리 작가 페르소나 (도경)
   - 한국어 서사 스타일 가이드라인
   - 딜레마 설계 원칙
   - 긴장감 관리 규칙

2. 서사 단계 가이드라인
   - ACT 1 Setup: Day 1-2 (소개, 확립)
   - ACT 2 Rising Action: Day 3-4 (갈등 고조)
   - ACT 2 Midpoint: Day 5 (전환점)
   - ACT 3 Climax: Day 6-7 (해결)

3. 장르별 가이드 (15+ 장르)
   - narrativeTone, dialogueStyle, pacingNote
   - thematicFocus, dilemmaTypes, emotionalRange

4. 현재 컨텍스트
   - 캐릭터 관계
   - 스토리 히스토리
   - 월드 상태

5. 플레이어 행동 분석
   - 액션 참여 시스템 데이터
```

### 5.3 AI 응답 구조

```typescript
{
  log: string,              // 서사 응답
  dilemma: {
    prompt: string,         // 상황/질문
    choice_a: string,       // 선택지 1
    choice_b: string,       // 선택지 2
    choice_c?: string       // 선택지 3 (선택적)
  },
  statChanges: {
    scenarioStats: {},      // { statId: 변화량 }
    survivorStatus: [],     // 상태 업데이트
    hiddenRelationships_change: [],  // 관계 델타
    flags_acquired: [],     // 이벤트 플래그
    locations_discovered: [] // 새 위치
  }
}
```

---

## 6. 스탯 증폭 시스템

### 6.1 증폭 규칙

```typescript
// 현재 백분율에 따른 증폭
극단값 (0-25% 또는 75-100%): 1.2x (완만)
중간값 (25-75%): 2.0x (극적 긴장)

// 예시
현재값: 60/100 (60%)
AI 제안: +8
증폭 계산: 60% = 중간값 → 2.0x
증폭된 변화: 8 × 2.0 = 16
최종값: 60 + 16 = 76 (범위 제한 적용)
```

### 6.2 몰입형 UI 표시

```
❌ "생존 기반 +16" (메카닉 노출)
✅ "생존 기반이 크게 향상되었다!" (서사적 표현)
```

---

## 7. Day 진행 시스템

### 7.1 기본 7일 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    7일 서사 구조                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Day 1-2: Setup 단계 (30%)                                  │
│  ├── 세계와 캐릭터 확립                                       │
│  ├── 초기 관계 형성                                          │
│  ├── 주요 갈등 소개                                          │
│  └── 루트 분기 아직 미활성                                    │
│                                                             │
│  Day 3-4: Rising Action 단계 (30%)                          │
│  ├── 초기 선택의 결과                                        │
│  ├── 루트 분기 활성화 (서사 경로 형성 시작)                    │
│  ├── 캐릭터 발전 심화                                        │
│  └── 스테이크 증가                                           │
│                                                             │
│  Day 5: Midpoint (15%)                                      │
│  ├── 전환점 순간                                             │
│  ├── 주요 반전 또는 변화                                     │
│  ├── 루트 명확화                                             │
│  └── 엔딩 체크 활성화                                        │
│                                                             │
│  Day 6-7: Climax (25%)                                      │
│  ├── 최종 대결                                               │
│  ├── 결과 구체화                                             │
│  ├── 루트가 스토리 방향 결정                                  │
│  └── Day 7 이후 게임 종료                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 AP 리셋 로직

```typescript
AP ≤ 0 일 때:
  currentDay += 1
  actionPoints = maxActionPoints
  actionsThisDay = []
  // 새 Day 시스템 메시지 채팅에 추가
```

---

## 8. 루트 시스템

### 8.1 기본 3개 루트

| 루트 | 설명 | 점수 기준 |
|------|------|-----------|
| 탈출 | 상황에서 벗어나기 | 탈출 관련 플래그/선택 |
| 항전 | 버티고 싸우기 | 전투/저항 관련 액션 |
| 협상 | 평화적 해결 | 대화/협력 액션 |

### 8.2 루트 활성화

- **routeActivationDay** (기본 Day 3): 루트 분기 가시화
- Day 3 이전: "미정" 표시
- Day 3 이후: 누적 플래그 점수 기반 루트 계산

---

## 9. 엔딩 시스템

### 9.1 레거시 엔딩 시스템

```typescript
// 조건 기반 평가
EndingArchetype {
  endingId: string;
  title: string;
  description: string;
  isGoalSuccess: boolean;
  systemConditions: [
    { required_stat: { statId, comparison, value } },
    { required_flag: { flagName } },
    { survivor_count: { comparison, value } }
  ]
}

// 평가 로직
- Day 5 이후 (configurable) 체크 시작
- 모든 systemConditions AND로 평가
- 조건 미충족 시 "결단의 시간" 폴백 엔딩
```

### 9.2 동적 엔딩 시스템 (2025 Enhanced)

```typescript
DynamicEndingConfig {
  enabled: boolean;
  endingDay: number;              // 엔딩 체크 Day
  warningDays: number;            // 경고 시작 몇 일 전
  goalType: 'manual' | 'auto';
  evaluationCriteria: {
    goalWeight: number;           // 목표 달성 가중치
    relationshipWeight: number;   // 관계 가중치
    moralWeight: number;          // 도덕적 선택 가중치
    narrativeWeight: number;      // 서사 일관성 가중치
  };
  narrativeGuidelines: string;
  endingToneHints: string[];
}

// AI가 ActionHistory 기반으로 고유 엔딩 생성
```

---

## 10. 액션 참여 시스템

### 10.1 동적 AP 비용

| 액션 유형 | 조건 | AP 비용 |
|-----------|------|---------|
| 대화 | 신뢰도 ≥60 | 0.5 |
| 대화 | 신뢰도 ≤-30 | 1.5 |
| 대화 | 기본 | 1.0 |
| 탐험 | 익숙한 장소 | 0.5 |
| 탐험 | 위험 장소 | 1.5 |
| 탐험 | 기본 | 1.0 |
| 선택 | Climax 단계 | 1.5 |
| 선택 | 기본 | 1.0 |

### 10.2 액션 시너지

```
exploration → dialogue: 정보 언락 보너스
dialogue → choice: 스탯 보너스
exploration → exploration: 모멘텀 보너스
```

### 10.3 콤보 시스템

| 콤보 | 패턴 | 효과 |
|------|------|------|
| 정보수집 | 탐험 → 대화 → 탐험 | 발견 보너스 |
| 신중함 | 탐험 → 대화(조언) → 선택 | 결과 개선 |
| 결단력 | 연속 3회 선택 | 스탯 보너스 |

---

## 11. 월드 상태 시스템 (Phase 6)

### 11.1 WorldState 구조

```typescript
WorldState {
  locations: WorldLocation[];        // 위치 목록
  discoveries: ConcreteDiscovery[];  // 발견 아이템
  events: WorldEvent[];              // 트리거된 이벤트
  objectRelations: ObjectRelation[]; // 아이템 관계
}
```

### 11.2 위치 상태

| 상태 | 설명 |
|------|------|
| available | 탐험 가능 |
| explored | 탐험 완료 |
| destroyed | 파괴됨 |
| blocked | 접근 불가 |
| hidden | 숨겨짐 |
| locked | 잠김 |

---

## 12. 언어 품질 관리

### 12.1 다층 검증

1. **AI 생성** - Gemini가 한국어 서사 강제
2. **응답 파싱** - JSON 오류 graceful 처리
3. **언어 정리** - 비한국어 문자 제거
4. **비율 검증** - >50% 한국어 콘텐츠 확인
5. **제어 문자 제거** - 유효하지 않은 유니코드 정리
6. **사용자 알림** - 감지 시 언어 경고 표시

---

## 13. 시스템 통합 맵

```
┌─────────────────────────────────────────────────────────────────┐
│                    GameClient.tsx (메인 오케스트레이터)          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 4 메인 핸들러                                               ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ 1. handlePlayerChoice()   → generateGameResponse           ││
│  │ 2. handleDialogueSelect() → generateDialogueResponse       ││
│  │ 3. handleExplore()        → generateExplorationResult      ││
│  │ 4. (handlePlayerChoice에 통합 - 자유 텍스트)                ││
│  └─────────────────────────────────────────────────────────────┘│
│                         ↓                           ↓           │
│  ┌───────────────────────────┐   ┌────────────────────────────┐│
│  │ AI APIs                   │   │ 상태 관리                   ││
│  ├───────────────────────────┤   ├────────────────────────────┤│
│  │ /api/gemini              │   │ updateSaveState()          ││
│  │ /api/dialogue            │   │ - 스탯 증폭                 ││
│  │ /api/exploration         │   │ - 관계 델타                 ││
│  │ /api/ending              │   │ - 플래그 획득               ││
│  └───────────┬───────────────┘   │ - 캐릭터 아크              ││
│              ↓                    │ - KeyDecisions             ││
│  ┌───────────────────────────┐   └───────────┬────────────────┘│
│  │ prompt-builder.ts        │               ↓                  │
│  │ - 복잡도 선택             │   ┌────────────────────────────┐│
│  │ - 컨텍스트 조립           │   │ 시스템 모듈                 ││
│  │ - 페르소나 가이드         │   ├────────────────────────────┤│
│  │ - 장르 스타일링           │   │ ending-checker.ts          ││
│  │ - 시너지 주입             │   │ gameplay-config.ts         ││
│  │ - 히스토리 참조           │   │ action-engagement-system   ││
│  └───────────────────────────┘   │ ai-narrative-engine        ││
│                                   │ world-state-manager        ││
│                                   │ context-manager            ││
│                                   └────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 14. 향후 분석 대상 (고도화 포인트)

### 14.1 식별된 개선 영역

| 영역 | 현재 상태 | 잠재적 개선 |
|------|-----------|-------------|
| AI 응답 일관성 | 기본 검증 | 자체 평가 루프 강화 |
| 프롬프트 효율 | Lite 레벨 | 컨텍스트 압축 최적화 |
| 엔딩 다양성 | 조건 기반 | 더 세밀한 분기 |
| 캐릭터 발전 | 기분/신뢰도 | 심층 성격 시스템 |
| 월드 상태 | 기본 추적 | 더 복잡한 인과관계 |

### 14.2 단계별 상세 분석 필요 항목

1. **AI 응답 품질**
   - 서사 일관성 평가
   - 캐릭터 음성 일관성
   - 선택지 의미 분화

2. **게임 밸런스**
   - AP 비용 조정
   - 스탯 증폭 튜닝
   - 엔딩 도달 가능성

3. **UX 분석**
   - 정보 과부하 측정
   - 선택 피로도
   - 피드백 명확성

4. **성능 최적화**
   - API 호출 최소화
   - 상태 업데이트 효율
   - 메모리 사용량

---

## 15. 부록: 메시지 타입

| 타입 | 설명 | 스타일링 |
|------|------|----------|
| `system` | 시스템 알림, Day 변경 | 중립적 |
| `player` | 플레이어 선택 | 강조 |
| `ai` | 일반 AI 서사 | 기본 |
| `ai-dialogue` | 캐릭터 대화 | 인용 스타일 |
| `ai-thought` | 내적 독백 | 이탤릭 |
| `ai-narration` | 장면 묘사 | 최소 스타일 |
| `change-summary` | 스탯/관계 변경 요약 | 강조 |

---

*이 보고서는 시나리오 플레이 시스템의 분석 결과입니다. 시나리오 생성 → 플레이까지의 전체 파이프라인 이해를 위한 기초 자료로 활용됩니다.*
