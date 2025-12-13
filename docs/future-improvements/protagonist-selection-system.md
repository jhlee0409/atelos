# 주인공 선택 시스템 개선

## 작성일: 2025-12-13
## 상태: ✅ 구현 완료 (Phase 1 + Phase 2)

---

## 1. 구현 완료 요약

### 1.1 구현된 기능

| 항목 | 파일 | 설명 |
|------|------|------|
| **타입 정의** | `types/index.ts` | `Character.isPlayable`, `Character.isDefaultProtagonist`, `ScenarioData.playableCharacters`, `ScenarioData.defaultProtagonist` |
| **캐릭터 선택 UI** | `ScenarioDetailClient.tsx` | 시나리오 상세 → 게임 시작 사이에 캐릭터 선택 화면 |
| **쿼리 파라미터 전달** | `game/[scenarioId]/page.tsx` | `?protagonist=ROLE_ID` 쿼리 파라미터 처리 |
| **주인공 식별** | `GameClient.tsx` | `selectedProtagonistId` 기반 주인공 식별 함수 |
| **AI 프롬프트** | `prompt-builder.ts` | 선택된 주인공 시점으로 프롬프트 생성 |
| **AI 생성 지원** | `ai-generate/route.ts` | 캐릭터 생성 시 `isPlayable`, `isDefaultProtagonist` 필드 |

### 1.2 주인공 식별 우선순위

```typescript
// 현재 구현 (GameClient.tsx, prompt-builder.ts)
const isProtagonist = (characterName: string, scenario: ScenarioData, selectedProtagonistId?: string): boolean => {
  // 1. "(플레이어)" 마커는 항상 주인공
  if (characterName === '(플레이어)') return true;
  // 2. selectedProtagonistId로 선택된 캐릭터와 이름이 일치하면 주인공
  if (selectedProtagonistId) {
    const selectedChar = scenario.characters.find((c) => c.roleId === selectedProtagonistId);
    if (selectedChar && selectedChar.characterName === characterName) return true;
  }
  // 3. protagonistSetup.name과 일치하면 주인공 (레거시 호환)
  const protagonistName = scenario.storyOpening?.protagonistSetup?.name || null;
  return protagonistName !== null && characterName === protagonistName;
};
```

---

## 2. UX 플로우

```
[로비] → [시나리오 상세] → [게임 시작 버튼 클릭]
                                      │
                                      ▼
                          ┌─────────────────────┐
                          │ 플레이할 캐릭터 선택  │
                          ├─────────────────────┤
                          │ ● 강하늘 (형사)      │ ← 기본 선택 (isDefaultProtagonist)
                          │ ○ 한서아 (의사)      │
                          │ ○ 박준경 (기자)      │
                          └─────────────────────┘
                                      │
                                      ▼
                          선택된 캐릭터 = 주인공
                          ?protagonist=ROLE_DETECTIVE
```

---

## 3. 구현 상세

### 3.1 타입 정의 (`types/index.ts`)

```typescript
export type Character = {
  // ... 기존 필드
  /** 플레이어가 이 캐릭터로 플레이 가능한지 여부 */
  isPlayable?: boolean;
  /** 시나리오의 기본 주인공인지 여부 */
  isDefaultProtagonist?: boolean;
};

export type ScenarioData = {
  // ... 기존 필드
  /** 플레이 가능한 캐릭터 ID 목록 (동적 주인공 선택용) */
  playableCharacters?: string[];
  /** 기본 주인공 캐릭터 ID (시나리오 추천) */
  defaultProtagonist?: string;
};
```

### 3.2 캐릭터 선택 UI (`ScenarioDetailClient.tsx`)

- `PlayableCharacterCard` 컴포넌트: 선택 가능한 캐릭터 카드
- `getPlayableCharacters()`: 플레이 가능한 캐릭터 필터링
- `getDefaultProtagonistId()`: 기본 주인공 ID 가져오기
- 게임 시작 시 `?protagonist={selectedProtagonistId}` 쿼리 파라미터 전달

### 3.3 주인공 식별 함수 (`GameClient.tsx`)

```typescript
// 주인공 이름 가져오기
const getProtagonistName = (scenario: ScenarioData, selectedProtagonistId?: string): string | null

// 캐릭터가 주인공인지 확인
const isProtagonist = (characterName: string, scenario: ScenarioData, selectedProtagonistId?: string): boolean

// NPC만 필터링 (주인공 제외)
const filterNPCs = (characters: Character[], scenario: ScenarioData, selectedProtagonistId?: string): Character[]

// 주인공 캐릭터 객체 가져오기
const getProtagonistCharacter = (scenario: ScenarioData, selectedProtagonistId?: string): Character | undefined
```

### 3.4 AI 프롬프트 생성 (`prompt-builder.ts`)

```typescript
// 프롬프트용 주인공 식별 함수
const getProtagonistNameForPrompt = (scenario: ScenarioData, selectedProtagonistId?: string): string | null
const isProtagonistForPrompt = (characterName: string, scenario: ScenarioData, selectedProtagonistId?: string): boolean
const filterNPCsForPrompt = (characters: Character[], scenario: ScenarioData, selectedProtagonistId?: string): Character[]

// 옵션에 selectedProtagonistId 추가
buildOptimizedGamePrompt(scenario, playerState, playerAction, lastLog, complexity, {
  // ...
  selectedProtagonistId?: string;
})

// 스토리 오프닝 프롬프트
buildStoryOpeningPrompt(scenario, characters, selectedProtagonistId?)

// 초기 딜레마 프롬프트
buildInitialDilemmaPrompt(scenario, characters, selectedProtagonistId?)
```

### 3.5 게임 AI 클라이언트 (`game-ai-client.ts`)

```typescript
// 스토리 오프닝 생성
generateStoryOpening(scenario, characters, selectedProtagonistId?)

// 초기 딜레마 생성
generateInitialDilemma(saveState, scenario, useLiteVersion, selectedProtagonistId?)
generateInitialDilemmaWithOpening(saveState, scenario, useLiteVersion, selectedProtagonistId?)
```

---

## 4. 미구현 항목 (Phase 3 - 추후 검토)

### 4.1 시나리오 생성 시스템 확장

현재 시나리오 생성 시 특정 주인공 기준으로 생성됨:

| 항목 | 현재 | 개선 후 |
|------|------|---------|
| `synopsis` | 주인공 시점 고정 | 시점 중립적 또는 다중 시점 |
| `playerGoal` | 주인공 목표 고정 | 캐릭터별 목표 분리 |
| `storyOpening` | 주인공 경험 고정 | 캐릭터별 오프닝 또는 동적 생성 |

### 4.2 캐릭터별 오프닝 시스템

```typescript
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

### 4.3 Admin UI 확장

- 캐릭터 편집 시 `isPlayable`, `isDefaultProtagonist` 토글
- 시나리오 설정에서 플레이 가능 캐릭터 관리

---

## 5. 관련 파일

### 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `types/index.ts` | Character, ScenarioData 타입 확장 |
| `app/scenarios/[scenarioId]/ScenarioDetailClient.tsx` | 캐릭터 선택 UI 추가 |
| `app/game/[scenarioId]/page.tsx` | 쿼리 파라미터 처리 |
| `app/game/[scenarioId]/GameClient.tsx` | 주인공 식별 함수 업데이트, selectedProtagonistId 전달 |
| `lib/prompt-builder.ts` | 프롬프트 생성 함수 업데이트 |
| `lib/game-ai-client.ts` | AI 생성 함수 업데이트 |
| `app/api/admin/ai-generate/route.ts` | AI 생성 스키마에 필드 추가 |

---

## 6. 사용 방법

### 6.1 시나리오 데이터 설정

```json
{
  "characters": [
    {
      "roleId": "ROLE_DETECTIVE",
      "characterName": "강하늘",
      "isPlayable": true,
      "isDefaultProtagonist": true
    },
    {
      "roleId": "ROLE_DOCTOR",
      "characterName": "한서아",
      "isPlayable": true,
      "isDefaultProtagonist": false
    },
    {
      "roleId": "ROLE_VILLAIN",
      "characterName": "김악당",
      "isPlayable": false
    }
  ],
  "playableCharacters": ["ROLE_DETECTIVE", "ROLE_DOCTOR"],
  "defaultProtagonist": "ROLE_DETECTIVE"
}
```

### 6.2 레거시 호환성

- `isPlayable`이 설정되지 않은 시나리오는 기존 방식 (`protagonistSetup.name` 또는 `(플레이어)`) 사용
- `selectedProtagonistId` 없이 게임 시작 시 기존 로직으로 폴백

---

## 7. 구현 일자

- **Phase 1 & 2 구현 완료**: 2025-12-13
- **Phase 3 (시나리오 생성 확장)**: 추후 검토 예정
