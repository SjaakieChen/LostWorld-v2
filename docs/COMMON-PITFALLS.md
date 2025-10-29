# Common Pitfalls & Things to Watch Out For

This document highlights common mistakes and issues developers encounter when working with the Lost World codebase. Learn from these examples to avoid similar problems.

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

## Summary: Golden Rules

1. **Never mutate state directly** - Always use context methods
2. **Slots store IDs** - Use `getItemInSlot()` to get objects
3. **Correct provider nesting** - GameStateProvider → EntityStorageProvider → PlayerUIProvider
4. **Use updateEntity()** - It maintains spatial index consistency
5. **Compute, don't store** - Derive data rather than storing derived state
6. **Check optional fields** - Use optional chaining for entity attributes
7. **Type safety** - Match entity types to method parameters
8. **Memoize expensive ops** - Use `useMemo` for computed values
9. **Context methods only** - Don't bypass context for state updates

Following these rules will help you avoid the most common pitfalls and maintain code quality.

See `docs/IMPLEMENTING-FEATURES.md` for implementation patterns and `docs/STATE-MANAGEMENT.md` for state management details.

