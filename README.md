# ATELOS

AI 기반 인터랙티브 내러티브 게임 플랫폼

[![Next.js](https://img.shields.io/badge/Next.js-15.2.6-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Gemini AI](https://img.shields.io/badge/Gemini-2.5--flash--lite-orange)](https://ai.google.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-yellow)](https://firebase.google.com/)
[![Tests](https://github.com/jhlee0409/atelos/actions/workflows/tests.yml/badge.svg)](https://github.com/jhlee0409/atelos/actions)

## 소개

ATELOS는 AI 기반 인터랙티브 스토리텔링 게임 플랫폼입니다. 플레이어의 선택에 따라 이야기가 분기되며, Google Gemini AI가 실시간으로 서사를 생성합니다.

### 주요 특징

- **AI 서사 생성**: Gemini 2.5 Flash Lite를 활용한 실시간 스토리 생성
- **다중 루트 시스템**: 탈출, 항전, 협상 등 다양한 서사 경로
- **캐릭터 아크**: NPC의 감정과 신뢰도가 플레이어 선택에 따라 변화
- **동적 스탯 시스템**: 상황에 따라 증폭되는 스탯 변화
- **다중 엔딩**: 조건에 따른 다양한 결말
- **AI 시나리오 생성**: 관리자 도구를 통한 AI 기반 시나리오 자동 생성
- **이미지 생성**: Gemini를 활용한 포스터 및 캐릭터 이미지 자동 생성
- **15+ 장르 지원**: 장르별 맞춤 서사 스타일 자동 적용

## 게임 시스템

### 플레이 모드

| 모드 | 설명 |
|------|------|
| **선택지** | AI가 생성한 선택지 중 하나를 선택 |
| **대화** | NPC와 1:1 대화를 통해 정보 획득 및 관계 구축 |
| **탐색** | 장소를 탐색하여 아이템, 단서, 자원 발견 |
| **자유 입력** | 직접 행동을 입력하여 창의적인 플레이 |

### 스탯 시스템

게임에는 시나리오별 커스텀 스탯이 있으며, 스탯 변화는 현재 값에 따라 증폭됩니다:
- 극단 구간 (0-25%, 75-100%): 1.5배 증폭
- 중간 구간 (25-75%): 3.0배 증폭

### 루트 시스템

Day 3부터 플레이어의 선택에 따라 서사 루트가 결정됩니다:
- **탈출 (Escape)**: 위험을 피해 새로운 곳으로
- **항전 (Defense)**: 끝까지 이 곳을 지킨다
- **협상 (Negotiation)**: 함께 살아남는 방법을 찾는다

### 엔딩 시스템

Day 5 이후 조건을 만족하면 엔딩이 트리거됩니다:
- 스탯 조건 (특정 스탯이 임계값 이상/이하)
- 플래그 조건 (특정 이벤트 달성)
- 생존자 수 조건

## 시작하기

### 요구사항

- Node.js 18.17 이상
- pnpm 8.0 이상
- Google Gemini API 키
- Firebase 프로젝트 (Firestore)
- Vercel Blob 스토리지 토큰

### 설치

```bash
# 저장소 클론
git clone https://github.com/jhlee0409/atelos.git
cd atelos

# 의존성 설치
pnpm install

# 환경 변수 설정
cp .env.example .env.local
```

### 환경 변수

`.env.local` 파일에 다음 변수를 설정하세요:

```env
# 필수: Gemini AI API 키
GOOGLE_GEMINI_API_KEY=your-gemini-api-key

# 필수: Firebase 설정
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_APP_ID=your-app-id
FIREBASE_MEASUREMENT_ID=G-xxxxxxxxxx

# 필수 (관리자 기능): Firebase 서비스 계정
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# 필수: Vercel Blob 스토리지
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token

# 선택: 관리자 페이지 비밀번호
ADMIN_PASSWORD=your-admin-password
```

### 실행

```bash
# 개발 서버 실행
pnpm dev

# 프로덕션 빌드
pnpm build

# 프로덕션 서버 실행
pnpm start

# 린트 실행
pnpm lint

# 테스트 실행
pnpm test
```

브라우저에서 [http://localhost:3000](http://localhost:3000)에 접속하세요.

## 프로젝트 구조

```
atelos/
├── app/                    # Next.js App Router
│   ├── page.tsx           # 랜딩 페이지
│   ├── admin/             # 시나리오 관리 (관리자)
│   │   ├── page.tsx       # 시나리오 목록
│   │   ├── new/           # 새 시나리오 생성 위자드
│   │   └── [id]/          # 시나리오 편집
│   ├── lobby/             # 시나리오 선택
│   ├── scenarios/         # 시나리오 상세
│   ├── game/              # 게임 플레이
│   └── api/               # API 라우트
│       ├── gemini/        # AI 서사 생성
│       ├── scenarios/     # 시나리오 조회
│       ├── admin/         # 관리자 API
│       ├── generate-image/# 이미지 생성
│       └── upload-image/  # 이미지 업로드
├── components/
│   ├── ui/                # UI 컴포넌트 (Radix 기반)
│   ├── client/GameClient/ # 게임 UI 컴포넌트
│   ├── admin/             # 관리자 컴포넌트
│   ├── landing/           # 랜딩 페이지 컴포넌트
│   └── lobby/             # 로비 컴포넌트
├── lib/                   # 비즈니스 로직
├── constants/             # 상수 및 매핑
├── types/                 # TypeScript 타입 정의
├── mocks/                 # 테스트 시나리오 데이터
├── hooks/                 # React 훅
└── tests/                 # 테스트 코드
    ├── unit/              # 단위 테스트
    ├── integration/       # 통합 테스트
    └── ai-quality/        # AI 품질 테스트
```

## 기술 스택

### 프론트엔드
- **Next.js 15** - React 프레임워크 (App Router)
- **React 19** - UI 라이브러리
- **TypeScript 5** - 타입 안전성
- **TailwindCSS** - 스타일링
- **Radix UI** - 접근성 UI 컴포넌트

### 백엔드 & 데이터
- **Firebase Firestore** - 시나리오 데이터 저장
- **Vercel Blob** - 이미지 저장
- **Firebase Admin SDK** - 서버사이드 데이터 접근

### AI
- **Google Gemini 2.5 Flash Lite** - 서사 생성
- **Google Gemini Image** - 이미지 생성

### 폼 & 검증
- **React Hook Form** - 폼 상태 관리
- **Zod** - 스키마 검증

### 테스트
- **Vitest** - 테스트 프레임워크
- **Testing Library** - 컴포넌트 테스트
- **happy-dom** - DOM 시뮬레이션

## 개발

### 코드 스타일

```bash
# 린트 실행
pnpm lint
```

프로젝트는 ESLint (Airbnb 설정)와 Prettier를 사용합니다.

### 테스트

```bash
# 전체 테스트 실행
pnpm test

# 워치 모드
pnpm test:watch

# 커버리지 리포트
pnpm test:coverage

# 단위 테스트만
pnpm test:unit

# 통합 테스트만
pnpm test:integration

# AI 품질 테스트만
pnpm test:ai
```

### 관리자 도구

`/admin` 경로에서 시나리오를 관리할 수 있습니다.

#### 시나리오 생성 위자드 (`/admin/new`)
AI를 활용한 단계별 시나리오 생성:
1. **아이디어 입력** - 시나리오 아이디어 또는 AI 추천 선택
2. **시놉시스 생성** - AI가 제목, 장르, 시놉시스 자동 생성
3. **캐릭터 생성** - AI가 캐릭터 설정 자동 생성
4. **스탯/플래그** - 게임 메카닉 설정
5. **엔딩** - 다중 엔딩 조건 설정
6. **포스터/이미지** - AI 이미지 자동 생성

#### 시나리오 에디터 (`/admin/[id]`)
- 기본 정보 (제목, 시놉시스, 목표)
- 등장인물 및 관계
- 스탯 및 플래그
- 엔딩 조건
- 스토리 오프닝 설정

### 시나리오 데이터 구조

`mocks/ZERO_HOUR.json`을 참고하세요:

```json
{
  "scenarioId": "ZERO_HOUR",
  "title": "제로 아워",
  "genre": ["포스트 아포칼립스", "서바이벌"],
  "synopsis": "...",
  "playerGoal": "...",
  "characters": [...],
  "initialRelationships": [...],
  "scenarioStats": [...],
  "flagDictionary": [...],
  "endingArchetypes": [...],
  "storyOpening": {
    "prologue": "...",
    "incitingIncident": "...",
    "characterIntroductionSequence": [...]
  }
}
```

## API 문서

### 공개 API

| 엔드포인트 | 메소드 | 설명 |
|-----------|--------|------|
| `/api/gemini` | POST | AI 서사 생성 |
| `/api/scenarios` | GET | 활성 시나리오 목록 |
| `/api/scenarios/[id]` | GET | 시나리오 상세 |

### 관리자 API

| 엔드포인트 | 메소드 | 설명 |
|-----------|--------|------|
| `/api/admin/auth` | POST | 관리자 인증 |
| `/api/admin/scenarios` | GET/POST | 시나리오 목록/생성 |
| `/api/admin/scenarios/[id]` | GET/PUT/DELETE | 시나리오 CRUD |
| `/api/admin/ai-generate` | POST | AI 요소 생성 |
| `/api/admin/ai-generate/synopsis` | POST | AI 시놉시스 생성 |

### 미디어 API

| 엔드포인트 | 메소드 | 설명 |
|-----------|--------|------|
| `/api/generate-image` | POST | AI 이미지 생성 |
| `/api/upload-image` | POST | 이미지 업로드 |

## 지원 장르

ATELOS는 15+ 장르에 대해 맞춤형 서사 스타일을 제공합니다:

| 장르 | 특징 |
|------|------|
| 스릴러 | 긴장감, 서스펜스, 반전 |
| 호러 | 공포, 심리적 압박 |
| 미스터리 | 추리, 단서, 수수께끼 |
| 범죄 | 도덕적 회색지대, 범죄 세계 |
| 액션 | 역동적 전개, 긴박한 상황 |
| 모험 | 탐험, 발견, 성장 |
| 전쟁 | 희생, 전우애, 리더십 |
| SF | 미래, 기술, 철학적 질문 |
| 판타지 | 마법, 신화, 영웅의 여정 |
| 포스트 아포칼립스 | 생존, 재건, 인간성 |
| 드라마 | 감정, 관계, 갈등 |
| 로맨스 | 사랑, 설렘, 관계 변화 |
| 멜로 | 슬픔, 이별, 그리움 |
| 사극 | 궁중, 권력, 충성 |
| 역사 | 시대, 개인의 삶, 변화 |
| 코미디 | 유머, 해피엔딩 |
| 가족 | 가족애, 세대 이해, 화해 |

## 기여

1. 이 저장소를 포크합니다
2. 기능 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다

### 개발 가이드

자세한 개발 가이드는 [CLAUDE.md](./CLAUDE.md)를 참조하세요.

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 문의

프로젝트 관련 문의는 [Issues](https://github.com/jhlee0409/atelos/issues)에 등록해주세요.

---

Made with AI-powered storytelling
