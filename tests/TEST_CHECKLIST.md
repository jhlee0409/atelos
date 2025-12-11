# ATELOS 테스트 체크리스트

## 개요

이 문서는 ATELOS 프로젝트의 테스트 전략과 체크리스트를 정의합니다.

## 테스트 전략

### 테스트 피라미드

```
        ┌─────────────┐
        │   E2E       │ ← 최소화 (비용 높음)
        │   Tests     │
       ┌┴─────────────┴┐
       │ Integration   │ ← AI 품질 평가 포함
       │    Tests      │
      ┌┴───────────────┴┐
      │   Unit Tests    │ ← 대부분의 테스트
      │ (Deterministic) │
      └─────────────────┘
```

### 테스트 카테고리

1. **구조적 검증 (Structural Validation)** - 결정론적
   - AI 응답 구조 검증
   - 스탯 변화 범위 검증
   - 선택지 포맷 검증
   - 언어 품질 검증

2. **AI 품질 평가 (AI Quality Evaluation)** - Gemini Judge 사용
   - 서사 품질
   - 한국어 자연스러움
   - 캐릭터 일관성
   - 선택지 품질
   - 스토리 몰입도

3. **통합 테스트 (Integration Tests)**
   - 게임 플로우 검증
   - 엔딩 조건 체크
   - 상태 관리 검증

## 실행 명령어

```bash
# 전체 테스트 실행
pnpm test

# 감시 모드로 테스트
pnpm test:watch

# 커버리지 포함 테스트
pnpm test:coverage

# 유닛 테스트만
pnpm test:unit

# 통합 테스트만
pnpm test:integration

# AI 품질 테스트만
pnpm test:ai

# CI 환경용
pnpm test:ci
```

---

## 체크리스트

### 1. 유닛 테스트 체크리스트

#### 1.1 언어 검증 (`game-ai-client.ts`)

- [ ] `detectAndCleanLanguageMixing`
  - [ ] 정상 한국어 텍스트 통과
  - [ ] 아랍어 문자 감지 및 제거
  - [ ] 태국어 문자 감지 및 제거
  - [ ] 힌디어 문자 감지 및 제거
  - [ ] 키릴 문자 감지 및 제거
  - [ ] null/undefined 안전 처리
  - [ ] 연속 공백 정리

- [ ] `validateKoreanContent`
  - [ ] 순수 한국어 유효성 통과
  - [ ] 한국어 비율 검증
  - [ ] 빈 텍스트 처리
  - [ ] 짧은 텍스트 경고

- [ ] `validateChoiceFormat`
  - [ ] 올바른 형식 통과
  - [ ] 길이 검증 (15-80자)
  - [ ] 종결형 검증
  - [ ] 시스템 ID 노출 감지

- [ ] `validateStatChanges`
  - [ ] 정상 범위 통과 (±40)
  - [ ] 과도한 변화 보정
  - [ ] 숫자 아닌 값 처리

#### 1.2 엔딩 체크 (`ending-checker.ts`)

- [ ] `checkStatCondition`
  - [ ] greater_equal 비교
  - [ ] less_equal 비교
  - [ ] equal 비교
  - [ ] greater_than 비교
  - [ ] less_than 비교
  - [ ] not_equal 비교
  - [ ] 존재하지 않는 스탯 처리

- [ ] `checkFlagCondition`
  - [ ] boolean true 플래그
  - [ ] boolean false 플래그
  - [ ] count > 0 플래그
  - [ ] count == 0 플래그
  - [ ] 존재하지 않는 플래그

- [ ] `checkSurvivorCountCondition`
  - [ ] 생존자 수 비교 연산

- [ ] `checkEndingConditions`
  - [ ] 성공 엔딩 발동
  - [ ] 실패 엔딩 발동
  - [ ] 복합 조건 체크
  - [ ] TIME_UP 엔딩 제외

#### 1.3 시뮬레이션 유틸 (`simulation-utils.ts`)

- [ ] `applyStatChanges`
  - [ ] 양수 변화 적용
  - [ ] 음수 변화 적용
  - [ ] 최대값 클램핑
  - [ ] 최소값 클램핑
  - [ ] 존재하지 않는 스탯 무시

- [ ] `generateRandomDilemma`
  - [ ] 딜레마 생성
  - [ ] 선택지 구조 검증

#### 1.4 행동 분류 시스템

- [ ] `classifyAction`
  - [ ] combat 분류
  - [ ] diplomacy 분류
  - [ ] medical 분류
  - [ ] exploration 분류
  - [ ] stealth 분류
  - [ ] 신뢰도 계산

- [ ] `calculateAmplification`
  - [ ] 중간 구간 3배 증폭
  - [ ] 극단 구간 1.5배 증폭
  - [ ] 범위 클램핑

---

### 2. AI 품질 평가 체크리스트

#### 2.1 로컬 평가 (`ai-judge-client.ts`)

- [ ] 서사 품질 (Narrative Quality)
  - [ ] 길이 검증 (200자 이상)
  - [ ] 감정 표현 존재
  - [ ] 대화 존재
  - [ ] 스탯 노출 감지

- [ ] 한국어 자연스러움 (Korean Naturalness)
  - [ ] 외래어 감지
  - [ ] 한국어 비율 검증
  - [ ] 어색한 표현 감지

- [ ] 캐릭터 일관성 (Character Consistency)
  - [ ] 캐릭터 이름 언급 여부
  - [ ] 캐릭터별 행동 일관성

- [ ] 선택지 품질 (Choice Quality)
  - [ ] 길이 검증
  - [ ] 형식 검증
  - [ ] 시스템 ID 노출

- [ ] 스토리 몰입도 (Story Immersion)
  - [ ] 긴박감 표현
  - [ ] 감각적 묘사
  - [ ] 게임 메커닉 직접 언급

#### 2.2 배치 평가

- [ ] 여러 응답 일괄 평가
- [ ] 카테고리별 평균 계산
- [ ] 공통 이슈 집계

---

### 3. 통합 테스트 체크리스트

#### 3.1 게임 초기화

- [ ] SaveState 생성
- [ ] 초기 스탯 일치
- [ ] 초기 플래그 비어있음

#### 3.2 플레이어 선택 처리

- [ ] PlayerAction 생성
- [ ] 선택지 분류

#### 3.3 AI 응답 처리 파이프라인

- [ ] 유효한 응답 통과
- [ ] 언어 혼용 정리
- [ ] 스탯 변화 보정

#### 3.4 스탯 변화 적용

- [ ] 기본 변화 적용
- [ ] 증폭 로직 적용
- [ ] 클램핑 동작

#### 3.5 엔딩 체크

- [ ] 성공 엔딩 조건
- [ ] 실패 엔딩 조건
- [ ] 플래그 기반 엔딩

#### 3.6 에지 케이스

- [ ] 극단값 스탯 처리
- [ ] 빈 변화 처리
- [ ] 존재하지 않는 스탯

---

### 4. 회귀 테스트 체크리스트

기존에 발견된 버그가 재발하지 않는지 확인:

- [ ] 언어 혼용 응답이 낮은 점수
- [ ] 필드 누락 응답 처리
- [ ] 빈 문자열 응답 처리
- [ ] 과도한 스탯 변화 보정

---

## CI/CD 통합

### GitHub Actions 예시

```yaml
name: Test

on:
  push:
    branches: [main, claude/*]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:ci
```

---

## 품질 기준

| 카테고리 | 통과 기준 | 우수 기준 | 경고 기준 |
|---------|----------|----------|----------|
| 서사 품질 | 60점 | 85점 | 40점 |
| 한국어 자연스러움 | 70점 | 90점 | 50점 |
| 캐릭터 일관성 | 60점 | 80점 | 40점 |
| 선택지 품질 | 60점 | 85점 | 40점 |
| 스토리 몰입도 | 60점 | 80점 | 40점 |
| **종합** | **70점** | **85점** | **50점** |

---

## 테스트 유지보수

### 새 기능 추가 시

1. `tests/fixtures/mock-scenario.ts`에 필요한 목 데이터 추가
2. `tests/unit/`에 유닛 테스트 추가
3. `tests/integration/`에 통합 테스트 추가
4. 이 체크리스트 업데이트

### 버그 수정 시

1. 버그를 재현하는 테스트 케이스 먼저 추가
2. 수정 후 테스트 통과 확인
3. 회귀 테스트 섹션에 추가

---

## 연락처

테스트 관련 문의: 프로젝트 이슈 트래커
