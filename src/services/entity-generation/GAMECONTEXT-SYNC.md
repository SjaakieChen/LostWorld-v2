# GameContext Synchronization Guide

## Overview

This document ensures that the test interface (`test.html` and `test.ts`) stays synchronized with the `GameContext` type definition in `types.ts`.

**Important:** When you modify the `GameContext` interface, you **MUST** update the test interface to match!

## File Dependencies

```
types.ts (GameContext definition)
    ↓ MUST SYNC TO ↓
test.html (SHARED form input fields - shown ONCE)
    ↓ MUST SYNC TO ↓
test.ts (buildGameContextFromForm function - NO entity prefix)
```

## Important: SHARED GameContext Design

**The GameContext is now SHARED for all three entity types!**

- GameContext sections appear **ONCE** at the top of test.html
- All three entity types (Item, NPC, Location) use the **SAME** GameContext
- Input IDs have **NO** entity type prefix (e.g., `spatial_location_name`, not `item_spatial_location_name`)
- Only GameRules are entity-specific (item_rules_*, npc_rules_*, location_rules_*)

## How to Keep Them Synchronized

### When Adding a New Field to GameContext

**Example:** Adding a new `reputation` field to the `relationships` section

#### Step 1: Update `types.ts`

```typescript
relationships?: {
  npcRelationships: Record<string, NPCRelationship>
  reputation?: {
    faction?: string
    level: number  // -100 to 100
  }
  // NEW FIELD ADDED BELOW
  karma?: number  // ← NEW!
}
```

#### Step 2: Update `test.html` (ONCE - shared section)

Add form input in the appropriate `<details>` section (shown ONCE in the shared GameContext):

```html
<!-- Relationships Context -->
<details class="context-section">
    <summary>🤝 Relationships Context</summary>
    <div class="form-section">
        <!-- Existing fields... -->
        
        <!-- NEW FIELD -->
        <div class="input-field">
            <label>Karma</label>
            <input type="number" id="relationships_karma" value="0">
            <span class="type-hint">Type: number</span>
        </div>
    </div>
</details>
```

**Important:** Add the field ONCE (not three times) since GameContext is shared!

#### Step 3: Update `test.ts` - `buildGameContextFromForm()` function

Add code to collect the new field:

```typescript
function buildGameContextFromForm(): GameContext {  // No entityType parameter!
  const context: GameContext = {}
  
  // ... existing code ...
  
  // Relationships Context
  const karma = document.getElementById('relationships_karma')  // No prefix!
  if (karma) {
    context.relationships = {
      ...context.relationships,  // preserve other relationship fields
      karma: getNumberValue('relationships_karma'),
    }
  }
  
  return context
}
```

## Field Type to Input Type Mapping

Use this reference to determine the correct HTML input type and helper function:

| TypeScript Type | HTML Input | Helper Function | Type Hint Example |
|----------------|------------|-----------------|-------------------|
| `string` | `<input type="text">` | `getInputValue()` | `Type: string` |
| `number` | `<input type="number">` | `getNumberValue()` | `Type: number` |
| `boolean` | `<select><option>true/false</option></select>` | `getBooleanValue()` | `Type: boolean` |
| `'a' \| 'b' \| 'c'` (Union) | `<select><option>a/b/c</option></select>` | `getInputValue()` as any | `Type: 'a' \| 'b' \| 'c'` |
| `string[]` | `<textarea>` (comma-separated) | Parse manually | `Type: string[]` |
| Complex object | `<textarea>` (JSON) | `JSON.parse()` | `Type: Record<...>` |

## Naming Convention

**GameContext input IDs** (SHARED - no entity prefix):

```
{section}_{field}

Examples:
- spatial_location_name
- player_strength
- world_timeOfDay
- meta_generationPurpose
```

**GameRules input IDs** (ENTITY-SPECIFIC):

```
{entityType}_rules_{field}

Examples:
- item_rules_artStyle
- npc_rules_historicalPeriod
- location_rules_categories
```

Where:
- `section` = GameContext section name ('spatial', 'player', 'world', etc.)
- `field` = The specific field name
- `entityType` = 'item' | 'npc' | 'location' (only for GameRules)

## Type Hint Format

Every input field MUST have a type hint showing the TypeScript type:

```html
<span class="type-hint">Type: {typescript_type}</span>
```

Examples:
- `Type: string`
- `Type: number`
- `Type: 'common' | 'rare' | 'epic' | 'legendary'`
- `Type: Record<string, {attributes: Record<string, AttributeMetadata>}>`

## Checklist When Modifying GameContext

- [ ] Updated `types.ts` - GameContext interface
- [ ] Updated `test.html` - Added input field ONCE in the shared GameContext section
- [ ] Updated `test.ts` - Modified `buildGameContextFromForm()` function (use ID without entity prefix)
- [ ] Added type hint to new input field
- [ ] Tested in browser to verify:
  - [ ] Form input appears correctly in shared section
  - [ ] Value is collected properly by buildGameContextFromForm()
  - [ ] ALL THREE entity types work with the new context field
  - [ ] Console logs show correct GameContext structure

## Quick Reference: GameContext Structure

```typescript
GameContext {
  spatial?: {
    currentLocation: LocationSummary
    currentRegion: RegionSummary
    adjacentRegions?: {...}
    nearbyLocations?: [...]
  }
  entities?: {
    nearbyNPCs?: [...]
    nearbyItems?: [...]
    activeNPC?: {...}
  }
  player?: {
    level?: number
    stats: PlayerStats
    status: PlayerStatus
    conditions?: string[]
  }
  inventory?: {...}
  equipment?: {...}
  world?: {
    timeOfDay: 'dawn' | 'morning' | 'afternoon' | 'dusk' | 'night' | 'midnight'
    season: 'spring' | 'summer' | 'fall' | 'winter'
    weather: 'clear' | 'rain' | 'storm' | 'snow' | 'fog'
  }
  narrative?: {...}
  exploration?: {...}
  relationships?: {...}
  combat?: {
    dangerLevel: 'safe' | 'low' | 'moderate' | 'high' | 'extreme'
    recentCombat: boolean
    enemiesNearby: number
    playerCombatStyle?: 'aggressive' | 'defensive' | 'stealthy' | 'magical'
  }
  economy?: {
    playerWealth: number
    localProsperity: 'poor' | 'modest' | 'prosperous' | 'wealthy'
    commonGoods?: string[]
    rareGoods?: string[]
  }
  meta?: {
    generationPurpose?: 'quest_reward' | 'random_encounter' | 'shop_inventory' | 'dungeon_loot' | 'world_building'
    expectedRarityRange?: Rarity[]
    preferredThemes?: string[]
    avoidThemes?: string[]
    targetEntityCategory?: string
  }
}
```

## Current Test Interface Coverage

### ✅ All 12 Sections Fully Implemented

1. **Spatial Context** - Location (8 fields) + Region (7 fields)
2. **Entities Context** - nearbyNPCs, nearbyItems, activeNPC (4 fields)
3. **Player Context** - Stats (6 fields) + Status (8 fields)
4. **Inventory Context** - totalItems, emptySlots, rarityDistribution, categories, notableItems
5. **Equipment Context** - equippedSlots, totalDefense, totalAttack, notableEquipment
6. **World Context** - timeOfDay, season, weather
7. **Narrative Context** - activeQuests, completedQuests, recentEvents, playerActions
8. **Exploration Context** - totalLocationsExplored, regionsVisited, unexploredNearby, isFirstVisit
9. **Relationships Context** - npcRelationships, reputation (faction + level)
10. **Combat Context** - dangerLevel, recentCombat, enemiesNearby, playerCombatStyle
11. **Economy Context** - playerWealth, localProsperity, commonGoods, rareGoods
12. **Meta Context** - generationPurpose, preferredThemes, avoidThemes, targetEntityCategory

**All sections are shown ONCE** in the shared GameContext area and used by all three entity types!

## Maintenance Tips

1. **Use Consistent IDs:** Always follow the naming convention
2. **Add Type Hints:** Never skip the type hint - it's documentation
3. **Test All Three:** When adding a field, test with item, npc, AND location generation
4. **Update Together:** Don't update `types.ts` without updating the test interface
5. **Check Console:** Use `console.log` to verify the built GameContext structure

## Example: Full Implementation Flow

See the `spatial` context implementation in test.html for a complete example of:
- Proper HTML structure with labels
- Type hints for each field
- Two-column grid layout for related fields
- Collapsible details section
- Corresponding collection code in test.ts

---

**Last Updated:** When GameContext was redesigned with comprehensive structure
**Maintainer:** Update this document when making changes to GameContext

