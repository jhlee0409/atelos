# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ATELOS is a Next.js 15 + React 19 interactive narrative game platform featuring AI-powered storytelling. It's a post-apocalyptic scenario-driven game where players make choices that affect the story outcome through Gemini AI (gemini-2.5-flash-lite) integration. The game is primarily in Korean with English internal identifiers.

## Tech Stack

- **Framework**: Next.js 15.2.4 with App Router
- **React**: Version 19
- **Language**: TypeScript 5
- **Styling**: TailwindCSS 3.4 + tailwindcss-animate
- **UI Components**: Radix UI primitives (accordion, dialog, dropdown, tabs, etc.)
- **AI**: Google Generative AI (@google/generative-ai) - Gemini 2.5 Flash Lite
- **Forms**: React Hook Form + Zod validation
- **Package Manager**: pnpm

## Common Development Commands

```bash
# Start development server
pnpm run dev

# Build for production
pnpm run build

# Start production server
pnpm run start

# Run linting
pnpm run lint
```

## Project Structure

```
atelos/
├── app/                              # Next.js App Router pages
│   ├── layout.tsx                    # Root layout with providers
│   ├── page.tsx                      # Landing page (/)
│   ├── admin/page.tsx                # Scenario Editor with auth (/admin)
│   ├── lobby/page.tsx                # Scenario selection (/lobby)
│   ├── scenarios/[scenarioId]/       # Scenario details pages
│   │   ├── page.tsx
│   │   └── ScenarioDetailClient.tsx
│   ├── game/[scenarioId]/            # Game play pages
│   │   ├── page.tsx
│   │   └── GameClient.tsx            # Main game client component
│   └── api/
│       ├── gemini/route.ts           # Main AI API endpoint
│       └── admin/auth/route.ts       # Admin authentication
├── components/
│   ├── ui/                           # Radix-based UI primitives (50+ components)
│   ├── client/GameClient/            # Game UI components
│   │   ├── ChatHistory.tsx           # Message history display
│   │   ├── ChatMessage.tsx           # Individual message component
│   │   ├── ChoiceButtons.tsx         # Player choice interface (+ free text input)
│   │   ├── StatsBar.tsx              # Compact stat display
│   │   ├── StatDisplay.tsx           # Detailed stat visualization (+ amplification tooltip)
│   │   ├── CharacterArcPanel.tsx     # Character mood/trust display
│   │   ├── RouteIndicator.tsx        # Narrative route tracker
│   │   ├── CharacterDialoguePanel.tsx # Phase 3: Character conversation system
│   │   ├── ExplorationPanel.tsx      # Phase 3: Location exploration system
│   │   ├── TimelineProgress.tsx      # Phase 3: Day/time visualization
│   │   ├── EndingProgress.tsx        # Phase 2: Ending progress tracker
│   │   └── KeyDecisionPanel.tsx      # Phase 2: Decision history panel
│   ├── admin/ScenarioEditor/         # Scenario editor components
│   │   ├── BaseContent.tsx           # Basic scenario info
│   │   ├── CharacterContent.tsx      # Character management
│   │   ├── SystemRulesContent.tsx    # Stats, flags, endings
│   │   ├── CoreStoryElementsContent.tsx
│   │   ├── ScenarioHeader.tsx
│   │   └── StickySidebar.tsx
│   ├── landing/                      # Landing page components
│   │   ├── Hero.tsx                  # Hero section
│   │   ├── Features.tsx              # Feature highlights
│   │   ├── Gameplay.tsx              # Gameplay explanation
│   │   ├── Endings.tsx               # Ending showcase
│   │   ├── CallToAction.tsx
│   │   ├── Navigation.tsx
│   │   └── Footer.tsx
│   └── theme-provider.tsx            # Dark/light theme support
├── lib/                              # Core business logic
│   ├── game-ai-client.ts             # AI response generation & validation
│   ├── gemini-client.ts              # Gemini API wrapper
│   ├── prompt-builder.ts             # Standard prompt construction
│   ├── prompt-builder-optimized.ts   # Token-optimized prompts (v2)
│   ├── ending-checker.ts             # Ending condition evaluation
│   ├── game-builder.ts               # Initial game state & fallbacks
│   ├── chat-history-manager.ts       # Chat history compression
│   ├── simulation-utils.ts           # Stat calculations & dilemmas
│   ├── dialogue-generator.ts         # Phase 3: Character dialogue AI generation
│   ├── exploration-generator.ts      # Phase 3: Location exploration AI generation
│   ├── validations.ts                # Form validation schemas
│   └── utils.ts                      # General utilities (cn, etc.)
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
└── hooks/
    └── use-mobile.tsx                # Mobile detection hook
```

## High-Level Architecture

### Core Application Flow

1. **Landing Page** (`/`) → Marketing page
2. **Scenario Selection** (`/lobby`) → **Scenario Details** (`/scenarios/[id]`) → **Game Play** (`/game/[id]`)
3. **Admin Interface** (`/admin`) - Password-protected scenario editor

### Key System Components

#### Type System (`types/index.ts`)

Core types that define the game:
- `ScenarioData`: Complete scenario definition (characters, stats, endings, etc.)
- `PlayerState`: Current player stats, flags, traits, relationships
- `SaveState`: Full game state including context, community, chat history
- `AIResponse`: Structure of AI-generated content (log, dilemma, stat changes)
- `EndingArchetype`: Ending conditions and descriptions
- `SystemCondition`: Stat/flag/survivor conditions for endings
- `CharacterArc`: Character mood and trust tracking
- `KeyDecision`: Player decision history for flashback system

#### Game State Management

- **Stats**: Dynamic stat tracking with amplification based on current values (1.5x at extremes, 3.0x in mid-range)
- **Flags**: Boolean or count-based event tracking
- **Relationships**: Character relationship values with signed numeric values
- **Time System**: Day-based progression (7-day scenarios)
- **Chat History**: Full message history with multiple message types
- **Character Arcs**: Track character moods and trust levels
- **Route Tracking**: Determine narrative path (탈출/항전/협상)

#### Chat Message Types

The game supports multiple message types for rich narrative display:
- `system`: System notifications and day changes
- `player`: Player choices
- `ai`: General AI narrative responses
- `ai-dialogue`: Character dialogue (with quote styling)
- `ai-thought`: Internal monologue/thoughts (italic styling)
- `ai-narration`: Scene descriptions (minimal styling)

#### AI Integration (`lib/game-ai-client.ts`)

Key functions:
- `generateGameResponse()`: Main AI call with token optimization
- `generateInitialDilemma()`: First turn narrative generation
- `validateGameResponse()`: Response structure validation
- `cleanAndValidateAIResponse()`: Korean language quality validation
- `getOptimalAISettings()`: Adaptive settings based on game phase
- `createPlayerAction()`: Create player action objects

Language validation features:
- Detects and removes Arabic, Thai, Hindi, Cyrillic characters
- Validates Korean content ratio (>30% required)
- Cleans weird Unicode characters

#### Prompt System

Two prompt builders:
1. **Standard** (`prompt-builder.ts`): Full, lite, minimal, detailed complexity levels
2. **Optimized v2** (`prompt-builder-optimized.ts`): Ultra-lite mode for token savings
   - Compressed character/stat/flag representations
   - Dynamic complexity based on token budget and game day
   - Prompt caching system

Token optimization strategy:
- Early game (Day 1-2): Lite mode
- Mid game (Day 3-5): Full mode with adaptive settings
- End game (Day 6+): Detailed mode for quality endings
- Auto-switch to ultra-lite when budget < 5000 tokens

#### Ending System (`lib/ending-checker.ts`)

- Checks stat conditions with comparison operators (>=, <=, ==, >, <, !=)
- Checks flag conditions (boolean true or count > 0)
- Only checks endings after Day 5
- Time limit ending triggers after Day 7 (ENDING_TIME_UP)
- Falls back to default "결단의 시간" ending if no conditions met

#### Route System (`RouteIndicator.tsx`)

Determines narrative path based on flags:
- **탈출 (Escape)**: FLAG_ESCAPE_VEHICLE_SECURED, FLAG_LEADER_SACRIFICE
- **항전 (Defense)**: FLAG_DEFENSES_COMPLETE, FLAG_RESOURCE_MONOPOLY, FLAG_IDEOLOGY_ESTABLISHED
- **협상 (Negotiation)**: FLAG_ALLY_NETWORK_FORMED, FLAG_GOVERNMENT_CONTACT, FLAG_UNDERGROUND_HIDEOUT

Route is "미정" (undetermined) until Day 3, then calculated based on accumulated flag scores.

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

**Character Dialogue System** (`CharacterDialoguePanel.tsx`, `dialogue-generator.ts`):
- Players can initiate conversations with any available character
- Topic categories: `info` (정보), `advice` (조언), `relationship` (관계), `personal` (개인)
- Topics generated dynamically based on character role
- AI generates contextual dialogue responses
- Can affect relationship values and provide in-game information
- Fallback responses available when AI fails

**Exploration System** (`ExplorationPanel.tsx`, `exploration-generator.ts`):
- Day-gated locations: storage, entrance, medical (Day 1+), roof (Day 3+), basement (Day 5+)
- Genre-specific locations (e.g., crew quarters for SF scenarios)
- AI generates exploration narratives and rewards
- Rewards include: stat changes, flag acquisition, information
- Fallback results for each location type

**Free Text Input** (`ChoiceButtons.tsx`):
- Optional player-written actions (max 200 characters)
- Processed by AI as custom player input
- Available via "다른 행동" toggle in choice interface

**Timeline Visualization** (`TimelineProgress.tsx`):
- Day progress bar with day markers
- Time of day indicator (morning/afternoon/evening/night based on turns)
- Remaining days warning (urgent at Day 6+)
- Compact version available for StatsBar integration

### Component Architecture

#### GameClient.tsx (Main Game Component)

State management:
- `saveState`: Complete game state (includes character arcs, key decisions)
- `isLoading` / `isInitialDilemmaLoading`: Loading states
- `triggeredEnding`: Active ending state
- `languageWarning`: AI language issue notifications
- `gameMode`: Current interaction mode ('choice' | 'dialogue' | 'exploration')
- `isDialogueLoading` / `isExplorationLoading`: Mode-specific loading states

Key functions:
- `createInitialSaveState()`: Initialize game from scenario with character arcs
- `updateSaveState()`: Apply AI response changes with stat amplification
- `handlePlayerChoice()`: Process player selection and call AI
- `handleDialogueSelect()`: Process character dialogue interactions (Phase 3)
- `handleExplore()`: Process location exploration (Phase 3)
- `handleFreeTextSubmit()`: Process free text player input (Phase 3)

### Data Flow

1. Scenarios loaded from JSON (see `mocks/ZERO_HOUR.json` for structure)
2. Game state initialized with scenario data via `createInitialSaveState()`
3. Initial dilemma generated via AI or fallback
4. Player makes choice → `handlePlayerChoice()` called
5. AI generates narrative via `generateGameResponse()`
6. State updates with amplified stat changes
7. Route indicator updates based on flags
8. Ending conditions checked (Day 5+)
9. Game continues until ending triggered

### API Routes

#### `/api/gemini` (POST)
Main AI endpoint for game responses. Handles:
- Game narrative generation
- Stat change calculations
- Character interactions

#### `/api/admin/auth` (POST)
Admin authentication endpoint.
- Input: `{ password: string }`
- Validates against `ADMIN_PASSWORD` env variable

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

### AI Prompt Construction

When modifying AI behavior, update `lib/prompt-builder.ts` or `lib/prompt-builder-optimized.ts`.

Prompt includes:
- Full game state context
- Character information with traits
- Recent chat history (compressed in v2)
- Available choices based on current situation
- Strict Korean-only output instruction

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

## Environment Setup

Required environment variables:
```
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
ADMIN_PASSWORD=your-admin-password  # For /admin route protection
```

**Note**: The API key is only used server-side via `/api/gemini` route and is never exposed to the client.

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
  - ⚠️/❌ Warnings/errors

### Component Naming

- Game components: `components/client/GameClient/`
- Admin components: `components/admin/ScenarioEditor/`
- Landing page: `components/landing/`
- UI primitives: `components/ui/`

### CSS Classes

Custom colors defined in `tailwind.config.ts`:
- `telos-black`: Primary dark background
- `red-900`, `red-950`: Accent colors for warnings/urgency
- `zinc-*`: Neutral grays for UI elements

## Common Debugging

### AI Response Issues
1. Check `validateGameResponse()` logs for structure problems
2. Check `cleanAndValidateAIResponse()` for language issues
3. Look for token budget warnings in console

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
- [ ] API 함수 호출 시그니처가 올바른가? (예: `callGeminiAPI({...})` 형식)

#### 3. 데이터 흐름 검증
```
GameClient.tsx → game-ai-client.ts → prompt-builder.ts → gemini-client.ts
                                   → context-manager.ts
                                   → exploration-generator.ts
                                   → dialogue-generator.ts
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
- [ ] `prompt-builder.ts`의 `buildOptimizedGamePrompt()` 옵션에 추가되었는가?
- [ ] `prompt-builder-optimized.ts`의 `buildOptimizedGamePromptV2()` 옵션에 추가되었는가?
- [ ] `game-ai-client.ts`의 호출부에서 해당 옵션을 전달하는가?
- [ ] `exploration-generator.ts`에서 해당 컨텍스트를 사용하는가?
- [ ] `dialogue-generator.ts`에서 해당 컨텍스트를 사용하는가?

#### 6. UI 컴포넌트 연동 검증
상태 변경이 UI에 반영되어야 하는 경우:
- [ ] 관련 UI 컴포넌트에 props가 전달되는가?
- [ ] 상태 변경 시 리렌더링이 발생하는가?

#### 7. 폴백/에러 처리 검증
- [ ] AI 호출 실패 시 폴백 로직이 있는가?
- [ ] Optional 데이터 접근 시 null/undefined 체크가 있는가?

### 체크리스트 적용 예시

```
❌ 잘못된 패턴:
"ActionContext 타입 추가했고, context-manager.ts 만들었습니다. 빌드 성공!"

✅ 올바른 패턴:
"ActionContext 타입 추가 완료. 검증 결과:
- types/index.ts: ✅ 타입 정의됨
- GameClient.tsx: ✅ 초기화 및 업데이트 로직 추가
- 4개 핸들러: ✅ 모두 context 업데이트 호출
- game-ai-client.ts: ✅ 프롬프트 빌더에 전달
- prompt-builder.ts: ✅ 옵션 추가 및 프롬프트에 포함
- prompt-builder-optimized.ts: ✅ 옵션 추가 및 프롬프트에 포함
- exploration-generator.ts: ✅ context 사용
- dialogue-generator.ts: ✅ context 사용
모든 통합 지점 확인 완료."
```

### 현재 시스템 핵심 통합 지점

| 시스템 | 초기화 | 업데이트 | AI 전달 | UI 표시 |
|--------|--------|----------|---------|---------|
| Action Gauge (AP) | `createInitialSaveState` | `consumeActionPoint` | N/A | `ChoiceButtons`, `TimelineProgress` |
| ActionContext | `createInitialSaveState` | 4개 핸들러 | `prompt-builder*.ts` | N/A |
| Character Arc | `createInitialSaveState` | `updateSaveState` | `prompt-builder.ts` | `CharacterArcPanel` |
| Key Decisions | N/A | `handlePlayerChoice` | `prompt-builder*.ts` | `KeyDecisionPanel` |
| Flags | `createInitialSaveState` | `updateSaveState` | `prompt-builder*.ts` | `RouteIndicator` |

