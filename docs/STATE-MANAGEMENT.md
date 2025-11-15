# State Management Deep Dive

This document provides detailed information about how state is managed across the Lost World codebase using React Context API.

## Table of Contents
- [Context Architecture](#context-architecture)
- [GameStateContext](#gamestatecontext)
- [EntityMemoryStorage](#entitymemorystorage)
- [PlayerUIContext](#playeruicontext)
- [State Update Patterns](#state-update-patterns)
- [Timeline System Integration](#timeline-system-integration)
- [Entity Storage Helpers](#entity-storage-helpers)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Save/Load Game System](#saveload-game-system)
- [Data Flow Integration Points](#data-flow-integration-points)
- [Data Flow Diagrams](#data-flow-diagrams)
- [See Also](#see-also)

## Context Architecture

The codebase uses three primary React contexts, each with distinct responsibilities:

```
GameStateContext (Outermost)
  ├── Manages game lifecycle
  └── EntityStorageProvider
      ├── Manages all entities
      └── PlayerUIProvider
          ├── Manages player's view
          └── Game Components
```

## GameStateContext

**Location**: `src/context/GameStateContext.tsx`

### Purpose
Manages the overall game lifecycle, from character creation through game generation to gameplay.

### State Structure

```typescript
interface GameStateContextType {
  gameState: 'not_started' | 'generating' | 'ready' | 'playing'
  generatedData: {
    config: GameConfiguration | null      // Game rules, scratchpad, entity specs
    entities: GeneratedEntities | null      // All initially generated entities
    player: PlayerCharacter | null          // Created player character
  }
  generationProgress: string                 // Status message during generation
  loadedSaveData: {                         // Save data when loading a game
    entities: SaveGameData['entities'] | null
    playerState: PlayerUIStateSnapshot | null
  }
  startGeneration: (name, description, artStyle) => Promise<void>
  startGame: () => void
  loadGame: (saveData: SaveGameData) => void // Load game from save file
}
```

### Responsibilities

1. **Game Generation Orchestration**
   - Calls `generateGameConfiguration()` to create game config
   - Calls `generateGameEntities()` to create initial entities
   - Calls `createPlayer()` to create player character
   - Manages generation progress messages

2. **State Transitions**
   - `not_started`: No game initialized
   - `generating`: Currently generating game content (shows progress)
   - `ready`: Generation complete, ready to play
   - `playing`: Game is active

3. **Save/Load Game Functionality**
   - `loadGame()` method restores game from saved JSON file
   - Stores loaded entity data and player state in `loadedSaveData`
   - Supports continuing games without regeneration

4. **Dev Dashboard Integration**
   - Broadcasts orchestrator operations (dev mode only)
   - Tracks operation history for sync requests
   - Broadcasts scratchpad updates

### When to Use

- Components that need to trigger game generation
- Components that display generation progress
- Components that check if game is ready to play
- Services that need game configuration during generation

### Example Usage

```typescript
const { gameState, generatedData, startGeneration } = useGameState()

// Start game generation
await startGeneration(characterName, description, artStyle)

// Check if game is ready
if (gameState === 'ready') {
  // Show "Start Game" button
}

// Access game configuration
const gameRules = generatedData.config?.gameRules

// Load a saved game
const { loadGame } = useGameState()
loadGame(saveData)  // saveData from deserializeGameState()
```

## EntityMemoryStorage

**Location**: `src/context/EntityMemoryStorage.tsx`

### Purpose
Central registry for all game entities with spatial indexing for fast location-based queries.

### State Structure

```typescript
interface EntityStorageState {
  // Spatial Index: Fast lookup by coordinates
  entityMap: Record<string, CoordinateEntities>
  // Key format: "region:x:y"
  // Value: { items: Item[], npcs: NPC[], locations: Location[] }
  
  // Complete Registries: Fast lookup by ID and iteration
  allItems: Item[]           // ALL items in game
  allLocations: Location[]   // ALL locations in game
  allNPCs: NPC[]            // ALL NPCs in game
  allRegions: Region[]      // ALL regions in game
}

interface EntityStorageContextType extends EntityStorageState {
  // Query methods
  getEntitiesAt: (region: string, x: number, y: number) => CoordinateEntities
  getAllItemById: (id: string) => Item | undefined
  getAllLocationById: (id: string) => Location | undefined
  getAllNPCById: (id: string) => NPC | undefined
  getAllRegionById: (id: string) => Region | undefined
  getRegionByCoordinates: (x: number, y: number) => Region | undefined
  
  // Mutation methods
  addEntity: (entity: Item | NPC | Location, type: EntityType) => void
  updateEntity: (entity: Item | NPC | Location, type: EntityType) => void
  removeEntity: (entityId: string, type: EntityType) => void
  addRegion: (region: Region) => void
  updateRegion: (region: Region) => void
}
```

### Dual Storage Pattern

EntityMemoryStorage uses **two storage mechanisms** for different query patterns:

#### 1. Spatial Index (`entityMap`)
**Purpose**: Fast "what's at this location?" queries

**Structure**:
```typescript
entityMap: {
  "region_medieval_kingdom_001:45:-23": {
    items: [Item, Item],
    npcs: [NPC],
    locations: [Location]
  },
  "region_medieval_kingdom_001:46:-23": {
    items: [],
    npcs: [NPC],
    locations: [Location]
  }
}
```

**Key Generation**:
```typescript
const makeKey = (region: string, x: number, y: number) => `${region}:${x}:${y}`
```

**Use Case**: When you know the coordinates and want all entities at that spot.

#### 2. Complete Registries (`allItems`, `allLocations`, etc.)
**Purpose**: Fast ID lookup and iteration

**Structure**:
```typescript
allItems: [
  { id: 'ite_sword_wea_001', name: 'Sword', ... },
  { id: 'ite_potion_con_002', name: 'Potion', ... }
]
```

**Use Case**: When you have an ID and need the entity, or need to iterate all entities.

### Why Both?

- **Spatial queries** are O(1) with spatial index (e.g., "what items are at x,y?")
- **ID queries** are O(n) with spatial index but O(1) with registries
- **Spatial index** can't efficiently iterate all items
- **Registries** can't efficiently query by location

### Entity Updates

All entity updates must use context methods to maintain consistency:

#### Adding an Entity

```typescript
const { addEntity } = useEntityStorage()

const newItem: Item = {
  id: 'ite_sword_wea_001',
  name: 'Sword',
  region: 'region_medieval_kingdom_001',
  x: 45,
  y: -23,
  // ... other fields
}

addEntity(newItem, 'item')
```

**What happens internally:**
1. Entity added to `allItems` registry
2. Spatial index updated: entity added to `entityMap["region_medieval_kingdom_001:45:-23"].items`
3. Dev dashboard notified (dev mode only)

#### Updating an Entity

```typescript
const { updateEntity } = useEntityStorage()

const updatedItem = { ...existingItem, name: 'Renamed Sword' }
updateEntity(updatedItem, 'item')
```

**What happens internally:**
1. Previous state captured for history tracking
2. Entity updated in registry (`allItems` array)
3. **If coordinates changed**: Removed from old spatial key, added to new spatial key
4. **If coordinates unchanged**: Updated in place in spatial index
5. Dev dashboard notified

#### Removing an Entity

```typescript
const { removeEntity } = useEntityStorage()

removeEntity('ite_sword_wea_001', 'item')
```

**What happens internally:**
1. Previous state captured for history tracking
2. Entity removed from registry (`allItems` array)
3. Entity removed from spatial index
4. Dev dashboard notified

### Special Case: Inventory Items

Items in player inventory use special coordinates:
```typescript
{
  id: 'ite_sword_wea_001',
  region: 'inventory',  // Special region identifier
  x: 0,
  y: 0
}
```

These items:
- Are still in `allItems` registry
- Are indexed in spatial index under key `"inventory:0:0"`
- Should NOT be queried using `getEntitiesAt()` for display (use PlayerUIContext instead)

### Query Methods

#### `getEntitiesAt(region, x, y)`
Returns all entities at a specific coordinate.

```typescript
const { items, npcs, locations } = getEntitiesAt(
  'region_medieval_kingdom_001',
  45,
  -23
)
```

**Implementation**: Direct spatial index lookup

#### `getAllItemById(id)`
Returns an item by its ID.

```typescript
const item = getAllItemById('ite_sword_wea_001')
```

**Implementation**: Array find in `allItems` registry

#### `getStateSnapshot()`
Returns a snapshot of current entity state for saving.

```typescript
const snapshot = getStateSnapshot()
// Returns: { allItems, allLocations, allNPCs, allRegions }
```

**Implementation**: Returns current state arrays (includes all properties: own_attributes, chatHistory, current positions, etc.)

**Use Case**: Save game functionality - captures current runtime state of all entities

### Dev Dashboard Integration

In development mode, EntityMemoryStorage:

1. **Tracks Changes**: Uses `entityHistoryTracker` to record all entity changes
2. **Broadcasts Updates**: Uses `stateBroadcaster` to notify dashboard
3. **Sync Support**: Responds to sync requests with full entity state

**Change Tracking**:
- Records before/after state for all changes
- Tracks change source (`'system'`, `'player_action'`)
- Tracks reason (`'entity_added'`, `'entity_updated'`, etc.)

### When to Use

- Any operation that creates, updates, or removes entities
- Queries by location (`getEntitiesAt`)
- Queries by ID (`getAllItemById`, etc.)
- Iterating all entities of a type

### Example Usage

```typescript
const { 
  getEntitiesAt, 
  getAllItemById, 
  updateEntity,
  allItems 
} = useEntityStorage()

// Query what's at current location
const { items, npcs } = getEntitiesAt(currentRegion.id, currentX, currentY)

// Find specific item
const sword = getAllItemById('ite_sword_wea_001')

// Update item (e.g., after durability damage)
const damagedSword = {
  ...sword,
  own_attributes: {
    ...sword.own_attributes,
    durability: { ...sword.own_attributes.durability, value: 75 }
  }
}
updateEntity(damagedSword, 'item')

// Iterate all items (rare, but possible)
allItems.forEach(item => {
  // Do something with each item
})
```

## PlayerUIContext

**Location**: `src/context/PlayerUIContext.tsx`

### Purpose
Manages the player's view and interaction with the game world. Represents what the player sees and controls.

### State Structure

```typescript
interface PlayerUIContextType {
  // Player Inventory & Equipment (stores item IDs)
  inventorySlots: Record<string, string | null>      // 12 slots: inv_slot_1 ... inv_slot_12
  equipmentSlots: Record<string, string | null>      // head, chest, legs, feet, leftHand, rightHand
  interactionInputSlots: Record<string, string | null>  // input_slot_1, input_slot_2, input_slot_3
  interactionOutputSlots: Record<string, string | null> // output_slot_1, output_slot_2, output_slot_3
  
  // Visible Entities (at current location)
  interactableItems: Item[]  // From EntityStorage.getEntitiesAt()
  npcs: NPC[]                // From EntityStorage.getEntitiesAt()
  
  // Active Interactions
  activeNPC: NPC | null
  selectedEntity: Item | NPC | Location | null
  draggedItem: DraggedItem | null
  
  // Player Position
  currentLocation: Location
  currentRegion: Region
  
  // Player Knowledge
  exploredLocations: Set<string>  // Location IDs player has visited
  allRegions: Region[]            // All available regions
  
  // Player Character
  playerStats: PlayerStats
  playerStatus: PlayerStatus
  
  // Actions
  getStateSnapshot: () => PlayerUIStateSnapshot  // Get current state for saving
  setSelectedEntity: (entity) => void
  startDrag: (item, source) => void
  endDrag: () => void
  moveItem: (destination) => void
  swapItems: (destination) => void
  takeItem: (item) => void
  toggleNPC: (npc) => void
  addChatMessage: (npcId, message) => void
  moveToLocation: (location) => void
  changeRegion: (direction) => void
  getLocationAt: (x, y, region) => Location | undefined
  getItemInSlot: (slotId) => Item | null
  increasePlayerStat: (statName, amount) => void
}
```

**Loading Saved Games**: PlayerUIProvider accepts optional `savedPlayerState` prop to restore game from save file. When provided, initializes slots, location, explored areas, stats, and status from saved data instead of using `initialPlayer`.

### Slot System

**Critical**: Slots store **item IDs**, not item objects.

```typescript
// Slot stores ID
inventorySlots['inv_slot_1'] = 'ite_sword_wea_001'

// Get item when needed
const item = getItemInSlot('inv_slot_1')  // Looks up in EntityStorage
```

**Why IDs?**
- Prevents stale object references
- Single source of truth (EntityStorage has actual objects)
- Easier serialization

**Slot Types**:
- **Inventory**: `inv_slot_1` through `inv_slot_12`
- **Equipment**: `head`, `chest`, `legs`, `feet`, `leftHand`, `rightHand`
- **Interaction Input**: `input_slot_1`, `input_slot_2`, `input_slot_3`
- **Interaction Output**: `output_slot_1`, `output_slot_2`, `output_slot_3`

### Visible Entities

Visible entities are **derived** from EntityStorage based on current location:

```typescript
const { items: interactableItems, npcs } = getEntitiesAt(
  currentLocation.region,
  currentLocation.x,
  currentLocation.y
)
```

These are computed on every render - they represent what the player **currently sees**.

### Entity Operations

PlayerUIContext methods that modify entities:

#### `takeItem(item)`
Moves item from world to inventory.

```typescript
takeItem(item)
```

**What happens:**
1. Finds first empty inventory slot
2. Updates item coordinates to `{ region: 'inventory', x: 0, y: 0 }`
3. Calls `EntityMemoryStorage.updateEntity()` to update item
4. Sets inventory slot to item ID
5. Dev dashboard notified

#### `moveItem(destination)`
Moves item between slots (inventory, equipment, interaction panels).

```typescript
moveItem({ type: 'equipment', slotId: 'head' })
```

**Implementation**: Updates slot state (removes from source, adds to destination)

#### `addChatMessage(npcId, message)`
Adds a chat message to an NPC's conversation history.

```typescript
addChatMessage('npc_merchant_mer_001', {
  id: 'msg_123',
  type: 'player',
  text: 'Hello!',
  timestamp: Date.now()
})
```

**What happens:**
1. Finds NPC in EntityStorage
2. Updates NPC with new chat message
3. Calls `EntityMemoryStorage.updateEntity()`
4. Dev dashboard notified

### Player Movement

#### `moveToLocation(location)`
Moves player to a different location (same region).

```typescript
moveToLocation(newLocation)
```

**What happens:**
1. Updates `currentLocation`
2. Marks location as explored
3. Closes active NPC conversation (if any)

#### `changeRegion(direction)`
Moves player to adjacent region.

```typescript
changeRegion('north')
```

**What happens:**
1. Calculates target region coordinates
2. Finds target region by coordinates
3. Finds entry location in target region
4. Calls `moveToLocation()` with entry location

#### `getStateSnapshot()`
Returns a snapshot of current player UI state for saving.

```typescript
const snapshot = getStateSnapshot()
// Returns: {
//   inventorySlots, equipmentSlots, interactionInputSlots, interactionOutputSlots,
//   currentLocationId, currentRegionId, exploredLocationIds (as array),
//   playerStats, playerStatus
// }
```

**Implementation**: Extracts current state, converts exploredLocations Set to Array for JSON serialization

**Use Case**: Save game functionality - captures current player progress and state

### When to Use

- Components that display player inventory/equipment
- Components that show current location
- Components that display visible NPCs/items
- Components that handle player interactions
- Components that need player stats/status

### Example Usage

```typescript
const {
  inventorySlots,
  currentLocation,
  interactableItems,
  takeItem,
  moveItem,
  getItemInSlot,
  getStateSnapshot
} = usePlayerUI()

// Display inventory
Object.entries(inventorySlots).map(([slotId, itemId]) => {
  const item = itemId ? getItemInSlot(slotId) : null
  return <InventorySlot key={slotId} item={item} />
})

// Pick up item from ground
const groundItem = interactableItems[0]
takeItem(groundItem)

// Equip item
moveItem({ type: 'equipment', slotId: 'rightHand' })
```

## State Update Patterns

### Atomic Updates

All entity updates are **atomic** - they maintain consistency between spatial index and registries:

```typescript
// ✅ CORRECT: Use context method
updateEntity(updatedItem, 'item')

// ❌ WRONG: Direct mutation
storage.allItems[0].name = 'New Name'  // Breaks spatial index!
```

### State Dependencies

Be aware of context dependencies:

```typescript
// ✅ CORRECT: PlayerUIContext can use EntityMemoryStorage
const { getEntitiesAt } = useEntityStorage()  // Inside PlayerUIProvider

// ❌ WRONG: EntityMemoryStorage cannot use PlayerUIContext
const { currentLocation } = usePlayerUI()  // Inside EntityStorageProvider - ERROR!
```

### Dev Dashboard Broadcasting

In dev mode, contexts automatically broadcast state changes. You don't need to do anything special - just use the context methods normally.

The `GameStateContext` broadcast now always includes the full `theTimeline` array, so the Dev Dashboard timeline stays in sync with every player/advisor interaction and turn progression event.

Entity history is broadcast on every change (and reset+replayed after loading a save), so the Dev Dashboard’s history log always mirrors the authoritative tracker and saved state.

## Timeline System Integration

### Overview

The timeline system tracks all game events chronologically with tags. Timeline entries are managed through the timeline service (`src/services/timeline/timeline-service.ts`), which uses a context stack pattern to automatically resolve the current timeline and turn number.

### Timeline Service

**Location**: `src/services/timeline/timeline-service.ts`

The timeline service provides standardized timeline management:

#### logTimelineEvent()

**Standard way to append to timeline** - always use this, never manually manipulate the timeline array.

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

#### Timeline Context Stack

The timeline service uses a context stack pattern to manage timeline and turn contexts:

**How it works**:
1. Services call `pushTimelineContext()` to register their timeline
2. Services call `pushTurnContext()` to register their current turn
3. `logTimelineEvent()` automatically uses the top context from the stack
4. Services call the release function to remove their context from the stack

**Setting up context manually**:
```typescript
import { pushTimelineContext, pushTurnContext } from '../services/timeline/timeline-service'

// Set up timeline context
const releaseTimeline = pushTimelineContext({
  getTimeline: () => gameConfig.theTimeline,
  setTimeline: (updated) => { gameConfig.theTimeline = updated },
  source: 'my-service'  // Optional: for debugging
})

// Set up turn context
const releaseTurn = pushTurnContext({
  getCurrentTurn: () => currentTurn,
  source: 'my-service'  // Optional: for debugging
})

try {
  // Now logTimelineEvent() will work correctly
  logTimelineEvent(['generation'], 'Generated item')
} finally {
  // Always release contexts
  releaseTimeline()
  releaseTurn()
}
```

### GameStateContext Timeline Integration

GameStateContext automatically sets up timeline and turn contexts, so components can use `updateTimeline()` without worrying about context setup:

```typescript
// In components
const { updateTimeline } = useGameState()

// This internally calls logTimelineEvent() with proper context
updateTimeline(['user', 'advisorLLM'], userMessage)
```

**Implementation in GameStateContext**:
```typescript
// GameStateContext sets up timeline context on mount
useEffect(() => {
  const releaseTimeline = pushTimelineContext({
    getTimeline: () => generatedData.config?.theTimeline || [],
    setTimeline: (updated) => {
      setGeneratedData(prev => ({
        ...prev,
        config: prev.config ? { ...prev.config, theTimeline: updated } : null
      }))
    },
    source: 'GameStateContext'
  })
  
  const releaseTurn = pushTurnContext({
    getCurrentTurn: () => currentTurn,
    source: 'GameStateContext'
  })
  
  return () => {
    releaseTimeline()
    releaseTurn()
  }
}, [generatedData.config?.theTimeline, currentTurn])

// updateTimeline method
const updateTimeline = (tags: string[], text: string) => {
  const entry = logTimelineEvent(tags, text)
  // Context is already set up, so this works automatically
}
```

### Unified Entity Generation

Use `generateEntityWithContext` (`src/services/entity-generation/generation-manager.ts`) whenever you need to create new items, NPCs, locations, or regions at runtime.  
The helper automatically:

- Sets up timeline context (if not already present)
- Calls the appropriate `create*` factory
- Creates timeline entry via `logTimelineEvent()`
- Updates `gameConfig.theTimeline`
- Adds entity to storage (if `entityStorage` provided)
- Invokes optional callbacks to update React state / contexts
- Triggers entity-history tracking and broadcasts when an `EntityStorage` instance is provided

**Example**:
```typescript
import { generateEntityWithContext } from '../services/entity-generation/generation-manager'

const result = await generateEntityWithContext({
  type: 'item',
  prompt: 'Create a sword',
  gameRules,
  region: currentRegion.id,
  x: currentLocation.x,
  y: currentLocation.y,
  gameConfig,  // For timeline integration
  entityStorage,  // For automatic storage
  changeReason: 'Turn progression generated item'
})
// Timeline entry automatically created with correct turn number
// Entity automatically added to storage
// Entity history automatically tracked (dev mode)
```

This keeps orchestrator setup, turn progression, and ad-hoc generators consistent without duplicating timeline or history plumbing.

### Timeline Entry Structure

```typescript
interface TimelineEntry {
  id: string  // Unique identifier (timestamp-based)
  tags: string[]  // Array of tags like ["user", "advisorLLM"]
  text: string  // The actual text content
  timestamp: number  // When it was created
  turn: number  // What turn this occurred in
}
```

### Common Timeline Tags

- `'user'`: User messages
- `'chatbot'`: LLM responses
- `'advisorLLM'`: Advisor conversation entries
- `'action'`: Player intent captured by the advisor
- `'turn-progression'`: Turn progression events
- `'entityChange'`: Entity modification events
- `'locationUpdate'`: Entity location changes
- `'AttributeUpdate'`: Entity attribute changes
- `'turngoal'`: Turn goals for next turn
- `'generation'`: Entity generation events
- `'item'`, `'npc'`, `'location'`: Entity type tags

### Timeline Best Practices

1. **Always use logTimelineEvent()**: Never manually manipulate the timeline array
2. **Use updateTimeline() in components**: Context wrapper from GameStateContext
3. **Use generateEntityWithContext() for entities**: Handles timeline automatically
4. **Set up context when needed**: Use `pushTimelineContext()` and `pushTurnContext()` if not using GameStateContext
5. **Always release context**: Call release functions in `finally` blocks
6. **Use descriptive tags**: Tags should clearly indicate the purpose and scope of the entry

### Turn Context Gotchas

Every timeline entry permanently records the **turn** it happened in. If the timeline service doesn’t know the current turn when you call `logTimelineEvent()`/`updateTimeline()`, the call will fail (it simply returns `null`). That’s why the turn context must always be set before logging:

- **Inside React**: GameStateContext + PlayerUIContext push the timeline/turn contexts for you. Use their helpers and you’re safe.
- **Outside React / background services**: push your own contexts up front and release them afterward. If you’re unsure who else has set context, push anyway—later pushes just sit on top of the stack.

Turn progression is a good example: before hitting the LLM, it now unconditionally does

```ts
const releaseTimeline = pushTimelineContext({ getTimeline: () => gameConfig.theTimeline, setTimeline: updated => { gameConfig.theTimeline = updated } })
const releaseTurn = pushTurnContext({ getCurrentTurn: () => currentTurn })
try {
  // all timeline writes during this block will use the correct turn
} finally {
  releaseTurn()
  releaseTimeline()
}
```

Use the same pattern for any orchestrators, CLI tools, or tests that need to append to the timeline—otherwise you’ll occasionally “miss” entries because the current turn couldn’t be resolved.

## Entity Storage Helpers

### Standard Storage Operations

**Location**: `src/context/EntityMemoryStorage.tsx`

**Functions**: `addEntity()`, `updateEntity()`, `removeEntity()`

**When to use**: Always use these for entity operations, never mutate storage directly.

```typescript
const { addEntity, updateEntity, removeEntity } = useEntityStorage()

// Add entity
addEntity(newItem, 'item')  // Automatically updates spatial index and registry

// Update entity
updateEntity(updatedItem, 'item', 'Player used item', 'player_action')
// Parameters: entity, type, changeReason (optional), changeSource (optional)

// Remove entity
removeEntity(itemId, 'item')  // Automatically removes from spatial index and registry
```

**What they handle automatically**:
- Spatial index updates
- Registry updates
- Entity history tracking (dev mode)
- Dev dashboard broadcasting (dev mode)

### Standard Query Helpers

**Functions**: `getEntitiesAt()`, `getAllItemById()`, `getAllNPCById()`, `getAllLocationById()`, `getAllRegionById()`, `getRegionByCoordinates()`

**When to use**: Always use these for queries, never manually filter arrays.

```typescript
const { 
  getEntitiesAt,
  getAllItemById,
  getAllNPCById,
  getAllLocationById,
  getAllRegionById,
  getRegionByCoordinates
} = useEntityStorage()

// Spatial query (O(1) with spatial index)
const { items, npcs, locations } = getEntitiesAt('region_001', 45, -23)

// ID lookup (O(n) but standard way)
const item = getAllItemById('ite_sword_wea_001')
const npc = getAllNPCById('npc_merchant_mer_001')
const location = getAllLocationById('loc_town_tow_001')
const region = getAllRegionById('region_medieval_kingdom_001')

// Region by coordinates
const region = getRegionByCoordinates(2, 3)  // Grid coordinates
```

**Why use these**: 
- `getEntitiesAt()` is O(1) with spatial index (much faster than filtering)
- Standardized interface
- Consistent behavior

### State Snapshot Helper

**Function**: `getStateSnapshot()`

**When to use**: For saving game state.

```typescript
const { getStateSnapshot } = useEntityStorage()

const snapshot = getStateSnapshot()
// Returns: { allItems, allLocations, allNPCs, allRegions }
// Use this for save game functionality
```

## Best Practices

### State Management
1. **Always use context methods** for state updates (`addEntity`, `updateEntity`, `removeEntity`)
2. **Never mutate state directly** - always through context
3. **Use appropriate context** - don't put player UI state in EntityStorage
4. **Remember slot system** - slots store IDs, use `getItemInSlot()` for objects

### Timeline System
5. **Always use logTimelineEvent()** - Never manually manipulate timeline array
6. **Use updateTimeline() in components** - Context wrapper from GameStateContext
7. **Use generateEntityWithContext() for entities** - Handles timeline automatically
8. **Set up context when needed** - Use `pushTimelineContext()` and `pushTurnContext()` if not using GameStateContext

### Entity Storage
9. **Query by location** - use `getEntitiesAt()` for location-based queries (O(1))
10. **Query by ID** - use `getAllXxxById()` for ID-based queries
11. **Use getStateSnapshot()** - For save game functionality
12. **Never bypass storage helpers** - Always use standard query methods

## Common Patterns

### Moving Item to Inventory

```typescript
const item = interactableItems[0]
takeItem(item)  // Handles coordinate update + slot assignment
```

### Updating Item Attributes

```typescript
const item = getAllItemById('ite_sword_wea_001')
const updated = {
  ...item,
  own_attributes: {
    ...item.own_attributes,
    durability: { ...item.own_attributes.durability, value: 75 }
  }
}
updateEntity(updated, 'item')
```

### Finding Entities at Location

```typescript
const { items, npcs, locations } = getEntitiesAt(region, x, y)
const location = locations[0]  // Usually one location per coordinate
```

See `docs/ENTITY-STORAGE.md` for more entity storage patterns and `docs/IMPLEMENTING-FEATURES.md` for adding new state.

## Save/Load Game System

**Location**: `src/services/save-game.ts`

### Purpose
Persists complete game state to a JSON file and restores it later, allowing players to save progress and continue without regenerating the game.

### Save File Structure

```typescript
interface SaveGameData {
  version: string              // Save format version (e.g., "1.0")
  timestamp: number            // When the game was saved
  gameConfig: GameConfiguration  // Game rules and configuration
    // Includes:
    // - theGuideScratchpad: string  // Game design notes and narrative context
    // - theTimeline: TimelineEntry[]  // Chronological log of game events
    // - gameRules: GameRules
    // - playerStats: OrchestratorPlayerStats
    // - startingLocation: { region, x, y }
    // - entitiesToGenerate: { regions, locations, npcs, items }
  playerCharacter: PlayerCharacter  // Initial player character data
  entities: {                   // CURRENT entity state (not initial)
    items: Item[]              // All items with current positions, attributes
    locations: Location[]      // All locations
    npcs: NPC[]                // All NPCs with chat histories
    regions: Region[]           // All regions
  }
  entityHistory: EntityHistoryEntry[]  // Full change log for all entities
  playerState: {                // Current player UI state
    inventorySlots: Record<string, string | null>
    equipmentSlots: Record<string, string | null>
    interactionInputSlots: Record<string, string | null>
    interactionOutputSlots: Record<string, string | null>
    currentLocationId: string   // Player's current location ID
    currentRegionId: string    // Player's current region ID
    exploredLocationIds: string[]  // Converted from Set for JSON
    playerStats: PlayerStats   // Current stat values
    playerStatus: PlayerStatus // Current health/energy
  }
}
```

### What Gets Saved

**Critical**: The system saves the **CURRENT runtime state**, not the initial generated state. This includes:
- Items that have moved (inventory vs world locations)
- NPCs with updated `chatHistory` arrays
- Entities with modified `own_attributes` (e.g., durability changes)
- All entity properties in their current runtime state
- Player position, inventory, equipment, explored locations
- Current player stats and status
- **Game configuration data**:
  - `theGuideScratchpad`: The current guide scratchpad (game design notes, narrative context, mechanics)
  - `theTimeline`: The complete chronological log of game events with tags
  - Game rules, player stats, starting location, and entity generation specs

**What's NOT saved**:
- EntityHistoryTracker data (dev-only, in-memory)
- UI state like `activeNPC`, `selectedEntity`, `draggedItem` (can reset on load)

### Save Process

1. **Collect State**: Each context provides a snapshot:
   - `EntityMemoryStorage.getStateSnapshot()` → current entity state
   - `PlayerUIContext.getStateSnapshot()` → current player UI state
   - `GameStateContext.generatedData` → config and player character

2. **Serialize**: `serializeGameState()` combines all state and converts Sets to Arrays

3. **Download**: `downloadSaveFile()` creates a `.lwg` file for the user

### Load Process

1. **User selects file**: CharacterCreationScreen file input reads `.lwg` file

2. **Deserialize**: `deserializeGameState()` validates and parses JSON

3. **Restore GameStateContext**: `loadGame()` sets:
   - `generatedData.config` from save (includes `theGuideScratchpad` and `theTimeline`)
   - `generatedData.player` from save
   - `generatedData.entities` to null (uses loaded entities instead)
   - `loadedSaveData` with entities and player state

4. **Initialize EntityStorageProvider**: Receives loaded entities via `initialData` prop

5. **Initialize PlayerUIProvider**: Receives saved player state via `savedPlayerState` prop:
   - Restores all slot states
   - Finds and sets currentLocation from EntityStorage
   - Converts exploredLocationIds array back to Set
   - Restores playerStats and playerStatus

### Usage Example

```typescript
// Saving a game
import { serializeGameState, downloadSaveFile } from '../services/save-game'

const { gameState, generatedData } = useGameState()
const { getStateSnapshot: getEntitySnapshot } = useEntityStorage()
const { getStateSnapshot: getPlayerSnapshot } = usePlayerUI()

const saveData = serializeGameState(
  generatedData.config!,
  generatedData.player!,
  getEntitySnapshot(),
  getPlayerSnapshot()
)

downloadSaveFile(saveData, 'my-save.lwg')

// Loading a game
import { deserializeGameState } from '../services/save-game'

const fileText = await file.text()
const saveData = deserializeGameState(fileText)
loadGame(saveData)
```

### File Format

- **Extension**: `.lwg` (Lost World Game)
- **Format**: JSON (pretty-printed with indentation)
- **Version**: Currently "1.0" (for future compatibility)

### Error Handling

- Validates save file structure on load
- Checks for required fields (config, entities, playerState)
- Validates `gameConfig.theGuideScratchpad` (must be string) and `gameConfig.theTimeline` (must be array)
- Handles backward compatibility: old save files missing scratchpad/timeline are initialized with empty values
- Shows user-friendly error messages for invalid/corrupted files
- Handles edge cases (missing entities, invalid locations, corrupted slot references)

## Data Flow Integration Points

### Entry Points for New Features

#### Adding New Entity Operations

**Location**: `src/context/EntityMemoryStorage.tsx`

**Entry Point**: Extend `EntityStorageContextType` interface

```typescript
interface EntityStorageContextType {
  // Existing methods...
  getAllItemById: (id: string) => Item | undefined
  
  // New method - add here
  getAllQuestById: (id: string) => Quest | undefined
}
```

**Implementation**: Add to provider implementation
```typescript
const getAllQuestById = (id: string): Quest | undefined => {
  return storage.allQuests.find(quest => quest.id === id)
}
```

**Data Flow**: 
```
Component calls getAllQuestById(id)
    ↓
Returns quest from allQuests registry
    ↓
Component uses quest data
```

#### Adding New Player Actions

**Location**: `src/context/PlayerUIContext.tsx`

**Entry Point**: Extend `PlayerUIContextType` interface

```typescript
interface PlayerUIContextType {
  // Existing actions...
  takeItem: (item: Item) => void
  
  // New action - add here
  acceptQuest: (questId: string) => void
}
```

**Implementation**: Add to provider implementation
```typescript
const acceptQuest = (questId: string) => {
  const quest = getAllQuestById(questId)
  if (quest) {
    setActiveQuests(prev => ({ ...prev, [questId]: quest }))
    // Update quest in EntityStorage if needed
    updateQuest({ ...quest, status: 'active' })
  }
}
```

**Data Flow**:
```
Component calls acceptQuest(questId)
    ↓
PlayerUIContext updates activeQuests state
    ↓
If entity update needed: Calls EntityMemoryStorage.updateQuest()
    ↓
EntityMemoryStorage updates quest registry
    ↓
Component re-renders with updated activeQuests
```

### Data Transformation Points

#### Point 1: Service → Context

**When**: Initial game generation

**Flow**:
```
Service (createItem, createNpc, etc.)
    ↓
Returns: GenerationResult<Entity>
    ↓
GameStateContext stores in generatedData.entities
    ↓
App.tsx passes to EntityStorageProvider as initialData
    ↓
EntityMemoryStorage initializes storage
    ├─→ Builds spatial index
    └─→ Populates registries
```

**Key Points**:
- Services return complete entities with all fields
- Context receives entities and indexes them
- No transformation needed - direct pass-through

#### Point 2: Context → Context

**When**: Player actions modify entities

**Flow**:
```
PlayerUIContext.takeItem(item)
    ↓
Updates item coordinates: { region: 'inventory', x: 0, y: 0 }
    ↓
Calls EntityMemoryStorage.updateEntity(item, 'item')
    ↓
EntityMemoryStorage:
    ├─→ Removes from old spatial key
    ├─→ Updates registry
    └─→ Adds to new spatial key
    ↓
PlayerUIContext updates inventorySlots
```

**Key Points**:
- PlayerUIContext handles player-facing logic
- EntityMemoryStorage handles entity storage consistency
- Both contexts update their own state

#### Point 3: Context → Component

**When**: Components render data

**Flow**:
```
Component calls usePlayerUI()
    ↓
PlayerUIContext computes visible entities:
    const { items } = getEntitiesAt(currentLocation.region, currentLocation.x, currentLocation.y)
    ↓
Returns: interactableItems, npcs
    ↓
Component renders UI
```

**Key Points**:
- Components derive data, don't store it
- Data is computed on every render
- Changes in EntityStorage automatically reflect in PlayerUIContext

### Exit Points for Data

#### Save Game

**Exit Point**: `src/services/save-game.ts`

**Flow**:
```
Contexts provide snapshots:
    ├─→ EntityMemoryStorage.getStateSnapshot()
    ├─→ PlayerUIContext.getStateSnapshot()
    └─→ GameStateContext.generatedData
    ↓
serializeGameState() combines all
    ↓
downloadSaveFile() creates .lwg file
```

#### Dev Dashboard

**Exit Point**: `src/dev-dashboard/` (dev mode only)

**Flow**:
```
EntityMemoryStorage.updateEntity()
    ↓
Broadcasts change via stateBroadcaster
    ↓
Dev Dashboard receives broadcast
    ↓
Updates entity history and display
```

## Data Flow Diagrams

### Complete Entity Lifecycle

```
[Generation Phase]
User Input → GameStateContext.startGeneration()
    ↓
Service Layer (createItem, createNpc, etc.)
    ├─→ LLM generates JSON
    ├─→ LLM generates attributes
    └─→ LLM generates image
    ↓
Complete Entity Created
    ↓
GameStateContext stores in generatedData
    ↓

[Storage Phase]
EntityStorageProvider receives entities
    ↓
EntityMemoryStorage indexes:
    ├─→ Adds to registry (allItems, etc.)
    └─→ Adds to spatial index (entityMap)
    ↓

[Runtime Phase]
PlayerUIContext computes visible entities
    ↓
Components render using PlayerUIContext
    ↓

[Update Phase]
User action (e.g., takeItem)
    ↓
PlayerUIContext updates own state
    ↓
PlayerUIContext calls EntityMemoryStorage.updateEntity()
    ↓
EntityMemoryStorage updates both:
    ├─→ Registry
    └─→ Spatial index
    ↓
Components re-render with updated data
```

### State Propagation

```
EntityMemoryStorage State Change
    ├─→ Updates entityMap
    ├─→ Updates allItems/allLocations/allNPCs
    └─→ Broadcasts change (dev mode)
    ↓
PlayerUIContext reads from EntityMemoryStorage
    ├─→ getEntitiesAt() called on render
    └─→ Computes interactableItems, npcs
    ↓
Components using PlayerUIContext
    └─→ Re-render with new data
```

**Key Insight**: Data flows down (contexts → components), actions flow up (components → contexts → storage).

## See Also

- `docs/DATA-FLOW.md` - Comprehensive data flow documentation with detailed diagrams
- `docs/IMPLEMENTING-FEATURES.md` - How to add new features following data flow patterns

