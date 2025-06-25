# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ATELOS is a Next.js-based interactive narrative game platform featuring AI-powered storytelling. It's a post-apocalyptic scenario-driven game where players make choices that affect the story outcome through Gemini AI integration.

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

## High-Level Architecture

### Core Application Flow

1. **Scenario Selection** (`/lobby`) → **Scenario Details** (`/scenarios/[id]`) → **Game Play** (`/game/[id]`)
2. **Admin Interface** (`/`) - Scenario editor for creating/editing game content

### Key System Components

#### Game State Management

- **GameState** (`types/index.ts`): Central state containing stats, flags, relationships, inventory, and chat history
- **Stats System**: Dynamic stat tracking with amplification based on current values
- **Relationship System**: Tracks character relationships and traits
- **Time System**: Days/hours progression affecting gameplay

#### AI Integration (`lib/game-ai-client.ts`)

- Uses Gemini AI (gemini-2.0-flash) for narrative generation
- Prompt builder (`lib/prompt-builder.ts`) constructs detailed prompts with game state
- Generates dynamic story content and player choices based on current state

#### Game Logic

- **Ending Checker** (`lib/ending-checker.ts`): Evaluates multiple ending conditions
- **Game Builder** (`lib/game-builder.ts`): Constructs initial game state from scenarios
- **Simulation Utils** (`lib/simulation-utils.ts`): Handles stat calculations and game mechanics

### Component Structure

#### Game Client Components (`app/game/[scenarioId]/`)

- **GameClient.tsx**: Main game interface orchestrator
- **ChoiceButtons** (`pages/client/GameClient/ChoiceButtons.tsx`): Player choice interface
- **StatDisplay** (`pages/client/GameClient/StatDisplay.tsx`): Real-time stat visualization
- **StatsBar** (`pages/client/GameClient/StatsBar.tsx`): Compact stat display

#### Scenario Editor (`pages/admin/ScenarioEditor/`)

- Character management with traits and relationships
- Ending condition configuration
- Stat definitions and initial values

### Data Flow

1. Scenarios loaded from JSON (see `mocks/` directory for examples)
2. Game state initialized with scenario data
3. AI generates narrative based on state + player choices
4. State updates trigger stat changes and condition checks
5. Game continues until ending condition is met

### Language Considerations

- Korean is the primary language with English internal identifiers
- Korean-English mappings in `constants/korean-english-mapping.ts`
- Comparison operators mapped in `constants/comparison-operators.ts`

## Development Patterns

### State Updates

Always use the provided setter functions when updating game state. The state is immutable:

```typescript
setGameState((prev) => ({
  ...prev,
  stats: { ...prev.stats, health: newValue },
}));
```

### AI Prompt Construction

When modifying AI behavior, update `lib/prompt-builder.ts`. The prompt includes:

- Full game state context
- Character information
- Recent chat history
- Available choices based on current situation

### Adding New Stats

1. Define in scenario's `statDefinitions`
2. Set initial values in `initialStats`
3. Update stat display components if needed
4. Consider amplification rules in `lib/simulation-utils.ts`

### Testing Scenarios

Use the included "ZERO_HOUR" mock scenario in `mocks/` for testing game mechanics and AI responses.

## Environment Setup

Requires `GOOGLE_GENERATIVE_AI_API_KEY` environment variable for AI functionality.

## Build Notes

- TypeScript and ESLint errors are ignored during production builds (see `next.config.mjs`)
- Images are unoptimized for deployment flexibility
- The project uses Next.js App Router with React 19
