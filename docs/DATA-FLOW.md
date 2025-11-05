# Data Flow Documentation

This document provides comprehensive data flow diagrams and decision trees for understanding how data moves through the Lost World system. Use this to understand where to hook into the system and how to add new features without breaking existing flows.

## Table of Contents

1. [Entity Generation Pipeline](#entity-generation-pipeline)
2. [State Flow Through Contexts](#state-flow-through-contexts)
3. [Save/Load Data Flow](#saveload-data-flow)
4. [Component Rendering Flow](#component-rendering-flow)
5. [Decision Trees](#decision-trees)
6. [Integration Points](#integration-points)

## Entity Generation Pipeline

### Complete Flow: User Input → Entity in Storage

```
User Character Creation
    ↓
GameStateContext.startGeneration()
    ↓
[Service Layer]
    ├─→ generateGameConfiguration()
    │   └─→ LLM (gemini-2.5-pro)
    │       └─→ GameConfiguration {
    │             gameRules,
    │             theGuideScratchpad,
    │             theTimeline,
    │             playerStats,
    │             entitiesToGenerate
    │           }
    │
    ├─→ generateGameEntities(config)
    │   └─→ For each entity spec:
    │       ├─→ createItem() / createNpc() / createLocation()
    │       │   ├─→ Step 1: generateItemJSON()
    │       │   │   └─→ LLM (gemini-2.5-flash-lite)
    │       │   │       └─→ BaseEntityInfo {
    │       │   │             name, rarity, category,
    │       │   │             visualDescription,
    │       │   │             functionalDescription
    │       │   │           }
    │       │   │
    │       │   ├─→ Step 2: generateItemAttributes() [PARALLEL]
    │       │   │   └─→ LLM (gemini-2.5-flash-lite)
    │       │   │       └─→ own_attributes: Record<string, Attribute>
    │       │   │
    │       │   └─→ Step 3: generateItemImage() [PARALLEL]
    │       │       └─→ LLM (gemini-2.5-flash-image)
    │       │           └─→ image_url: base64 string
    │       │
    │       └─→ Complete Entity {
    │             id, name, rarity, category,
    │             visualDescription, functionalDescription,
    │             own_attributes, image_url,
    │             x, y, region
    │           }
    │
    └─→ createPlayer()
        └─→ PlayerCharacter {
              name, description,
              stats, status,
              startingLocation
            }
    ↓
GameStateContext stores in generatedData
    ↓
App.tsx receives generatedData
    ↓
EntityStorageProvider initializes with initialData
    ↓
EntityMemoryStorage.buildSpatialIndex()
    ├─→ entityMap: Record<"region:x:y", CoordinateEntities>
    └─→ allItems, allLocations, allNPCs arrays
    ↓
PlayerUIProvider initializes with starting location
    ↓
Components render using contexts
```

### Data Transformation Points

#### Point 1: LLM → Entity Structure
**Location**: `src/services/entity-generation/*-generation.ts`

**Input**: Prompt string + GameRules
```typescript
{
  prompt: "Create a legendary fire sword",
  gameRules: {
    artStyle: "historical illustration",
    historicalPeriod: "Medieval Europe 1200s",
    itemCategories: [...]
  }
}
```

**Output**: Complete Entity
```typescript
{
  id: "ite_legendary_fire_sword_wea_001",
  name: "Legendary Fire Sword",
  rarity: "legendary",
  category: "weapon",
  visualDescription: "A blade forged in dragon fire...",
  functionalDescription: "Deals fire damage in combat",
  own_attributes: {
    damage: { value: 80, type: "integer", ... },
    fire_damage: { value: 50, type: "integer", ... }
  },
  image_url: "data:image/png;base64,...",
  x: 450,
  y: -123,
  region: "region_medieval_kingdom_001"
}
```

**Key Points**:
- Entity IDs are auto-generated using `getNextEntityId()`
- Attributes are generated based on category attribute libraries
- Images are generated in parallel with attributes (performance optimization)
- All entities have spatial coordinates from generation

#### Point 2: Entity Array → Spatial Index
**Location**: `src/context/EntityMemoryStorage.tsx`

**Input**: Array of entities
```typescript
allItems: [
  { id: "ite_sword_001", region: "region_001", x: 45, y: -23, ... },
  { id: "ite_potion_002", region: "region_001", x: 46, y: -23, ... }
]
```

**Output**: Spatial index + registries
```typescript
entityMap: {
  "region_001:45:-23": {
    items: [{ id: "ite_sword_001", ... }],
    npcs: [],
    locations: [{ id: "loc_town_001", ... }]
  },
  "region_001:46:-23": {
    items: [{ id: "ite_potion_002", ... }],
    npcs: [],
    locations: []
  }
}
```

**Key Points**:
- Spatial index uses key format: `"${region}:${x}:${y}"`
- Both spatial index AND registries are maintained (dual storage)
- Initialization happens in `EntityStorageProvider.initializeStorage()`

## State Flow Through Contexts

### Initialization Flow

```
App Startup
    ↓
GameStateProvider (outermost)
    ├─→ gameState: 'not_started'
    ├─→ generatedData: { config: null, entities: null, player: null }
    └─→ loadedSaveData: { entities: null, playerState: null }
    ↓
[User triggers generation]
    ↓
GameStateContext.startGeneration()
    ├─→ gameState: 'generating'
    ├─→ Calls orchestrator services
    ├─→ Stores results in generatedData
    └─→ gameState: 'ready'
    ↓
App.tsx reads generatedData
    ↓
EntityStorageProvider (initialized with initialData)
    ├─→ Receives entities from generatedData OR loadedSaveData
    ├─→ Builds spatial index (entityMap)
    └─→ Populates registries (allItems, allLocations, etc.)
    ↓
PlayerUIProvider (initialized with player data)
    ├─→ Receives player from generatedData OR savedPlayerState
    ├─→ Sets currentLocation from startingLocation
    ├─→ Initializes empty slots (inventory, equipment)
    └─→ Computes visible entities from EntityStorage
    ↓
Components render
    └─→ Use PlayerUIContext for display
```

### Runtime Update Flow

```
User Action (e.g., picks up item)
    ↓
Component calls PlayerUIContext.takeItem(item)
    ↓
PlayerUIContext:
    ├─→ Finds empty inventory slot
    ├─→ Updates item coordinates: { region: 'inventory', x: 0, y: 0 }
    ├─→ Updates slot state: inventorySlots['inv_slot_1'] = item.id
    └─→ Calls EntityMemoryStorage.updateEntity(item, 'item')
    ↓
EntityMemoryStorage.updateEntity():
    ├─→ Captures previous state (for history tracking)
    ├─→ Removes entity from old spatial key
    ├─→ Updates entity in registry (allItems array)
    ├─→ Adds entity to new spatial key
    └─→ Broadcasts change (dev mode only)
    ↓
Dev Dashboard receives broadcast (dev mode)
    ├─→ Updates entity history
    └─→ Displays updated entity
    ↓
Components re-render
    ├─→ PlayerUIContext.interactableItems updated (item no longer visible)
    └─→ PlayerUIContext.inventorySlots updated (item now in inventory)
```

### Data Dependencies

```
GameStateContext (no dependencies)
    ├─→ Stores: gameState, generatedData, loadedSaveData
    └─→ Provides: startGeneration(), startGame(), loadGame()
    ↓
EntityMemoryStorage (depends on: none)
    ├─→ Stores: entityMap, allItems, allLocations, allNPCs, allRegions
    ├─→ Uses: GameStateContext.generatedData (for initialization)
    └─→ Provides: getEntitiesAt(), getAllXxxById(), updateEntity(), etc.
    ↓
PlayerUIContext (depends on: EntityMemoryStorage)
    ├─→ Stores: inventorySlots, currentLocation, playerStats, etc.
    ├─→ Uses: EntityMemoryStorage.getEntitiesAt() (for visible entities)
    ├─→ Uses: EntityMemoryStorage.updateEntity() (for entity updates)
    └─→ Provides: takeItem(), moveItem(), moveToLocation(), etc.
```

**Critical Rule**: Contexts can only access contexts that are their parents in the provider tree.

## Save/Load Data Flow

### Save Flow

```
User clicks "Save Game"
    ↓
SaveGameButton component
    ├─→ Calls GameStateContext.generatedData
    ├─→ Calls EntityMemoryStorage.getStateSnapshot()
    │   └─→ Returns: { allItems, allLocations, allNPCs, allRegions }
    └─→ Calls PlayerUIContext.getStateSnapshot()
        └─→ Returns: {
              inventorySlots, equipmentSlots,
              currentLocationId, currentRegionId,
              exploredLocationIds,
              playerStats, playerStatus
            }
    ↓
serializeGameState()
    ├─→ Combines all snapshots
    ├─→ Converts Sets to Arrays (exploredLocations Set → array)
    ├─→ Includes gameConfig (with theGuideScratchpad and theTimeline)
    └─→ Returns: SaveGameData
    ↓
downloadSaveFile()
    └─→ Creates .lwg file for download
```

**Data Captured**:
- **Current runtime state** (not initial state)
- Items with current positions (inventory vs world)
- NPCs with updated chatHistory
- Entities with modified attributes
- Player position, inventory, explored locations
- Game config including scratchpad and timeline

### Load Flow

```
User selects .lwg file
    ↓
CharacterCreationScreen file input
    ├─→ Reads file as text
    └─→ Calls deserializeGameState(fileText)
    ↓
deserializeGameState()
    ├─→ Validates JSON structure
    ├─→ Validates required fields
    ├─→ Validates gameConfig.theGuideScratchpad (must be string)
    ├─→ Validates gameConfig.theTimeline (must be array)
    ├─→ Handles backward compatibility (old saves)
    └─→ Returns: SaveGameData
    ↓
GameStateContext.loadGame(saveData)
    ├─→ Sets generatedData.config (from save)
    ├─→ Sets generatedData.player (from save)
    ├─→ Sets generatedData.entities = null (uses loaded entities instead)
    └─→ Sets loadedSaveData = { entities, playerState }
    ↓
App.tsx detects loadedSaveData
    ├─→ Passes entities to EntityStorageProvider as initialData
    └─→ Passes playerState to PlayerUIProvider as savedPlayerState
    ↓
EntityStorageProvider initializes
    ├─→ Builds spatial index from loaded entities
    └─→ Populates registries
    ↓
PlayerUIProvider initializes
    ├─→ Restores slots from savedPlayerState
    ├─→ Finds currentLocation from EntityStorage by ID
    ├─→ Converts exploredLocationIds array back to Set
    └─→ Restores playerStats and playerStatus
    ↓
Game ready to play
```

## Component Rendering Flow

### Component Dependency Chain

```
App.tsx (root)
    ├─→ Uses: GameStateContext
    │   └─→ Checks: gameState === 'playing'?
    │
    └─→ GameUI (when playing)
        ├─→ Wraps: EntityStorageProvider
        │   └─→ Wraps: PlayerUIProvider
        │       └─→ Renders: Game Components
        │           ├─→ Inventory.tsx
        │           │   ├─→ Uses: PlayerUIContext (inventorySlots, getItemInSlot)
        │           │   └─→ Uses: EntityStorageContext (for entity details)
        │           │
        │           ├─→ Interactables.tsx
        │           │   ├─→ Uses: PlayerUIContext (interactableItems, npcs, takeItem)
        │           │   └─→ Uses: EntityStorageContext (selectedEntity)
        │           │
        │           ├─→ MapUI.tsx
        │           │   ├─→ Uses: PlayerUIContext (currentRegion, exploredLocations)
        │           │   ├─→ Uses: EntityStorageContext (allRegions, getLocationAt)
        │           │   └─→ Calls: PlayerUIContext.moveToLocation()
        │           │
        │           └─→ ChatInput.tsx
        │               ├─→ Uses: GameStateContext (gameConfig, timeline)
        │               └─→ Calls: DefaultChatAreaLLM.generateChatResponse()
        │
        └─→ CharacterCreationScreen (when not playing)
            └─→ Uses: GameStateContext (startGeneration, loadGame)
```

### Data Derivation Pattern

**Pattern**: Components derive data rather than storing it

```typescript
// ✅ CORRECT: Derive on render
function Interactables() {
  const { interactableItems, npcs } = usePlayerUI()
  // These are computed from EntityStorage.getEntitiesAt() in PlayerUIContext
  
  return (
    <div>
      {interactableItems.map(item => <ItemCard key={item.id} item={item} />)}
    </div>
  )
}

// ❌ WRONG: Store derived state
function Interactables() {
  const [visibleItems, setVisibleItems] = useState<Item[]>([])
  
  useEffect(() => {
    // Unnecessary state - already computed in PlayerUIContext
    const { items } = getEntitiesAt(currentLocation.region, currentLocation.x, currentLocation.y)
    setVisibleItems(items)
  }, [currentLocation])
}
```

## Decision Trees

### When Adding a New Entity Type

```
Do you need a new entity type?
├─→ NO: Use existing (Item, NPC, Location, Region)
│
└─→ YES:
    ├─→ Does it need spatial coordinates?
    │   ├─→ YES: Extend GeneratableEntity
    │   │   ├─→ Create type in src/types/
    │   │   ├─→ Add to EntityMemoryStorage
    │   │   │   ├─→ Add registry: allQuests: Quest[]
    │   │   │   ├─→ Add to entityMap CoordinateEntities
    │   │   │   └─→ Add methods: getAllQuestById(), addQuest(), etc.
    │   │   └─→ Create generation service (if AI-generated)
    │   │
    │   └─→ NO: Don't extend GeneratableEntity
    │       └─→ Create standalone type (like Region)
    │
    └─→ Does it need AI generation?
        ├─→ YES: Create service in src/services/entity-generation/
        │   └─→ Follow pattern: createItem(), createNpc(), etc.
        │
        └─→ NO: Create manually or via game logic
```

### When Adding a New UI Component

```
Where does your component need data from?
├─→ Game generation/config: Use GameStateContext
│   └─→ Example: Game settings panel, generation progress
│
├─→ Entity data (all entities): Use EntityMemoryStorage
│   └─→ Example: Entity browser, admin panel
│
├─→ Player view/interaction: Use PlayerUIContext
│   └─→ Example: Inventory, map, NPC chat
│
└─→ Multiple contexts: Use all needed contexts
    └─→ Example: Quest log (needs PlayerUIContext + EntityMemoryStorage)
```

### When Adding a New Service

```
What does your service do?
├─→ Generates entities: Add to src/services/entity-generation/
│   ├─→ Follow pattern: createItem(), createNpc()
│   ├─→ Use core.ts schemas
│   └─→ Export from index.ts
│
├─→ Game orchestration: Add to src/services/game-orchestrator/
│   ├─→ Follow pattern: generateGameConfiguration()
│   └─→ Export from index.ts
│
├─→ Chatbot/LLM interaction: Add to src/services/chatbot/
│   ├─→ Register in llm-registry.ts
│   ├─→ Follow pattern: DefaultChatAreaLLM
│   └─→ Export from index.ts
│
└─→ Other: Create new service folder
    └─→ Follow existing service patterns
```

### When Modifying Existing Entities

```
What are you modifying?
├─→ Adding a new field:
│   ├─→ Update type definition in src/types/
│   ├─→ If AI-generated: Update schema in core.ts
│   ├─→ If AI-generated: Update generation prompts
│   ├─→ Update EntityModal components (if displayed)
│   └─→ Update save/load (if needed for persistence)
│
├─→ Changing field type:
│   ├─→ Update type definition
│   ├─→ Update all usages (search codebase)
│   ├─→ Update save/load validation
│   └─→ Consider backward compatibility
│
└─→ Removing a field:
    ├─→ Mark as optional first (soft deprecation)
    ├─→ Update all usages
    ├─→ Remove from types
    └─→ Update save/load (remove validation)
```

## Integration Points

### Where to Hook In

#### 1. Entity Generation Hooks

**Location**: `src/services/entity-generation/*-generation.ts`

**Hook Points**:
- After Step 1 (Base JSON): Modify entity structure before attributes/image
- After Step 2 (Attributes): Modify or validate attributes
- After Step 3 (Image): Post-process image or add metadata
- After complete entity: Add custom logic before returning

**Example**:
```typescript
export async function createItem(...) {
  // ... existing generation steps ...
  
  const completeEntity: Item = {
    ...entity,
    visualDescription: entity.visualDescription,
    functionalDescription: entity.functionalDescription,
    own_attributes,
    image_url: `data:image/png;base64,${imageBase64}`,
    // ... other fields ...
  }
  
  // HOOK POINT: Custom logic here
  if (completeEntity.rarity === 'legendary') {
    // Add special processing for legendary items
  }
  
  return { entity: completeEntity, ... }
}
```

#### 2. Context State Hooks

**Location**: `src/context/*Context.tsx`

**Hook Points**:
- Before state update: Validate or transform data
- After state update: Trigger side effects (analytics, notifications)
- In updateEntity: Add custom entity processing

**Example**:
```typescript
const updateEntity = (entity: Item | NPC | Location, type: EntityType) => {
  // HOOK POINT: Before update
  const validated = validateEntity(entity)
  
  // Existing update logic
  setStorage(prev => { ... })
  
  // HOOK POINT: After update
  if (import.meta.env.DEV) {
    onEntityUpdated?.(entity, type)
  }
}
```

#### 3. Component Action Hooks

**Location**: `src/components/**/*.tsx`

**Hook Points**:
- Before action: Validate or check conditions
- After action: Update UI or trigger notifications

**Example**:
```typescript
function handleTakeItem(item: Item) {
  // HOOK POINT: Before action
  if (inventorySlots.length >= 12) {
    showNotification('Inventory full!')
    return
  }
  
  // Existing action
  takeItem(item)
  
  // HOOK POINT: After action
  playSound('item_pickup')
}
```

### Breaking Change Prevention

#### 1. Type Extensions (Safe)

**Always add optional fields**:
```typescript
// ✅ SAFE: Adding optional field
interface Item extends GeneratableEntity {
  category?: string
  questItem?: boolean  // New optional field
}

// ❌ BREAKING: Adding required field
interface Item extends GeneratableEntity {
  category?: string
  questItem: boolean  // BREAKS existing code!
}
```

#### 2. Context Method Extensions (Safe)

**Add new methods, don't change signatures**:
```typescript
// ✅ SAFE: Adding new method
interface EntityStorageContextType {
  getAllItemById: (id: string) => Item | undefined
  getAllQuestById: (id: string) => Quest | undefined  // New method
}

// ❌ BREAKING: Changing existing method
interface EntityStorageContextType {
  getAllItemById: (id: string, includeDeleted?: boolean) => Item | undefined  // BREAKS!
}
```

#### 3. Service Function Extensions (Safe)

**Add optional parameters or overloads**:
```typescript
// ✅ SAFE: Adding optional parameter
export async function createItem(
  prompt: string,
  gameRules: GameRules,
  region: string,
  x: number,
  y: number,
  customOptions?: ItemOptions  // New optional parameter
): Promise<GenerationResult<Item>>

// ❌ BREAKING: Changing required parameters
export async function createItem(
  prompt: string,
  gameRules: GameRules,
  region: string,
  x: number,
  y: number,
  customOptions: ItemOptions  // Now required - BREAKS!
): Promise<GenerationResult<Item>>
```

## Best Practices Summary

1. **Follow the Flow**: Understand where data comes from and where it goes
2. **Use Context Methods**: Never mutate state directly
3. **Derive, Don't Store**: Compute data in render, don't store derived state
4. **Add, Don't Replace**: Extend types/services, don't break existing ones
5. **Hook at Integration Points**: Use documented hook points for custom logic
6. **Maintain Consistency**: Keep spatial index and registries in sync
7. **Test Data Flow**: Verify data moves correctly through contexts

## Related Documentation

- `docs/STATE-MANAGEMENT.md` - Detailed context documentation
- `docs/ENTITY-STORAGE.md` - Entity storage patterns
- `docs/IMPLEMENTING-FEATURES.md` - Implementation patterns
- `docs/SERVICES.md` - Service layer documentation
- `docs/COMMON-PITFALLS.md` - Things to avoid

