# Stage 4: AI 응답 처리 (AI Response Processing) 상세 분석

## 1. 개요

AI 응답(AIResponse)을 받아 게임 상태(SaveState)에 반영하는 단계입니다.
핵심 함수는 `updateSaveState()`이며, 스탯 증폭, 관계 변화, 캐릭터 아크 업데이트 등을 처리합니다.

**핵심 파일**: `app/game/[scenarioId]/GameClient.tsx`
**함수 위치**: lines 535-1233

**관련 시스템** (★ 2025-12-13):
- 주인공 식별 시스템: NPC만 캐릭터 처리 대상으로 필터링
- 프롬프트 품질 강화: `lib/prompt-enhancers.ts`로 AI 응답 품질 개선

---

## 2. Stage 3에서 받는 데이터

| 데이터 | Stage 3에서 | Stage 4 용도 |
|--------|------------|-------------|
| `aiResponse` | generateGameResponse() 결과 | 상태 업데이트 입력 |
| `currentSaveState` | 핸들러의 현재 상태 | 업데이트 대상 |
| `scenario` | 시나리오 데이터 | 스탯 정의, NPC 관계 참조 |

### 2.1 AIResponse 구조

```typescript
interface AIResponse {
  log: string;                           // 서사 텍스트
  dilemma: {
    prompt: string;
    choice_a: string;
    choice_b: string;
    choice_c?: string;
  };
  statChanges: {
    scenarioStats: Record<string, number>;     // 스탯 변화
    survivorStatus: Array<{ name, newStatus }>;// 생존자 상태
    hiddenRelationships_change: Array<...>;    // 관계 변화
    // [v1.4 REMOVED] flags_acquired - Dynamic Ending System에서 ActionHistory로 대체
    locations_discovered?: Array<{name, description}>; // 발견 장소
  };
}
```

---

## 3. updateSaveState() 처리 순서

```
AIResponse
    │
    ├─→ 1. log, dilemma 저장
    │
    ├─→ 2. 채팅 기록에 AI 응답 추가
    │
    ├─→ 3. scenarioStats 처리 (증폭 시스템)
    │       ├─→ 한국어 → 영어 ID 매핑
    │       ├─→ 현재 비율에 따른 증폭 (25-75%: 2.0x, 극단: 1.2x)
    │       └─→ min/max 범위 clamp
    │
    ├─→ 4. survivorStatus 처리
    │       └─→ survivors[].status 업데이트
    │
    ├─→ 5. hiddenRelationships_change 처리
    │       ├─→ 문자열/객체 형식 파싱
    │       ├─→ 플레이어 이름 정규화 ("나", "리더" → "(플레이어)")
    │       └─→ -100~100 범위 clamp
    │
    ├─→ 6. [v1.4 REMOVED] flags_acquired 처리
    │       └─→ @deprecated - ActionHistory로 대체됨
    │
    ├─→ 7. 시간 처리 (remainingHours 또는 Day 태그)
    │
    ├─→ 8. characterArcs 업데이트
    │       ├─→ status 변화 → moments 추가
    │       └─→ 관계 변화 → trustLevel, mood 업데이트
    │
    ├─→ 9. 변화 요약 메시지 (changeSummary)
    │       └─→ 채팅 기록에 추가
    │
    ├─→ 10. [v1.2] 새로 만난 캐릭터 자동 감지
    │       ├─→ 서사에서 NPC 이름 언급 감지
    │       ├─→ metCharacters 업데이트
    │       └─→ community.survivors 추가
    │
    ├─→ 11. [v1.2] locations_discovered 처리
    │       ├─→ worldState에 장소 추가
    │       └─→ protagonistKnowledge.informationPieces 추가 ★ [Stage 4]
    │
    └─→ 12. [Stage 4] NPC 관계 힌트 감지 ★
            ├─→ 두 캐릭터 동시 언급 감지
            ├─→ npcRelationshipStates.visibility → 'hinted'
            └─→ protagonistKnowledge.hintedRelationships 추가
```

---

## 4. 핵심 처리 상세

### 4.1 스탯 증폭 시스템 (lines 610-688)

```typescript
// 현재 스탯 비율에 따른 증폭
const percentage = ((currentValue - min) / range) * 100;

let amplificationFactor: number;
if (percentage <= 25 || percentage >= 75) {
  // 극단적 상태: 최소 증폭 (안정화)
  amplificationFactor = 1.2;
} else {
  // 중간 구간: 적당한 증폭 (긴장감)
  amplificationFactor = 2.0;
}

const amplifiedChange = Math.round(originalChange * amplificationFactor);
const clampedChange = Math.max(min - currentValue, Math.min(max - currentValue, amplifiedChange));
```

### 4.2 관계 변화 처리 (lines 700-850)

**지원 형식**:
| 형식 | 예시 |
|------|------|
| 표준 문자열 | `"박준경-한서아:-5"` |
| 설명 문자열 | `"한서아:신뢰 상승"` |
| 쌍+설명 문자열 | `"박준경-한서아:갈등 심화"` |
| pair 객체 | `{ pair: "플레이어-한서아", change: 10 }` |
| 개별 필드 객체 | `{ personA: "박준경", personB: "한서아", change: -5 }` |

**플레이어 이름 정규화**:
```typescript
const normalizeName = (name: string) => {
  if (['플레이어', '리더', 'player', '나', '당신'].some(p => name.includes(p))) {
    return '(플레이어)';
  }
  return name;
};
```

### 4.3 [v1.2] 새로 만난 캐릭터 자동 감지 (lines 1114-1159)

**[2025-12-13 업데이트]**: 주인공 식별 시스템으로 NPC만 필터링

```typescript
// 이전: 하드코딩된 '(플레이어)' 체크
const allNpcNames = scenario.characters.filter(c => c.characterName !== '(플레이어)')
  .map(c => c.characterName);

// 현재: 주인공 식별 헬퍼 사용
const allNpcNames = filterNPCs(scenario.characters, scenario)
  .map(c => c.characterName);

allNpcNames.forEach((charName) => {
  // 아직 만나지 않은 캐릭터가 서사에 이름으로 언급되면
  if (!currentMetCharacters.includes(charName) && narrative.includes(charName)) {
    newlyIntroducedCharacters.push(charName);
  }
});

if (newlyIntroducedCharacters.length > 0) {
  // metCharacters 업데이트
  protagonistKnowledge.metCharacters = [...currentMetCharacters, ...newlyIntroducedCharacters];
  // community.survivors에도 추가
  // ...
}
```

### 4.4 [Stage 4] NPC 관계 힌트 감지 (lines 1195-1230)

```typescript
if (npcRelationshipStates && scenario.storyOpening?.hiddenNPCRelationships) {
  hiddenRelationships.forEach((rel) => {
    const relState = npcRelationshipStates.find(r => r.relationId === rel.relationId);

    if (relState && relState.visibility === 'hidden') {
      // 관계에 연결된 두 캐릭터 이름 추출
      const relatedChars = rel.relationId.split('-');

      // 서사에서 두 캐릭터가 함께 언급되면 힌트 상태로 변경
      const bothMentioned = relatedChars.length >= 2 &&
        relatedChars.every(charName => narrative.includes(charName));

      if (bothMentioned) {
        relState.visibility = 'hinted';

        // protagonistKnowledge에 힌트된 관계 추가
        if (!hintedRelationships.includes(rel.relationId)) {
          hintedRelationships.push(rel.relationId);
        }
      }
    }
  });
}
```

---

## 5. 데이터 흐름 (Stage 3 → Stage 4 → Stage 5)

```
Stage 3 핸들러
    │
    ├─→ generateGameResponse() ─→ AIResponse
    │
    └─→ updateSaveState(currentSaveState, aiResponse, scenario)
            │
            ├─→ 스탯 증폭 적용 ─────→ context.scenarioStats
            ├─→ 관계 변화 적용 ─────→ community.hiddenRelationships
            ├─→ [v1.4 REMOVED] 플래그 획득 → ActionHistory로 대체
            ├─→ 캐릭터 아크 ────────→ characterArcs
            ├─→ 새 캐릭터 감지 ─────→ protagonistKnowledge.metCharacters ★
            ├─→ 장소 발견 ──────────→ protagonistKnowledge.informationPieces ★
            └─→ 관계 힌트 감지 ─────→ npcRelationshipStates.visibility,
                                     protagonistKnowledge.hintedRelationships ★

Stage 5 (엔딩)에서 활용:
    ├─→ context.scenarioStats ─→ 엔딩 조건 체크
    ├─→ actionHistory ─────────→ 동적 엔딩 AI 프롬프트 (v1.4)
    ├─→ protagonistKnowledge ──→ 동적 엔딩 AI 프롬프트 ★
    └─→ npcRelationshipStates ─→ 동적 엔딩 AI 프롬프트 ★
```

---

## 6. 구현된 개선사항

### 6.1 커밋 1b11b62 (초기)

| 항목 | 이전 상태 | Stage 4 구현 |
|------|----------|-------------|
| locations_discovered → protagonistKnowledge | worldState만 업데이트 | informationPieces에도 추가 |
| NPC 관계 힌트 감지 | 없음 | 두 캐릭터 동시 언급 시 자동 힌트 |
| hintedRelationships 업데이트 | 없음 | 관계 힌트 시 자동 추가 |

### 6.2 Stage 4 개선 (현재)

| 개선 | 설명 | 위치 |
|------|------|------|
| **#1** hinted → revealed 전환 | 이미 hinted인 관계가 재언급되면 revealed로 전환 | updateSaveState:1319-1328 |
| **#1** 명시적 키워드 감지 | 관계 키워드(사이, 형제, 연인 등) 감지 시 바로 revealed | updateSaveState:1269-1274 |
| **#2** discoveredRelationships 사용 | revealed 상태 시 discoveredRelationships에 추가, hintedRelationships에서 제거 | updateSaveState:1308-1327 |

**테스트**: `tests/unit/ai-response-processing.test.ts` 13개 테스트 추가

---

## 7. 추가 개선 필요사항

### 7.1 잠재적 이슈

| 이슈 | 현재 상태 | 개선 제안 |
|------|----------|----------|
| ~~힌트 → 공개 전환 없음~~ | ✅ **해결됨** - Stage 4 개선 #1 | - |
| ~~관계 힌트 기준 단순~~ | ✅ **해결됨** - Stage 4 개선 #1 (명시적 키워드 감지) | - |
| ~~discoveredRelationships 미사용~~ | ✅ **해결됨** - Stage 4 개선 #2 | - |
| characterArcs.trustLevel 동기화 | 관계 변화 시 자동 업데이트 | 일관성 검증 로직 추가 |

### 7.2 handleDialogueSelect/handleExplore와의 일관성

| 처리 | updateSaveState | handleDialogueSelect | handleExplore |
|------|----------------|---------------------|---------------|
| 관계 변화 | 복잡한 파싱 로직 | 직접 계산 | 없음 |
| characterArcs 업데이트 | moments + mood | trustLevel + mood | 없음 |
| metCharacters 업데이트 | 서사 기반 자동 감지 | ✅ Stage 3 개선 #1에서 해결 | 없음 |

**참고**: ~~handleDialogueSelect에서 대화한 캐릭터가 metCharacters에 없어도 자동 추가되지 않음.~~
→ Stage 3 개선 #1에서 해결됨.

---

## 8. Stage 5로 전달되는 데이터

### 8.1 Stage 4 완료 후 SaveState 상태

```typescript
// updateSaveState() 처리 후 변화 필드
saveState = {
  context: {
    scenarioStats: { ...amplified },      // 증폭된 스탯 값
    // [v1.4 REMOVED] flags - ActionHistory로 대체됨
    protagonistKnowledge: {
      metCharacters: [...withNewChars],   // 새로 만난 캐릭터
      hintedRelationships: [...withHints], // ★ 힌트된 관계
      discoveredRelationships: [...withDiscovered], // ★ Stage 4 개선: 공개된 관계
      informationPieces: [...withLocations], // ★ 발견 장소 포함
    },
    npcRelationshipStates: [
      { relationId, visibility: 'hinted' | 'revealed' }, // ★ Stage 4 개선: revealed 상태 추가
    ],
  },
  community: {
    hiddenRelationships: { ...updated },  // 관계 변화 적용
    survivors: [...withNewSurvivors],     // 새 캐릭터 추가
  },
  characterArcs: [...withMoments],        // 모먼트, 무드 업데이트
  chatHistory: [...withChangeSummary],    // 변화 요약 추가
};
```

### 8.2 Stage 5 (동적 엔딩)에서 사용할 데이터

| 데이터 | Stage 5 용도 |
|--------|-------------|
| `protagonistKnowledge.metCharacters` | 엔딩 서사에 등장 가능 캐릭터 |
| `protagonistKnowledge.hintedRelationships` | 엔딩에서 관계 암시 가능 |
| `protagonistKnowledge.discoveredRelationships` | ★ Stage 4 개선: 엔딩에서 관계 명시 가능 |
| `protagonistKnowledge.informationPieces` | 플레이어가 아는 정보 기반 엔딩 |
| `npcRelationshipStates` | 공개된 관계(revealed)만 엔딩에 명시 |
| `context.scenarioStats` | 엔딩 조건 체크 |
| `actionHistory` | 동적 엔딩 조건 체크 (v1.4) |
| `characterArcs` | 캐릭터별 엔딩 결과 |

---

## 9. 검증 체크리스트

- [x] 스탯 증폭 시스템 정상 동작 확인
- [x] 관계 변화 다양한 형식 파싱 확인
- [x] [v1.4 REMOVED] 플래그 획득 처리 → ActionHistory로 대체됨
- [x] 캐릭터 아크 업데이트 확인
- [x] [v1.2] 새로 만난 캐릭터 자동 감지 확인
- [x] [Stage 4] locations_discovered → informationPieces 추가 확인
- [x] [Stage 4] NPC 관계 힌트 감지 확인
- [x] **[Stage 4 개선 #1]** hinted → revealed 전환 (재언급 시)
- [x] **[Stage 4 개선 #1]** 명시적 관계 키워드 감지 (바로 revealed)
- [x] **[Stage 4 개선 #2]** discoveredRelationships 업데이트
- [x] handleDialogueSelect의 대화 캐릭터 metCharacters 추가 (Stage 3 개선 #1에서 해결)

---

## 10. 코드 참조

| 위치 | 함수/섹션 | 역할 |
|------|----------|------|
| GameClient.tsx:535-1233 | updateSaveState() | 전체 AI 응답 처리 |
| GameClient.tsx:569-608 | mapStatNameToId() | 스탯 이름 매핑 |
| GameClient.tsx:610-688 | 스탯 증폭 로직 | 동적 증폭 계산 |
| GameClient.tsx:700-850 | 관계 변화 처리 | 다양한 형식 파싱 |
| GameClient.tsx:890-1020 | characterArcs 업데이트 | moments, mood, trust |
| GameClient.tsx:1114-1159 | 새 캐릭터 감지 | metCharacters 자동 추가 |
| GameClient.tsx:1161-1193 | locations_discovered 처리 | worldState + protagonistKnowledge |
| GameClient.tsx:1195-1230 | NPC 관계 힌트 감지 | visibility 업데이트 |
