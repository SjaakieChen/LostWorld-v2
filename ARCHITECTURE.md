# Architecture Overview

This document provides a high-level overview of the Lost World codebase architecture, helping developers understand the structure and design patterns used throughout the project.

## Project Structure

```
Lostworld_openai/
├── src/
│   ├── components/          # React UI components
│   │   ├── character/       # Character UI (equipment, stats, status bars, map)
│   │   ├── character-creation/  # Initial character creation screen
│   │   ├── common/          # Shared components (EntityModal)
│   │   ├── game/            # Core game UI (display, chat, description)
│   │   └── inventory/       # Inventory and interaction panels
│   ├── config/              # Configuration files (Gemini API)
│   ├── constants/           # Game constants (rarity levels, etc.)
│   ├── context/             # React Context providers (state management)
│   │   ├── GameStateContext.tsx      # Game lifecycle & generation
│   │   ├── EntityMemoryStorage.tsx   # Entity storage & spatial indexing
│   │   └── PlayerUIContext.tsx       # Player view & interactions
│   ├── data/                 # Static reference data
│   ├── dev-dashboard/        # Development tools (dev mode only)
│   ├── services/             # Business logic & API services
│   │   ├── entity-generation/   # AI-powered entity creation
│   │   └── game-orchestrator/   # Game configuration & setup
│   ├── types/                # TypeScript type definitions
│   └── utils/                # Utility functions
├── __tests__/               # Test utilities and test interfaces
└── docs/                    # Additional documentation (see other docs)
```

## State Management Architecture

The codebase uses a **three-context React architecture** where each context has a distinct responsibility:

### Context Hierarchy

```
App (Root)
└── GameStateProvider
    └── EntityStorageProvider
        └── PlayerUIProvider
            └── Game Components
```

This nesting order is **critical** - each provider depends on the one above it.

### Context Responsibilities

#### 1. GameStateContext (`src/context/GameStateContext.tsx`)
**Purpose**: Manages the game lifecycle and initial generation

**Responsible for:**
- Game state (`not_started` → `generating` → `ready` → `playing`)
- Triggering game generation (calls orchestrator)
- Storing generated game configuration
- Managing orchestrator operations history
- Player character creation

**Key State:**
- `gameState`: Current game phase
- `generatedData.config`: Game configuration (rules, scratchpad, entity specs)
- `generatedData.entities`: All initially generated entities
- `generatedData.player`: Created player character

**When to use**: Components that need to know about game generation status or trigger new games.

#### 2. EntityMemoryStorage (`src/context/EntityMemoryStorage.tsx`)
**Purpose**: Complete entity registry + spatial indexing

**Responsible for:**
- Storing ALL entities (Items, NPCs, Locations, Regions)
- Spatial indexing by coordinates (`region:x:y`)
- Entity CRUD operations (add, update, remove, query)
- Maintaining consistency between spatial index and registries

**Key State:**
- `entityMap`: Spatial index `Record<string, CoordinateEntities>`
- `allItems`, `allLocations`, `allNPCs`: Complete entity registries
- `allRegions`: Region registry

**Storage Pattern:**
- **Spatial Index** (`entityMap`): Fast lookup of what's at a specific location
- **Complete Registries**: Fast lookup by ID and iteration

**When to use**: Any component or service that needs to:
- Query entities at a location
- Look up entities by ID
- Add/update/remove entities

#### 3. PlayerUIContext (`src/context/PlayerUIContext.tsx`)
**Purpose**: Player's current view of the game world

**Responsible for:**
- Player position (current location, current region)
- Player inventory & equipment slots
- Visible entities at current location
- Active interactions (NPC conversations, selected entity)
- Player stats and status
- Exploration tracking

**Key State:**
- `inventorySlots`: 12 inventory slots (stores item IDs)
- `equipmentSlots`: 6 equipment slots (stores item IDs)
- `currentLocation`, `currentRegion`: Player position
- `interactableItems`, `npcs`: Entities visible at current location
- `playerStats`, `playerStatus`: Player character data

**When to use**: Components that display:
- Player inventory/equipment
- Current location details
- Visible NPCs and items
- Player stats

## Data Flow

### Initial Game Generation

```
1. User submits character creation form
   ↓
2. GameStateContext.startGeneration()
   ↓
3. Orchestrator generates:
   - Game configuration (configurator.ts)
   - Initial entities (items, NPCs, locations, regions)
   - Player character (player-creation.ts)
   ↓
4. GameStateContext stores generated data
   ↓
5. EntityStorageProvider receives initialData
   ↓
6. EntityMemoryStorage indexes all entities:
   - Builds spatial index (entityMap)
   - Stores in registries (allItems, allLocations, etc.)
   ↓
7. PlayerUIProvider initializes with starting location
   ↓
8. Components render using PlayerUIContext
```

### Runtime Entity Updates

```
1. Component calls context method (e.g., takeItem, moveToLocation)
   ↓
2. Context updates its own state
   ↓
3. If entity data changes, calls EntityMemoryStorage.updateEntity()
   ↓
4. EntityMemoryStorage updates:
   - Spatial index (removes from old location, adds to new)
   - Registry (updates entity in array)
   ↓
5. Dev Dashboard receives broadcast (dev mode only)
   ↓
6. Components re-render with updated data
```

## Source of Truth Pattern

**Critical Rule**: There is ONE source of truth for each piece of state.

### Entity Storage: EntityMemoryStorage
- **ALL entity updates** must go through `EntityMemoryStorage`
- Methods: `addEntity()`, `updateEntity()`, `removeEntity()`
- These methods maintain consistency between spatial index and registries

### Player Inventory/Equipment: PlayerUIContext
- Inventory slots live in `PlayerUIContext`
- Slots store **item IDs**, not item objects
- To get item object: `getItemInSlot(slotId)` → looks up ID in EntityMemoryStorage

### Game Configuration: GameStateContext
- Game config created once during generation
- Stored in `GameStateContext.generatedData.config`
- Shared via props to providers that need it

## Spatial Indexing System

Entities are indexed by location using keys: `"region:x:y"`

**Example**:
```typescript
// Location: region_medieval_kingdom_001, x: 45, y: -23
const key = makeKey("region_medieval_kingdom_001", 45, -23)
// Result: "region_medieval_kingdom_001:45:-23"

// Query what's at this location
const { items, npcs, locations } = getEntitiesAt("region_medieval_kingdom_001", 45, -23)
```

**Special Case: Inventory Items**
- Items in player inventory have `region: 'inventory'`
- They exist in EntityMemoryStorage but are indexed separately
- Inventory slots in PlayerUIContext reference these items by ID

## Slot System

Slots (inventory, equipment, interaction panels) store **item IDs**, not item objects.

**Why?**
- Prevents stale object references
- Allows single source of truth (EntityMemoryStorage)
- Makes serialization easier

**Pattern:**
```typescript
// Slot stores ID
inventorySlots['inv_slot_1'] = 'ite_sword_wea_001'

// Get item object when needed
const item = getItemInSlot('inv_slot_1')  // Looks up ID in EntityMemoryStorage
```

## Component Organization

Components are organized by **feature domain**, not by technical concern:

- `character/`: Character-related UI (equipment, stats, status)
- `game/`: Core game display and interaction
- `inventory/`: Inventory management and interactions
- `character-creation/`: Initial game setup

**Shared components** live in `common/` when used across multiple domains.

## Service Layer

Services handle business logic and external API calls:

- **entity-generation/**: AI-powered entity creation using Gemini API
  - `generation-manager.ts`: `generateEntityWithContext()` - standard runtime entity generation
  - `core.ts`: Schemas, models, and constants (reuse these, don't redefine)
  - `categories.ts`: Category definitions and `getNextEntityId()` helper
  - `*-generation.ts`: Core generation functions (`createItem`, `createNpc`, etc.)
- **game-orchestrator/**: Game configuration and initial setup
- **chatbots/**: LLM chatbot services for player interaction
- **turn-progression/**: Turn progression and world simulation
- **timeline/**: Timeline service for event logging (`logTimelineEvent`, context stack)

Services are **stateless** - they operate on data passed to them, not internal state.

### Standardized Helper Functions

The codebase provides many standardized helper functions that should be reused:

#### Timeline Service
- `logTimelineEvent()`: Standard way to append to timeline (from `timeline-service.ts`)
- `pushTimelineContext()`, `pushTurnContext()`: Context stack management
- `getActiveTimeline()`: Get current timeline from context

#### Entity Generation
- `generateEntityWithContext()`: Standard runtime entity generation (handles timeline, storage, callbacks)
- `getNextEntityId()`: Standard ID generation (MUST be used for all entity IDs)
- `cleanJsonResponse()`: Cleans LLM JSON responses (removes markdown code blocks)
- `addNewAttributesToLibrary()`: Adds discovered attributes to gameRules

#### Entity Storage
- `addEntity()`, `updateEntity()`, `removeEntity()`: Standard entity operations
- `getEntitiesAt()`: Spatial queries (O(1) with spatial index)
- `getAllItemById()`, `getAllNPCById()`, etc.: ID lookups
- `getStateSnapshot()`: State snapshots for saving

#### Constants (Always Reuse)
- Schemas: `ITEM_SCHEMA`, `NPC_SCHEMA`, `LOCATION_SCHEMA` (from `core.ts`)
- Categories: `ITEM_CATEGORIES`, `NPC_CATEGORIES`, `LOCATION_CATEGORIES` (from `categories.ts`)
- Models: `STRUCTURED_FLASH_LITE_MODEL`, `STRUCTURED_IMAGE_MODEL`, `STRUCTURED_API_BASE_URL` (from `core.ts`)

**Critical**: Always use these helpers instead of reimplementing functionality. See `docs/IMPLEMENTING-FEATURES.md` for detailed usage patterns.

## Type System

Types are organized by entity:

- `types/base.types.ts`: Shared types (Rarity, GeneratableEntity, Attribute)
- `types/item.types.ts`: Item interface
- `types/npc.types.ts`: NPC interface
- `types/location.types.ts`: Location interface
- `types/region.types.ts`: Region interface
- `types/slot.types.ts`: Slot system types
- `types/index.ts`: Central export point

## Timeline System

The timeline system tracks all game events chronologically with tags. It uses a context stack pattern to automatically resolve the current timeline and turn number.

### Timeline Service

**Location**: `src/services/timeline/timeline-service.ts`

**Key Functions**:
- `logTimelineEvent(tags, text)`: Standard way to append to timeline
- `pushTimelineContext()`: Set up timeline context
- `pushTurnContext()`: Set up turn context
- `getActiveTimeline()`: Get current timeline from context

**Context Stack Pattern**: Services register their timeline/turn context on a stack. `logTimelineEvent()` automatically uses the top context from the stack, allowing nested services to each have their own context.

**Integration**: 
- GameStateContext automatically sets up timeline context
- `generateEntityWithContext()` automatically sets up timeline context if needed
- Components use `updateTimeline()` wrapper from GameStateContext

See `docs/STATE-MANAGEMENT.md` for detailed timeline integration patterns and `docs/SERVICES.md` for timeline service documentation.

## Development Dashboard

In development mode (`import.meta.env.DEV`), a dev dashboard monitors state:

- **State Broadcasting**: Contexts broadcast state changes via BroadcastChannel
- **Entity History**: Tracks all entity changes with before/after states
- **Orchestrator Operations**: Logs all orchestrator API calls
- **Timeline Monitoring**: Displays timeline entries and tags
- **Sync System**: Dashboard can request full state sync

The dashboard is conditionally loaded and doesn't affect production builds.

## Key Design Principles

1. **Single Source of Truth**: Each piece of state has one authoritative location
2. **Spatial + Registry Storage**: Dual indexing for different query patterns
3. **ID-Based References**: Slots and references use IDs, not objects
4. **Context Dependency Order**: Providers must nest in correct order
5. **Atomic Updates**: Entity updates maintain spatial index + registry consistency
6. **Type Safety**: TypeScript types ensure compile-time safety

## Next Steps

- **Deep Dive**: See `docs/STATE-MANAGEMENT.md` for detailed state management patterns
- **Storage Details**: See `docs/ENTITY-STORAGE.md` for entity storage patterns
- **Adding Features**: See `docs/IMPLEMENTING-FEATURES.md` for implementation guide
- **Common Issues**: See `docs/COMMON-PITFALLS.md` for things to watch out for
- **Services**: See `docs/SERVICES.md` for service layer documentation

