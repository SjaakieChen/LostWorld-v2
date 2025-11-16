# Common Pitfalls & Things to Watch Out For

This document highlights common mistakes and issues developers encounter when working with the Lost World codebase. Learn from these examples to avoid similar problems.

## Table of Contents
- [State Management Pitfalls](#state-management-pitfalls)
- [Entity Generation Pitfalls](#entity-generation-pitfalls)
- [Save/Load Pitfalls](#saveload-pitfalls)
- [LLM Integration Pitfalls](#llm-integration-pitfalls)
- [Debugging Tips](#debugging-tips)
- [Best Practices Summary](#best-practices-summary)

## State Management Pitfalls

### ❌ Direct State Mutation

**Problem**: Mutating state directly breaks the spatial index consistency.

```typescript
// ❌ WRONG - Direct mutation
const { allItems } = useEntityStorage()
allItems[0].name = 'New Name'  // Breaks spatial index!
```

**Why it's wrong**: 
- Spatial index still references old object
- Registries and spatial index become out of sync
- Dev dashboard won't track the change

**✅ CORRECT - Use context method**:
```typescript
const { getAllItemById, updateEntity } = useEntityStorage()
const item = getAllItemById(itemId)
const updated = { ...item, name: 'New Name' }
updateEntity(updated, 'item')
```

**Solution**: Always use context methods (`updateEntity`, `addEntity`, `removeEntity`) to maintain consistency.

### ❌ Storing Entity Objects in Slots

**Problem**: Slots should store item IDs, not entity objects.

```typescript
// ❌ WRONG - Storing object
const [inventorySlots, setInventorySlots] = useState<Record<string, Item | null>>({})
inventorySlots['inv_slot_1'] = itemObject  // Creates stale references
```

**Why it's wrong**:
- Objects can become stale if entity updates
- No single source of truth
- Harder to serialize for save games

**✅ CORRECT - Store IDs**:
```typescript
const { inventorySlots } = usePlayerUI()  // Already stores IDs
// Slots: { 'inv_slot_1': 'ite_sword_wea_001' }

// Get item when needed
const item = getItemInSlot('inv_slot_1')  // Looks up in EntityStorage
```

**Solution**: Slots store IDs, use `getItemInSlot()` to get the actual item object.

### ❌ Wrong Context Provider Order

**Problem**: Context providers must nest in correct order due to dependencies.

```typescript
// ❌ WRONG - Wrong order
<PlayerUIProvider>
  <EntityStorageProvider>
    {/* PlayerUIProvider tries to use EntityStorage - ERROR! */}
  </EntityStorageProvider>
</PlayerUIProvider>
```

**Why it's wrong**: PlayerUIContext depends on EntityMemoryStorage, so EntityStorageProvider must be the parent.

**✅ CORRECT - Correct order**:
```typescript
<GameStateProvider>
  <EntityStorageProvider>
    <PlayerUIProvider>
      {/* Correct nesting */}
    </PlayerUIProvider>
  </EntityStorageProvider>
</GameStateProvider>
```

**Solution**: Always nest in this order:
1. GameStateProvider (outermost)
2. EntityStorageProvider
3. PlayerUIProvider (innermost)

### ❌ Using Context Outside Provider

**Problem**: Calling context hook outside its provider throws error.

```typescript
// ❌ WRONG - Using hook outside provider
function MyComponent() {
  const { allItems } = useEntityStorage()  // Error if not wrapped in provider
  return <div>{allItems.length}</div>
}

function App() {
  return <MyComponent />  // Missing EntityStorageProvider wrapper
}
```

**✅ CORRECT - Wrap in provider**:
```typescript
function App() {
  return (
    <EntityStorageProvider>
      <MyComponent />
    </EntityStorageProvider>
  )
}
```

**Solution**: Ensure components using context hooks are children of the appropriate provider.

## Entity Storage Pitfalls

### ❌ Forgetting to Update Spatial Index

**Problem**: Updating only registry without updating spatial index causes inconsistency.

```typescript
// ❌ WRONG - Only updating registry
const updatedItems = allItems.map(item => 
  item.id === itemId ? { ...item, name: 'New' } : item
)
setAllItems(updatedItems)  // Spatial index still has old data!
```

**Why it's wrong**: Entity still appears at old location in spatial queries.

**✅ CORRECT - Use updateEntity**:
```typescript
const { updateEntity } = useEntityStorage()
updateEntity(updatedItem, 'item')  // Updates both registry and spatial index
```

**Solution**: Always use context methods that maintain both registries and spatial index.

### ❌ Moving Entity Without Updating Coordinates

**Problem**: Moving entity between locations requires coordinate update.

```typescript
// ❌ WRONG - Moving item but coordinates unchanged
const item = getAllItemById(itemId)
const movedItem = { ...item }  // Coordinates still point to old location
updateEntity(movedItem, 'item')  // Item appears at wrong location
```

**✅ CORRECT - Update coordinates**:
```typescript
const item = getAllItemById(itemId)
const movedItem = {
  ...item,
  region: newRegion,
  x: newX,
  y: newY
}
updateEntity(movedItem, 'item')  // updateEntity handles spatial index cleanup
```

**Solution**: `updateEntity()` automatically handles spatial index when coordinates change - just provide the new coordinates.

### ❌ Querying Inventory Items via getEntitiesAt

**Problem**: Inventory items should not be queried using spatial queries.

```typescript
// ❌ WRONG - Querying inventory as location
const { items } = getEntitiesAt('inventory', 0, 0)  // Returns all items with region='inventory'
// But this mixes inventory and world items that might be at coordinate (0, 0) in a region
```

**Why it's wrong**: Inventory items are managed via PlayerUIContext slots, not spatial queries.

**✅ CORRECT - Use PlayerUIContext**:
```typescript
const { inventorySlots, getItemInSlot } = usePlayerUI()

// Get items in inventory
Object.values(inventorySlots).forEach(itemId => {
  if (itemId) {
    const item = getItemInSlot(itemId)  // Looks up in EntityStorage
    // Use item
  }
})
```

**Solution**: Use `PlayerUIContext` for inventory operations, `EntityMemoryStorage` for world location queries.

### ❌ Not Handling Coordinate Changes in Updates

**Problem**: If entity moves, both old and new spatial keys need handling.

```typescript
// ❌ WRONG - Assuming updateEntity handles everything without coordinates
const updated = { ...item, name: 'New Name' }
updateEntity(updated, 'item')  // If coordinates changed, old location still has entity
```

**Why it's wrong**: Actually, `updateEntity()` DOES handle this correctly! The issue is if you manually update coordinates without using `updateEntity()`.

**✅ CORRECT - updateEntity handles it**:
```typescript
// updateEntity() automatically:
// 1. Removes from old spatial key (if coordinates changed)
// 2. Updates in registry
// 3. Adds to new spatial key (if coordinates changed)

const updated = {
  ...item,
  region: newRegion,
  x: newX,
  y: newY
}
updateEntity(updated, 'item')  // Handles spatial index correctly
```

**Solution**: `updateEntity()` handles coordinate changes automatically - trust it to maintain consistency.

## Component Pitfalls

### ❌ Not Checking Context Availability

**Problem**: Component fails if context not available.

```typescript
// ❌ WRONG - No error handling
function MyComponent() {
  const { allItems } = useEntityStorage()  // Throws if provider missing
  return <div>{allItems.length}</div>
}
```

**✅ CORRECT - Check availability**:
```typescript
function MyComponent() {
  try {
    const { allItems } = useEntityStorage()
    return <div>{allItems.length}</div>
  } catch (error) {
    return <div>Context not available</div>
  }
}
```

**Solution**: Wrap context usage in try-catch or ensure proper provider nesting.

### ❌ Re-rendering on Every Entity Change

**Problem**: Component re-renders even when unrelated entities change.

```typescript
// ❌ WRONG - Subscribes to all items
function ItemList() {
  const { allItems } = useEntityStorage()  // Re-renders on ANY item change
  return <div>{allItems.map(...)}</div>
}
```

**✅ CORRECT - Filter or memoize**:
```typescript
function ItemList() {
  const { allItems } = useEntityStorage()
  const visibleItems = useMemo(() => 
    allItems.filter(item => item.region !== 'inventory'),
    [allItems]
  )
  return <div>{visibleItems.map(...)}</div>
}
```

**Solution**: Use `useMemo` or filter entities before rendering if you only need a subset.

### ❌ Storing Derived State

**Problem**: Storing computed/derived data in state instead of computing it.

```typescript
// ❌ WRONG - Storing derived state
const [visibleItems, setVisibleItems] = useState<Item[]>([])

useEffect(() => {
  const { items } = getEntitiesAt(currentLocation.region, currentLocation.x, currentLocation.y)
  setVisibleItems(items)  // Unnecessary state
}, [currentLocation])
```

**✅ CORRECT - Compute when needed**:
```typescript
const { getEntitiesAt } = useEntityStorage()
const { currentLocation } = usePlayerUI()

// Compute directly - no state needed
const { items: visibleItems } = getEntitiesAt(
  currentLocation.region,
  currentLocation.x,
  currentLocation.y
)
```

**Solution**: Compute derived data in render rather than storing in state.

## Type Safety Pitfalls

### ❌ Assuming Entity Fields Exist

**Problem**: Accessing optional fields without checking.

```typescript
// ❌ WRONG - No null check
const item = getAllItemById(itemId)
const durability = item.own_attributes.durability.value  // Error if durability doesn't exist
```

**✅ CORRECT - Check existence**:
```typescript
const item = getAllItemById(itemId)
if (!item) return

const durability = item.own_attributes?.durability?.value
if (durability !== undefined) {
  // Use durability
}
```

**Solution**: Use optional chaining (`?.`) and null checks for optional fields.

### ❌ Type Mismatches

**Problem**: Passing wrong entity type to methods.

```typescript
// ❌ WRONG - Wrong type
const item = getAllItemById(itemId)
updateEntity(item, 'npc')  // Item is not an NPC!
```

**✅ CORRECT - Match type**:
```typescript
const item = getAllItemById(itemId)
if (item) {
  updateEntity(item, 'item')  // Correct type
}
```

**Solution**: Ensure entity type matches the second parameter.

## Performance Pitfalls

### ❌ Creating Large Lists in Render

**Problem**: Computing expensive operations on every render.

```typescript
// ❌ WRONG - Recomputes every render
function ExpensiveComponent() {
  const { allItems } = useEntityStorage()
  const filtered = allItems
    .filter(item => item.rarity === 'legendary')
    .map(item => expensiveTransform(item))
  
  return <div>{filtered.map(...)}</div>
}
```

**✅ CORRECT - Memoize**:
```typescript
function ExpensiveComponent() {
  const { allItems } = useEntityStorage()
  const filtered = useMemo(() => 
    allItems
      .filter(item => item.rarity === 'legendary')
      .map(item => expensiveTransform(item)),
    [allItems]
  )
  
  return <div>{filtered.map(...)}</div>
}
```

**Solution**: Use `useMemo` for expensive computations.

### ❌ Not Debouncing Frequent Updates

**Problem**: Too many state updates cause performance issues.

```typescript
// ❌ WRONG - Updates on every keystroke
function SearchInput() {
  const [query, setQuery] = useState('')
  const { allItems } = useEntityStorage()
  
  const results = allItems.filter(item => 
    item.name.includes(query)  // Re-filters on every keystroke
  )
  
  return <input onChange={e => setQuery(e.target.value)} />
}
```

**✅ CORRECT - Debounce**:
```typescript
function SearchInput() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const { allItems } = useEntityStorage()
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])
  
  const results = useMemo(() => 
    allItems.filter(item => item.name.includes(debouncedQuery)),
    [allItems, debouncedQuery]
  )
  
  return <input onChange={e => setQuery(e.target.value)} />
}
```

**Solution**: Debounce frequent updates using `useEffect` and timers.

## Dev Dashboard Pitfalls

### ❌ Forgetting to Track Changes

**Problem**: Dev dashboard won't show entity changes if not tracked.

```typescript
// ❌ WRONG - Direct state update, no tracking
setAllItems(prev => prev.map(item => 
  item.id === itemId ? updatedItem : item
))
```

**Why it's wrong**: Dev dashboard relies on context methods to broadcast changes.

**✅ CORRECT - Use context method**:
```typescript
const { updateEntity } = useEntityStorage()
updateEntity(updatedItem, 'item')  // Automatically tracks for dev dashboard
```

**Solution**: Always use context methods - they handle dev dashboard tracking automatically.

## Timeline System Pitfalls

### ❌ Manually Appending to Timeline

**Problem**: Manually manipulating timeline array breaks context stack and turn tracking.

```typescript
// ❌ WRONG - Manual timeline manipulation
const newEntry: TimelineEntry = {
  id: `entry-${Date.now()}`,
  tags: ['user', 'advisorLLM'],
  text: userMessage,
  timestamp: Date.now(),
  turn: 0  // Wrong turn number!
}
gameConfig.theTimeline.push(newEntry)  // Breaks context stack
```

**Why it's wrong**: 
- Turn number may be incorrect (should use active turn context)
- Breaks timeline context stack pattern
- Timeline updates won't be tracked properly
- Dev dashboard won't see changes

**✅ CORRECT - Use logTimelineEvent()**:
```typescript
import { logTimelineEvent } from '../services/timeline/timeline-service'

// Standard way - automatically handles turn tracking and context
const entry = logTimelineEvent(['user', 'advisorLLM'], userMessage)
// Or use context wrapper if available
const { updateTimeline } = useGameState()
updateTimeline(['user', 'advisorLLM'], userMessage)
```

**Solution**: Always use `logTimelineEvent()` from `timeline-service.ts` or the `updateTimeline()` context method. Never manually manipulate the timeline array.

### ❌ Not Using Timeline Context Stack

**Problem**: Creating timeline entries without proper context setup breaks turn tracking.

```typescript
// ❌ WRONG - No timeline context
function myService() {
  // Timeline context not set up - turn will default to 0
  logTimelineEvent(['generation'], 'Generated item')  // Wrong turn!
}
```

**Why it's wrong**: Timeline service needs context to know current turn. Without context, all entries get turn 0.

**✅ CORRECT - Use generateEntityWithContext or set up context**:
```typescript
// Option 1: Use generateEntityWithContext (handles context automatically)
import { generateEntityWithContext } from '../services/entity-generation/generation-manager'

const result = await generateEntityWithContext({
  type: 'item',
  prompt: 'Create a sword',
  gameRules,
  region: 'region_001',
  x: 0,
  y: 0,
  gameConfig  // Timeline context set up automatically
})

// Option 2: Set up context manually if needed
import { pushTimelineContext, pushTurnContext } from '../services/timeline/timeline-service'

const releaseTimeline = pushTimelineContext({
  getTimeline: () => gameConfig.theTimeline,
  setTimeline: (updated) => { gameConfig.theTimeline = updated }
})
const releaseTurn = pushTurnContext({
  getCurrentTurn: () => currentTurn
})

try {
  logTimelineEvent(['generation'], 'Generated item')
} finally {
  releaseTimeline()
  releaseTurn()
}
```

**Solution**: Use `generateEntityWithContext()` for entity generation (handles context automatically), or set up timeline/turn context manually when needed.

### ❌ Incrementing the turn before the LLM finishes

**Problem**: Advancing `currentTurn` while the turn-progression LLM is still running (or has failed) makes it impossible to retry the same turn and causes future timeline entries to be stamped with the wrong turn.

```typescript
// ❌ WRONG - increments even if progression fails
incrementTurn()
await processTurnProgression(...)
```

**Why it's wrong**: If the LLM throws or returns partial results, the UI already moved to the next turn. Retrying the progression or correlating timeline entries to the correct turn becomes inconsistent.

**✅ CORRECT - only increment after success**:

```typescript
let succeeded = false
try {
  await processTurnProgression(...)
  succeeded = true
} finally {
  if (succeeded) {
    incrementTurn()
  }
}
```

**Solution**: Follow the pattern in `src/components/game/TurnButton.tsx`—wait for `processTurnProgression()` to complete successfully, then increment the turn inside a guarded block.

## Entity Generation Pitfalls

### ❌ Not Using generateEntityWithContext for Runtime Generation

**Problem**: Manually generating entities without timeline/storage integration.

```typescript
// ❌ WRONG - Manual entity generation
const result = await createItem('Create a sword', gameRules, region, x, y)
// Forgot to add to storage!
// Forgot to update timeline!
// Forgot to track entity history!
```

**Why it's wrong**: 
- Entity not added to storage automatically
- Timeline not updated
- Entity history not tracked
- Requires manual integration work

**✅ CORRECT - Use generateEntityWithContext**:
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
  changeReason: 'Player requested item'  // Optional: why was this created
})
// Entity automatically:
// - Added to EntityStorage
// - Appended to timeline
// - Tracked in entity history (dev mode)
```

**Solution**: Always use `generateEntityWithContext()` for runtime entity generation. It handles timeline updates, storage, and callbacks automatically.

### ❌ Manually Generating Entity IDs

**Problem**: Creating entity IDs manually leads to collisions and inconsistent formats.

```typescript
// ❌ WRONG - Manual ID generation
const item: Item = {
  id: `item-${Date.now()}`,  // Not standardized format!
  name: 'Sword',
  // ...
}
// Or worse:
const item: Item = {
  id: 'sword',  // Collision risk!
  // ...
}
```

**Why it's wrong**: 
- IDs don't follow standard format (`ite_sword_wea_001`)
- Risk of ID collisions
- Inconsistent naming makes debugging harder
- Counter system not updated

**✅ CORRECT - Use getNextEntityId()**:
```typescript
import { getNextEntityId } from '../services/entity-generation/categories'

// Always use getNextEntityId for entity IDs
const item: Item = {
  id: getNextEntityId('item', 'weapon', 'Sword'),  // Returns: "ite_sword_wea_001"
  name: 'Sword',
  category: 'weapon',
  // ...
}
```

**Solution**: Always use `getNextEntityId(entityType, category, name)` from `categories.ts` for all entity IDs. Never generate IDs manually.

### ❌ Not Cleaning LLM JSON Responses

**Problem**: LLM responses may contain markdown code blocks that break JSON parsing.

```typescript
// ❌ WRONG - Direct JSON parsing
const response = await fetch(endpoint, { ... })
const json = await response.json()
const data = JSON.parse(json.text)  // Fails if response has ```json blocks
```

**Why it's wrong**: LLMs sometimes wrap JSON in markdown code blocks (````json ... ```), causing parsing to fail.

**✅ CORRECT - Use cleanJsonResponse()**:
```typescript
import { cleanJsonResponse } from '../services/entity-generation/item-generation'
// Or copy the function - it's a simple utility

const response = await fetch(endpoint, { ... })
const json = await response.json()
const cleaned = cleanJsonResponse(json.text)  // Removes ```json and ``` markers
const data = JSON.parse(cleaned)
```

**Solution**: Always use `cleanJsonResponse()` (or equivalent) when parsing LLM JSON responses to handle markdown code blocks.

### ❌ Not Adding Discovered Attributes to Library

**Problem**: New attributes discovered during generation aren't added to gameRules, causing inconsistency.

```typescript
// ❌ WRONG - Ignoring new attributes
const result = await createItem('Create a fire sword', gameRules, region, x, y)
// result.newAttributes contains { fire_damage: {...} }
// But we don't add it to gameRules!
// Next generation won't know about fire_damage attribute
```

**Why it's wrong**: 
- Attribute library becomes incomplete
- Future generations can't use discovered attributes
- Inconsistent attribute usage across entities

**✅ CORRECT - Use addNewAttributesToLibrary()**:
```typescript
import { addNewAttributesToLibrary } from '../services/entity-generation/item-generation'
// Or copy the function pattern

const result = await createItem('Create a fire sword', gameRules, region, x, y)

// Add discovered attributes to library
if (result.newAttributes && Object.keys(result.newAttributes).length > 0) {
  addNewAttributesToLibrary(result.newAttributes, gameRules)
  // Now future generations can use these attributes
}
```

**Solution**: Always check `result.newAttributes` after entity generation and call `addNewAttributesToLibrary()` to keep the attribute library up to date.

### ❌ Redefining Schemas, Categories, or Models

**Problem**: Copying schema/category/model definitions instead of reusing constants.

```typescript
// ❌ WRONG - Redefining constants
const ITEM_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    // ... duplicate definition
  }
}
// What if the real schema changes? This copy is now outdated!
```

**Why it's wrong**: 
- Duplication leads to inconsistencies
- Updates to standard schemas don't propagate
- Harder to maintain
- Risk of bugs from outdated definitions

**✅ CORRECT - Import and reuse**:
```typescript
// Import standard constants
import { 
  ITEM_SCHEMA, 
  NPC_SCHEMA, 
  LOCATION_SCHEMA,
  ITEM_CATEGORIES,
  NPC_CATEGORIES,
  LOCATION_CATEGORIES,
  STRUCTURED_FLASH_LITE_MODEL,
  STRUCTURED_IMAGE_MODEL,
  STRUCTURED_API_BASE_URL
} from '../services/entity-generation/core'
import { 
  ITEM_CATEGORIES,
  NPC_CATEGORIES,
  LOCATION_CATEGORIES
} from '../services/entity-generation/categories'

// Reuse them - always in sync
const schema = ITEM_SCHEMA
const model = STRUCTURED_FLASH_LITE_MODEL
const categories = ITEM_CATEGORIES
```

**Solution**: Always import and reuse schema, category, and model constants from `core.ts` and `categories.ts`. Never redefine them.

## Storage Helper Pitfalls

### ❌ Not Using Standard Storage Helpers

**Problem**: Bypassing standard storage methods leads to inconsistent state.

```typescript
// ❌ WRONG - Bypassing storage helpers
const { allItems } = useEntityStorage()
// Manually finding entity
const item = allItems.find(i => i.id === itemId)  // Should use getAllItemById()
// Manually querying location
const itemsAtLocation = allItems.filter(i => 
  i.region === region && i.x === x && i.y === y
)  // Should use getEntitiesAt()
```

**Why it's wrong**: 
- Slower (O(n) instead of O(1) for spatial queries)
- Doesn't leverage spatial index
- Code duplication
- Risk of bugs from manual filtering

**✅ CORRECT - Use standard helpers**:
```typescript
const { 
  getAllItemById,      // O(n) but standard way
  getEntitiesAt,       // O(1) spatial query
  getStateSnapshot     // For saving
} = useEntityStorage()

// Use standard helpers
const item = getAllItemById(itemId)
const { items, npcs, locations } = getEntitiesAt(region, x, y)
const snapshot = getStateSnapshot()  // For save games
```

**Solution**: Always use standard storage helpers (`getAllItemById`, `getEntitiesAt`, `getStateSnapshot`) instead of manually querying arrays. They're optimized and maintain consistency.

## Summary: Golden Rules

### State Management
1. **Never mutate state directly** - Always use context methods (`addEntity`, `updateEntity`, `removeEntity`)
2. **Slots store IDs** - Use `getItemInSlot()` to get objects
3. **Correct provider nesting** - GameStateProvider → EntityStorageProvider → PlayerUIProvider
4. **Use updateEntity()** - It maintains spatial index consistency
5. **Compute, don't store** - Derive data rather than storing derived state
6. **Context methods only** - Don't bypass context for state updates

### Timeline System
7. **Use logTimelineEvent()** - Never manually manipulate timeline array
8. **Set up timeline context** - Use `generateEntityWithContext()` or set up context stack manually
9. **Use updateTimeline()** - Context wrapper for timeline updates (when available)

### Entity Generation
10. **Use generateEntityWithContext()** - Standard way for runtime entity generation
11. **Use getNextEntityId()** - Always use for entity IDs, never generate manually
12. **Clean JSON responses** - Use `cleanJsonResponse()` when parsing LLM responses
13. **Add discovered attributes** - Call `addNewAttributesToLibrary()` after generation
14. **Reuse constants** - Import schemas, categories, and models from `core.ts` and `categories.ts`

### Entity Storage
15. **Use standard helpers** - `getAllItemById()`, `getEntitiesAt()`, `getStateSnapshot()`
16. **Never bypass storage** - Always use context methods for entity operations

### General
17. **Check optional fields** - Use optional chaining for entity attributes
18. **Type safety** - Match entity types to method parameters
19. **Memoize expensive ops** - Use `useMemo` for computed values

Following these rules will help you avoid the most common pitfalls and maintain code quality.

See `docs/IMPLEMENTING-FEATURES.md` for implementation patterns, `docs/STATE-MANAGEMENT.md` for state management details, and `docs/SERVICES.md` for service layer patterns.

