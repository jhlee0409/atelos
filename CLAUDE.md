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
│   │       ├── SystemRulesContent.tsx # Stats, flags, endings
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
│   ├── scenario-api.ts               # Scenario API client functions
│   └── scenario-mapping-utils.ts     # Scenario data transformations
├── constants/
│   ├── korean-english-mapping.ts     # i18n mappings for stats/flags/roles
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
- `PlayerState`: Current player stats, flags, traits, relationships
- `SaveState`: Full game state including context, community, chat history
- `AIResponse`: Structure of AI-generated content (log, dilemma, stat changes)
- `EndingArchetype`: Ending conditions and descriptions
- `SystemCondition`: Stat/flag/survivor conditions for endings
- `CharacterArc`: Character mood and trust tracking
- `KeyDecision`: Player decision history for flashback system
- `ActionContext`: Current action context for AI prompts (Phase 5)
- `WorldState`: Dynamic world state tracking (Phase 6)
- `StoryOpening`: 3-phase story opening configuration (Phase 7)

#### Game State Management

- **Stats**: Dynamic stat tracking with amplification based on current values (1.5x at extremes, 3.0x in mid-range)
- **Flags**: Boolean or count-based event tracking
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
- `lib/game-builder.ts`: Initial game state generation
- `lib/ai-scenario-generator.ts`: Scenario generation client
- `lib/synopsis-generator.ts`: Synopsis generation
- `lib/genre-narrative-styles.ts`: Genre-specific narrative guidance
- `lib/gameplay-config.ts`: Dynamic gameplay configuration utilities (Day calculation, route scores, action points, stat thresholds)

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
- `calculateRouteScores(flags, stats, scenario)`: 동적 루트 점수 계산
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

- Checks stat conditions with comparison operators (>=, <=, ==, >, <, !=)
- Checks flag conditions (boolean true or count > 0)
- Only checks endings after `endingCheckDay` (동적 계산, 기본: Day 5 for 7일 게임)
- Time limit ending triggers after configured days (ENDING_TIME_UP)
- Falls back to default "결단의 시간" ending if no conditions met

#### Route System (`RouteIndicator.tsx`)

Determines narrative path based on scenario's `routeScores` configuration:
- Default routes: 탈출 (Escape), 항전 (Defense), 협상 (Negotiation)
- Route scores calculated from flags and stats defined in `gameplayConfig.routeScores`

Route is "미정" (undetermined) until `routeActivationDay` (동적 계산, 기본: Day 3 for 7일 게임), then calculated based on accumulated flag scores.

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
- Rewards include: stat changes, flag acquisition, information

**Free Text Input**:
- Optional player-written actions (max 200 characters)
- Processed by AI as custom player input
- Available via "다른 행동" toggle in choice interface

#### Action Gauge System (Phase 4)

Per-day action budget management:
- `actionPoints`: Current remaining actions
- `maxActionPoints`: Maximum actions per day
- `ActionRecord`: Records of actions taken
- Actions consume points: choice (1), dialogue (1), exploration (1), freeText (1)

#### Context Linking System (Phase 5)

Maintains context across actions:
- `ActionContext`: Current situation, location, today's actions
- `DiscoveredClue`: Information pieces found during play
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
9. Route indicator updates based on flags
10. Ending conditions checked (Day 5+)
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
- `FLAG_MAPPING`: Event flags with Korean names
- `CHARACTER_ROLE_MAPPING`: Role IDs to Korean names
- `CHARACTER_TRAIT_MAPPING`: Trait IDs to Korean names
- `STATUS_MAPPING`: Character status values

Utility functions:
- `getStatIdByKorean()`: Reverse lookup for Korean → English
- `getKoreanStatName()`: Forward lookup English → Korean
- `getKoreanFlagName()`: Forward lookup with FLAG_ prefix handling
- `getKoreanRoleName()`, `getKoreanTraitName()`, `getKoreanStatusName()`
- `isValidStatId()`, `isValidFlagId()`: Type guard validation functions
- `getAllStatIds()`, `getAllFlagIds()`: Get all available IDs

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
   - `required_flag`: { flagName }
   - `survivor_count`: { comparison, value }
3. Set `isGoalSuccess` boolean for success/failure classification

### Adding New Flags

1. Add to scenario's `flagDictionary` array
2. Define `flagName`, `description`, `type` (boolean/count), `initial`
3. Optionally add `triggerCondition` for AI guidance
4. Add to `FLAG_MAPPING` in `constants/korean-english-mapping.ts`
5. If route-related, update `RouteIndicator.tsx` score calculations

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
- `flagDictionary` for trackable events
- `endingArchetypes` with conditions
- `endCondition` (time_limit with days/hours)
- `storyOpening` for 3-phase opening configuration

### Scenario Data Validation (`lib/scenario-validator.ts`)

시나리오 데이터의 일관성을 검증하는 유틸리티입니다. Admin 에디터의 StickySidebar에서 실시간으로 검증 결과를 표시합니다.

**검증 항목:**

| 검증 유형 | 심각도 | 설명 |
|----------|--------|------|
| 엔딩 스탯 참조 | error | 존재하지 않는 statId 참조 |
| 엔딩 플래그 참조 | error | 존재하지 않는 flagName 참조 |
| 관계 캐릭터 | error | 존재하지 않는 캐릭터 관계 설정 |
| 스토리 오프닝 캐릭터 | error | firstCharacterToMeet 등이 캐릭터 목록에 없음 |
| 스탯 범위 | error | initialValue가 min/max 범위 밖 |
| 엔딩 조건 충돌 | warning | 같은 스탯에 충돌하는 조건 (>=80 AND <=20) |
| 미사용 플래그 | warning | 정의되었지만 엔딩 조건에서 사용되지 않는 플래그 |

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
  - 🏴 Flags
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
1. Check flag acquisition in game state
2. Verify flag names match exactly (with FLAG_ prefix)
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

## 🚨 Development Checklist (MANDATORY)

**이 체크리스트는 기능 구현/개선 시 반드시 따라야 합니다.**

### 기능 구현 완료 후 자동 검증 단계

모든 기능 구현/개선 작업 후, 다음을 **자동으로** 수행:

#### 1. 타입 일관성 검증
- [ ] 새로 추가한 타입이 `types/index.ts`에 정의되어 있는가?
- [ ] 해당 타입을 사용하는 모든 파일에서 import 되었는가?
- [ ] Optional 필드(`?`)와 required 필드가 일관되게 처리되는가?

#### 2. 함수 호출 체인 검증
- [ ] 새로운 파라미터를 추가했다면, 호출하는 **모든 곳**에서 전달되는가?
- [ ] 함수 시그니처 변경 시, 모든 호출부가 업데이트 되었는가?
- [ ] API 함수 호출 시그니처가 올바른가?

#### 3. 데이터 흐름 검증
```
GameClient.tsx → lib/game-builder.ts → lib/gemini-client.ts
                                     → lib/genre-narrative-styles.ts
```
- [ ] 새로운 상태/데이터가 이 체인 전체에서 올바르게 전달되는가?
- [ ] 상태 업데이트가 모든 관련 핸들러에서 동일하게 처리되는가?

#### 4. 핸들러 일관성 검증
GameClient의 4개 주요 핸들러에 동일한 로직이 필요한 경우:
- [ ] `handlePlayerChoice()` - 선택지 처리
- [ ] `handleDialogueSelect()` - 대화 처리
- [ ] `handleExplore()` - 탐색 처리
- [ ] `handleFreeTextSubmit()` - 자유 입력 처리

#### 5. AI 프롬프트 통합 검증
새로운 컨텍스트/데이터를 AI에 전달해야 하는 경우:
- [ ] 프롬프트 빌더에서 해당 데이터를 포함하는가?
- [ ] 장르 스타일이 적절히 적용되는가?

#### 6. UI 컴포넌트 연동 검증
상태 변경이 UI에 반영되어야 하는 경우:
- [ ] 관련 UI 컴포넌트에 props가 전달되는가?
- [ ] 상태 변경 시 리렌더링이 발생하는가?

#### 7. 폴백/에러 처리 검증
- [ ] AI 호출 실패 시 폴백 로직이 있는가?
- [ ] Optional 데이터 접근 시 null/undefined 체크가 있는가?

#### 8. 테스트 검증
- [ ] 새 기능에 대한 단위 테스트가 작성되었는가?
- [ ] 기존 테스트가 통과하는가? (`pnpm test`)

### 체크리스트 적용 예시

```
❌ 잘못된 패턴:
"새 타입 추가했고, 컴포넌트 만들었습니다. 빌드 성공!"

✅ 올바른 패턴:
"새 타입 추가 완료. 검증 결과:
- types/index.ts: ✅ 타입 정의됨
- GameClient.tsx: ✅ 초기화 및 업데이트 로직 추가
- 4개 핸들러: ✅ 모두 context 업데이트 호출
- lib/gemini-client.ts: ✅ 프롬프트에 전달
- tests/unit/: ✅ 테스트 추가됨
모든 통합 지점 확인 완료."
```

### 현재 시스템 핵심 통합 지점

| 시스템 | 초기화 | 업데이트 | AI 전달 | UI 표시 |
|--------|--------|----------|---------|---------|
| Action Points | `createInitialSaveState` | 4개 핸들러 | N/A | `ChoiceButtons`, `TimelineProgress` |
| ActionContext | `createInitialSaveState` | 4개 핸들러 | `gemini-client.ts` | N/A |
| WorldState | `createInitialSaveState` | 4개 핸들러 | `gemini-client.ts` | `ExplorationPanel` |
| Character Arc | `createInitialSaveState` | `updateSaveState` | `gemini-client.ts` | `CharacterArcPanel` |
| Key Decisions | N/A | `handlePlayerChoice` | `gemini-client.ts` | `KeyDecisionPanel` |
| Flags | `createInitialSaveState` | `updateSaveState` | `gemini-client.ts` | `RouteIndicator` |
| ProtagonistKnowledge | `createInitialSaveState` | 4개 핸들러 | `gemini-client.ts` | N/A |
| GameplayConfig | N/A | N/A | `gameplay-config.ts` | `RouteIndicator`, `EndingProgress`, `StatsBar` |

### 🔗 전체 시스템 통합 검증 (3-Way Integration)

**ATELOS는 세 가지 핵심 시스템이 긴밀하게 연결되어 있습니다. 새로운 기능/데이터를 추가할 때 반드시 세 시스템 모두에서 통합을 확인해야 합니다.**

```
┌─────────────────────────────────────────────────────────────────┐
│                    ATELOS 시스템 통합 다이어그램                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │ 1. AI 시나리오   │ → │ 2. Admin Editor │ → │ 3. 게임      │  │
│  │    생성 시스템   │    │    (수정/저장)   │    │   플레이    │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
│                                                                 │
│  - ai-generate/route.ts   - ScenarioEditor/*    - GameClient   │
│  - ai-scenario-generator  - BaseContent         - game-builder │
│  - CATEGORY_SCHEMAS       - SystemRulesContent  - gameplay-config│
│                           - GameplayConfigContent - RouteIndicator│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 새로운 ScenarioData 필드 추가 시 필수 체크리스트

**예시: `gameplayConfig` 필드를 추가하는 경우**

| 단계 | 확인 사항 | 체크 |
|------|----------|------|
| **1. 타입 정의** | `types/index.ts`에 타입이 정의되었는가? | [ ] |
| **2. AI 생성** | `ai-generate/route.ts`에 생성 카테고리가 추가되었는가? | [ ] |
|  | `ai-scenario-generator.ts`에 결과 타입이 추가되었는가? | [ ] |
|  | AI가 생성한 데이터가 ScenarioData에 올바르게 매핑되는가? | [ ] |
| **3. Admin 편집** | Admin Editor에 수정 UI가 추가되었는가? | [ ] |
|  | 저장 시 Firebase에 올바르게 저장되는가? | [ ] |
|  | 시나리오 불러오기 시 데이터가 로드되는가? | [ ] |
| **4. 게임 사용** | GameClient에서 해당 데이터를 사용하는가? | [ ] |
|  | 기본값(defaults)이 정의되어 있는가? (선택적 필드의 경우) | [ ] |
|  | 관련 UI 컴포넌트에 전달되는가? | [ ] |
| **5. 유틸리티** | 헬퍼 함수가 필요한 경우 `lib/` 에 추가되었는가? | [ ] |
|  | 다른 파일에서 import하여 사용 가능한가? | [ ] |

#### 통합 검증 예시

```
❌ 불완전한 구현:
"GameplayConfig 타입을 추가하고, Admin Editor UI를 만들었습니다."
→ AI 생성 시스템과 게임 플레이 시스템에서 사용하지 않음!

✅ 완전한 구현:
"GameplayConfig 전체 통합 완료:
1. types/index.ts: ✅ GameplayConfig, RouteScoreConfig 타입 정의
2. ai-generate/route.ts: ✅ 'gameplay_config' 카테고리 추가
   - CATEGORY_SCHEMAS에 스키마 정의
   - CATEGORY_TEMPERATURE, CATEGORY_MAX_TOKENS 설정
   - getCategoryPrompt에 프롬프트 템플릿 추가
3. ai-scenario-generator.ts: ✅ GameplayConfigResult 타입 및 CATEGORY_INFO 추가
4. GameplayConfigContent.tsx: ✅ Admin Editor UI 컴포넌트
5. admin/[scenarioId]/page.tsx: ✅ 편집 페이지에 섹션 추가
6. lib/gameplay-config.ts: ✅ 헬퍼 함수 및 기본값
7. GameClient.tsx: ✅ getActionPointsPerDay, canCheckEnding 등 사용
8. RouteIndicator.tsx: ✅ calculateRouteScores 사용
9. EndingProgress.tsx: ✅ getEndingCheckDay 사용
모든 시스템에서 gameplayConfig가 사용됨을 확인했습니다."
```

#### ScenarioData 필드별 통합 현황

| 필드 | AI 생성 | Admin 편집 | 게임 사용 |
|------|---------|------------|----------|
| `title`, `synopsis`, `playerGoal` | scenario_overview | BaseContent | GameClient |
| `characters` | characters | CharacterContent | GameClient |
| `initialRelationships` | relationships | CharacterContent | GameClient |
| `scenarioStats` | stats | SystemRulesContent | StatsBar, GameClient |
| `flagDictionary` | flags | SystemRulesContent | RouteIndicator, GameClient |
| `endingArchetypes` | endings | CoreStoryElementsContent | ending-checker |
| `traitPool` | traits | SystemRulesContent | GameClient |
| `storyOpening` | story_opening | StoryOpeningContent | GameClient |
| `gameplayConfig` | gameplay_config | GameplayConfigContent | gameplay-config utils |

**⚠️ 새 필드 추가 시 위 테이블의 모든 열이 채워져야 합니다!**

## 🧪 테스트 전략 (Test-Aware Development)

**LLM 기반 개발에 최적화된 실용적 테스트 전략입니다.**

### 테스트 적용 기준

| 구분 | 테스트 필수 | 테스트 선택 |
|------|-------------|-------------|
| **핵심 비즈니스 로직** | ✅ | |
| (ending-checker, simulation-utils) | | |
| **API 엔드포인트** | ✅ | |
| **유틸리티 함수** | ✅ | |
| **UI 컴포넌트** | | ✅ |
| **AI 생성 기능** | | ✅ (출력 비결정적) |
| **스타일/레이아웃** | | ❌ 불필요 |

### 개발 워크플로우

#### 1단계: 구현 계획 공유

구현 전 무엇을 만들지 명확히 설명:

```
📋 구현 계획:
- 목표: 스토리 오프닝 재생성 버튼 추가
- 변경 파일: ScenarioEditor/index.tsx, ai-generate/route.ts
- 영향 범위: 기존 시나리오 편집 기능
```

#### 2단계: 구현

LLM으로 빠르게 구현 진행

#### 3단계: 핵심 테스트 작성 (해당 시)

핵심 로직 변경 시에만 테스트 추가:

```typescript
// 핵심 로직 예시 - 테스트 필수
describe('checkEndingConditions', () => {
  it('should trigger ending when all conditions met', () => {
    // ...
  });
});
```

#### 4단계: 검증

```bash
pnpm build       # 빌드 성공 확인
pnpm test        # 기존 테스트 통과 확인
```

### 테스트 파일 위치

| 테스트 유형 | 위치 | 용도 |
|------------|------|------|
| Unit Tests | `tests/unit/` | 핵심 함수/모듈 테스트 |
| Integration Tests | `tests/integration/` | 시스템 간 통합 테스트 |
| AI Quality Tests | `tests/ai-quality/` | AI 응답 품질 테스트 |

### 테스트 작성 시 가이드라인

1. **테스트 이름은 명확하게**: `should [동작] when [조건]`
2. **AAA 패턴 사용**: Arrange → Act → Assert
3. **엣지 케이스 포함**: 빈 값, null, 경계값 등
4. **Mock 적절히 사용**: 외부 의존성은 mock 처리
5. **독립적인 테스트**: 테스트 간 의존성 없이 독립 실행 가능

### 핵심 원칙

```
✅ 올바른 패턴:
"엔딩 체커 로직 수정 → 테스트 추가 → 검증"
"UI 버튼 추가 → 빌드 확인 → 수동 테스트"

❌ 피해야 할 패턴:
"모든 기능에 테스트 먼저 작성" (과도한 오버헤드)
"테스트 없이 핵심 로직 수정" (위험)
```

## 📝 문서화 규칙 (Documentation Rules)

**기능 구현/개선 후 반드시 관련 문서를 업데이트해야 합니다.**

### 필수 업데이트 대상

| 변경 유형 | 업데이트 대상 |
|----------|---------------|
| 새로운 시스템/기능 추가 | CLAUDE.md (Project Structure, High-Level Architecture) |
| 새로운 유틸리티 함수 추가 | CLAUDE.md (lib/ 섹션에 파일 설명 추가) |
| 타입 정의 변경 | CLAUDE.md (Type System 섹션) |
| API 엔드포인트 추가 | CLAUDE.md (API Routes 테이블) |
| 환경 변수 추가 | CLAUDE.md (Environment Setup) |
| 디버깅 팁 발견 | CLAUDE.md (Common Debugging) |
| 주요 기능 완성 | README.md (Features 섹션) |

### 문서 업데이트 체크리스트

기능 구현 완료 후 다음을 확인:

- [ ] **CLAUDE.md**: 새 파일/함수가 Project Structure에 반영되었는가?
- [ ] **CLAUDE.md**: 새 시스템이 High-Level Architecture에 설명되었는가?
- [ ] **CLAUDE.md**: 핵심 통합 지점 테이블이 업데이트 되었는가?
- [ ] **README.md**: 사용자에게 보이는 새 기능이 Features에 추가되었는가?

### 문서화 예시

```
✅ 올바른 패턴:
"시나리오 검증 시스템 구현 완료.
- lib/scenario-validator.ts 추가
- CLAUDE.md: lib/ 섹션에 scenario-validator.ts 설명 추가
- CLAUDE.md: Admin 섹션에 검증 시스템 설명 추가"

❌ 잘못된 패턴:
"시나리오 검증 시스템 구현 완료. 빌드 성공!"
(문서 업데이트 없음)
```
