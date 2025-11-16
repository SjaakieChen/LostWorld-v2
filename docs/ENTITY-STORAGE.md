# Entity Storage & Management

This document explains how entities are stored, organized, and managed in the Lost World codebase.

## Table of Contents
- [Entity Types](#entity-types)
- [Storage Structure](#storage-structure)
- [Coordinate System](#coordinate-system)
- [Entity Lifecycle](#entity-lifecycle)
- [Inventory Items](#inventory-items)
- [Entity Lookup Patterns](#entity-lookup-patterns)
- [Standard Storage Operations](#standard-storage-operations)
- [Timeline Integration](#timeline-integration)
- [Entity Attributes](#entity-attributes)
- [Entity Relationships](#entity-relationships)
- [Best Practices](#best-practices)
- [Common Operations](#common-operations)

## Entity Types

The game has four main entity types:

### 1. Items (`Item`)
**Type**: `src/types/item.types.ts`

Represents objects that can be picked up, equipped, or used.

**Structure**:
```typescript
interface Item extends GeneratableEntity {
  category?: string  // 'weapon', 'armor', 'food', 'consumable', 'tool', etc.
}
```

**Base fields** (from `GeneratableEntity`):
- `id`: Unique identifier (e.g., `'ite_sword_wea_001'`)
- `name`: Display name
- `rarity`: `'common' | 'rare' | 'epic' | 'legendary'`
- `category`: Item category
- `image_url`: Generated image URL/base64
- `visualDescription`: Visual details used for rendering/image prompts
- `functionalDescription` (optional): Narrative description of what it does/how it’s used
- `purpose`: Required intent/role for the entity (falls back to `'generic'` when unspecified)
- `x`, `y`, `region`: Spatial coordinates
- `own_attributes`: Record of attribute values with metadata

**Special States**:
- **In world**: `region: 'region_medieval_kingdom_001'`, `x: 45`, `y: -23`
- **In inventory**: `region: 'inventory'`, `x: 0`, `y: 0`

### 2. NPCs (`NPC`)
**Type**: `src/types/npc.types.ts`

Represents non-player characters that can be interacted with.

**Structure**:
```typescript
interface NPC extends GeneratableEntity {
  chatHistory: ChatMessage[]  // Conversation history
  category?: string            // 'merchant', 'guard', 'quest_giver', etc.
}
```

**Base fields** (from `GeneratableEntity`):
- All standard entity fields (id, name, visualDescription, functionalDescription, purpose, etc.)
- Plus `chatHistory`: Array of conversation messages

**Chat Messages**:
```typescript
interface ChatMessage {
  id: string
  type: 'player' | 'npc'
  text: string
  timestamp: number
}
```

### 3. Locations (`Location`)
**Type**: `src/types/location.types.ts`

Represents places in the game world where entities can exist.

**Structure**:
```typescript
interface Location extends GeneratableEntity {
  category?: string  // 'town', 'dungeon', 'building', 'wilderness', etc.
}
```

**Base fields** (from `GeneratableEntity`):
- All standard entity fields
- Typically one location per coordinate (x, y, region)

**Note**: Locations contain other entities (items, NPCs) but are themselves entities too.

### 4. Regions (`Region`)
**Type**: `src/types/region.types.ts`

Represents large areas on the world map. **DO NOT** extend `GeneratableEntity`.

**Structure**:
```typescript
interface Region {
  id: string              // 'region_medieval_kingdom_001'
  name: string            // 'Medieval Kingdom'
  regionX: number         // X position on world grid
  regionY: number         // Y position on world grid
  properties?: Record<string, any>  // Theme, biome, description, etc.
}
```

**Key Differences from Entities**:
- No `x`, `y` coordinates (regions ARE coordinates)
- No `image_url` or generated attributes
- Use `regionX`, `regionY` for grid positioning
- Structural/organizational, not interactive

## Storage Structure

EntityMemoryStorage uses **two complementary storage systems**:

### Spatial Index (`entityMap`)

**Purpose**: Fast lookup by location - "what entities are at x, y?"

**Structure**:
```typescript
entityMap: Record<string, CoordinateEntities>

// Key format: "region:x:y"
// Example: "region_medieval_kingdom_001:45:-23"

interface CoordinateEntities {
  locations: Location[]
  npcs: NPC[]
  items: Item[]
}
```

**Key Generation**:
```typescript
const makeKey = (region: string, x: number, y: number) => 
  `${region}:${x}:${y}`
```

**Use Cases**:
- Finding what's visible at player's current location
- Querying entities near a specific point
- Rendering items/NPCs at a location on the map

### Complete Registries

**Purpose**: Fast lookup by ID and iteration

**Structure**:
```typescript
allItems: Item[]           // All items in the game
allLocations: Location[]   // All locations in the game
allNPCs: NPC[]            // All NPCs in the game
allRegions: Region[]      // All regions in the game
```

**Use Cases**:
- Looking up entity by ID: `allItems.find(item => item.id === 'ite_sword_001')`
- Iterating all entities: `allItems.forEach(...)`
- Serialization/saving game state

## Coordinate System

Entities are positioned using a **3D coordinate system**:

### Coordinates

```typescript
{
  region: string  // Region identifier
  x: number       // X coordinate (unbounded, can be negative)
  y: number       // Y coordinate (unbounded, can be negative)
}
```

**Examples**:
```typescript
// Item in world
{
  region: 'region_medieval_kingdom_001',
  x: 45,
  y: -23
}

// Item in inventory
{
  region: 'inventory',
  x: 0,
  y: 0
}
```

### Regions

Regions exist on a **world grid** (max 5x5 = 25 regions):

```typescript
{
  id: 'region_medieval_kingdom_001',
  regionX: 2,  // Grid X position
  regionY: 3,  // Grid Y position
  name: 'Medieval Kingdom'
}
```

**Coordinate Scale**:
- Adjacent regions in real world = 1 unit apart on grid
- Oceans/barriers = 2-4 units gap
- Same scale for all regions (continent OR country OR province, but not mixed)

### Entity Coordinates vs Region Grid

**Different coordinate systems**:

- **Region grid** (`regionX`, `regionY`): Where regions exist on world map (max 5x5)
- **Entity coordinates** (`region`, `x`, `y`): Where entities exist within a region (unbounded)

**Example**:
```
World Grid:
┌─────────┬─────────┬─────────┐
│         │         │         │
│ Region  │ Region  │ Region  │
│ (0,0)   │ (1,0)   │ (2,0)   │
│         │         │         │
└─────────┴─────────┴─────────┘

Within Region (0,0):
Items at: (45, -23), (46, -20), (50, -25)
NPCs at: (45, -23), (47, -22)
Location at: (45, -23)
```

## Entity Lifecycle

### Creation

**Initial Generation** (During Game Setup):
1. Game orchestrator generates entities during game creation
2. Entities created via `entity-generation` service (`createItem()`, `createNpc()`, etc.)
3. Passed to `EntityStorageProvider` as `initialData`
4. `EntityMemoryStorage` indexes them automatically

**Runtime Creation** (During Gameplay):

**Standard Way**: Use `generateEntityWithContext()` for runtime entity generation.

```typescript
import { generateEntityWithContext } from '../services/entity-generation/generation-manager'

const result = await generateEntityWithContext({
  type: 'item',
  prompt: 'Create a sword',
  gameRules,
  region: 'region_medieval_kingdom_001',
  x: 50,
  y: -30,
  gameConfig,  // For timeline integration
  entityStorage,  // For automatic storage
  changeReason: 'Player requested item'
})
// Entity automatically:
// - Generated with proper ID (via getNextEntityId())
// - Added to EntityStorage
// - Appended to timeline
// - Tracked in entity history (dev mode)
```

**Manual Creation** (Rare - only if not using generation):

```typescript
import { getNextEntityId } from '../services/entity-generation/categories'
const { addEntity } = useEntityStorage()

const newItem: Item = {
  id: getNextEntityId('item', 'weapon', 'New Item'),  // Always use getNextEntityId()
  name: 'New Item',
  rarity: 'common',
  description: 'A new item',
  image_url: 'data:image/png;base64,...',
  region: 'region_medieval_kingdom_001',
  x: 50,
  y: -30,
  own_attributes: { /* ... */ }
}

addEntity(newItem, 'item')
```

**Important**: Always use `getNextEntityId()` for entity IDs. Never generate IDs manually.

### Storage

When an entity is added:

1. **Added to registry**:
   ```typescript
   allItems.push(item)
   ```

2. **Indexed spatially**:
   ```typescript
   const key = makeKey(item.region, item.x, item.y)
   if (!entityMap[key]) {
     entityMap[key] = { locations: [], npcs: [], items: [] }
   }
   entityMap[key].items.push(item)
   ```

3. **History tracked** (dev mode):
   - Records `null` (previous) → `item` (new)
   - Broadcasts to dev dashboard

### Updates

When an entity is updated:

**If coordinates unchanged**:
1. Update in registry (replace in array)
2. Update in spatial index (replace in array)

**If coordinates changed**:
1. Remove from old spatial key
2. Update in registry
3. Add to new spatial key

```typescript
const { updateEntity } = useEntityStorage()

const updatedItem = {
  ...existingItem,
  name: 'Renamed Item',
  x: newX,  // Coordinates changed
  y: newY
}

updateEntity(updatedItem, 'item')
```

### Removal

When an entity is removed:

1. Remove from registry (filter out)
2. Remove from spatial index (filter out of coordinate array)
3. History tracked (previous state → null)

```typescript
const { removeEntity } = useEntityStorage()

removeEntity('ite_sword_wea_001', 'item')
```

## Inventory Items

Items in player inventory have **special handling**:

### Inventory Coordinates

```typescript
{
  id: 'ite_sword_wea_001',
  region: 'inventory',  // Special region identifier
  x: 0,
  y: 0
}
```

### Storage

- Still in `allItems` registry
- Indexed under key `"inventory:0:0"` in spatial index
- **Should NOT** be queried via `getEntitiesAt()` for display
- PlayerUIContext manages inventory slots separately

### Moving to Inventory

Use `PlayerUIContext.takeItem()`:

```typescript
const { takeItem } = usePlayerUI()

// Item is in world
const groundItem = interactableItems[0]

// Move to inventory
takeItem(groundItem)
// Updates: region → 'inventory', x → 0, y → 0
// Also assigns to inventory slot
```

## Entity Lookup Patterns

### By Location

**Use**: `getEntitiesAt(region, x, y)` - **Standard spatial query helper**

```typescript
const { getEntitiesAt } = useEntityStorage()

// Get all entities at a location
const { items, npcs, locations } = getEntitiesAt(
  'region_medieval_kingdom_001',
  45,
  -23
)

// Display items at location
items.forEach(item => {
  renderItem(item)
})
```

**Implementation**: Direct spatial index lookup - O(1)

**Why use this**: Much faster than filtering arrays. Always use `getEntitiesAt()` for location-based queries.

### By ID

**Use**: `getAllXxxById(id)` - **Standard ID lookup helpers**

```typescript
const { getAllItemById, getAllNPCById, getAllLocationById } = useEntityStorage()

// Find specific item
const sword = getAllItemById('ite_sword_wea_001')

// Find specific NPC
const merchant = getAllNPCById('npc_merchant_mer_001')

// Find specific location
const location = getAllLocationById('loc_town_tow_001')
```

**Implementation**: Array find in registry - O(n)

**Why use this**: Standardized interface, consistent behavior. Always use these helpers instead of manually finding in arrays.

### By Region

**Use**: `getAllRegionById(id)` or `getRegionByCoordinates(x, y)` - **Standard region lookup helpers**

```typescript
const { getAllRegionById, getRegionByCoordinates } = useEntityStorage()

// By ID
const region = getAllRegionById('region_medieval_kingdom_001')

// By grid coordinates
const region = getRegionByCoordinates(2, 3)
```

**Why use this**: Standardized interface for region lookups.

### Iterating All Entities

**Use**: Direct registry access (rare, but possible)

```typescript
const { allItems, allNPCs, allLocations } = useEntityStorage()

// Iterate all items
allItems.forEach(item => {
  // Do something with each item
})

// Filter items
const weapons = allItems.filter(item => item.category === 'weapon')
```

**When to use**: Only when you need to iterate all entities. For location-based queries, use `getEntitiesAt()` instead.

## Standard Storage Operations

### addEntity()

**Purpose**: Adds a new entity to storage.

**When to use**: Always use this for adding entities, never manually push to arrays.

```typescript
const { addEntity } = useEntityStorage()

addEntity(newItem, 'item')  // Automatically updates spatial index and registry
```

**What it handles automatically**:
- Adds to registry (`allItems`, `allLocations`, etc.)
- Adds to spatial index (`entityMap`)
- Entity history tracking (dev mode)
- Dev dashboard broadcasting (dev mode)

### updateEntity()

**Purpose**: Updates an existing entity in storage.

**When to use**: Always use this for updating entities, never mutate entities directly.

```typescript
const { updateEntity } = useEntityStorage()

updateEntity(updatedItem, 'item', 'Player used item', 'player_action')
// Parameters: entity, type, changeReason (optional), changeSource (optional)
```

**What it handles automatically**:
- Updates in registry
- Updates in spatial index (if coordinates changed, removes from old key, adds to new key)
- Entity history tracking (dev mode)
- Dev dashboard broadcasting (dev mode)

### removeEntity()

**Purpose**: Removes an entity from storage.

**When to use**: Always use this for removing entities, never manually filter arrays.

```typescript
const { removeEntity } = useEntityStorage()

removeEntity(itemId, 'item')  // Automatically removes from spatial index and registry
```

**What it handles automatically**:
- Removes from registry
- Removes from spatial index
- Entity history tracking (dev mode)
- Dev dashboard broadcasting (dev mode)

### getStateSnapshot()

**Purpose**: Gets a snapshot of current entity state for saving.

**When to use**: For save game functionality.

```typescript
const { getStateSnapshot } = useEntityStorage()

const snapshot = getStateSnapshot()
// Returns: { allItems, allLocations, allNPCs, allRegions }
// Use this for save game functionality
```

**What it returns**: Current runtime state of all entities (includes all properties: own_attributes, chatHistory, current positions, etc.)

## Timeline Integration

### Entity Generation with Timeline

When generating entities at runtime, use `generateEntityWithContext()` which automatically handles timeline integration:

```typescript
import { generateEntityWithContext } from '../services/entity-generation/generation-manager'

const result = await generateEntityWithContext({
  type: 'item',
  prompt: 'Create a sword',
  gameRules,
  region: 'region_001',
  x: 0,
  y: 0,
  gameConfig,  // For timeline integration
  entityStorage,  // For automatic storage
  changeReason: 'Turn progression generated item'
})
// Timeline entry automatically created with tags: ['generation', 'item']
// Entity automatically added to storage
// Entity history automatically tracked (dev mode)
```

### Entity Updates with Timeline

Entity updates don't automatically create timeline entries. If you need to log entity changes to the timeline, do it manually:

```typescript
const { updateEntity } = useEntityStorage()
const { updateTimeline } = useGameState()

// Update entity
updateEntity(updatedItem, 'item', 'Player used item', 'player_action')

// Log to timeline if needed
updateTimeline(['entityChange', 'AttributeUpdate'], `Item ${updatedItem.name} updated: ${reason}`)
```

**Note**: Most entity updates don't need timeline entries. Only log significant changes that should be part of game history.

### Dev Dashboard Sync for Narrative State

`GameStateContext` is the source of truth for the player-facing narrative (timeline + guide scratchpad). It exposes lightweight helpers (`getTimelineSnapshot()` and `getGuideScratchpad()`) that mirror the storage snapshot pattern—contexts can call them to obtain the latest narrative data. In development mode the context listens for dashboard `SYNC_REQUEST` messages and immediately re-broadcasts both snapshots, so refreshing the dashboard restores the same timeline and scratchpad without rerunning the orchestrator. See `docs/STATE-MANAGEMENT.md` for details on the broadcaster wiring.

## Entity Attributes

Entities can have **dynamic attributes** with full metadata:

```typescript
own_attributes: {
  durability: {
    value: 75,
    type: 'integer',
    description: 'Item durability/condition',
    reference: '0=broken, 50=worn, 100=pristine'
  },
  damage: {
    value: 45,
    type: 'integer',
    description: 'Damage dealt in combat',
    reference: '10=dagger, 40=sword, 80=greatsword, 100=legendary'
  }
}
```

### Attribute Structure

```typescript
interface Attribute {
  value: any                              // Actual value
  type: 'integer' | 'number' | 'string' | 'boolean' | 'array'
  description: string                     // What it represents
  reference: string                       // Calibration scale/examples
}
```

### Updating Attributes

```typescript
const { getAllItemById, updateEntity } = useEntityStorage()

const item = getAllItemById('ite_sword_wea_001')
const updated = {
  ...item,
  own_attributes: {
    ...item.own_attributes,
    durability: {
      ...item.own_attributes.durability,
      value: item.own_attributes.durability.value - 5  // Reduce durability
    }
  }
}

updateEntity(updated, 'item')
```

## Entity Relationships

### Containment

- **Regions contain**: Locations, NPCs, Items
- **Locations contain**: NPCs, Items (at same coordinates)
- **Player inventory contains**: Items (via PlayerUIContext slots)

### References

Entities reference each other via IDs:

```typescript
// Item might reference location or region
item.region = 'region_medieval_kingdom_001'

// NPC conversation references NPC
chatMessage in npc.chatHistory

// Player slots reference items
inventorySlots['inv_slot_1'] = 'ite_sword_wea_001'
```

## Best Practices

### Entity Operations
1. **Always use context methods**: `addEntity()`, `updateEntity()`, `removeEntity()`
2. **Maintain consistency**: Both spatial index and registries must stay in sync
3. **Never mutate directly**: Always use context methods to maintain consistency

### Entity Queries
4. **Use appropriate lookup**: Spatial queries use `getEntitiesAt()`, ID queries use `getAllXxxById()`
5. **Never bypass helpers**: Always use standard query helpers instead of manually filtering arrays
6. **Spatial queries are O(1)**: `getEntitiesAt()` is much faster than filtering arrays

### Entity Generation
7. **Use generateEntityWithContext()**: For runtime entity generation (handles timeline, storage, history)
8. **Use getNextEntityId()**: Always use for entity IDs, never generate manually
9. **ID format**: Follow semantic ID pattern: `ite_*`, `npc_*`, `loc_*`, `region_*`

### Entity Updates
10. **Coordinate changes**: When updating coordinates, `updateEntity()` handles spatial index cleanup automatically
11. **Special inventory handling**: Use `PlayerUIContext.takeItem()` for moving to inventory
12. **Timeline integration**: Use `generateEntityWithContext()` for entities that need timeline entries

## Common Operations

### Finding Items at Location

```typescript
const { getEntitiesAt } = useEntityStorage()
const { items } = getEntitiesAt(region, x, y)
```

### Moving Item from World to Inventory

```typescript
const { takeItem, interactableItems } = usePlayerUI()
takeItem(interactableItems[0])
```

### Updating Item Attributes

```typescript
const { getAllItemById, updateEntity } = useEntityStorage()
const item = getAllItemById(itemId)
const updated = { ...item, own_attributes: { ...newAttributes } }
updateEntity(updated, 'item')
```

### Finding NPC by Location

```typescript
const { getEntitiesAt } = useEntityStorage()
const { npcs } = getEntitiesAt(region, x, y)
const npc = npcs.find(n => n.name === 'Merchant')
```

See `docs/STATE-MANAGEMENT.md` for context usage and `docs/IMPLEMENTING-FEATURES.md` for extending entity types.

