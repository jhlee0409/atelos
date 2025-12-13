# 주인공 선택 시스템 개선 제안

## 작성일: 2025-12-13
## 상태: 제안 (추후 시나리오 생성 시스템 점검 시 구현 예정)

---

## 1. 현재 시스템의 한계

### 1.1 현재 주인공 식별 방식

```typescript
// 현재 구현 (GameClient.tsx, prompt-builder.ts)
const isProtagonist = (characterName: string, scenario: ScenarioData): boolean => {
  if (characterName === '(플레이어)') return true;
  const protagonistName = scenario.storyOpening?.protagonistSetup?.name;
  return protagonistName !== null && characterName === protagonistName;
};
```

### 1.2 문제점

| 문제 | 설명 |
|------|------|
| **식별 기준 모호** | 모든 캐릭터가 실제 이름을 가지고 있어, `protagonistSetup.name`만으로 주인공 구분이 불명확 |
| **시나리오 종속** | 시나리오 생성 시 주인공이 고정되어 플레이어 선택권 없음 |
| **유연성 부족** | 같은 시나리오를 다른 시점(캐릭터)으로 플레이할 수 없음 |

### 1.3 현재 주인공 판별 우선순위

1. `(플레이어)` 리터럴 체크
2. `storyOpening.protagonistSetup.name` 일치 체크

→ 다른 NPC와 이름이 겹치면 오동작 가능

---

## 2. 제안: 동적 주인공 선택 시스템

### 2.1 UX 플로우

```
[로비] → [시나리오 상세] → [캐릭터 선택] → [게임 시작]
                              │
                              ▼
                    ┌─────────────────────┐
                    │ 플레이할 캐릭터 선택  │
                    ├─────────────────────┤
                    │ ○ 강하늘 (형사)      │ ← 기본 선택 (시나리오 추천)
                    │ ○ 한서아 (의사)      │
                    │ ○ 박준경 (기자)      │
                    │ ○ ...               │
                    └─────────────────────┘
                              │
                              ▼
                    선택된 캐릭터 = 주인공
```

### 2.2 데이터 모델 변경

```typescript
// types/index.ts 추가
interface GameSession {
  scenarioId: string;
  selectedProtagonistId: string;  // 플레이어가 선택한 주인공
  startedAt: Date;
}

// ScenarioData 확장
interface ScenarioData {
  // ... 기존 필드
  playableCharacters?: string[];  // 플레이 가능한 캐릭터 ID 목록
  defaultProtagonist?: string;    // 기본 주인공 (시나리오 추천)
}
```

### 2.3 구현 위치

| 파일 | 변경 내용 |
|------|----------|
| `app/scenarios/[scenarioId]/page.tsx` | 캐릭터 선택 UI 추가 |
| `app/game/[scenarioId]/page.tsx` | 선택된 주인공 ID를 쿼리 파라미터로 받기 |
| `GameClient.tsx` | `selectedProtagonistId` 기반 주인공 식별 |
| `prompt-builder.ts` | 선택된 주인공 시점으로 프롬프트 생성 |

---

## 3. 주요 과제

### 3.1 시나리오 생성 시스템 수정 필요

현재 시나리오 생성 시 특정 주인공 기준으로 생성됨:

| 항목 | 현재 | 개선 후 |
|------|------|---------|
| `synopsis` | 주인공 시점 고정 | 시점 중립적 또는 다중 시점 |
| `playerGoal` | 주인공 목표 고정 | 캐릭터별 목표 분리 |
| `storyOpening` | 주인공 경험 고정 | 캐릭터별 오프닝 또는 동적 생성 |
| `protagonistSetup` | 단일 주인공 | 다중 플레이어블 캐릭터 |

### 3.2 오프닝 시스템 확장

```typescript
// 현재: 단일 오프닝
storyOpening: {
  protagonistSetup: { name: "강하늘", ... },
  prologue: "강하늘의 시점에서...",
}

// 개선 후: 캐릭터별 오프닝
storyOpenings: {
  "강하늘": {
    prologue: "형사 강하늘은...",
    firstCharacterToMeet: "한서아",
  },
  "한서아": {
    prologue: "응급의학과 한서아는...",
    firstCharacterToMeet: "강하늘",
  },
}
```

### 3.3 AI 생성 시 고려사항

시나리오 AI 생성 시 (`/api/admin/ai-generate`) 수정 필요:
- 각 캐릭터의 동기와 목표 명시
- 시점 중립적 시놉시스 생성
- 캐릭터별 오프닝 자동 생성 옵션

---

## 4. 구현 우선순위

### Phase 1: 기본 인프라 (낮음)
- [ ] `GameSession` 타입 추가
- [ ] 캐릭터 선택 UI 컴포넌트
- [ ] `selectedProtagonistId` 전달 경로

### Phase 2: 주인공 식별 리팩토링 (중간)
- [ ] 세션 기반 주인공 식별로 전환
- [ ] `isProtagonist()` 함수 시그니처 변경
- [ ] 관련 컴포넌트 업데이트

### Phase 3: 시나리오 생성 확장 (높음)
- [ ] 다중 플레이어블 캐릭터 지원
- [ ] 캐릭터별 오프닝 생성
- [ ] AI 생성 프롬프트 수정

---

## 5. 대안 고려

### 5.1 간단한 대안: 주인공 마커

```typescript
// Character 타입에 isPlayable 추가
interface Character {
  // ... 기존 필드
  isPlayable?: boolean;  // true면 플레이어가 선택 가능
  isDefaultProtagonist?: boolean;  // true면 기본 주인공
}
```

장점: 최소한의 변경으로 구현 가능
단점: 시나리오/오프닝 문제 해결 안 됨

### 5.2 장기 대안: 멀티 시점 시나리오

완전히 새로운 시나리오 포맷:
- 각 캐릭터의 시점에서 동일 사건을 다르게 경험
- 라쇼몽 스타일 서사 구조
- 구현 복잡도 매우 높음

---

## 6. 관련 파일

- `app/scenarios/[scenarioId]/ScenarioDetailClient.tsx` - 캐릭터 선택 UI 추가 위치
- `app/game/[scenarioId]/GameClient.tsx` - 주인공 식별 로직
- `lib/prompt-builder.ts` - AI 프롬프트 생성
- `app/api/admin/ai-generate/route.ts` - 시나리오 AI 생성
- `types/index.ts` - 타입 정의

---

## 7. 참고

이 문서는 **추후 시나리오 생성 시스템 종합 점검 시** 함께 검토할 예정입니다.

현재 구현된 주인공 식별 시스템(`isProtagonist`, `filterNPCs`)은 임시 방편으로,
`protagonistSetup.name`이 설정된 시나리오에서만 정상 동작합니다.
