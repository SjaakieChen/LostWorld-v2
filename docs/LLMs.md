# LLM Services Documentation

This document provides comprehensive documentation for all Large Language Model (LLM) chatbot services used in the Lost World game system.

## Table of Contents
- [Overview](#overview)
- [LLM Registry System](#llm-registry-system)
- [Game Orchestrator](#game-orchestrator)
- [Advisor LLM](#advisor-llm)
- [Turn Progression LLM](#turn-progression-llm)
- [Timeline Integration](#timeline-integration)
- [Adding New LLMs](#adding-new-llms)
- [Best Practices](#best-practices)
- [Related Documentation](#related-documentation)

## Overview

The game uses three main chatbot LLMs that oversee different aspects of the game:

1. **Game Orchestrator**: Generates initial game configuration and sets up the game world
2. **Advisor LLM**: Provides narrative information and answers player questions
3. **Turn Progression LLM**: Simulates world changes at the end of each turn

These LLMs use Google Gemini models and are integrated with the game's timeline system, entity management, and state management.

## LLM Registry System

**Location**: `src/services/chatbots/llm-registry.ts`

The LLM registry provides centralized configuration for all LLMs in the system. This allows for:
- Consistent configuration management
- Timeline tag access control
- Model selection per LLM
- Easy addition of new LLMs

### Registry Structure

Each LLM is registered with the following configuration:

```typescript
interface LLMConfig {
  id: string                    // Unique identifier (e.g., 'advisor-llm')
  name: string                  // Display name (e.g., 'Advisor LLM')
  model: string                 // Gemini model name (from GEMINI_CONFIG)
  description: string           // Brief description of purpose
  allowedTimelineTags: string[] // Tags this LLM can access from timeline
  purpose: string              // Detailed purpose statement
}
```

### Available Models

Models are defined in `src/config/gemini.config.ts`:

- **`gemini-2.5-pro`**: Complex reasoning tasks (orchestrator, turn progression)
- **`gemini-2.5-flash`**: Fast responses for chat interactions (advisor)
- **`gemini-2.5-flash-lite`**: Lightweight for simple tasks (entity generation - internal)
- **`gemini-2.5-flash-image`**: Image generation (entity images - internal)

**Note**: Entity generator and image generator are internal services, not chatbot LLMs.

### Registry Functions

```typescript
import { 
  getLLMConfig, 
  getAllLLMConfigs, 
  getLLMTimelineTags 
} from './services/advisor'

// Get specific LLM configuration
const advisorConfig = getLLMConfig('advisor-llm')

// Get all LLM configurations
const allLLMs = getAllLLMConfigs()

// Get timeline tags for an LLM
const tags = getLLMTimelineTags('advisor-llm')

// Optional: dialogue/world history windows (turns back from current)
const maxDialogueTurns = advisorConfig?.maxDialogueTurnsBack  // e.g., 5 or null for unlimited
const maxWorldTurns = advisorConfig?.maxWorldTurnsBack        // e.g., 2 or null for unlimited
```

## Game Orchestrator

**Location**: `src/services/game-orchestrator/configurator.ts`

**Model**: `gemini-2.5-pro`

**Purpose**: Generates the initial game configuration including game rules, player stats, guide scratchpad, and entity specifications.

### Responsibilities

- Generate complete game configuration from user input
- Create guide scratchpad (game design document)
- Define player stats with tier systems
- Generate attribute library for entities
- Specify entities to generate (items, NPCs, locations, regions)
- Set starting location

### When It's Called

- Called once at game creation
- Triggered by `GameStateContext.startGeneration()`
- Runs during initial game setup phase

### Input Parameters

```typescript
generateGameConfiguration(
  characterName: string,      // Player character name
  userDescription: string,    // Free-form game description
  artStyle: string           // Art style preference
): Promise<GameConfiguration>
```

### Output Format

Returns a `GameConfiguration` object containing:
- `theGuideScratchpad`: Game design document (string)
- `gameRules`: Attribute library, categories, historical period info
- `playerStats`: Six player stats with tier names
- `startingLocation`: Initial location for player
- `entitiesToGenerate`: Specifications for initial entities
- `theTimeline`: Empty timeline array (initialized)

### Timeline Access

- **Tags**: `[]` (no timeline access)
- **Reason**: Orchestrator runs before game starts, so no timeline exists yet

### Example Usage

```typescript
import { generateGameConfiguration } from './services/game-orchestrator'

const config = await generateGameConfiguration(
  'Sir Lancelot',
  'A knight in medieval England during the Hundred Years War',
  'historical illustration'
)

// Use config to set up game
gameState.setConfig(config)
```

### Integration Points

- Called from: `GameStateContext.startGeneration()`
- Updates: `GameStateContext.generatedData.config`
- Used by: Entity generation services, Advisor LLM, Turn Progression LLM

## Advisor LLM

**Location**: `src/services/advisor/advisor-llm.ts`

**Model**: `gemini-2.5-flash`

**Purpose**: Provides narrative information, answers player questions about the game world, and maintains conversation context through the timeline system.

### Responsibilities

- Answer player questions about the game world
- Provide narrative information and context
- Maintain conversation history via timeline
- Use current game state (location, inventory, stats) for context-aware responses
- Reference guide scratchpad for world consistency

### When It's Called

- Called from `ChatInput` component when player sends a message
- Triggered on user message submission
- Runs during gameplay (after game setup)

### Input Parameters

```typescript
generateChatResponse(
  userMessage: string,                    // Player's message/question
  gameConfig: GameConfiguration | null,   // Game configuration
  timeline: TimelineEntry[],              // Full timeline array
  allowedTimelineTags?: string[],         // Optional: tags to filter (defaults to registry)
  localContext?: LocalGameContext        // Optional: current game state
): Promise<string>
```

### Output Format

Returns a `Promise<string>` containing the LLM's response text.

### Timeline Access

- **Tags**: `['advisorLLM']`
- **Filtering Logic**: Accesses entries with:
  - `'advisorLLM'` tag AND
  - `'user'` OR `'chatbot'` tag
- **Purpose**: Only sees conversation history between player and advisor
- **Format**: Timeline entries are formatted as dialogue (User: ... / Assistant: ...)

### LocalGameContext

The Advisor LLM can receive a `LocalGameContext` data package that includes:
- **Location**: Current location with descriptions
- **Inventory**: Items in player inventory
- **Status**: Player health and energy
- **Stats**: All player stats with tiers
- **Interactable NPCs**: NPCs at current location
- **Interactable Items**: Items at current location

**Important**: Context includes visual/functional descriptions but **NOT** full entity attributes. This keeps responses focused on narrative rather than game mechanics.

### Example Usage

```typescript
import { advisorLLM, getLocalGameContext } from './services/advisor'

// Build context package
const localContext = getLocalGameContext(
  currentLocation,
  currentRegion,
  inventorySlots,
  playerStats,
  playerStatus,
  npcs,
  interactableItems,
  getAllItemById
)

// Generate response
const response = await advisorLLM.generateChatResponse(
  userMessage,
  gameConfig,
  timeline,
  undefined,  // Use default tags from registry
  localContext
)

// Append to timeline
updateTimeline(['chatbot', 'advisorLLM'], response)
```

### Integration Points

- Called from: `ChatInput` component
- Reads from: `GameStateContext` (config, timeline)
- Reads from: `PlayerUIContext` (location, inventory, stats, NPCs, items)
- Updates: `GameStateContext.theTimeline` (via `updateTimeline`)

### Timeline Integration

1. User message is appended to timeline with tags: `['user', 'advisorLLM']`
2. LLM filters timeline to get conversation history
3. LLM generates response
4. Response is appended to timeline with tags: `['chatbot', 'advisorLLM']`

### Standardized Chat History and Local Context

- The Advisor uses a unified chat history builder to create a single formatted history block from the timeline:
  - Dialogue entries for this LLM (`advisor-llm`) are rendered as `[Turn X] User: ...` and `[Turn X] Assistant: ...`
  - Other non-dialogue entries are rendered as `[World][Turn X][tag1, tag2]: ...`
  - You can restrict which world tags are included.
- The latest user prompt is appended after this history block.
- The local context text now begins with `CURRENT TURN: <number>`, followed by stable sections:
  - CURRENT LOCATION
  - INVENTORY
  - PLAYER STATUS
  - PLAYER STATS
  - INTERACTABLE NPCS
  - INTERACTABLE ITEMS

## Turn Progression LLM

**Location**: `src/services/turn-progression/turn-progression-llm.ts`

**Model**: `gemini-2.5-pro`

**Purpose**: Simulates world changes at the end of each turn, including entity movements, attribute changes, new entity generation, and player stat/status updates.

### Responsibilities

- Generate turn goals for the next turn
- Move entities (NPCs, items) to new locations
- Modify entity attributes (e.g., durability, mood, condition)
- Generate new entities when needed
- Update player status (health, energy)
- Update player stats based on world events
- Add new attributes to entities (extend attribute library)

### When It's Called

- Called from `TurnButton` component when turn ends
- Triggered by player clicking the turn button
- Runs at the end of each turn

### Input Parameters

```typescript
processTurnProgression(
  gameConfig: GameConfiguration,    // Game configuration
  timeline: Timeline,               // Full timeline array
  currentTurn: number,              // Current turn number (ending turn)
  entitySummary: EntitySummary,     // Summary of all entities
  currentLocation: Location,        // Player's current location
  playerStats: PlayerStats,         // Player stats
  playerStatus: PlayerStatus,       // Player health/energy
  callbacks: TurnProgressionCallbacks // Callbacks for executing changes
): Promise<void>
```

### Output Format

The LLM returns a `TurnProgressionDecision` JSON object containing:
- `turnGoal`: Short paragraph for next turn (appended to timeline with `['turngoal']` tag)
- `entityGeneration`: Array of entities to generate (items, NPCs, locations)
- `entityMoves`: Array of entity location changes
- `attributeChanges`: Array of attribute updates or new attributes
- `playerStatusChanges`: Health/energy deltas
- `playerStatChanges`: Stat value deltas

All changes include a `changeReason` explaining why the change occurred.

### Timeline Access

- **Tags**: `['turn-progression', 'entityChange', 'turngoal', 'action']`
- **Time Scope**: Receives the full timeline for the current turn and the previous turn (all entries included).
- **Purpose**: Understand recent world events, player actions, and advisor guidance before generating changes.

### Entity Summary

The LLM receives a summary of all entities in the world:
- Items: ID, name, location, attributes
- NPCs: ID, name, location, attributes
- Locations: ID, name, location, attributes

This provides a complete world state view without full entity objects.

### Attributes Library

The LLM has access to the complete attributes library from `gameRules`. It can:
- Update existing attributes (change values)
- Add new attributes to entities (with type, description, reference)
- New attributes are automatically added to the global library

### Example Usage

```typescript
import { turnProgressionLLM } from './services/turn-progression'

// Build entity summary
const entitySummary = buildEntitySummary(
  allItems,
  allNPCs,
  allLocations
)

// Define callbacks for executing changes
const callbacks = {
  updateEntity: (entity, type, reason, source) => { /* ... */ },
  addEntity: (entity, type) => { /* ... */ },
  updatePlayerStatus: (healthDelta, energyDelta, reason) => { /* ... */ },
  updatePlayerStat: (statName, delta, reason) => { /* ... */ },
  updateTimeline: (tags, text) => { /* ... */ },
  // ... other callbacks
}

// Process turn progression
await turnProgressionLLM.processTurnProgression(
  gameConfig,
  timeline,
  currentTurn,
  entitySummary,
  currentLocation,
  playerStats,
  playerStatus,
  callbacks
)
```

### Integration Points

- Called from: `TurnButton` component
- Reads from: `GameStateContext` (config, timeline)
- Reads from: `EntityMemoryStorage` (all entities)
- Reads from: `PlayerUIContext` (location, stats, status)
- Updates: Entities via callbacks
- Updates: Player stats/status via callbacks
- Updates: Timeline via callbacks

### Timeline Integration

The Turn Progression LLM:
1. Reads timeline entries from current and last turn
2. Generates decisions based on recent events
3. Produces a `turnProgression` summary describing what happened during the simulated turn
4. Uses `generateEntityWithContext()` for all entity creation so timeline/history updates happen automatically
5. Appends the progression summary to the timeline with standardized tags (see below)
6. Appends the next-turn goal with standardized tags
7. Appends entity and player changes with standardized tags

**Timeline Updates**: The turn progression LLM uses callbacks to update the timeline. These callbacks internally use `logTimelineEvent()` to append entries with proper turn tracking.

## Timeline Integration

All chatbot LLMs integrate with the timeline system to maintain context and history.

### Timeline Filtering

The `filterTimelineByTags()` helper in `advisor-llm.ts` and the `LLM_REGISTRY` configuration determine which entries are visible to each LLM. The advisor and turn progression LLMs now reason over the standardized tag schema:

- Dialogue entries for the advisor are identified by:
  - `llm:advisorLLM` plus `type:dialogue` and `actor:user` or `actor:ai`
- World entries for the advisor use:
  - `type:turnGoal`, `type:turnProgression`, `type:entityChange`, `type:playerAction`, or `type:generation`
- Turn progression reads world events based on `type:*` and `llm:*` tags (e.g., `type:playerAction`, `type:entityChange`, `type:turnGoal`).

#### Per-LLM timeline window

Each LLM can also declare how many turns back it is allowed to read:

- `maxDialogueTurnsBack?: number | null`:
  - `5` → last 5 turns of dialogue.
  - `null`/`undefined` → unlimited dialogue history.
- `maxWorldTurnsBack?: number | null`:
  - `2` → last 2 turns of world events.
  - `null`/`undefined` → unlimited world history.

These values are read from `LLMConfig` and passed to the chat-history helpers as the `fromTurnsAgo` parameter so you can tune context size per LLM without touching logic code.

### Timeline Tags

All timeline entries begin with four core tags:

- `loc:*` – location:
  - `loc:<regionName>:<x>:<y>` for concrete positions
  - `loc:unknown` when the location cannot be resolved
  - `loc:none` for truly locationless events (turn goals, global summaries)
- `type:*` – event type:
  - `type:dialogue`, `type:generation`, `type:entityChange`, `type:turnProgression`,
    `type:turnGoal`, `type:playerAction`, `type:statusChange`, or `type:none`
- `llm:*` – LLM origin:
  - `llm:advisorLLM`, `llm:turnProgressionLLM`, `llm:orchestratorLLM`, or `llm:none`
- `actor:*` – actor:
  - `actor:user`, `actor:ai`, or `actor:none`

Additional tags may appear after these four, but new code should rely primarily on the core schema.

### Adding Timeline Entries

**Standard Way**: Always use `logTimelineEvent()` from `timeline-service.ts` or the `updateTimeline()` context wrapper.

#### In Components

Use the context wrapper from GameStateContext together with the tag builder:

```typescript
import { buildTimelineTags } from '../services/timeline/tags'

// User message (advisor dialogue)
const loc = `${currentLocation.region}:${currentLocation.x}:${currentLocation.y}`
updateTimeline(
  buildTimelineTags({
    location: loc,
    eventType: 'dialogue',
    llmId: 'advisorLLM',
    actor: 'user'
  }),
  userMessage
)

// LLM response (advisor dialogue)
updateTimeline(
  buildTimelineTags({
    location: loc,
    eventType: 'dialogue',
    llmId: 'advisorLLM',
    actor: 'ai'
  }),
  response
)

// Player action (from advisor tool call)
performPlayerAction('Order the castle guard to seal the gates.')

// Entity change (example)
updateTimeline(
  buildTimelineTags({
    location: `${entity.region}:${entity.x}:${entity.y}`,
    eventType: 'entityChange',
    llmId: 'turnProgressionLLM',
    actor: 'ai'
  }),
  `name: ${entity.name} ...`
)
```

#### In Services

Use `logTimelineEvent()` directly (ensure context is set up):

```typescript
import { logTimelineEvent } from '../services/timeline/timeline-service'

// Entity generation (if not using generateEntityWithContext)
logTimelineEvent(['generation', 'item'], `name: ${item.name} ...`)

// Entity change
logTimelineEvent(['entityChange', 'locationUpdate'], `name: ${entity.name} ...`)
```

**How it works**: 
- `updateTimeline()` (from GameStateContext) internally calls `logTimelineEvent()`
- `logTimelineEvent()` automatically resolves the active timeline and current turn from context stack
- No need to pass turn number or manage timeline state manually
- Timeline context must be set up (via `pushTimelineContext()` or GameStateContext)
- Turn context must be set up (via `pushTurnContext()` or GameStateContext)

**Context Stack Pattern**: The timeline service uses a context stack to manage multiple timeline contexts. Services register their timeline/turn context, and `logTimelineEvent()` automatically uses the top context from the stack.

**Entity Generation**: When using `generateEntityWithContext()`, timeline entries are created automatically - no need to call `logTimelineEvent()` manually.

## Adding New LLMs

To add a new chatbot LLM to the system:

### Step 1: Create LLM Service File

Create a new file in `src/services/chatbots/` (e.g., `new-llm.ts`):

```typescript
import { getApiKey } from '../../config/gemini.config'
import { GEMINI_CONFIG } from '../../config/gemini.config'
import type { GameConfiguration } from '../game-orchestrator/types'
import type { TimelineEntry } from '../../context/timeline'

const NEW_LLM_MODEL = GEMINI_CONFIG.models.flash // or .pro
const API_BASE_URL = GEMINI_CONFIG.apiBase

export async function processNewLLM(
  gameConfig: GameConfiguration,
  timeline: TimelineEntry[],
  // ... other parameters
): Promise<ReturnType> {
  const API_KEY = getApiKey()
  const endpoint = `${API_BASE_URL}/${NEW_LLM_MODEL}:generateContent?key=${API_KEY}`
  
  // Build prompt/system instruction
  // Filter timeline if needed
  // Call API
  // Process response
  // Return result
}
```

### Step 2: Register in LLM Registry

Add entry to `LLM_REGISTRY` in `src/services/chatbots/llm-registry.ts`:

```typescript
{
  id: 'new-llm',
  name: 'New LLM',
  model: GEMINI_CONFIG.models.flash,
  description: 'Description of what this LLM does',
  allowedTimelineTags: ['new-llm', 'relevant-tag'],
  purpose: 'Detailed purpose statement'
}
```

### Step 3: Export from Index

Add export to `src/services/chatbots/index.ts`:

```typescript
export { processNewLLM } from './new-llm'
```

### Step 4: Integrate into Components

Call the LLM from appropriate components:

```typescript
import { processNewLLM } from './services/advisor'

// In component
const result = await processNewLLM(gameConfig, timeline, ...)
```

### Step 5: Update Timeline

If the LLM creates timeline entries:

```typescript
updateTimeline(['new-llm', 'relevant-tag'], entryText)
```

## Best Practices

### Model Selection

- **Use `pro` for**: Complex reasoning, game configuration, world simulation
- **Use `flash` for**: Chat interactions, quick responses
- **Use `flash-lite` for**: Simple structured outputs (internal services)

### Timeline Tagging

- Use descriptive tags that indicate the purpose
- Combine tags to create scopes (e.g., `['user', 'advisorLLM']`)
- Keep tags consistent across related entries
- Document tag meanings in code comments

### Error Handling

- Always wrap LLM API calls in try-catch blocks
- Provide meaningful error messages
- Log errors for debugging
- Handle API failures gracefully (e.g., show user-friendly message)

### Data Packages

- Use data packages (like `LocalGameContext`) for reusable context
- Keep packages focused on narrative information, not game mechanics
- Format packages as readable text for LLM prompts
- Reuse existing packages when possible

### Testing

- Test LLM responses for correctness
- Verify timeline integration works correctly
- Test error handling and edge cases
- Verify callbacks are called correctly

### Performance

- Cache expensive computations (e.g., entity summaries)
- Use appropriate models for tasks (don't overuse `pro`)
- Filter timeline efficiently (only get needed entries)
- Batch operations when possible

## Related Documentation

- **Services**: `docs/SERVICES.md` - General service architecture
- **Data Flow**: `docs/DATA-FLOW.md` - How data flows through LLMs
- **State Management**: `docs/STATE-MANAGEMENT.md` - LLM state interactions
- **Entity Storage**: `docs/ENTITY-STORAGE.md` - How LLMs interact with entities
- **Implementing Features**: `docs/IMPLEMENTING-FEATURES.md` - Guide for adding new features

