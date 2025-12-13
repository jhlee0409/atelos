# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ATELOS is a Next.js 15 + React 19 interactive narrative game platform featuring AI-powered storytelling. It's a scenario-driven game where players make choices that affect the story outcome through Gemini AI (gemini-2.5-flash-lite) integration. The game is primarily in Korean with English internal identifiers.

## Tech Stack

- **Framework**: Next.js 15.2.6 with App Router
- **React**: Version 19
- **Language**: TypeScript 5
- **Styling**: TailwindCSS 3.4 + tailwindcss-animate
- **UI Components**: Radix UI primitives (accordion, dialog, dropdown, tabs, etc.)
- **AI**: Google Generative AI (@google/generative-ai) - Gemini 2.5 Flash Lite
- **Database**: Firebase Firestore (scenario storage)
- **Storage**: Vercel Blob (image storage)
- **Forms**: React Hook Form + Zod validation
- **Testing**: Vitest + Testing Library + happy-dom
- **Package Manager**: pnpm

## Common Development Commands

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage

# Run unit tests only
pnpm test:unit

# Run integration tests only
pnpm test:integration

# Run AI quality tests only
pnpm test:ai

# Run tests for CI
pnpm test:ci
```

## Project Structure

```
atelos/
├── app/                              # Next.js App Router pages
│   ├── layout.tsx                    # Root layout with providers
│   ├── page.tsx                      # Landing page (/)
│   ├── admin/                        # Admin section
│   │   ├── page.tsx                  # Scenario list (/admin)
│   │   ├── new/page.tsx              # New scenario wizard (/admin/new)
│   │   └── [scenarioId]/page.tsx     # Edit scenario (/admin/[id])
│   ├── lobby/page.tsx                # Scenario selection (/lobby)
│   ├── scenarios/[scenarioId]/       # Scenario details pages
│   │   ├── page.tsx
│   │   └── ScenarioDetailClient.tsx
│   ├── game/[scenarioId]/            # Game play pages
│   │   ├── page.tsx
│   │   └── GameClient.tsx            # Main game client component
│   └── api/
│       ├── gemini/route.ts           # Main AI API endpoint
│       ├── scenarios/                # Public scenarios API
│       │   ├── route.ts              # GET active scenarios
│       │   └── [id]/route.ts         # GET scenario by ID
│       ├── admin/
│       │   ├── auth/route.ts         # Admin authentication
│       │   ├── scenarios/            # Admin scenario CRUD
│       │   │   ├── route.ts          # GET all, POST new
│       │   │   └── [id]/route.ts     # GET, PUT, DELETE
│       │   └── ai-generate/
│       │       ├── route.ts          # AI scenario generation
│       │       └── synopsis/route.ts # AI synopsis generation
│       ├── generate-image/route.ts   # AI image generation (poster/character)
│       └── upload-image/route.ts     # Image upload to Vercel Blob
├── components/
│   ├── ui/                           # Radix-based UI primitives (50+ components)
│   ├── client/GameClient/            # Game UI components
│   │   ├── index.tsx                 # Main GameClient component
│   │   ├── ChatHistory.tsx           # Message history display
│   │   ├── ChatMessage.tsx           # Individual message component
│   │   ├── ChoiceButtons.tsx         # Player choice interface (+ free text)
│   │   ├── StatsBar.tsx              # Compact stat display
│   │   ├── StatDisplay.tsx           # Detailed stat visualization
│   │   ├── CharacterArcPanel.tsx     # Character mood/trust display
│   │   ├── RouteIndicator.tsx        # Narrative route tracker
│   │   ├── CharacterDialoguePanel.tsx # Character conversation system
│   │   ├── ExplorationPanel.tsx      # Location exploration system
│   │   ├── TimelineProgress.tsx      # Day/time visualization
│   │   ├── EndingProgress.tsx        # Ending progress tracker
│   │   ├── KeyDecisionPanel.tsx      # Decision history panel
│   │   └── ChangeSummary.tsx         # Stat/relationship change display
│   ├── admin/                        # Admin section components
│   │   ├── ScenarioWizard.tsx        # AI-powered scenario creation wizard
│   │   ├── AIScenarioGenerator.tsx   # AI generation interface
│   │   ├── ScenarioList.tsx          # Scenario list component
│   │   ├── ScenarioListPage.tsx      # Scenario list page wrapper
│   │   └── ScenarioEditor/           # Scenario editing components
│   │       ├── index.tsx             # Main editor component
│   │       ├── BaseContent.tsx       # Basic scenario info
│   │       ├── CharacterContent.tsx  # Character management
│   │       ├── SystemRulesContent.tsx # Stats, endings
│   │       ├── CoreStoryElementsContent.tsx
│   │       ├── ScenarioHeader.tsx
│   │       └── StickySidebar.tsx
│   ├── landing/                      # Landing page components
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── Gameplay.tsx
│   │   ├── Endings.tsx
│   │   ├── CallToAction.tsx
│   │   ├── Navigation.tsx
│   │   ├── Footer.tsx
│   │   └── LandingButton.tsx
│   ├── lobby/
│   │   └── ScenarioCard.tsx          # Scenario card for lobby
│   └── theme-provider.tsx            # Dark/light theme support
├── lib/                              # Core business logic
│   ├── gemini-client.ts              # Gemini API wrapper
│   ├── game-builder.ts               # Initial game state & fallbacks
│   ├── ending-checker.ts             # Ending condition evaluation
│   ├── chat-history-manager.ts       # Chat history compression
│   ├── simulation-utils.ts           # Stat calculations & dilemmas
│   ├── scenario-validator.ts         # Scenario data consistency validation
│   ├── validations.ts                # Form validation schemas
│   ├── utils.ts                      # General utilities (cn, etc.)
│   ├── firebase.ts                   # Firebase client initialization
│   ├── firebase-admin.ts             # Firebase Admin SDK
│   ├── firebase-scenarios.ts         # Firestore scenario queries (client)
│   ├── firebase-scenarios-admin.ts   # Firestore scenario queries (admin)
│   ├── blob-storage.ts               # Vercel Blob image storage
│   ├── image-generator.ts            # AI image generation utilities
│   ├── image-optimizer.ts            # Image optimization (Sharp)
│   ├── ai-scenario-generator.ts      # AI scenario generation client
│   ├── synopsis-generator.ts         # AI synopsis generation
│   ├── genre-narrative-styles.ts     # Genre-specific narrative guidance
│   ├── ai-narrative-engine.ts        # AI Narrative Engine (ending prediction, seeds)
│   ├── action-engagement-system.ts   # Action synergy, combo, dynamic AP system
│   ├── prompt-enhancers.ts           # Prompt Quality Enhancement (Choice Diversity, Character Balancing)
│   ├── scenario-api.ts               # Scenario API client functions
│   └── scenario-mapping-utils.ts     # Scenario data transformations
├── constants/
│   ├── korean-english-mapping.ts     # i18n mappings for stats/roles
│   ├── comparison-operators.ts       # Condition evaluation operators
│   └── scenario.ts                   # Scenario constants
├── types/
│   └── index.ts                      # All TypeScript type definitions
├── mocks/
│   ├── ZERO_HOUR.json                # Test scenario data
│   ├── UniversalMasterSystemPrompt.ts
│   └── index.ts                      # Scenario data exports
├── hooks/
│   └── use-mobile.tsx                # Mobile detection hook
└── tests/                            # Test suite
    ├── setup.ts                      # Vitest setup
    ├── fixtures/
    │   └── mock-scenario.ts          # Test scenario fixtures
    ├── utils/
    │   ├── test-helpers.ts           # Test utility functions
    │   └── ai-judge-client.ts        # AI-as-Judge testing
    ├── unit/                         # Unit tests
    │   ├── ending-checker.test.ts
    │   ├── game-ai-client.test.ts
    │   └── simulation-utils.test.ts
    ├── integration/
    │   └── game-flow.test.ts         # Integration tests
    └── ai-quality/
        └── ai-judge.test.ts          # AI quality tests
```

## High-Level Architecture

### Core Application Flow

1. **Landing Page** (`/`) → Marketing page
2. **Scenario Selection** (`/lobby`) → **Scenario Details** (`/scenarios/[id]`) → **Game Play** (`/game/[id]`)
3. **Admin Interface** (`/admin`) - Password-protected scenario management
   - `/admin` → Scenario list
   - `/admin/new` → AI-powered scenario creation wizard
   - `/admin/[id]` → Edit existing scenario

### Key System Components

#### Type System (`types/index.ts`)

Core types that define the game:
- `ScenarioData`: Complete scenario definition (characters, stats, endings, story opening, etc.)
- `PlayerState`: Current player stats, traits, relationships
- `SaveState`: Full game state including context, community, chat history, action history
- `AIResponse`: Structure of AI-generated content (log, dilemma, stat changes)
- `EndingArchetype`: Ending conditions and descriptions
- `SystemCondition`: Stat/survivor conditions for endings (v1.4: Dynamic Ending System)
- `CharacterArc`: Character mood and trust tracking
- `KeyDecision`: Player decision history for flashback system
- `ActionContext`: Current action context for AI prompts (Phase 5)
- `WorldState`: Dynamic world state tracking (Phase 6)
- `StoryOpening`: 3-phase story opening configuration (Phase 7)

#### Game State Management

- **Stats**: Dynamic stat tracking with amplification based on current values (1.5x at extremes, 3.0x in mid-range)
- **Action History**: Player action tracking for Dynamic Ending System (v1.4: replaces legacy flags)
- **Relationships**: Character relationship values with signed numeric values
- **Time System**: Day-based progression (configurable days per scenario)
- **Action Points**: Per-day action budget (Phase 4)
- **Chat History**: Full message history with multiple message types
- **Character Arcs**: Track character moods and trust levels
- **Route Tracking**: Determine narrative path (탈출/항전/협상)
- **World State**: Dynamic location and discovery tracking (Phase 6)
- **Protagonist Knowledge**: Track what the player knows (Phase 7)

#### Chat Message Types

The game supports multiple message types for rich narrative display:
- `system`: System notifications and day changes
- `player`: Player choices
- `ai`: General AI narrative responses
- `ai-dialogue`: Character dialogue (with quote styling)
- `ai-thought`: Internal monologue/thoughts (italic styling)
- `ai-narration`: Scene descriptions (minimal styling)
- `change-summary`: Stat/relationship change summaries

#### AI Integration

Key files:
- `lib/gemini-client.ts`: Gemini API wrapper
- `lib/prompt-builder.ts`: AI prompt construction with persona system + 주인공 식별 헬퍼
- `lib/prompt-enhancers.ts`: Prompt Quality Enhancement System (Choice Diversity, Character Balancing, Theme Rotation, Context Bridge)
- `lib/game-builder.ts`: Initial game state generation
- `lib/ai-scenario-generator.ts`: Scenario generation client
- `lib/synopsis-generator.ts`: Synopsis generation
- `lib/genre-narrative-styles.ts`: Genre-specific narrative guidance
- `lib/gameplay-config.ts`: Dynamic gameplay configuration utilities (Day calculation, route scores, action points, stat thresholds)
- `lib/ai-narrative-engine.ts`: AI Narrative Engine (ending prediction, narrative seeds)
- `lib/action-engagement-system.ts`: Action Engagement System (synergy, combo, dynamic AP)

Language validation features:
- Detects and removes Arabic, Thai, Hindi, Cyrillic characters
- Validates Korean content ratio (>30% required)
- Cleans weird Unicode characters

#### Gameplay Configuration System (`lib/gameplay-config.ts`)

시나리오별로 게임플레이 설정을 동적으로 조정할 수 있는 시스템입니다.

**주요 함수:**
- `getTotalDays(scenario)`: 시나리오의 총 일수 가져오기
- `getRouteActivationDay(scenario)`: 루트 분기 활성화 Day 계산
- `getEndingCheckDay(scenario)`: 엔딩 체크 시작 Day 계산
- `getNarrativePhase(currentDay, scenario)`: 서사 단계 계산 (setup/rising_action/midpoint/climax)
- `canCheckEnding(currentDay, scenario)`: 엔딩 체크 가능 여부
- `getActionPointsPerDay(scenario)`: 하루당 Action Points 가져오기
- `isStatCritical(percentage, scenario)`: 스탯 위험 상태 체크
- `isStatWarning(percentage, scenario)`: 스탯 경고 상태 체크
- `calculateRouteScores(actionHistory, stats, scenario)`: 동적 루트 점수 계산
- `getFallbackChoices(scenario)`: 장르별 Fallback 선택지

**설정 가능 항목 (ScenarioData.gameplayConfig):**
```typescript
gameplayConfig?: {
  routeActivationRatio?: number;     // 루트 활성화 비율 (기본: 0.4 = Day 3 for 7일)
  endingCheckRatio?: number;         // 엔딩 체크 비율 (기본: 0.7 = Day 5 for 7일)
  narrativePhaseRatios?: { setup, rising_action, midpoint, climax };
  actionPointsPerDay?: number;       // 하루당 AP (기본: 3)
  criticalStatThreshold?: number;    // 위험 스탯 임계값 (기본: 0.4)
  warningStatThreshold?: number;     // 경고 스탯 임계값 (기본: 0.5)
  routeScores?: RouteScoreConfig[];  // 커스텀 루트 점수 설정
  customFallbackChoices?: { prompt, choice_a, choice_b };
};
```

#### Ending System (`lib/ending-checker.ts`)

- **Dynamic Ending System (v1.4)**: Uses ActionHistory and stat conditions for ending determination
- Checks stat conditions with comparison operators (>=, <=, ==, >, <, !=)
- Only checks endings after `endingCheckDay` (동적 계산, 기본: Day 5 for 7일 게임)
- Time limit ending triggers after configured days (ENDING_TIME_UP)
- Falls back to default "결단의 시간" ending if no conditions met

#### Route System (`RouteIndicator.tsx`)

Determines narrative path based on scenario's `routeScores` configuration:
- Default routes: 탈출 (Escape), 항전 (Defense), 협상 (Negotiation)
- Route scores calculated from action history and stats defined in `gameplayConfig.routeScores`

Route is "미정" (undetermined) until `routeActivationDay` (동적 계산, 기본: Day 3 for 7일 게임), then calculated based on player action patterns.

#### Character Arc System (`CharacterArcPanel.tsx`)

Tracks character development throughout the game:
- **Moods**: hopeful, anxious, angry, resigned, determined
- **Trust Level**: -100 to 100, displayed via border colors
- **Moments**: Events that shape character development

#### Game Modes System (Phase 3)

The game supports multiple interaction modes beyond standard choice selection:

**Game Mode Types** (`GameMode` type):
- `choice`: Default mode - player selects from AI-generated choices
- `dialogue`: Character conversation mode - talk with NPCs
- `exploration`: Location exploration mode - investigate areas

**Character Dialogue System**:
- Players can initiate conversations with any available character
- Topic categories: `info` (정보), `advice` (조언), `relationship` (관계), `personal` (개인)
- Topics generated dynamically based on character role
- AI generates contextual dialogue responses
- Can affect relationship values and provide in-game information

**Exploration System**:
- Day-gated locations: storage, entrance, medical (Day 1+), roof (Day 3+), basement (Day 5+)
- Genre-specific locations (e.g., crew quarters for SF scenarios)
- AI generates exploration narratives and rewards
- Rewards include: stat changes, significant discoveries, information

**Free Text Input**:
- Optional player-written actions (max 200 characters)
- Processed by AI as custom player input
- Available via "다른 행동" toggle in choice interface

#### Action Gauge System (Phase 4)

Per-day action budget management:
- `actionPoints`: Current remaining actions
- `maxActionPoints`: Maximum actions per day
- `ActionRecord`: Records of actions taken
- Actions consume points: choice (1), dialogue (1), exploration (1)
- v1.2: freeText가 choice로 통합됨 (ActionRecord.isCustomInput으로 구분)

#### Action Engagement System (`lib/action-engagement-system.ts`)

전략적 깊이와 몰입감을 높이는 행동 시스템:

**핵심 기능:**
- **동적 AP 비용**: 신뢰도, 상황에 따라 AP 비용 조정
  - 높은 신뢰도 캐릭터와 대화: 0.5 AP
  - 낮은 신뢰도 캐릭터와 대화: 1.5 AP
  - 익숙한 장소 재방문: 0.5 AP
- **행동 시너지**: 선행 행동이 후속 행동에 보너스
  - `exploration → dialogue`: 발견한 정보로 대화 유리
  - `dialogue → choice`: 조언받은 후 더 나은 선택
- **콤보 시스템**: 연속 행동 패턴 감지 및 보상
  - 정보수집 콤보: 탐색 + 대화 + 탐색
  - 신중함 콤보: 탐색 → 대화(조언) → 선택
  - 결단력 콤보: 연속 3회 선택
- **동적 대화 주제**: 신뢰도/발견 기반 주제 언락

**주요 함수:**
```typescript
calculateDynamicAPCost(actionType, saveState, scenario, target?)
getActionSynergy(currentAction, previousActions)
analyzeActionSequence(actions, currentDay)
generateDynamicDialogueTopics(character, saveState, scenario)
```

#### Prompt Quality Enhancement System (`lib/prompt-enhancers.ts`)

AI 응답 품질 극대화를 위한 프롬프트 강화 시스템:

**핵심 시스템:**
- **Choice Diversity System**: 테마별 선택지 분류 및 균형 유지
  - 테마 카테고리: social, survival, exploration, leadership, moral, information
  - 연속 동일 테마 방지, 테마 다양성 보장
- **Character Balancing System**: 캐릭터 등장 빈도 추적 및 조정
  - 소외 캐릭터 자동 감지
  - 관계 변화 없는 캐릭터 우선 등장 권유
- **Theme Rotation System**: 서사 단계별 테마 가중치 조정
  - setup: exploration, information 강조
  - rising_action: social, moral 강조
  - climax: survival, leadership 강조
- **Context Bridge System**: 이전 씬과의 연결성 유지
  - 미해결 긴장, 캐릭터 감정 상태 추적

**통합 규칙:**
- `LANGUAGE_RULES`: 한국어 전용, 스타일 가이드
- `CHOICE_FORMAT_RULES`: 선택지 형식 규칙
- `EMOTIONAL_EXPRESSION_RULES`: 감정 표현 가이드
- `STAT_CHANGE_RULES`: 스탯 변화 가이드

**주요 함수:**
```typescript
generateEnhancedPromptGuidelines(saveState, scenario, chatHistory)
generateChoiceDiversityGuideline(chatHistory)
generateCharacterBalancingGuideline(saveState, scenario)
generateContextBridge(chatHistory)
```

#### AI Narrative Engine (`lib/ai-narrative-engine.ts`)

AI 스토리 생성을 위한 고급 서사 시스템:

**핵심 기능:**
- **엔딩 예측**: 현재 상태에서 가능한 엔딩 예측
- **서사 씨앗(Narrative Seeds)**: 복선과 떡밥 시스템
- **스토리 비트**: 서사 진행에 따른 이벤트 트리거
- **캐릭터 아크 추적**: 캐릭터별 서사 발전 단계

**주요 함수:**
```typescript
predictPossibleEndings(saveState, scenario)
generateNarrativeSeeds(phase, context)
checkStoryBeatTriggers(saveState, scenario)
analyzeCharacterArcProgression(characterArcs)
```

#### Story Writer Persona System (도경 v2.1)

AI가 일관된 작가 페르소나로 서사를 생성:

**페르소나 특성:**
- 이름: 도경 (導京) - "서울로 이끄는 자"
- 역할: 인터랙티브 내러티브 전문 작가
- 스타일: 장르별 톤 조절, 캐릭터 일관성 유지
- 원칙: 플레이어 선택 존중, 과도한 개입 자제

**동적 페르소나 기능:**
- `getNarrativePhase()`: 서사 단계에 따른 톤 조절
- 장르별 스타일 자동 적용 (GENRE_NARRATIVE_STYLES)
- 캐릭터 대화 스타일 일관성 유지
- 플레이어 행동 패턴 인식 및 보상 (콤보/시너지)

#### Context Linking System (Phase 5)

Maintains context across actions:
- `ActionContext`: Current situation, location, today's actions
- `DiscoveredClue`: Information pieces found during play
  - v1.2: 발견한 정보가 AI 프롬프트에 포함되어 선택지 생성에 활용됨
- `CharacterPresence`: Character locations and availability
- `DynamicLocation`: Situation-dependent exploration options

#### Dynamic World System (Phase 6)

World state that changes based on player actions:
- `WorldState`: Locations, discoveries, relations, events
- `WorldLocation`: Location status (available, explored, destroyed, blocked, hidden, locked)
- `ConcreteDiscovery`: Items, documents, equipment, clues, resources
- `WorldEvent`: Triggered events that change world state
- `ObjectRelation`: Relationships between game objects

#### Story Opening System (Phase 7) - 2025 Enhanced

3-phase story opening with advanced narrative patterns:
- **Prologue**: Player's ordinary world before the inciting incident
- **Inciting Incident**: The event that disrupts normalcy
- **First Encounter**: Meeting the first important character

**2025 Enhanced Features**:
- `CharacterIntroductionSequence`: 1:1 character introductions in defined order
- `HiddenNPCRelationship`: NPC relationships hidden from player, discovered through play
- `CharacterRevelationConfig`: Progressive character reveals based on trust
- `EmergentNarrativeConfig`: Dynamic story events from player action combinations
- `StorySiftingTrigger`: Conditions that generate emergent story events
- `ProtagonistKnowledge`: Tracks what the player character knows
- **Protagonist Identification System** (2025-12-13): Distinguishes protagonist from NPCs
  - `GameClient.tsx`: `getProtagonistName()`, `isProtagonist()`, `filterNPCs()`, `getProtagonistCharacter()`
  - `prompt-builder.ts`: `getProtagonistNameForPrompt()`, `isProtagonistForPrompt()`, `filterNPCsForPrompt()`
  - Identifies protagonist by `(플레이어)` OR `storyOpening.protagonistSetup.name`
  - Used in: characterArcs initialization, NPC filtering, metCharacters updates
- **Protagonist-NPC Name Collision Detection**: Prevents protagonist name from matching NPC names
  - `prompt-builder.ts` detects collision at runtime and clears protagonist name
  - AI generation API (`ai-generate/route.ts`) instructs AI to avoid name collision
  - Fallback: AI uses pronouns or occupation title instead of name when collision detected

#### Genre Narrative Styles (`lib/genre-narrative-styles.ts`)

Comprehensive genre-specific guidance for AI:
- 15+ genre definitions (스릴러, 호러, 미스터리, 범죄, 액션, 모험, 전쟁, SF, 판타지, 포스트 아포칼립스, 드라마, 로맨스, 멜로, 사극, 역사, 코미디, 가족)
- Each genre includes:
  - `narrativeTone`: Overall narrative voice
  - `dialogueStyle`: Character dialogue patterns
  - `pacingNote`: Pacing guidance
  - `thematicFocus`: Core themes
  - `dilemmaTypes`: Typical moral dilemmas
  - `emotionalRange`: Expected emotions
  - `writingTechniques`: Specific techniques
  - `atmosphereKeywords`: Mood keywords
  - `choiceFraming`: How to frame player choices

#### Immersion-First UI Design

게임 메카닉을 숨기고 서사적 표현으로 대체하는 UI 원칙:

**숨겨야 하는 요소:**
| 메카닉 | 변경 전 | 변경 후 |
|--------|---------|---------|
| 신뢰도 숫자 | "+40", "-20" | "신뢰함", "경계 중" |
| 언락 조건 | "신뢰도 40 필요" | "아직 이 이야기를 나눌 만큼 가깝지 않다" |
| 엔딩 체크 Day | "Day 5부터 엔딩 체크" | "마지막 순간", "시간이 얼마 남지 않았다" |
| 콤보 이름 | "🔥 정보수집 콤보!" | 서사적 보너스 텍스트만 |
| 스탯 변화 예고 | "+10 예상" | 표시 안 함 |

**구현 위치:**
- `CharacterDialoguePanel.tsx`: `getTrustDescription()` - 신뢰도 모호화
- `RouteIndicator.tsx`: `DayProgressBar` - 서사적 진행 표현
- `ChoiceButtons.tsx`: 콤보 보너스 텍스트만 표시

**원칙:**
1. 플레이어가 "계산"하지 않고 "느끼게" 한다
2. 숫자보다 감정적 언어 사용
3. 시스템 용어(콤보, AP, 언락) 노출 금지
4. 진행 상황은 서사적 긴장감으로 전달

### Component Architecture

#### GameClient.tsx (Main Game Component)

State management:
- `saveState`: Complete game state (includes character arcs, key decisions, world state)
- `isLoading` / `isInitialDilemmaLoading`: Loading states
- `triggeredEnding`: Active ending state
- `languageWarning`: AI language issue notifications
- `gameMode`: Current interaction mode ('choice' | 'dialogue' | 'exploration')
- `isDialogueLoading` / `isExplorationLoading`: Mode-specific loading states

Key functions:
- `createInitialSaveState()`: Initialize game from scenario with all systems
- `updateSaveState()`: Apply AI response changes with stat amplification
- `handlePlayerChoice()`: Process player selection and call AI
- `handleDialogueSelect()`: Process character dialogue interactions
- `handleExplore()`: Process location exploration
- `handleFreeTextSubmit()`: Process free text player input

### Data Flow

1. Scenarios loaded from Firestore (or JSON mock for testing)
2. Game state initialized with scenario data via `createInitialSaveState()`
3. Story opening displayed (prologue → inciting incident → first encounter)
4. Initial dilemma generated via AI or fallback
5. Player makes choice → `handlePlayerChoice()` called
6. AI generates narrative with world state updates
7. State updates with amplified stat changes
8. World events triggered based on conditions
9. Route indicator updates based on action history patterns
10. Ending conditions checked (Day 5+) via Dynamic Ending System
11. Game continues until ending triggered

### API Routes

#### Public APIs

| Route | Method | Description |
|-------|--------|-------------|
| `/api/gemini` | POST | Main AI endpoint for game responses |
| `/api/scenarios` | GET | List active scenarios for lobby |
| `/api/scenarios/[id]` | GET | Get scenario by ID |

#### Admin APIs (Require authentication)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/auth` | POST | Admin authentication |
| `/api/admin/scenarios` | GET | List all scenarios |
| `/api/admin/scenarios` | POST | Create new scenario |
| `/api/admin/scenarios/[id]` | GET | Get scenario |
| `/api/admin/scenarios/[id]` | PUT | Update scenario |
| `/api/admin/scenarios/[id]` | DELETE | Delete scenario |
| `/api/admin/ai-generate` | POST | AI scenario element generation |
| `/api/admin/ai-generate/synopsis` | POST | AI synopsis generation |

#### Media APIs

| Route | Method | Description |
|-------|--------|-------------|
| `/api/generate-image` | POST | Generate poster/character images via Gemini |
| `/api/upload-image` | POST | Upload image to Vercel Blob storage |

### Storage Architecture

#### Firebase Firestore
- Stores scenario data (ScenarioData)
- Collection: `scenarios`
- Operations in `lib/firebase-scenarios.ts` (client) and `lib/firebase-scenarios-admin.ts` (admin)

#### Vercel Blob Storage
- Stores images (posters, character portraits)
- Path pattern: `scenarios/{scenarioId}/{type}s/{filename}.webp`
- Operations in `lib/blob-storage.ts`
- Images auto-optimized to WebP format via `lib/image-optimizer.ts`

## Language Considerations

Korean is the primary user-facing language with English internal identifiers.

### Mapping System (`constants/korean-english-mapping.ts`)

- `STAT_MAPPING`: cityChaos → "도시 혼란도", etc.
- `STAT_POLARITY`: Defines if high values are positive/negative
- `CHARACTER_ROLE_MAPPING`: Role IDs to Korean names
- `CHARACTER_TRAIT_MAPPING`: Trait IDs to Korean names
- `STATUS_MAPPING`: Character status values

Utility functions:
- `getStatIdByKorean()`: Reverse lookup for Korean → English
- `getKoreanStatName()`: Forward lookup English → Korean
- `getKoreanRoleName()`, `getKoreanTraitName()`, `getKoreanStatusName()`
- `isValidStatId()`: Type guard validation function
- `getAllStatIds()`: Get all available stat IDs

## Development Patterns

### State Updates

Always use immutable patterns:
```typescript
setSaveState((prev) => ({
  ...prev,
  stats: { ...prev.stats, health: newValue },
}));
```

### Stat Amplification System

Stats are amplified based on current percentage:
- At extremes (0-25% or 75-100%): 1.5x amplification (gentle)
- In mid-range (25-75%): 3.0x amplification (dramatic tension)
- Changes are clamped to min/max bounds

### Adding New Stats

1. Add to scenario's `scenarioStats` array
2. Set `initialValue` and `range`
3. Add to `STAT_MAPPING` in `constants/korean-english-mapping.ts`
4. Add to `STAT_POLARITY` if needed
5. Update stat display components if custom styling needed

### Adding New Endings

1. Add to scenario's `endingArchetypes` array
2. Define `systemConditions` array with:
   - `required_stat`: { statId, comparison, value }
   - `survivor_count`: { comparison, value }
3. Set `isGoalSuccess` boolean for success/failure classification
4. **Note**: v1.4 Dynamic Ending System uses ActionHistory for advanced ending determination

### Adding New Genre

1. Add to `GENRE_NARRATIVE_STYLES` in `lib/genre-narrative-styles.ts`
2. Define all style properties (narrativeTone, dialogueStyle, etc.)
3. Add to `GENRE_STYLE_MAP` in `app/api/generate-image/route.ts` for image generation

### Testing Scenarios

Use `mocks/ZERO_HOUR.json` as a reference for scenario structure. Key sections:
- `scenarioId`, `title`, `synopsis`, `playerGoal`
- `characters` with roles, traits, backstories
- `initialRelationships` between characters
- `scenarioStats` with initial values and ranges
- `traitPool` with buffs and debuffs
- `endingArchetypes` with conditions
- `endCondition` (time_limit with days/hours)
- `storyOpening` for 3-phase opening configuration
- **Note**: v1.4 Dynamic Ending System - `flagDictionary` is deprecated, use ActionHistory instead

### Scenario Data Validation (`lib/scenario-validator.ts`)

시나리오 데이터의 일관성을 검증하는 유틸리티입니다. Admin 에디터의 StickySidebar에서 실시간으로 검증 결과를 표시합니다.

**검증 항목:**

| 검증 유형 | 심각도 | 설명 |
|----------|--------|------|
| 엔딩 스탯 참조 | error | 존재하지 않는 statId 참조 |
| 관계 캐릭터 | error | 존재하지 않는 캐릭터 관계 설정 |
| 스토리 오프닝 캐릭터 | error | firstCharacterToMeet 등이 캐릭터 목록에 없음 |
| 스탯 범위 | error | initialValue가 min/max 범위 밖 |
| 엔딩 조건 충돌 | warning | 같은 스탯에 충돌하는 조건 (>=80 AND <=20) |

**사용법:**
```typescript
import { validateScenario } from '@/lib/scenario-validator';

const result = validateScenario(scenario);
// result.isValid: boolean - 오류 없으면 true
// result.issues: ValidationIssue[] - 발견된 이슈 목록
// result.summary: { errors: number, warnings: number }
```

## Testing

### Test Structure

```
tests/
├── setup.ts              # Global setup, mocks console, sets env vars
├── fixtures/             # Test data
├── utils/                # Test helpers and AI judge client
├── unit/                 # Unit tests for lib functions
├── integration/          # End-to-end flow tests
└── ai-quality/           # AI output quality tests
```

### Running Tests

```bash
pnpm test              # Run all tests once
pnpm test:watch        # Run in watch mode
pnpm test:ui           # Run with Vitest UI
pnpm test:coverage     # Generate coverage report
pnpm test:unit         # Unit tests only
pnpm test:integration  # Integration tests only
pnpm test:ai           # AI quality tests only
```

### Test Configuration

From `vitest.config.ts`:
- Environment: `happy-dom`
- Timeout: 30000ms (for AI tests)
- Coverage: V8 provider, reports to `text`, `json`, `html`
- Path alias: `@/` maps to project root

## Environment Setup

Required environment variables:
```env
# Required: Gemini AI API key
GOOGLE_GEMINI_API_KEY=your-gemini-api-key

# Required: Firebase configuration
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_APP_ID=your-app-id
FIREBASE_MEASUREMENT_ID=G-xxxxxxxxxx

# Required for admin functions: Firebase service account
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Required: Vercel Blob storage token
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token

# Optional: Admin page password
ADMIN_PASSWORD=your-admin-password
```

**Note**: API keys are only used server-side via API routes and are never exposed to the client.

## Build Configuration

From `next.config.mjs`:
- `eslint.ignoreDuringBuilds: true` - ESLint errors don't block builds
- `typescript.ignoreBuildErrors: true` - TS errors don't block builds
- `images.unoptimized: true` - Images served as-is

## Code Style

- ESLint with Airbnb TypeScript config
- Prettier with Tailwind plugin
- Korean comments are common in the codebase
- Console logging uses emoji prefixes for categorization:
  - 🎮 Game events
  - 🤖 AI operations
  - 📊 Stats/metrics
  - 🤝 Relationships
  - ⏳ Time progression
  - 🎉 Endings
  - 📤 Storage/upload operations
  - 🎨 Image generation
  - ⚠️/❌ Warnings/errors

### Component Naming

- Game components: `components/client/GameClient/`
- Admin components: `components/admin/` and `components/admin/ScenarioEditor/`
- Landing page: `components/landing/`
- Lobby: `components/lobby/`
- UI primitives: `components/ui/`

### CSS Classes

Custom colors defined in `tailwind.config.ts`:
- `telos-black`: Primary dark background
- `red-900`, `red-950`: Accent colors for warnings/urgency
- `zinc-*`: Neutral grays for UI elements

## Common Debugging

### AI Response Issues
1. Check Gemini API key is set correctly
2. Check response structure validation logs
3. Look for language validation issues (non-Korean characters)
4. Check token budget warnings in console

### Stat Not Updating
1. Verify stat ID matches `scenarioStats` definition
2. Check mapping in `korean-english-mapping.ts`
3. Verify amplification isn't clamping to bounds

### Ending Not Triggering
1. Confirm Day >= 5 (endings only check after Day 5)
2. Log `checkEndingConditions()` output
3. Verify all `systemConditions` are satisfiable

### Route Not Displaying Correctly
1. Check action history patterns in game state
2. Verify route score configuration in `gameplayConfig.routeScores`
3. Check `RouteIndicator.tsx` score calculation logic

### Character Arc Issues
1. Verify `characterArcs` is initialized in `createInitialSaveState()`
2. Check AI response includes character updates
3. Verify character names match between scenario and arcs

### Admin Access Issues
1. Check `ADMIN_PASSWORD` environment variable is set
2. Clear sessionStorage if stuck (`sessionStorage.removeItem('atelos_admin_auth')`)
3. Verify `/api/admin/auth` endpoint is responding

### Firebase Issues
1. Verify all `FIREBASE_*` environment variables are set
2. Check `FIREBASE_SERVICE_ACCOUNT_KEY` is valid JSON
3. Check Firestore rules allow access

### Image Generation Issues
1. Verify `GOOGLE_GEMINI_API_KEY` is valid
2. Check `BLOB_READ_WRITE_TOKEN` is set
3. Check image type is 'poster' or 'character'
4. Look for safety filter blocks in error messages

### Story Opening Issues
1. Check for "⚠️ 주인공 이름...충돌" warning in console (protagonist-NPC name collision)
2. Verify `storyOpening.protagonistSetup.name` differs from all NPC character names
3. If collision detected, system auto-clears protagonist name (AI uses pronouns instead)
4. Check `firstCharacterToMeet` matches an actual character in `scenario.characters`

## 🚨 개발 규칙 (MANDATORY)

### 핵심 원칙
1. **수정 전 읽기**: 코드를 충분히 이해한 후 수정
2. **영향 추적**: grep으로 모든 사용처 확인
3. **3-Way 통합**: AI 생성 → Admin → 게임 전체 확인
4. **검증 필수**: `pnpm build && pnpm test`

### 시스템 통합 지점 (빠른 참조)

| 시스템 | 초기화 | 업데이트 | AI 전달 | UI 표시 |
|--------|--------|----------|---------|---------|
| Action Points | `createInitialSaveState` | 4개 핸들러 | N/A | `ChoiceButtons`, `TimelineProgress` |
| ActionContext | `createInitialSaveState` | 4개 핸들러 | `gemini-client.ts` | N/A |
| DiscoveredClues | `context-manager.ts` | dialogue/exploration 핸들러 | `prompt-builder.ts` (v1.2) | `chatHistory` |
| WorldState | `createInitialSaveState` | 4개 핸들러 | `gemini-client.ts` | `ExplorationPanel` |
| Character Arc | `createInitialSaveState` | `updateSaveState` | `gemini-client.ts` | `CharacterArcPanel` |
| Action History | `createInitialSaveState` | 4개 핸들러 | `gemini-client.ts` | `RouteIndicator` (v1.4) |
| Action Engagement | N/A (런타임) | N/A | `prompt-builder.ts` | `ChoiceButtons` (콤보) |
| AI Narrative Engine | N/A (런타임) | N/A | `prompt-builder.ts` | N/A |
| Story Writer Persona | N/A (프롬프트) | N/A | `prompt-builder.ts` | N/A |

### 3-Way Integration

```
AI 생성 (ai-generate/route.ts) → Admin (ScenarioEditor/*) → 게임 (GameClient)
```

**새 ScenarioData 필드 추가 시:**
1. `types/index.ts` - 타입 정의
2. `ai-generate/route.ts` - AI 생성 카테고리
3. `ScenarioEditor/*` - Admin UI
4. `GameClient` / `lib/*` - 게임 사용

### ScenarioData 필드별 통합 현황

| 필드 | AI 생성 | Admin 편집 | 게임 사용 |
|------|---------|------------|----------|
| `title`, `synopsis`, `playerGoal` | scenario_overview | BaseContent | GameClient |
| `characters` | characters | CharacterContent | GameClient |
| `scenarioStats` | stats | SystemRulesContent | StatsBar |
| `endingArchetypes` | endings | CoreStoryElementsContent | ending-checker |
| `storyOpening` | story_opening | StoryOpeningContent | GameClient |
| `gameplayConfig` | gameplay_config | GameplayConfigContent | gameplay-config |

### GameClient 핸들러 일관성

4개 핸들러에 동일 로직 필요 시 모두 수정:
- `handlePlayerChoice()`
- `handleDialogueSelect()`
- `handleExplore()`
- `handleFreeTextSubmit()`

### 흔한 실수 방지

| 상황 | 올바른 접근 |
|------|-------------|
| 새 파라미터 추가 | grep으로 **모든** 호출부 찾아 수정 |
| 타입 변경 | 사용하는 **모든** 파일 확인 |
| GameClient 수정 | **4개 핸들러** 모두 확인 |
| AI 프롬프트 수정 | **응답 파싱 로직**도 확인 |
| 새 시나리오 필드 | 3-Way 통합 **3곳** 모두 |

### 테스트 기준

| 구분 | 테스트 |
|------|--------|
| 핵심 로직 (ending-checker 등) | 필수 |
| API 엔드포인트 | 필수 |
| UI 컴포넌트 | 선택 |
| AI 생성 기능 | 선택 |
