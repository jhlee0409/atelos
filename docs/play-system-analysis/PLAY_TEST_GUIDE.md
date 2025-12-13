# 플레이 테스트 가이드

## 개요

플레이 테스트 로거는 실제 게임 플레이 중 각 Stage의 동작을 자동으로 기록하고 검증합니다.
개발 환경(`pnpm dev`)에서 자동으로 활성화됩니다.

---

## 사용법

### 1. 개발 서버 시작

```bash
pnpm dev
```

브라우저에서 게임 페이지 접속 시 콘솔에 아래 메시지가 표시됩니다:

```
╔════════════════════════════════════════════════════════════╗
║  🎮 ATELOS 플레이 테스트 로거 활성화                         ║
╠════════════════════════════════════════════════════════════╣
║  사용법:                                                    ║
║  • window.__ATELOS__.verify()    : 검증 체크리스트 출력      ║
║  • window.__ATELOS__.getReport() : 전체 리포트 객체          ║
║  • window.__ATELOS__.export()    : JSON 문자열 (복사용)      ║
║  • copy(window.__ATELOS__.export()) : 클립보드에 복사        ║
║  • window.__ATELOS__.clear()     : 로그 초기화               ║
╚════════════════════════════════════════════════════════════╝
```

### 2. 게임 플레이

정상적으로 게임을 플레이합니다. 각 행동에서 자동으로 로그가 기록됩니다.

### 3. 검증 체크리스트 확인

브라우저 콘솔에서:

```javascript
window.__ATELOS__.verify()
```

출력 예시:

```
📋 ========== 검증 체크리스트 ==========

【Stage 1】
  ✅ protagonistKnowledge.metCharacters 초기화
     └─ 1명: 박지원
  ✅ characterArcs.trustLevel이 initialRelationships 반영
     └─ 박지원: 20, 김철수: 0
  ✅ worldState.locations 초기화
     └─ 5개 위치
  ✅ actionContext.currentLocation 설정
     └─ 본부

【Stage 2】
  ✅ 오프닝 서사 chatHistory 추가
     └─ 3개 메시지
  ✅ characterArcs 첫 만남 moment 추가
     └─ 1명에게 moment 추가
...

📊 ========== 요약 ==========
  ✅ 통과: 15
  ❌ 실패: 0
  ⚠️ 경고: 3
  ⬜ 미확인: 7
  📝 총 액션: 12
  📅 현재 Day: 3
```

### 4. 리포트 복사

브라우저 콘솔에서:

```javascript
// 방법 1: 클립보드에 직접 복사
copy(window.__ATELOS__.export())

// 방법 2: 콘솔에 JSON 출력
console.log(window.__ATELOS__.export())
```

---

## 검증 항목

### Stage 1: 게임 초기화
| 항목 | 자동 검증 |
|------|----------|
| protagonistKnowledge.metCharacters 초기화 | ✅ |
| characterArcs.trustLevel이 initialRelationships 반영 | ✅ |
| worldState.locations 초기화 | ✅ |
| actionContext.currentLocation 설정 | ✅ |

### Stage 2: 스토리 오프닝
| 항목 | 자동 검증 |
|------|----------|
| 오프닝 서사 chatHistory 추가 | ✅ |
| metCharacters 첫 만남 캐릭터 추가 | ⬜ (수동) |
| characterArcs 첫 만남 moment 추가 | ✅ |
| actionContext.currentSituation 업데이트 | ✅ |

### Stage 3: 메인 게임 루프
| 항목 | 자동 검증 |
|------|----------|
| handlePlayerChoice 정상 동작 | ⬜ (수동) |
| handleDialogueSelect metCharacters 자동 추가 | ⬜ (수동) |
| handleExplore informationPieces 추가 | ⬜ (수동) |
| keyDecisions 기록 | ⬜ (수동) |
| 시너지 보너스 적용 | ⬜ (수동) |
| AP 소모 정상 동작 | ⬜ (수동) |

### Stage 4: AI 응답 처리
| 항목 | 자동 검증 |
|------|----------|
| 스탯 변화 적용 (증폭 시스템) | ✅ |
| urgentMatters 자동 업데이트 | ✅ |
| informationPieces 중복 제거 | ⬜ (수동) |
| NPC 관계 힌트 감지 (hidden→hinted) | ✅ |
| NPC 관계 공개 (hinted→revealed) | ✅ |

### Stage 5: 엔딩 시스템
| 항목 | 자동 검증 |
|------|----------|
| Dynamic Ending 트리거 | ✅ |
| characterArcs 엔딩 프롬프트 전달 | ⬜ (수동) |
| discoveredInfo 엔딩 프롬프트 전달 | ⬜ (수동) |

---

## 리포트 구조

```typescript
{
  sessionId: "session_1702468123456",
  scenarioId: "ZERO_HOUR",
  scenarioTitle: "제로 아워",
  startTime: "2024-12-13T12:00:00.000Z",
  endTime: "2024-12-13T12:30:00.000Z",  // 엔딩 시에만
  snapshots: [
    {
      timestamp: "2024-12-13T12:00:01.000Z",
      stage: "Stage 1: 게임 초기화",
      data: { /* 상태 스냅샷 */ }
    },
    {
      timestamp: "2024-12-13T12:00:05.000Z",
      stage: "Stage 2: 스토리 오프닝",
      data: { /* 상태 스냅샷 */ }
    },
    {
      timestamp: "2024-12-13T12:01:00.000Z",
      stage: "Stage 3: 메인 게임 루프",
      action: "choice",
      data: { /* 액션 상세 */ }
    },
    // ...
  ],
  verifications: [
    {
      category: "Stage 1",
      item: "protagonistKnowledge.metCharacters 초기화",
      status: "pass",
      details: "1명: 박지원"
    },
    // ...
  ],
  summary: {
    totalActions: 12,
    currentDay: 3,
    endingTriggered: "dynamic",  // 또는 "legacy"
    errors: []
  }
}
```

---

## 수동 검증 가이드

### Stage 3 검증 (메인 게임 루프)

1. **선택지 선택 후 확인**
   - 콘솔에 `📸 [Stage 3] choice 액션:` 로그 확인
   - `keyDecisions` 배열에 새 결정 추가됐는지 확인

2. **대화 후 확인**
   - 처음 대화하는 캐릭터가 `metCharacters`에 추가됐는지
   - `infoGained`가 있으면 `informationPieces`에 추가됐는지

3. **탐색 후 확인**
   - `informationPieces`에 탐색 결과 추가됐는지
   - `worldState.locations` 상태 변경됐는지

### Stage 4 검증 (AI 응답 처리)

1. **urgentMatters 확인**
   - 스탯이 40% 이하로 떨어지면 `urgentMatters` 배열에 경고 추가
   - 콘솔 로그: `📸 [Stage 4] AI 응답 처리:` 의 `urgentMatters` 확인

2. **NPC 관계 힌트 확인**
   - AI 응답에 두 NPC가 동시에 언급되면 관계 힌트 감지
   - `npcRelationshipStates`의 visibility 변화 확인

### Stage 5 검증 (엔딩)

1. **Dynamic Ending**
   - 엔딩 Day에 도달하면 자동 생성
   - SDT 점수와 만족도 확인

2. **Legacy Ending**
   - 조건 만족 시 트리거
   - `endingId`, `title`, `isGoalSuccess` 확인

---

## 트러블슈팅

### 로거가 활성화되지 않음
- 개발 환경(`pnpm dev`)에서만 자동 활성화됨
- 프로덕션에서는 수동 활성화 필요:
  ```javascript
  window.__ATELOS__.enable()
  ```

### 로그가 너무 많음
- 로거 비활성화:
  ```javascript
  window.__ATELOS__.disable()
  ```

### 이전 세션 로그 삭제
```javascript
window.__ATELOS__.clear()
```

---

## 테스트 시나리오 체크리스트

### 기본 플로우
- [ ] 게임 시작 → Stage 1 스냅샷 확인
- [ ] 오프닝 완료 → Stage 2 스냅샷 확인
- [ ] 선택지 선택 → Stage 3/4 스냅샷 확인
- [ ] 대화 → metCharacters 추가 확인
- [ ] 탐색 → informationPieces 추가 확인
- [ ] 엔딩 → Stage 5 스냅샷 확인

### 특수 케이스
- [ ] 스탯 40% 이하 → urgentMatters 확인
- [ ] 두 NPC 언급 → 관계 힌트 확인
- [ ] 시너지 보너스 → 연속 행동 시 확인
- [ ] AP 소진 → Day 전환 확인

---

## 관련 파일

| 파일 | 설명 |
|------|------|
| `lib/play-test-logger.ts` | 로거 구현 |
| `app/game/[scenarioId]/GameClient.tsx` | 로깅 호출부 |
| `docs/play-system-analysis/*.md` | Stage별 상세 문서 |
