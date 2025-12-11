# 행동 게이지 시스템 리서치 문서

> 작성일: 2025-12-10
> 목적: ATELOS 내러티브 게임에 행동 게이지 시스템 도입을 위한 사전 리서치

---

## 1. 개요

### 1.1 현재 시스템의 한계

기존 ATELOS 시스템에서는 특정 시점(턴 수) 이후에 자동으로 day가 전환되는 방식을 사용했습니다. 이 방식의 한계점:

- 플레이어가 day 전환 시점을 예측하기 어려움
- 선택 이외의 다양한 액션(탐색, 대화 등)을 추가할 때 복잡성 증가
- 플레이어의 전략적 선택에 대한 무게감 부족

### 1.2 행동 게이지 시스템 도입 목적

1. **신중한 선택 유도**: 제한된 자원(행동 포인트)을 통해 플레이어가 각 선택의 무게를 느낄 수 있음
2. **다양한 액션 지원**: 탐색, 캐릭터 대화, 메인 선택 등 다양한 행동을 일관된 시스템으로 관리
3. **Day 전환 명확화**: 행동 게이지 소진 시 다음 날로 전환되는 직관적인 시스템

---

## 2. 행동 포인트 시스템의 이론적 배경

### 2.1 액션 이코노미(Action Economy) 개념

**정의**: 게임 내에서 플레이어가 주어진 시간/턴 동안 수행할 수 있는 행동의 양과 질을 관리하는 시스템

> "An 'action' is a resource in quite a real sense. And perhaps it's even the most valuable resource, because no matter what else you're spending, you're also spending an action."
> — [Brain Games: Action Point Allocation in Board Games](https://brain-games.com/en-us/blogs/board-game-explorer/what-is-action-point-allocation-in-board-games)

### 2.2 핵심 설계 원칙

**의미 있는 선택(Meaningful Choices)의 4가지 요소**:

| 요소 | 설명 |
|------|------|
| **Consequences** | 선택이 게임 세계나 내러티브에 영향을 미침 |
| **Relevance** | 선택이 플레이어의 목표와 관련됨 |
| **Uncertainty** | 결과가 불확실하거나 여러 가능성 존재 |
| **Significance** | 선택의 영향이 눈에 띄게 나타남 |

> 출처: [MoldStud: Designing for Player Agency](https://moldstud.com/articles/p-designing-for-player-agency-in-video-games-providing-choices-and-consequences)

### 2.3 리소스로서의 행동 포인트

행동 포인트는 본질적으로 **전략적 자원**입니다:

- 모든 행동에는 비용이 따름
- 플레이어는 제한된 정보로 최선의 선택을 해야 함
- 모든 원하는 행동을 수행할 수 없기에 **우선순위 결정**이 필요

> "Action points are a system to allow players to make choices within a framework of an action economy. They restrict players to choosing the best action at the time with limited information."
> — [Vibrant Bliss: Philosophy of Tabletop Game Design](https://vibrantbliss.wordpress.com/2020/08/21/philosophy-of-tabletop-game-design-action-points/)

---

## 3. 레퍼런스 게임 분석

### 3.1 Persona 시리즈 - 시간 관리 시스템

**핵심 메커니즘**:
- 하루가 여러 시간대(방과 후, 저녁 등)로 나뉨
- 각 시간대에 1가지 활동만 선택 가능
- 활동 종류: Social Link/Confidant, 스탯 향상, 던전 탐험, 아르바이트 등

**적용 포인트**:
```
시간대 = 행동 게이지
활동 = 선택, 탐색, 캐릭터 대화
```

> "Time management is one of Persona's main mechanics, and so it's important to get the most out of every in-game day."
> — [Gamers with Glasses: Scheduling Life in Persona](https://www.gamerswithglasses.com/features/take-your-time-scheduling-life-in-the-persona-series)

**Persona 5 Royal 특징**:
- 캘린더 기반 데드라인 시스템
- 팰리스(던전) 마감일 전까지 완료 필요
- 일상 활동과 전투의 균형 필요

> 출처: [eXputer: Persona 5 Royal's Time Management](https://exputer.com/features/persona-5-royal-time-management-and-strategy/)

### 3.2 Baldur's Gate 3 - 전투 액션 이코노미

**턴당 행동 구조**:
| 행동 유형 | 설명 |
|-----------|------|
| **Action** | 메인 행동 (공격, 주문 등) |
| **Bonus Action** | 보조 행동 (특수 스킬) |
| **Movement** | 이동 |
| **Free Action** | 자유 행동 |
| **Reaction** | 반응 행동 |

**설계 원칙**:
> "The Action Economy is a way of measuring how much one character should be able to accomplish in a given amount of real-world time."
> — [DualShockers: BG3 Action Economy Explained](https://www.dualshockers.com/baldurs-gate-3-action-economy-explained/)

**ATELOS 적용 시사점**:
- 행동 유형별 차등 비용 고려 가능
- 메인 선택 vs 보조 행동(탐색, 대화) 분리

### 3.3 서바이벌 호러 장르 - 자원 기반 긴장감

**핵심 철학**:
> "Health is a resource, Ammo is a resource, Saving is a resource."
> — [Survival Horrors: Survival Horror vs Action Horror](https://survivalhorrors.com/survival-horror-vs-action-horror)

**의사결정의 무게감**:
- "지금 치료할까 vs 한 번 더 버틸까?"
- "이 적과 싸울까 vs 도망칠까?"
- "지금 세이브할까 vs 조금 더 진행할까?"

**ATELOS 적용 시사점**:
- 행동 게이지 잔량에 따른 긴장감 조성
- "이 선택에 행동 포인트를 쓸 가치가 있는가?" 고민 유도

### 3.4 Until Dawn / Dark Pictures Anthology - 선택 기반 내러티브

**버터플라이 이펙트 시스템**:
- 작은 선택부터 큰 도덕적 선택까지 영향
- 캐릭터의 생존/사망에 직접 영향
- 시간 제한 하의 빠른 결정

> "Heavy choices that majorly affect the story are often tasked to a character under time constraints."
> — [GameRant: Horror Games Where Choices Matter](https://gamerant.com/horror-games-choices-matter/)

### 3.5 보드게임 사례 - Java, Tigris & Euphrates

**Java (6 AP 시스템)**:
- 턴당 6 포인트
- 9가지 행동 중 선택
- 각 행동 비용 1-2 포인트

**Tigris & Euphrates (2 AP 시스템)**:
- 턴당 2 행동 포인트
- 단순하지만 깊은 전략

> "Euro games often use action points to combine strategic depth with straightforward gameplay."
> — [Brain Games](https://brain-games.com/en-us/blogs/board-game-explorer/what-is-action-point-allocation-in-board-games)

---

## 4. 고정 vs 가변 행동 게이지

### 4.1 고정 행동 게이지

**장점**:
- 예측 가능성 높음
- 구현 복잡도 낮음
- 플레이어 학습 곡선 완만
- 밸런싱 용이

**단점**:
- 상황 반영 부족
- 단조로움 위험
- 내러티브 긴급성 표현 제한

**적합한 경우**:
- 초기 프로토타입
- 단순하고 직관적인 UX 우선

### 4.2 가변 행동 게이지

**변동 요소 예시**:

| 요소 | 영향 |
|------|------|
| 플레이어 체력/피로도 | 낮을수록 행동 감소 |
| 스탯 상태 (stress 등) | 높은 스트레스 = 행동 감소 |
| 외부 상황 (위기 등) | 긴급 상황 = 추가 행동 or 감소 |
| 특정 아이템/버프 | 일시적 행동 증가 |
| Day 진행도 | 후반부 긴장감 위해 감소 |

**장점**:
- 동적인 게임플레이
- 내러티브와 메커니즘 연동
- 리플레이 가치 증가

**단점**:
- 밸런싱 난이도 높음
- 플레이어 혼란 가능성
- 예측 불가능한 상황 발생

### 4.3 권장: 하이브리드 접근

**기본 구조**: 고정 기본값 + 상황적 보너스/페널티

```
일일 행동 게이지 = 기본값(3) + 보너스(-1 ~ +1)

보너스 예시:
- 체력 > 70%: +1
- 스트레스 > 80%: -1
- 특수 아이템 사용: +1 (일회성)
- D-Day 임박 (Day 6+): -1 긴장감 표현
```

---

## 5. ATELOS 적용 설계 고려사항

### 5.1 핵심 질문과 답변

**Q1: 유저의 행동 트래킹이 엔딩에 잘 반영되는가?**

**권장 접근**:
- 각 행동에 메타데이터 태깅
- 행동 유형별 집계 (탐색 횟수, 대화 횟수, 주요 선택)
- `KeyDecision` 시스템 확장하여 행동 패턴 기록

```typescript
interface ActionRecord {
  day: number;
  actionType: 'choice' | 'dialogue' | 'exploration';
  target?: string;  // 캐릭터명 또는 장소명
  outcome: 'success' | 'partial' | 'fail';
  relatedFlags: string[];
  statChanges: Record<string, number>;
}
```

**Q2: 고정 vs 가변 행동 게이지?**

**1단계 권장**: 고정 시스템으로 시작
- 일일 3-4 행동 포인트
- 명확하고 예측 가능
- 플레이테스트 후 가변 요소 추가

**2단계 확장**: 상황적 수정자 도입
- 스탯 기반 보너스/페널티
- 스토리 이벤트 기반 변동

### 5.2 행동 비용 설계

| 행동 유형 | 비용 | 근거 |
|-----------|------|------|
| **메인 선택 (Dilemma)** | 1 AP | 핵심 내러티브 진행 |
| **캐릭터 대화** | 1 AP | 관계/정보 획득 |
| **장소 탐색** | 1 AP | 자원/정보 획득 |
| **자유 텍스트 입력** | 1 AP | 커스텀 행동 |
| **휴식/회복** | 1 AP | 스탯 회복 (선택적) |

**대안: 차등 비용 시스템**
```
메인 선택: 2 AP (무게감)
탐색/대화: 1 AP (보조 행동)
일일 한도: 4 AP
```

### 5.3 Day 전환 로직

```typescript
const ACTION_POINTS_PER_DAY = 3;

function handleAction(actionType: string, saveState: SaveState) {
  // 1. 행동 수행
  const result = executeAction(actionType, saveState);

  // 2. AP 소모
  const newActionPoints = saveState.actionPoints - 1;

  // 3. Day 전환 체크
  if (newActionPoints <= 0) {
    return advanceDay({
      ...saveState,
      currentDay: saveState.currentDay + 1,
      actionPoints: ACTION_POINTS_PER_DAY,
      // 가변 시스템 적용 시:
      // actionPoints: calculateDailyAP(saveState)
    });
  }

  return { ...saveState, actionPoints: newActionPoints };
}
```

### 5.4 UI/UX 고려사항

**표시 요소**:
- 현재 잔여 행동 포인트 (아이콘 또는 게이지)
- 각 행동의 비용 명시
- Day 전환 임박 경고 (1 AP 남았을 때)

**시각적 피드백**:
```
[🔵🔵⚪] Day 3 - 2/3 행동 남음
[🔵⚪⚪] Day 3 - 1/3 행동 남음 ⚠️ 마지막 행동!
```

### 5.5 엔딩 시스템 연동

**기존 시스템과의 통합**:
- `ending-checker.ts`의 Day 체크 로직 유지
- 행동 게이지 소진으로 Day가 자연스럽게 증가
- Day 5+ 엔딩 조건 체크 동일

**행동 패턴 기반 엔딩 분기**:
```typescript
// 탐색 중심 플레이 → 정보 기반 엔딩 우대
// 대화 중심 플레이 → 관계 기반 엔딩 우대
// 선택 중심 플레이 → 결단 기반 엔딩 우대
```

---

## 6. 페이싱과 긴장감 설계

### 6.1 게임 진행에 따른 긴장감 곡선

> "We usually experience the baseline pace: perform X number of actions per turn and as the game progresses we get more actions or actions become more powerful."
> — [Games Precipice: Pacing](https://www.gamesprecipice.com/pacing/)

**ATELOS 긴장감 설계**:

```
Day 1-2: 탐색 단계
  - 넉넉한 행동 포인트 (4 AP)
  - 탐색/대화 장려
  - 세계관 이해

Day 3-4: 발전 단계
  - 표준 행동 포인트 (3 AP)
  - 관계/플래그 구축
  - 전략적 선택 필요

Day 5-6: 긴장 단계
  - 감소된 행동 포인트 (2-3 AP)
  - 엔딩 조건 활성화
  - 선택의 무게 증가

Day 7: 결전 단계
  - 최소 행동 포인트 (2 AP)
  - 최종 선택
  - 타임 리밋 엔딩 임박
```

### 6.2 휴식과 액션의 균형

> "Well timed rests or breaks will make the action moments feel intense again when they start back up."
> — [World of Level Design: Pacing](https://www.worldofleveldesign.com/categories/wold-members-tutorials/peteellis/level-design-pacing-gameplay-beats-part1.php)

**적용**: 탐색/대화를 "휴식" 역할로 활용
- 메인 선택 = 긴장 (액션)
- 캐릭터 대화 = 이완 (정보 + 관계)
- 장소 탐색 = 발견 (보상 + 준비)

---

## 7. 잠재적 과제와 해결 방안

### 7.1 결정 피로(Decision Fatigue)

**문제**: 매 행동마다 "무엇을 할까" 고민 → 플레이어 피로

**해결**:
- 행동 선택지를 3-4개로 제한
- 상황에 따라 추천 행동 하이라이트
- "빠른 진행" 옵션 (AI가 다음 행동 제안)

### 7.2 최적화 플레이 압박

**문제**: "최적의 행동 순서"를 찾아야 한다는 부담

**해결**:
- 여러 경로가 유효함을 명시
- "정답"이 아닌 "선호"에 따른 분기 설계
- 행동 순서보다 총 행동 패턴이 중요

### 7.3 진행 차단(Soft Lock)

**문제**: 잘못된 행동 선택으로 엔딩 도달 불가

**해결**:
- 최소 1개 이상의 엔딩은 항상 도달 가능하도록 설계
- 폴백 엔딩 유지 ("결단의 시간")
- 행동 게이지와 무관하게 최종 Day에 강제 엔딩 체크

---

## 8. 구현 우선순위 권장

### Phase 1: 기본 시스템 (MVP)
1. 고정 행동 포인트 시스템 (3 AP/day)
2. 기존 choice/dialogue/exploration을 1 AP로 통합
3. AP 소진 시 자동 Day 전환
4. UI에 AP 표시

### Phase 2: 피드백 및 개선
1. 플레이테스트 데이터 수집
2. 적정 AP 수 조정
3. 행동별 차등 비용 검토
4. 긴장감 곡선 조정

### Phase 3: 고급 기능
1. 가변 AP 시스템 도입
2. 스탯 기반 AP 보너스/페널티
3. 행동 패턴 기반 엔딩 분기
4. 특수 아이템/이벤트 연동

---

## 9. 참고 자료

### 게임 디자인 이론
- [Brain Games: Action Point Allocation](https://brain-games.com/en-us/blogs/board-game-explorer/what-is-action-point-allocation-in-board-games)
- [Vibrant Bliss: Philosophy of Action Points](https://vibrantbliss.wordpress.com/2020/08/21/philosophy-of-tabletop-game-design-action-points/)
- [MoldStud: Designing for Player Agency](https://moldstud.com/articles/p-designing-for-player-agency-in-video-games-providing-choices-and-consequences)
- [Games Precipice: Pacing](https://www.gamesprecipice.com/pacing/)

### 레퍼런스 게임
- [eXputer: Persona 5 Royal Time Management](https://exputer.com/features/persona-5-royal-time-management-and-strategy/)
- [DualShockers: BG3 Action Economy](https://www.dualshockers.com/baldurs-gate-3-action-economy-explained/)
- [Survival Horrors: Survival Horror vs Action Horror](https://survivalhorrors.com/survival-horror-vs-action-horror)
- [GameRant: Horror Games Choices Matter](https://gamerant.com/horror-games-choices-matter/)

### 내러티브 디자인
- [Gamedeveloper: Comparing Social Links in Persona](https://www.gamedeveloper.com/design/same-but-different---comparing-the-social-link-system-in-persona-3-4-5)
- [Gamers with Glasses: Scheduling Life in Persona](https://www.gamerswithglasses.com/features/take-your-time-scheduling-life-in-the-persona-series)
- [Mind Studios: Turn-Based Game Development](https://games.themindstudios.com/post/turn-based-game-development/)

### 2024-2025 트렌드
- [Derek Ex Machina: Rewriting Turn-Based RPG Narrative](https://www.derekexmachina.com/blog/2025/6/10/its-time-to-rewrite-the-narrative-about-turn-based-rpgs)
- [Turn Based Lovers: New Turn-Based RPGs 2025](https://turnbasedlovers.com/news/new-turn-based-rpgs-to-play-november-7-2025/)

---

## 10. 결론

행동 게이지 시스템은 ATELOS의 핵심 목표인 **플레이어 에이전시 강화**와 **의미 있는 선택**을 지원하는 효과적인 메커니즘입니다.

**핵심 권장사항**:
1. **단순하게 시작**: 고정 3 AP 시스템으로 MVP 구현
2. **일관된 비용**: 모든 행동 1 AP로 시작, 이후 차등화 검토
3. **명확한 피드백**: UI에서 잔여 AP와 Day 전환 임박을 명시
4. **유연한 엔딩**: 행동 패턴과 무관하게 최소 1개 엔딩 보장
5. **점진적 확장**: 플레이테스트 후 가변 시스템 도입

이 시스템을 통해 플레이어는 제한된 자원 내에서 전략적 선택을 하며, 각 행동의 무게를 느끼면서도 다양한 플레이 스타일을 경험할 수 있습니다.
