# ATELOS

AI 기반 인터랙티브 내러티브 게임 플랫폼

[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Gemini AI](https://img.shields.io/badge/Gemini-2.5--flash--lite-orange)](https://ai.google.dev/)

## 소개

ATELOS는 포스트 아포칼립스 세계관에서 펼쳐지는 AI 기반 인터랙티브 스토리텔링 게임입니다. 플레이어의 선택에 따라 이야기가 분기되며, Google Gemini AI가 실시간으로 서사를 생성합니다.

### 주요 특징

- **AI 서사 생성**: Gemini 2.0 Flash를 활용한 실시간 스토리 생성
- **다중 루트 시스템**: 탈출, 항전, 협상 등 다양한 서사 경로
- **캐릭터 아크**: NPC의 감정과 신뢰도가 플레이어 선택에 따라 변화
- **동적 스탯 시스템**: 상황에 따라 증폭되는 스탯 변화
- **다중 엔딩**: 조건에 따른 다양한 결말

## 스크린샷

```
┌─────────────────────────────────────────────┐
│  ATELOS                                     │
│  ─────────────────────────────────────────  │
│                                             │
│  Day 3/7                    탈출 루트       │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🌅 Day 3이 시작됩니다...            │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 도시의 혼란이 점점 커지고 있다.     │   │
│  │ 생존자들 사이에서 불안감이 감돈다.  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌───────────────┐  ┌───────────────┐      │
│  │ A. 탈출 준비  │  │ B. 방어 강화  │      │
│  └───────────────┘  └───────────────┘      │
└─────────────────────────────────────────────┘
```

## 시작하기

### 요구사항

- Node.js 18.17 이상
- pnpm 8.0 이상
- Google Gemini API 키

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
```

브라우저에서 [http://localhost:3000](http://localhost:3000)에 접속하세요.

## 프로젝트 구조

```
atelos/
├── app/                    # Next.js App Router
│   ├── page.tsx           # 랜딩 페이지
│   ├── admin/             # 시나리오 에디터 (관리자)
│   ├── lobby/             # 시나리오 선택
│   ├── scenarios/         # 시나리오 상세
│   ├── game/              # 게임 플레이
│   └── api/               # API 라우트
├── components/
│   ├── ui/                # UI 컴포넌트 (Radix 기반)
│   ├── client/GameClient/ # 게임 UI 컴포넌트
│   ├── admin/             # 관리자 컴포넌트
│   └── landing/           # 랜딩 페이지 컴포넌트
├── lib/                   # 비즈니스 로직
├── constants/             # 상수 및 매핑
├── types/                 # TypeScript 타입 정의
└── mocks/                 # 테스트 시나리오 데이터
```

## 게임 시스템

### 스탯 시스템

게임에는 3가지 핵심 스탯이 있습니다:

| 스탯 | 설명 | 극성 |
|------|------|------|
| 도시 혼란도 | 도시의 무질서 정도 | 부정적 (높을수록 나쁨) |
| 공동체 응집력 | 생존자 집단의 단결력 | 긍정적 |
| 생존 기반 | 물자 및 안전 상태 | 긍정적 |

스탯 변화는 현재 값에 따라 증폭됩니다:
- 극단 구간 (0-25%, 75-100%): 1.5배 증폭
- 중간 구간 (25-75%): 3.0배 증폭

### 루트 시스템

Day 3부터 플레이어의 선택에 따라 서사 루트가 결정됩니다:

- **탈출 (Escape)**: 도시를 떠나 새로운 곳을 향해
- **항전 (Defense)**: 끝까지 이 곳을 지킨다
- **협상 (Negotiation)**: 함께 살아남는 방법을 찾는다

### 엔딩 시스템

Day 5 이후 조건을 만족하면 엔딩이 트리거됩니다:
- 스탯 조건 (특정 스탯이 임계값 이상/이하)
- 플래그 조건 (특정 이벤트 달성)
- 생존자 수 조건

Day 7이 지나면 시간 제한 엔딩이 발생합니다.

## 기술 스택

### 프론트엔드
- **Next.js 15** - React 프레임워크
- **React 19** - UI 라이브러리
- **TypeScript 5** - 타입 안전성
- **TailwindCSS** - 스타일링
- **Radix UI** - 접근성 UI 컴포넌트

### AI
- **Google Gemini 2.5 Flash Lite** - 서사 생성 AI

### 폼 & 검증
- **React Hook Form** - 폼 상태 관리
- **Zod** - 스키마 검증

## 개발

### 코드 스타일

```bash
# 린트 실행
pnpm lint
```

프로젝트는 ESLint (Airbnb 설정)와 Prettier를 사용합니다.

### 시나리오 에디터

`/admin` 경로에서 시나리오를 편집할 수 있습니다. `ADMIN_PASSWORD` 환경 변수로 접근을 제한합니다.

시나리오 에디터에서 설정 가능한 항목:
- 기본 정보 (제목, 시놉시스, 목표)
- 등장인물 및 관계
- 스탯 및 플래그
- 엔딩 조건

### 시나리오 데이터 구조

`mocks/ZERO_HOUR.json`을 참고하세요:

```json
{
  "scenarioId": "ZERO_HOUR",
  "title": "제로 아워",
  "synopsis": "...",
  "characters": [...],
  "scenarioStats": [...],
  "flagDictionary": [...],
  "endingArchetypes": [...]
}
```

## API 문서

### POST /api/gemini
메인 AI 엔드포인트. 게임 서사를 생성합니다.

### POST /api/admin/auth
관리자 인증 엔드포인트.

## 기여

1. 이 저장소를 포크합니다
2. 기능 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 문의

프로젝트 관련 문의는 [Issues](https://github.com/jhlee0409/atelos/issues)에 등록해주세요.

---

Made with AI-powered storytelling
