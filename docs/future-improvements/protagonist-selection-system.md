# 주인공 선택 시스템 개선

## 작성일: 2025-12-13
## 상태: ✅ 구현 완료 (Phase 1 + Phase 2 + Phase 3)

---

## 1. 구현 완료 요약

### 1.1 구현된 기능

| 항목 | 파일 | 설명 |
|------|------|------|
| **타입 정의** | `types/index.ts` | `Character.isPlayable`, `Character.isDefaultProtagonist`, `Character.personalGoal`, `Character.playerGoalOverride`, `CharacterStoryOpening`, `ScenarioData.characterStoryOpenings` |
| **캐릭터 선택 UI** | `ScenarioDetailClient.tsx` | 시나리오 상세 → 게임 시작 사이에 캐릭터 선택 화면 |
| **쿼리 파라미터 전달** | `game/[scenarioId]/page.tsx` | `?protagonist=ROLE_ID` 쿼리 파라미터 처리 |
| **주인공 식별** | `GameClient.tsx` | `selectedProtagonistId` 기반 주인공 식별 함수, `getStoryOpeningForProtagonist()` |
| **AI 프롬프트** | `prompt-builder.ts` | 선택된 주인공 시점으로 프롬프트 생성 |
| **AI 생성 지원** | `ai-generate/route.ts` | 캐릭터 생성 시 `isPlayable`, `isDefaultProtagonist`, `personalGoal` 필드, `character_openings` 카테고리 |
| **Admin UI** | `CharacterContent.tsx` | 플레이 가능/기본 주인공 체크박스, personalGoal 입력 필드 |
| **검증 로직** | `scenario-validator.ts` | 플레이 가능 캐릭터 및 기본 주인공 검증 |

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

## 4. Phase 3 구현 완료 (2025-12-13)

### 4.1 ✅ Admin UI 확장 - 캐릭터 편집 (구현 완료)

**파일**: `components/admin/ScenarioEditor/CharacterContent.tsx`

**구현 내용**:
```typescript
// 캐릭터 편집 폼에 추가할 필드
<div className="flex items-center gap-4 mt-4">
  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={character.isPlayable || false}
      onChange={(e) => updateCharacter({ ...character, isPlayable: e.target.checked })}
    />
    <span>플레이 가능</span>
  </label>

  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={character.isDefaultProtagonist || false}
      onChange={(e) => {
        // 하나만 true 가능하도록 처리
        if (e.target.checked) {
          // 다른 캐릭터의 isDefaultProtagonist를 false로
          characters.forEach(c => c.isDefaultProtagonist = false);
        }
        updateCharacter({ ...character, isDefaultProtagonist: e.target.checked });
      }}
    />
    <span>기본 주인공</span>
  </label>
</div>
```

**검증 로직** (`lib/scenario-validator.ts` 확장):
```typescript
// 플레이 가능 캐릭터 검증
if (scenario.characters.filter(c => c.isPlayable).length === 0) {
  issues.push({
    type: 'warning',
    message: '플레이 가능한 캐릭터가 없습니다. 기존 방식(protagonistSetup.name)으로 동작합니다.',
    field: 'characters.isPlayable',
  });
}

// 기본 주인공 중복 검증
const defaultProtagonists = scenario.characters.filter(c => c.isDefaultProtagonist);
if (defaultProtagonists.length > 1) {
  issues.push({
    type: 'error',
    message: '기본 주인공은 1명만 설정 가능합니다.',
    field: 'characters.isDefaultProtagonist',
  });
}
```

---

### 4.2 ✅ 시나리오 생성 시스템 확장 (구현 완료)

**파일**: `app/api/admin/ai-generate/route.ts`

**현재 vs 개선**:

| 항목 | 현재 | 개선 후 |
|------|------|---------|
| `synopsis` | 주인공 시점 고정 | 시점 중립적 또는 다중 시점 |
| `playerGoal` | 주인공 목표 고정 | 캐릭터별 목표 분리 |
| `storyOpening` | 주인공 경험 고정 | 캐릭터별 오프닝 또는 동적 생성 |

**AI 생성 프롬프트 수정안**:
```typescript
// 시놉시스 생성 시 - 시점 중립적으로 유도
const synopsisPrompt = `
시나리오 시놉시스를 생성하세요.

**중요**: 특정 캐릭터 시점이 아닌, 상황 중심으로 서술하세요.
- ❌ "강하늘은 사건을 조사하게 되는데..."
- ✅ "도시에 연쇄 살인 사건이 발생하고, 각자의 동기를 가진 인물들이 진실에 접근한다..."

플레이어가 어떤 캐릭터를 선택해도 자연스럽게 읽히도록 작성하세요.
`;

// 캐릭터 생성 시 - 각 캐릭터의 개인 목표/동기 명시
const characterPrompt = `
각 캐릭터에 대해 다음을 포함하세요:
- personalGoal: 이 캐릭터만의 개인적 목표
- motivation: 사건에 연루된 동기
- perspective: 사건을 바라보는 시각
`;
```

**타입 확장** (`types/index.ts`):
```typescript
export type Character = {
  // ... 기존 필드
  /** 캐릭터의 개인적 목표 (플레이어가 이 캐릭터로 플레이 시 표시) */
  personalGoal?: string;
  /** 이 캐릭터의 시점에서의 플레이어 목표 */
  playerGoalOverride?: string;
};
```

---

### 4.3 ✅ 캐릭터별 오프닝 시스템 (구현 완료)

**타입 정의** (`types/index.ts`):
```typescript
/** 캐릭터별 오프닝 설정 */
export type CharacterStoryOpening = {
  /** 프롤로그 (캐릭터 시점) */
  prologue?: string;
  /** 촉발 사건 (캐릭터가 경험하는 방식) */
  incitingIncident?: string;
  /** 첫 번째로 만나는 캐릭터 (자신 제외) */
  firstCharacterToMeet?: string;
  /** 첫 만남 상황 설명 */
  firstEncounterContext?: string;
  /** 오프닝 장소 */
  openingLocation?: string;
};

export type ScenarioData = {
  // ... 기존 필드
  /** 캐릭터별 오프닝 설정 (동적 주인공 선택용) */
  characterStoryOpenings?: Record<string, CharacterStoryOpening>;
};
```

**AI 생성 확장** (`ai-generate/route.ts`):
```typescript
// 'character_openings' 카테고리 추가
case 'character_openings':
  return {
    prompt: `플레이 가능한 각 캐릭터(isPlayable=true)에 대해 개별 오프닝을 생성하세요.

각 캐릭터별로:
- prologue: 이 캐릭터의 일상/시작 장면 (100-150자)
- incitingIncident: 이 캐릭터가 사건에 휘말리는 순간 (80-120자)
- firstCharacterToMeet: 처음 만나는 다른 캐릭터 이름
- openingLocation: 오프닝 장소

**제약사항**:
- 각 캐릭터의 시점에서 1인칭 서술 가능하도록
- 다른 캐릭터의 비밀이나 숨겨진 관계는 포함하지 않음
- 자기 자신은 firstCharacterToMeet에서 제외
`,
    schema: {
      type: SchemaType.OBJECT,
      properties: {
        characterOpenings: {
          type: SchemaType.OBJECT,
          additionalProperties: {
            type: SchemaType.OBJECT,
            properties: {
              prologue: { type: SchemaType.STRING },
              incitingIncident: { type: SchemaType.STRING },
              firstCharacterToMeet: { type: SchemaType.STRING },
              openingLocation: { type: SchemaType.STRING },
            },
          },
        },
      },
    },
  };
```

**GameClient.tsx 수정안**:
```typescript
// 스토리 오프닝 선택 로직
const getStoryOpeningForProtagonist = (
  scenario: ScenarioData,
  selectedProtagonistId?: string
): StoryOpening => {
  // 1. 캐릭터별 오프닝이 있고, 선택된 캐릭터가 있으면 사용
  if (selectedProtagonistId && scenario.characterStoryOpenings) {
    const protagonistName = scenario.characters.find(
      c => c.roleId === selectedProtagonistId
    )?.characterName;

    if (protagonistName && scenario.characterStoryOpenings[protagonistName]) {
      return {
        ...scenario.storyOpening, // 기본 설정 상속
        ...scenario.characterStoryOpenings[protagonistName], // 캐릭터별 오버라이드
      };
    }
  }

  // 2. 기존 storyOpening 사용
  return scenario.storyOpening || {};
};
```

---

### 4.4 ✅ Admin UI - 캐릭터별 오프닝 편집 (추후 구현)

**파일**: `components/admin/ScenarioEditor/StoryOpeningContent.tsx`

**UI 구조**:
```
[스토리 오프닝 설정]
├── [기본 오프닝] (기존)
│   ├── 프롤로그
│   ├── 촉발 사건
│   └── 첫 캐릭터 만남
│
└── [캐릭터별 오프닝] (신규)
    ├── [강하늘 (형사)] - 플레이 가능
    │   ├── 프롤로그 오버라이드
    │   ├── 촉발 사건 오버라이드
    │   └── 첫 만남 캐릭터: 한서아
    │
    ├── [한서아 (의사)] - 플레이 가능
    │   ├── 프롬로그 오버라이드
    │   └── 첫 만남 캐릭터: 강하늘
    │
    └── [AI 일괄 생성] 버튼
```

---

### 4.5 구현 현황

| 우선순위 | 항목 | 복잡도 | 상태 |
|---------|------|--------|------|
| 1 | Admin UI - isPlayable/isDefaultProtagonist 토글 | 낮음 | ✅ 완료 |
| 2 | 시나리오 검증 로직 확장 | 낮음 | ✅ 완료 |
| 3 | Character.personalGoal 필드 추가 | 중간 | ✅ 완료 |
| 4 | 캐릭터별 오프닝 타입/UI | 높음 | ✅ 완료 (UI는 추후) |
| 5 | AI 생성 character_openings 카테고리 | 높음 | ✅ 완료 |

---

### 4.6 예상 작업량

```
Phase 3.1: Admin UI 기본 (1-2시간)
- CharacterContent.tsx에 체크박스 추가
- scenario-validator.ts 검증 추가

Phase 3.2: 캐릭터 목표 시스템 (2-3시간)
- Character.personalGoal 타입 추가
- ai-generate characters 프롬프트 수정
- CharacterContent.tsx UI 추가
- GameClient에서 목표 표시 로직

Phase 3.3: 캐릭터별 오프닝 (4-6시간)
- CharacterStoryOpening 타입 정의
- StoryOpeningContent.tsx 캐릭터별 탭 UI
- ai-generate character_openings 카테고리
- GameClient getStoryOpeningForProtagonist() 로직
- prompt-builder.ts 오프닝 선택 로직
```

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
- **Phase 3 구현 완료**: 2025-12-13
  - Admin UI 체크박스 및 검증 로직
  - Character.personalGoal 필드 및 AI 생성 지원
  - CharacterStoryOpening 타입 및 AI 생성
  - getStoryOpeningForProtagonist() 로직
