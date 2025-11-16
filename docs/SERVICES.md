# Service Layer Documentation

This document explains the service layer architecture, how services work, and how to extend them.

## Table of Contents
- [Service Architecture](#service-architecture)
- [Entity Generation Service](#entity-generation-service)
- [Game Orchestrator Service](#game-orchestrator-service)
- [LLM Chatbot Services](#llm-chatbot-services)
- [Timeline Service](#timeline-service)
- [API Integration](#api-integration)
- [Extending Services](#extending-services)
- [Best Practices](#best-practices)
- [Testing Services](#testing-services)
- [Common Patterns](#common-patterns)
- [Service Dependencies](#service-dependencies)
- [Service Integration with Contexts](#service-integration-with-contexts)
- [Service Data Flow Diagrams](#service-data-flow-diagrams)
- [Data Packages](#data-packages)
- [Service Integration Best Practices](#service-integration-best-practices)
- [See Also](#see-also)

## Service Architecture

Services in the Lost World codebase are **stateless modules** that handle business logic and external API integration:

```
src/services/
├── entity-generation/    # AI-powered entity creation
├── game-orchestrator/    # Game configuration and setup
├── advisor/            # LLM advisor services for player interaction
├── turn-progression/    # Turn progression and world simulation
└── timeline/            # Timeline service for event logging
```

## Entity Generation Service

**Location**: `src/services/entity-generation/`

### Overview

The entity generation service uses Google Gemini AI models to create game entities (Items, NPCs, Locations, Regions) with:
- Structured JSON metadata
- Dynamic attributes with full metadata
- AI-generated images

### Models Used

The service uses three Gemini models:

1. **`gemini-2.5-pro`**: Complex reasoning (game configuration)
2. **`gemini-2.5-flash-lite`**: Fast JSON generation (entity metadata, attributes)
3. **`gemini-2.5-flash-image`**: Image generation (Nano Banana)

**API Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`

### Configuration

**Location**: `src/config/gemini.config.ts`

```typescript
export const GEMINI_CONFIG = {
  models: {
    pro: 'gemini-2.5-pro',
    flashLite: 'gemini-2.5-flash-lite',
    flashImage: 'gemini-2.5-flash-image',
  },
  apiBase: 'https://generativelanguage.googleapis.com/v1beta/models',
}

export const getApiKey = (): string => {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  if (!key) {
    throw new Error('VITE_GEMINI_API_KEY not found in environment variables')
  }
  return key
}
```

**Environment Variable**: `VITE_GEMINI_API_KEY` in `.env` file

### Core Generation Functions

#### `createItem(prompt, gameRules, region, x, y)`

Creates a complete item with attributes and image.

```typescript
import { createItem } from './services/entity-generation'

const result = await createItem(
  'Create a tournament sword',
  gameRules,
  'region_medieval_kingdom_001',
  450,
  -123
)

// Result structure
const { entity, newAttributes, timing, debugData } = result
```

**Returns**:
- `entity`: Complete Item with image and attributes
- `newAttributes`: Attributes discovered during generation (auto-learned)
- `timing`: Performance metrics
- `debugData`: LLM prompts and responses (for debugging)

#### `createNpc(prompt, gameRules, region, x, y)`

Similar to `createItem`, but generates NPCs with conversation history support.

#### `createLocation(prompt, gameRules, region, x, y)`

Generates locations with themes and biomes.

#### `createRegion(prompt, gameRules, regionX, regionY)`

Generates regions (simple structure, no attributes/images).

### Generation Process

Each entity goes through a **3-step parallel process**:

1. **Step 1: Base JSON** (Sequential)
   - Model: `gemini-2.5-flash-lite`
   - Generates: `name`, `rarity`, `category`, `visualDescription`, `functionalDescription`, `purpose`
   - Uses structured output with JSON schema

2. **Step 2: Attributes** (Parallel with Step 3)
   - Model: `gemini-2.5-flash-lite`
   - Generates: `own_attributes` with full metadata
   - Uses gameRules category attribute libraries

3. **Step 3: Image** (Parallel with Step 2)
   - Model: `gemini-2.5-flash-image`
   - Generates: Base64-encoded PNG image
   - Uses description from Step 1

**Performance**: Steps 2 and 3 run in parallel, reducing total time by 30-40%.

### Attribute System

Attributes include full metadata:

```typescript
{
  durability: {
    value: 75,
    type: 'integer',
    description: 'Item durability/condition',
    reference: '0=broken, 50=worn, 100=pristine'
  }
}
```

**Automatic Learning**: New attributes discovered during generation are automatically added to the gameRules category library for consistency in future generations.

### ID Generation

IDs are automatically generated with semantic structure:

**Format**: `<typePrefix>_<sanitizedName>_<categoryPrefix>_<counter>`

**Examples**:
- Item weapon: `ite_sword_wea_001`, `ite_sword_wea_002`
- NPC merchant: `npc_merchant_mer_001`
- Location town: `loc_village_tow_001`

**Type Prefixes**:
- Items: `ite_`
- NPCs: `npc_`
- Locations: `loc_`
- Regions: `region_` (direct, no category prefix)

### Category System

Categories are defined in `GameRules`:

```typescript
interface GameRules {
  itemCategories: Array<{
    name: string
    attributes: Array<{
      name: string
      type: 'integer' | 'number' | 'string' | 'boolean' | 'array'
      description: string
      reference: string
    }>
  }>
  // ... npcCategories, locationCategories
}
```

Categories are generated by the orchestrator based on historical period and genre, ensuring historically accurate entity categories.

### Usage Example

```typescript
import { createItem, type GameRules } from './services/entity-generation'

const gameRules: GameRules = {
  artStyle: 'historical illustration',
  genre: 'exploration',
  historicalPeriod: 'Medieval Europe 1200s',
  itemCategories: [
    {
      name: 'weapon',
      attributes: [
        {
          name: 'damage',
          type: 'integer',
          description: 'Damage dealt in combat',
          reference: '10=dagger, 40=sword, 80=greatsword, 100=legendary'
        }
      ]
    }
  ],
  npcCategories: [],
  locationCategories: []
}

const result = await createItem(
  'Create a legendary fire sword',
  gameRules,
  'region_medieval_kingdom_001',
  50,
  -20
)

const { entity, newAttributes } = result
console.log('Generated item:', entity)
console.log('New attributes found:', newAttributes)
```

### Files Structure

```
entity-generation/
├── index.ts              # Main exports
├── core.ts                # Core schemas and constants
├── types.ts               # Service-specific types
├── categories.ts           # Category definitions and ID generation
├── generation-manager.ts   # generateEntityWithContext - standard runtime generation
├── item-generation.ts      # Item generation logic
├── npc-generation.ts        # NPC generation logic
├── location-generation.ts  # Location generation logic
├── region-generation.ts   # Region generation logic
└── README.md              # Detailed service documentation
```

### Standard Runtime Entity Generation

#### generateEntityWithContext()

**Location**: `src/services/entity-generation/generation-manager.ts`

**Purpose**: **Standard way to generate entities at runtime** with automatic timeline and storage integration.

**When to use**: Always use this for runtime entity generation (during gameplay, turn progression, etc.).

**When NOT to use**: For initial game generation during setup (use orchestrator services directly).

```typescript
import { generateEntityWithContext } from '../services/entity-generation/generation-manager'

const result = await generateEntityWithContext({
  type: 'item',  // 'item' | 'npc' | 'location' | 'region'
  prompt: 'Create a legendary fire sword',
  gameRules,
  region: 'region_medieval_kingdom_001',
  x: 45,
  y: -23,
  gameConfig,  // Required for timeline integration
  entityStorage,  // Optional: for automatic storage
  changeReason: 'Player requested item',  // Optional: why was this created
  onEntityCreated: (entity, type) => {  // Optional: callback after creation
    console.log('Entity created:', entity)
  },
  onTimelineEntry: (entry) => {  // Optional: callback for timeline entry
    console.log('Timeline entry:', entry)
  }
})

// Result includes:
// - entity: The generated entity
// - newAttributes: Attributes discovered during generation
// - timing: Performance metrics
// - debugData: LLM prompts and responses
// - timeline: Updated timeline array
// - timelineEntry: The timeline entry that was created
```

**What it handles automatically**:
- Entity generation (calls appropriate `create*` function)
- Timeline context setup (via `pushTimelineContext`)
- Timeline entry creation (with correct turn number)
- Entity storage (if `entityStorage` provided)
- Entity history tracking (if `entityStorage` provided)

**Key Benefits**:
- No manual timeline management
- No manual storage integration
- Consistent turn tracking
- Automatic entity history tracking (dev mode)

### Standard Generation Helpers

#### getNextEntityId()

**Location**: `src/services/entity-generation/categories.ts`

**Purpose**: Generates standardized entity IDs with auto-incrementing counters.

**When to use**: Always use this for entity IDs, never generate IDs manually.

```typescript
import { getNextEntityId } from '../services/entity-generation/categories'

// Generate ID for item
const itemId = getNextEntityId('item', 'weapon', 'Sword')
// Returns: "ite_sword_wea_001"

// Generate ID for NPC
const npcId = getNextEntityId('npc', 'merchant', 'Hans the Blacksmith')
// Returns: "npc_hans_the_blacksmith_mer_001"
```

**ID Format**: `<typePrefix>_<sanitizedName>_<categoryPrefix>_<counter>`

**Important**: This function maintains counters internally. Always use it to ensure no ID collisions.

#### cleanJsonResponse()

**Location**: `src/services/entity-generation/item-generation.ts` (and similar in other generation files)

**Purpose**: Cleans LLM JSON responses that may contain markdown code blocks.

**When to use**: Always use this when parsing JSON from LLM responses.

```typescript
// Copy this function to your service if needed
function cleanJsonResponse(text: string): string {
  let cleaned = text.trim()
  
  // Remove markdown code blocks if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3)
  }
  
  // Remove ``` at end
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3)
  }
  
  return cleaned.trim()
}

// Usage
const response = await fetch(endpoint, { ... })
const json = await response.json()
const cleaned = cleanJsonResponse(json.text)  // Remove ```json markers
const data = JSON.parse(cleaned)
```

**Why it's needed**: LLMs sometimes wrap JSON in markdown code blocks, causing parsing to fail.

#### addNewAttributesToLibrary()

**Location**: `src/services/entity-generation/item-generation.ts` (and similar in other generation files)

**Purpose**: Adds newly discovered attributes to the gameRules attribute library.

**When to use**: After entity generation, if `result.newAttributes` contains new attributes.

```typescript
// Copy this function pattern to your service
function addNewAttributesToLibrary(
  newAttributes: Record<string, Attribute & { category: string }>,
  gameRules: GameRules
): void {
  Object.entries(newAttributes).forEach(([attrName, attr]) => {
    const category = gameRules.itemCategories.find(cat => cat.name === attr.category)
    if (category) {
      // Check if attribute already exists
      const existing = category.attributes.find(a => a.name === attrName)
      if (!existing) {
        // Add to category's attribute library
        category.attributes.push({
          name: attrName,
          type: attr.type,
          description: attr.description,
          reference: attr.reference
        })
        console.log(`✅ Added new attribute "${attrName}" to ${attr.category} category`)
      }
    }
  })
}

// Usage after generation
const result = await createItem('Create a fire sword', gameRules, region, x, y)

if (result.newAttributes && Object.keys(result.newAttributes).length > 0) {
  addNewAttributesToLibrary(result.newAttributes, gameRules)
  // Now future generations can use these attributes
}
```

**Why it's important**: Keeps the attribute library up to date, ensuring consistency across entity generations.

### Schema, Category, and Model Constants

**Location**: 
- Schemas: `src/services/entity-generation/core.ts`
- Categories: `src/services/entity-generation/categories.ts`
- Models: `src/services/entity-generation/core.ts`

**Purpose**: Standard constants that should be reused, never redefined.

**When to use**: Always import and reuse these constants.

```typescript
// Import schemas
import { 
  ITEM_SCHEMA, 
  NPC_SCHEMA, 
  LOCATION_SCHEMA 
} from '../services/entity-generation/core'

// Import categories
import { 
  ITEM_CATEGORIES,
  NPC_CATEGORIES,
  LOCATION_CATEGORIES
} from '../services/entity-generation/categories'

// Import models
import { 
  STRUCTURED_FLASH_LITE_MODEL,
  STRUCTURED_IMAGE_MODEL,
  STRUCTURED_API_BASE_URL
} from '../services/entity-generation/core'

// Use them - never redefine
const schema = ITEM_SCHEMA
const model = STRUCTURED_FLASH_LITE_MODEL
const endpoint = `${STRUCTURED_API_BASE_URL}/${model}:generateContent?key=${API_KEY}`
```

**Why it's important**: Ensures consistency and makes updates easier (change once, affects everywhere).

### When to Use Which Generation Function

#### Runtime Entity Generation (During Gameplay)

**Use**: `generateEntityWithContext()`

```typescript
// During turn progression, player actions, etc.
const result = await generateEntityWithContext({
  type: 'item',
  prompt: 'Create a sword',
  gameRules,
  region: currentRegion.id,
  x: currentLocation.x,
  y: currentLocation.y,
  gameConfig,  // For timeline
  entityStorage,  // For storage
  changeReason: 'Turn progression generated item'
})
```

**Why**: Handles timeline, storage, and history tracking automatically.

#### Initial Game Generation (During Setup)

**Use**: `createItem()`, `createNpc()`, `createLocation()`, `createRegion()` directly

```typescript
// During orchestrator setup
const result = await createItem(
  'Create a sword',
  gameRules,
  'region_001',
  0,
  0
)
// Manually add to storage (orchestrator handles this)
```

**Why**: Orchestrator manages initial entity storage and timeline setup separately.

#### Generate + Add to Storage (No Timeline)

**Use**: `generateAndAddItem()`, `generateAndAddNPC()`, etc.

```typescript
// When you need generation + storage but no timeline
const result = await generateAndAddItem(
  'Create a sword',
  gameRules,
  'region_001',
  0,
  0,
  entityStorage  // Automatically adds to storage
)
// Note: Still need to update timeline manually if needed
```

**Why**: Sometimes you need storage integration but not timeline integration.

## Game Orchestrator Service

**Location**: `src/services/game-orchestrator/`

### Overview

The orchestrator service generates initial game configuration and entities when a new game is created.

### Main Functions

#### `generateGameConfiguration(characterName, description, artStyle)`

Creates complete game configuration using Gemini 2.5 Pro.

```typescript
import { generateGameConfiguration } from './services/game-orchestrator'

const config = await generateGameConfiguration(
  'Alexander the Great',
  'A game about conquering regions and building an empire',
  'historical illustration'
)
```

**Returns**: `GameConfiguration` with:
- `gameRules`: Category definitions, historical period, genre, art style
- `scratchpad`: Comprehensive game design document (500-800 words)
- `playerStats`: Dynamic stat definitions
- `startingLocation`: Where player starts
- `entitiesToGenerate`: List of entities to create (regions, locations, NPCs, items)

#### `generateGameEntities(config)`

Generates all initial entities based on configuration.

```typescript
import { generateGameEntities } from './services/game-orchestrator'

const entities = await generateGameEntities(config)
```

**Returns**: `GeneratedEntities` with arrays of:
- `regions`: Region[]
- `locations`: Location[]
- `npcs`: NPC[]
- `items`: Item[]

**Process**:
1. Generates regions (parallel)
2. Generates locations (parallel, assigned to regions)
3. Generates NPCs (parallel, assigned to locations)
4. Generates items (parallel, assigned to locations)

#### `createPlayer(characterName, description, playerStats, gameRules, startingLocation)`

Creates player character.

```typescript
import { createPlayer } from './services/game-orchestrator'

const player = await createPlayer(
  characterName,
  description,
  config.playerStats,
  config.gameRules,
  config.startingLocation
)
```

**Returns**: `PlayerCharacter` with:
- `name`: Character name
- `description`: Character description
- `stats`: PlayerStats (dynamic stats from config)
- `status`: PlayerStatus (health, energy)
- `startingLocation`: Location ID string (`"region:x:y"`)

### Configuration Schema

The orchestrator uses a strict schema (`GAME_CONFIGURATION_SCHEMA`) to ensure valid game configurations.

**See**: `src/services/game-orchestrator/types.ts` for full schema definition.

### Files Structure

```
game-orchestrator/
├── index.ts              # Main exports
├── types.ts              # Type definitions and schema
├── configurator.ts        # Game configuration generation
├── player-creation.ts     # Player character creation
└── seed-generator.ts      # Seed file generation (optional)
```

## LLM Chatbot Services

**Location**: `src/services/advisor/`

### Overview

The LLM chatbot services provide AI-powered interaction and world simulation capabilities. The system includes three main chatbot LLMs:

1. **Game Orchestrator**: Generates initial game configuration and sets up the game world
2. **Advisor LLM**: Provides narrative information and answers player questions
3. **Turn Progression LLM**: Simulates world changes at the end of each turn

**📖 For comprehensive LLM documentation, see: [`docs/LLMs.md`](./LLMs.md)**

### Hardcoded Game Form (always include with scratchpad)

- `src/context/hardcoded-game-form.ts` exports `HARD_CODED_GAME_FORM` plus `buildGuideMaterials(guideScratchpad)`.
- All LLM prompts **must** include both the dynamic guide scratchpad and this hardcoded form (call `buildGuideMaterials()` or `GameStateContext.getGuideMaterials()`).
- This guarantees every model knows the immutable rules (5 stat tiers with 100 points each, 12 inventory slots, fixed equipment slots, etc.).

### Quick Reference

**LLM Registry**: `src/services/advisor/llm-registry.ts`

All LLMs are registered in a central registry that manages:
- Model assignments (pro vs flash)
- Timeline tag access permissions
- LLM configuration and metadata

```typescript
import { getLLMConfig, getAllLLMConfigs } from './services/advisor'

// Get specific LLM configuration
const advisorConfig = getLLMConfig('advisor-llm')

// Get all LLM configurations
const allLLMs = getAllLLMConfigs()
```

### Main Services

#### Advisor LLM

**Quick Usage**:
```typescript
import { advisorLLM, getLocalGameContext } from './services/advisor'

const response = await advisorLLM.generateChatResponse(
  userMessage,
  gameConfig,
  timeline,
  undefined,  // Use default tags from registry
  localContext // Optional: current game state
)
```

#### Turn Progression LLM

**Quick Usage**:
```typescript
import { turnProgressionLLM } from './services/turn-progression'

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

### Files Structure

```
advisor/
├── index.ts                    # Main exports
├── advisor-llm.ts              # Advisor LLM service
├── llm-registry.ts             # LLM configuration registry
└── turn-progression/
    ├── index.ts
    ├── turn-progression-llm.ts # Turn Progression LLM service
    └── types.ts
```

### Key Concepts

- **Timeline Integration**: LLMs filter timeline entries based on registered tags to maintain context
- **Data Packages**: Reusable context objects (like `LocalGameContext`) provide structured game state
- **Model Selection**: Different models for different tasks (pro for reasoning, flash for speed)
- **Registry System**: Centralized configuration for easy management and extension

For detailed documentation on each LLM, timeline integration, adding new LLMs, and best practices, see [`docs/LLMs.md`](./LLMs.md).

## Timeline Service

**Location**: `src/services/timeline/timeline-service.ts`

### Overview

The timeline service provides a centralized way to manage timeline entries with proper turn tracking and context management. It uses a context stack pattern to automatically resolve the current timeline and turn number.

### Key Functions

#### logTimelineEvent()

**Purpose**: Standard way to append entries to the timeline with proper turn tracking.

**When to use**: Always use this for timeline updates, never manually manipulate the timeline array.

```typescript
import { logTimelineEvent } from '../services/timeline/timeline-service'

// Standard way to append to timeline
const entry = logTimelineEvent(['user', 'advisorLLM'], userMessage)
// Automatically handles:
// - Turn number from context
// - Unique ID generation
// - Timestamp
// - Timeline context management
```

**Returns**: `TimelineEntry | null` - The created timeline entry, or null if context is missing.

**Timeline Context Requirements**: 
- Timeline context must be set up (via `pushTimelineContext()` or `generateEntityWithContext()`)
- Turn context must be set up (via `pushTurnContext()` or GameStateContext)
- If context is missing, `logTimelineEvent()` will warn and return null

#### pushTimelineContext()

**Purpose**: Sets up timeline context for the timeline service.

**When to use**: When you need to use `logTimelineEvent()` outside of GameStateContext or `generateEntityWithContext()`.

```typescript
import { pushTimelineContext } from '../services/timeline/timeline-service'

const releaseTimeline = pushTimelineContext({
  getTimeline: () => gameConfig.theTimeline,
  setTimeline: (updated) => { gameConfig.theTimeline = updated },
  source: 'my-service'  // Optional: for debugging
})

try {
  // Now logTimelineEvent() will work correctly
  logTimelineEvent(['generation'], 'Generated item')
} finally {
  // Always release context
  releaseTimeline()
}
```

**Returns**: A release function that should be called when done (in a `finally` block).

#### pushTurnContext()

**Purpose**: Sets up turn context for the timeline service.

**When to use**: When you need to use `logTimelineEvent()` and need to specify the current turn.

```typescript
import { pushTurnContext } from '../services/timeline/timeline-service'

const releaseTurn = pushTurnContext({
  getCurrentTurn: () => currentTurn,
  source: 'my-service'  // Optional: for debugging
})

try {
  // Now logTimelineEvent() will use the correct turn number
  logTimelineEvent(['generation'], 'Generated item')
} finally {
  // Always release context
  releaseTurn()
}
```

**Returns**: A release function that should be called when done (in a `finally` block).

#### getActiveTimeline()

**Purpose**: Gets the currently active timeline from the context stack.

**When to use**: When you need to read the current timeline but don't need to modify it.

```typescript
import { getActiveTimeline } from '../services/timeline/timeline-service'

const timeline = getActiveTimeline()
// Returns: Timeline | null
```

**Returns**: The active timeline array, or null if no context is set up.

### Context Stack Pattern

The timeline service uses a context stack pattern to manage multiple timeline contexts. This allows nested services to each have their own timeline context, with the service automatically using the most recent (top of stack) context.

**How it works**:
1. Services call `pushTimelineContext()` to register their timeline
2. Services call `pushTurnContext()` to register their current turn
3. `logTimelineEvent()` automatically uses the top context from the stack
4. Services call the release function to remove their context from the stack

**Benefits**:
- No need to pass timeline/turn as parameters
- Automatic context resolution
- Supports nested contexts
- Clean separation of concerns

### Integration with GameStateContext

GameStateContext automatically sets up timeline and turn contexts, so components can use `updateTimeline()` without worrying about context setup:

```typescript
// In GameStateContext
const updateTimeline = (tags: string[], text: string) => {
  const entry = logTimelineEvent(tags, text)
  // Context is already set up by GameStateProvider
}
```

### Integration with generateEntityWithContext

`generateEntityWithContext()` automatically sets up timeline context if not already present:

```typescript
// In generateEntityWithContext
const releaseTimelineContext =
  !hasTimelineContext() && options.gameConfig
    ? pushTimelineContext({
        getTimeline: () => options.gameConfig!.theTimeline,
        setTimeline: (updatedTimeline) => {
          options.gameConfig!.theTimeline = updatedTimeline
        },
        source: 'generateEntityWithContext'
      })
    : null

try {
  // Timeline context is now set up
  logTimelineEvent(['generation', options.type], timelineText)
} finally {
  releaseTimelineContext?.()
}
```

### Best Practices

1. **Always use logTimelineEvent()**: Never manually manipulate the timeline array
2. **Set up context when needed**: Use `pushTimelineContext()` and `pushTurnContext()` if not using GameStateContext or `generateEntityWithContext()`
3. **Always release context**: Call the release function in a `finally` block
4. **Use context wrappers when available**: In components, use `updateTimeline()` from GameStateContext
5. **Check for context**: Use `hasTimelineContext()` and `hasTurnContext()` to check if context is available

## API Integration

### Google Gemini API

All services use the Google Generative Language API.

**Base URL**: `https://generativelanguage.googleapis.com/v1beta/models`

**Authentication**: API key via `VITE_GEMINI_API_KEY` environment variable

**Request Format**:
```typescript
const endpoint = `${API_BASE_URL}/${MODEL}:generateContent?key=${API_KEY}`

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      response_mime_type: 'application/json',
      response_schema: schema  // For structured output
    }
  })
})
```

### Structured Output

For JSON generation, use structured output:

```typescript
generationConfig: {
  response_mime_type: 'application/json',
  response_schema: ITEM_SCHEMA  // JSON Schema definition
}
```

### Image Generation

For image generation, use `gemini-2.5-flash-image`:

```typescript
const response = await fetch(
  `${API_BASE_URL}/${IMAGE_MODEL}:generateContent?key=${API_KEY}`,
  {
    method: 'POST',
    body: JSON.stringify({
      contents: [{
        parts: [{ text: imagePrompt }]
      }]
    })
  }
)

// Response contains base64-encoded PNG image
const imageBase64 = response.data[0].content.parts[0].text
```

## Extending Services

### Adding a New Entity Generation Function

1. **Create generation file**:
   ```typescript
   // src/services/entity-generation/quest-generation.ts
   
   import { generateStructuredJSON, generateImageFromDescription } from './core'
   
   export async function createQuest(
     prompt: string,
     gameRules: GameRules
   ): Promise<GenerationResult<Quest>> {
     // Implementation
   }
   ```

2. **Define schema**:
   ```typescript
   // src/services/entity-generation/core.ts
   export const QUEST_SCHEMA = {
     type: 'object',
     properties: {
       name: { type: 'string' },
       // ... other properties
     },
     required: ['name', /* ... */]
   }
   ```

3. **Export from index**:
   ```typescript
   // src/services/entity-generation/index.ts
   export { createQuest } from './quest-generation'
   ```

4. **Update types**:
   ```typescript
   // src/types/quest.types.ts
   export interface Quest {
     // ... structure
   }
   ```

### Adding New API Integration

1. **Create service module**:
   ```typescript
   // src/services/custom-service/index.ts
   
   import { getApiKey } from '../../config/gemini.config'
   
   export async function customFunction() {
     const API_KEY = getApiKey()
     const endpoint = `${API_BASE_URL}/${MODEL}:generateContent?key=${API_KEY}`
     
     // API call
   }
   ```

2. **Follow error handling patterns**:
   ```typescript
   try {
     const response = await fetch(endpoint, { ... })
     if (!response.ok) {
       throw new Error(`API error: ${response.status}`)
     }
     return await response.json()
   } catch (error) {
     console.error('Service error:', error)
     throw error
   }
   ```

## Best Practices

1. **Stateless Services**: Services should not maintain internal state
2. **Error Handling**: Always handle API errors gracefully
3. **Type Safety**: Use TypeScript types for all inputs/outputs
4. **Performance**: Use parallel execution when possible
5. **Configuration**: Centralize API configuration in `gemini.config.ts`
6. **Documentation**: Document function signatures and return types

## Testing Services

### Manual Testing

Use the test interfaces:

- **Entity Generation**: `src/services/entity-generation/test.html`
- **Orchestrator**: `__tests__/game-configurator/dashboard.html`

### Service Testing Pattern

```typescript
// Example test
import { createItem } from './services/entity-generation'

const gameRules = {
  // ... test game rules
}

const result = await createItem(
  'Create a test sword',
  gameRules,
  'region_test_001',
  0,
  0
)

console.assert(result.entity !== undefined, 'Entity should be generated')
console.assert(result.entity.image_url !== undefined, 'Entity should have image')
```

## Common Patterns

### Parallel Generation

```typescript
// Generate multiple entities in parallel
const [item1, item2, item3] = await Promise.all([
  createItem(prompt1, gameRules, region, x1, y1),
  createItem(prompt2, gameRules, region, x2, y2),
  createItem(prompt3, gameRules, region, x3, y3)
])
```

### Sequential with Dependencies

```typescript
// Generate region first, then entities in it
const region = await createRegion(prompt, gameRules, 2, 3)
const location = await createLocation(
  prompt,
  gameRules,
  region.id,
  0,
  0
)
```

### Error Handling

```typescript
try {
  const result = await createItem(prompt, gameRules, region, x, y)
  // Use result
} catch (error) {
  console.error('Generation failed:', error)
  // Handle error (show message, retry, etc.)
}
```

## Service Dependencies

**Services depend on**:
- `config/gemini.config.ts`: API configuration
- `types/`: Type definitions
- External: Google Gemini API

**Services are used by**:
- `context/GameStateContext.tsx`: Calls orchestrator
- Components: Can call entity generation directly (rare)

See `src/services/entity-generation/README.md` for detailed entity generation documentation.

## Service Integration with Contexts

### How Services Flow Into Contexts

Services are **stateless** - they return data but don't store it. Contexts call services and handle storage.

#### Entity Generation Services → EntityMemoryStorage

**Flow**:
```
Service (createItem, createNpc, createLocation)
    ↓
Returns: GenerationResult<Entity>
    ↓
GameStateContext.startGeneration() calls service
    ↓
GameStateContext stores entities in generatedData.entities
    ↓
App.tsx passes entities to EntityStorageProvider as initialData
    ↓
EntityMemoryStorage.initializeStorage()
    ├─→ Builds spatial index from entities
    └─→ Populates registries (allItems, allLocations, etc.)
```

**Key Points**:
- Services generate complete entities with all fields
- Entities flow through GameStateContext first (for initial generation)
- EntityMemoryStorage indexes entities for runtime queries
- No transformation needed - services return ready-to-use entities

#### Orchestrator Services → GameStateContext

**Flow**:
```
GameStateContext.startGeneration()
    ↓
Calls generateGameConfiguration()
    ├─→ LLM generates config
    └─→ Returns: GameConfiguration
    ↓
Calls generateGameEntities(config)
    ├─→ Calls entity generation services
    └─→ Returns: GeneratedEntities
    ↓
Calls createPlayer(...)
    └─→ Returns: PlayerCharacter
    ↓
GameStateContext stores all in generatedData
    ├─→ config: GameConfiguration
    ├─→ entities: GeneratedEntities
    └─→ player: PlayerCharacter
```

**Key Points**:
- Orchestrator services coordinate multiple generation steps
- All generated data flows into GameStateContext
- GameStateContext is the source of truth for initial game state

#### Chatbot Services → Components

**Flow**:
```
Component (ChatInput)
    ↓
User types message
    ↓
Component calls advisorLLM.generateChatResponse()
    ├─→ Reads gameConfig from GameStateContext
    ├─→ Reads timeline from GameStateContext
    ├─→ Calls LLM API
    └─→ Returns: string (response)
    ↓
Component displays response
```

**Key Points**:
- Chatbot services are called directly from components
- They read context data but don't modify it
- They return data for immediate display (no storage needed)

### Service Data Transformation

#### Input Transformation

**Pattern**: User Input → Service Format

```typescript
// User provides simple description
const userInput = "Create a legendary sword"

// Service transforms to structured prompt
const prompt = `You are a historical game designer.
User Request: ${userInput}
Generate following schema...`

// Service calls LLM with structured prompt
const entity = await generateItemJSON(prompt, gameRules)
```

#### Output Transformation

**Pattern**: LLM Response → Entity Structure

```typescript
// LLM returns JSON
const llmResponse = {
  name: "Legendary Fire Sword",
  rarity: "legendary",
  visualDescription: "...",
  functionalDescription: "..."
}

// Service transforms to complete Entity
const entity: Item = {
  ...llmResponse,
  id: getNextEntityId('item', llmResponse.category, llmResponse.name),
  own_attributes: await generateAttributes(...),
  image_url: await generateImage(...),
  x: 450,
  y: -123,
  region: 'region_medieval_kingdom_001'
}
```

### Service → Context Integration Patterns

#### Pattern 1: Initial Generation

```typescript
// In GameStateContext.startGeneration()
const config = await generateGameConfiguration(...)
const entities = await generateGameEntities(config)
const player = await createPlayer(...)

// Store in context
setGeneratedData({ config, entities, player })
```

**Data Flow**:
- Services generate data
- Context stores data
- Context passes to child providers

#### Pattern 2: Runtime Generation

```typescript
// In component or context
const { addEntity } = useEntityStorage()

// Generate new entity at runtime
const result = await createItem(
  'Create a potion',
  gameRules,
  currentLocation.region,
  currentLocation.x,
  currentLocation.y
)

// Add to storage
addEntity(result.entity, 'item')
```

**Data Flow**:
- Component/Context calls service
- Service generates entity
- Context adds entity to storage
- System indexes entity

#### Pattern 3: Chatbot Interaction

```typescript
// In component
const { generatedData } = useGameState()
const { currentLocation, currentRegion, inventorySlots, playerStats, npcs, interactableItems } = usePlayerUI()
const { getAllItemById } = useEntityStorage()

// Build data package
const localContext = getLocalGameContext(
  currentLocation,
  currentRegion,
  inventorySlots,
  playerStats,
  npcs,
  interactableItems,
  getAllItemById
)

const response = await advisorLLM.generateChatResponse(
  userMessage,
  generatedData.config,
  generatedData.config?.theTimeline || [],
  undefined, // Use default timeline tags
  localContext
)

// Display response (no storage needed)
setMessages(prev => [...prev, { type: 'assistant', text: response }])
```

**Data Flow**:
- Component gathers data from multiple contexts
- Component builds data package (LocalGameContext)
- Component calls service with context data and package
- Service processes with LLM (includes data package in system instruction)
- Component displays result (no storage)

### Breaking Change Prevention in Services

#### Adding Optional Parameters

```typescript
// ✅ SAFE: Adding optional parameter
export async function createItem(
  prompt: string,
  gameRules: GameRules,
  region: string,
  x: number,
  y: number,
  options?: ItemGenerationOptions  // New optional parameter
): Promise<GenerationResult<Item>>

// ❌ BREAKING: Changing required parameters
export async function createItem(
  prompt: string,
  gameRules: GameRules,
  region: string,
  x: number,
  y: number,
  options: ItemGenerationOptions  // Now required - BREAKS!
): Promise<GenerationResult<Item>>
```

#### Extending Return Types

```typescript
// ✅ SAFE: Adding optional fields to return type
interface GenerationResult<T> {
  entity: T
  newAttributes: Record<string, Attribute>
  timing: TimingInfo
  debugData: DebugInfo
  metadata?: GenerationMetadata  // New optional field
}

// ❌ BREAKING: Changing required fields
interface GenerationResult<T> {
  entity: T
  newAttributes: Record<string, Attribute>
  timing: TimingInfo
  debugData: DebugInfo  // Removing this breaks existing code!
}
```

## Service Data Flow Diagrams

### Entity Generation Service Flow

#### Initial Generation (Orchestrator)

```
[Service Layer]
createItem(prompt, gameRules, region, x, y)
    ├─→ generateItemJSON()
    │   └─→ LLM (gemini-2.5-flash-lite)
    │       └─→ BaseEntityInfo
    │
    ├─→ generateItemAttributes() [PARALLEL]
    │   └─→ LLM (gemini-2.5-flash-lite)
    │       └─→ own_attributes
    │
    └─→ generateItemImage() [PARALLEL]
        └─→ LLM (gemini-2.5-flash-image)
            └─→ image_url
    ↓
Complete Entity
    ↓
[Context Layer]
GameStateContext stores in generatedData
    ↓
EntityMemoryStorage indexes entity
    ├─→ Adds to registry
    └─→ Adds to spatial index
```

#### Runtime Generation (generateEntityWithContext)

```
[Service Layer]
generateEntityWithContext(options)
    ├─→ Sets up timeline context (if needed)
    ├─→ Calls createItem()/createNpc()/etc.
    │   └─→ Returns generated entity
    ├─→ Creates timeline entry via logTimelineEvent()
    ├─→ Adds to EntityStorage (if provided)
    └─→ Returns result with timeline entry
    ↓
[Context Layer]
EntityMemoryStorage indexes entity
    ├─→ Adds to registry
    └─→ Adds to spatial index
    ↓
Timeline updated in gameConfig.theTimeline
```

### Orchestrator Service Flow

```
[Service Layer]
generateGameConfiguration(name, description, artStyle)
    └─→ LLM (gemini-2.5-pro)
        └─→ GameConfiguration {
              gameRules,
              theGuideScratchpad,
              theTimeline,
              entitiesToGenerate,
              ...
            }
    ↓
generateGameEntities(config)
    ├─→ For each region spec → createRegion()
    ├─→ For each location spec → createLocation()
    ├─→ For each NPC spec → createNpc()
    └─→ For each item spec → createItem()
    ↓
GeneratedEntities
    ↓
[Context Layer]
GameStateContext stores all
    ├─→ config: GameConfiguration
    ├─→ entities: GeneratedEntities
    └─→ player: PlayerCharacter
```

### Chatbot Service Flow

```
[Component Layer]
ChatInput component
    ↓
User types message
    ↓
[Context Layer]
Gathers data from contexts:
    ├─→ GameStateContext (gameConfig, timeline)
    ├─→ PlayerUIContext (location, inventory, stats, npcs, items)
    └─→ EntityStorageContext (getAllItemById)
    ↓
[Service Layer]
getLocalGameContext()
    └─→ Builds LocalGameContext package
    ↓
[Service Layer]
advisorLLM.generateChatResponse()
    ├─→ Reads gameConfig.theGuideScratchpad
    ├─→ Formats LocalGameContext to text
    ├─→ Filters timeline by allowed tags
    ├─→ Formats timeline as dialogue history
    ├─→ Calls LLM (gemini-2.5-flash)
    │   └─→ System instruction: guideScratchpad + LocalGameContext
    │   └─→ Contents: dialogue history + current message
    └─→ Returns: string (response)
    ↓
[Component Layer]
Component displays response
    └─→ No storage needed (ephemeral data)
```

## Data Packages

Data packages are reusable, formatted context objects that provide LLMs with structured game state information. They eliminate the need to repeatedly parse and format data by providing pre-formatted packages.

### Pattern Overview

**Key Principle**: Create reusable data packages instead of re-parsing data each time an LLM needs context.

**Benefits**:
- Consistent data formatting across LLM services
- Reduced code duplication
- Easier to maintain and update
- Clear separation between data structure and formatting

**When to Create a New Data Package**:
- When multiple LLMs need the same type of context
- When data formatting is complex and should be centralized
- When you want to ensure consistent data depth (e.g., descriptions but not attributes)

**When to Reuse an Existing Package**:
- Always check existing packages first before creating new ones
- If an existing package contains the needed data, reuse it
- Extend existing packages rather than creating duplicates

### LocalGameContext

**Location**: `src/services/advisor/advisor-llm.ts`

**Purpose**: Provides current game state context for LLM services (location, inventory, stats, interactables).

**Interface**:
```typescript
interface LocalGameContext {
  location: {
    name: string
    visualDescription: string
    functionalDescription?: string
    regionName: string
    coordinates: { x: number; y: number }
  }
  inventory: Array<{
    name: string
    visualDescription: string
    functionalDescription?: string
  }>
  stats: Array<{
    name: string
    value: number
    tier: number
    tierName: string
  }>
  interactableNPCs: Array<{
    name: string
    visualDescription: string
    functionalDescription?: string
  }>
  interactableItems: Array<{
    name: string
    visualDescription: string
    functionalDescription?: string
  }>
}
```

**Creating the Package**:
```typescript
import { getLocalGameContext } from './services/advisor'
import { usePlayerUI } from './context/PlayerUIContext'
import { useEntityStorage } from './context/EntityMemoryStorage'

const { 
  currentLocation, 
  currentRegion, 
  inventorySlots, 
  playerStats, 
  npcs, 
  interactableItems 
} = usePlayerUI()
const { getAllItemById } = useEntityStorage()

const localContext = getLocalGameContext(
  currentLocation,
  currentRegion,
  inventorySlots,
  playerStats,
  npcs,
  interactableItems,
  getAllItemById
)
```

**Data Depth**:
- **Includes**: Visual descriptions, functional descriptions, names, stats, coordinates
- **Excludes**: Full attributes (`own_attributes`), internal IDs, game mechanics data

**Usage in LLM Services**:
The `formatLocalGameContext()` function converts the package to readable text for LLM prompts. It's automatically called when passing `LocalGameContext` to `advisorLLM.generateChatResponse()`.

### Creating New Data Packages

**Pattern**:
1. Define interface in service file (e.g., `src/services/advisor/`)
2. Create builder function that takes raw context data
3. Format data to include only necessary fields (avoid full attributes)
4. Create formatter function to convert package to LLM-readable text
5. Export interface, builder, and formatter from service module

**Example Structure**:
```typescript
// In service file (e.g., src/services/advisor/context-packages.ts)

export interface MyDataPackage {
  // Only include narrative/descriptive data
  // NOT full attributes or game mechanics
}

export function getMyDataPackage(
  rawData: SomeRawData,
  // ... other required data sources
): MyDataPackage {
  // Build and format package
  return { /* formatted data */ }
}

function formatMyDataPackage(package: MyDataPackage): string {
  // Convert to readable text for LLM
  return /* formatted string */
}
```

**Best Practices**:
- Keep packages focused on narrative/descriptive information
- Exclude game mechanics (attributes, internal IDs, complex objects)
- Include visual and functional descriptions for entities
- Make packages reusable across multiple LLM services
- Document what data is included/excluded

## Service Integration Best Practices

1. **Services are Stateless**: Don't store state in services
2. **Return Complete Data**: Services should return ready-to-use data structures
3. **Handle Errors**: Services should throw descriptive errors
4. **Type Safety**: Use TypeScript types for all inputs/outputs
5. **Documentation**: Document function signatures and data transformations
6. **Integration Points**: Clearly document where services integrate with contexts
7. **Reuse Data Packages**: Use existing data packages instead of re-parsing data

## See Also

- `docs/DATA-FLOW.md` - Comprehensive data flow documentation
- `docs/STATE-MANAGEMENT.md` - How contexts use service data
- `docs/IMPLEMENTING-FEATURES.md` - How to add new services

