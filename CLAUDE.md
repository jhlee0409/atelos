# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ATELOS is a Next.js 15 + React 19 interactive narrative game platform featuring AI-powered storytelling. It's a post-apocalyptic scenario-driven game where players make choices that affect the story outcome through Gemini AI (gemini-2.0-flash) integration. The game is primarily in Korean with English internal identifiers.

## Tech Stack

- **Framework**: Next.js 15.2.4 with App Router
- **React**: Version 19
- **Language**: TypeScript 5
- **Styling**: TailwindCSS 3.4 + tailwindcss-animate
- **UI Components**: Radix UI primitives (accordion, dialog, dropdown, tabs, etc.)
- **AI**: Google Generative AI (@google/generative-ai) - Gemini 2.0 Flash
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
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Admin/Scenario Editor (/)
│   ├── lobby/page.tsx            # Scenario selection (/lobby)
│   ├── scenarios/[scenarioId]/   # Scenario details pages
│   └── game/[scenarioId]/        # Game play pages
│       └── GameClient.tsx        # Main game client component
├── components/
│   ├── ui/                       # Radix-based UI primitives
│   ├── lobby/                    # Lobby-specific components
│   └── theme-provider.tsx        # Dark/light theme support
├── lib/                          # Core business logic
│   ├── game-ai-client.ts         # AI response generation & validation
│   ├── gemini-client.ts          # Gemini API wrapper
│   ├── prompt-builder.ts         # Standard prompt construction
│   ├── prompt-builder-optimized.ts # Token-optimized prompts (v2)
│   ├── ending-checker.ts         # Ending condition evaluation
│   ├── game-builder.ts           # Initial game state & fallbacks
│   ├── chat-history-manager.ts   # Chat history compression
│   ├── simulation-utils.ts       # Stat calculations & dilemmas
│   ├── validations.ts            # Form validation schemas
│   └── utils.ts                  # General utilities (cn, etc.)
├── pages/                        # Legacy component organization
│   ├── admin/ScenarioEditor/     # Scenario editor components
│   └── client/GameClient/        # Game UI components
│       ├── ChoiceButtons.tsx     # Player choice interface
│       ├── ChatHistory.tsx       # Message history display
│       ├── ChatMessage.tsx       # Individual message component
│       ├── StatsBar.tsx          # Compact stat display
│       └── StatDisplay.tsx       # Detailed stat visualization
├── constants/
│   ├── korean-english-mapping.ts # i18n mappings for stats/flags/roles
│   ├── comparison-operators.ts   # Condition evaluation operators
│   └── scenario.ts               # Scenario constants
├── types/
│   └── index.ts                  # All TypeScript type definitions
├── mocks/
│   └── ZERO_HOUR.json            # Test scenario data
└── hooks/
    └── use-mobile.tsx            # Mobile detection hook
```

## High-Level Architecture

### Core Application Flow

1. **Scenario Selection** (`/lobby`) → **Scenario Details** (`/scenarios/[id]`) → **Game Play** (`/game/[id]`)
2. **Admin Interface** (`/`) - Scenario editor for creating/editing game content

### Key System Components

#### Type System (`types/index.ts`)

Core types that define the game:
- `ScenarioData`: Complete scenario definition (characters, stats, endings, etc.)
- `PlayerState`: Current player stats, flags, traits, relationships
- `SaveState`: Full game state including context, community, chat history
- `AIResponse`: Structure of AI-generated content (log, dilemma, stat changes)
- `EndingArchetype`: Ending conditions and descriptions
- `SystemCondition`: Stat/flag/survivor conditions for endings

#### Game State Management

- **Stats**: Dynamic stat tracking with amplification based on current values (1.5x at extremes, 3.0x in mid-range)
- **Flags**: Boolean or count-based event tracking
- **Relationships**: Character relationship values with signed numeric values
- **Time System**: Day-based progression (7-day scenarios)
- **Chat History**: Full message history for context and display

#### AI Integration (`lib/game-ai-client.ts`)

Key functions:
- `generateGameResponse()`: Main AI call with token optimization
- `generateInitialDilemma()`: First turn narrative generation
- `validateGameResponse()`: Response structure validation
- `cleanAndValidateAIResponse()`: Korean language quality validation
- `getOptimalAISettings()`: Adaptive settings based on game phase

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

### Component Architecture

#### GameClient.tsx (Main Game Component)

State management:
- `saveState`: Complete game state
- `isLoading` / `isInitialDilemmaLoading`: Loading states
- `triggeredEnding`: Active ending state
- `languageWarning`: AI language issue notifications

Key functions:
- `createInitialSaveState()`: Initialize game from scenario
- `updateSaveState()`: Apply AI response changes with stat amplification
- `handlePlayerChoice()`: Process player selection and call AI

### Data Flow

1. Scenarios loaded from JSON (see `mocks/ZERO_HOUR.json` for structure)
2. Game state initialized with scenario data via `createInitialSaveState()`
3. Initial dilemma generated via AI or fallback
4. Player makes choice → `handlePlayerChoice()` called
5. AI generates narrative via `generateGameResponse()`
6. State updates with amplified stat changes
7. Ending conditions checked (Day 5+)
8. Game continues until ending triggered

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
- Similar for flags, roles, traits, status

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

Required environment variable:
```
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
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

## Common Debugging

### AI Response Issues
1. Check `validateGameResponse()` logs for structure problems
2. Check `cleanAndValidateAIResponse()` for language issues
3. Look for token budget warnings in console

### Stat Not Updating
1. Verify stat ID matches `scenarioStats` definition
2. Check `mapStatNameToId()` mapping in `updateSaveState()`
3. Verify amplification isn't clamping to bounds

### Ending Not Triggering
1. Confirm Day >= 5 (endings only check after Day 5)
2. Log `checkEndingConditions()` output
3. Verify all `systemConditions` are satisfiable
