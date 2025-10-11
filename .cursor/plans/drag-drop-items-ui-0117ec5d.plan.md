<!-- 0117ec5d-dfc7-42a9-b294-c505225f9882 0f93716e-1bfb-4f03-8d33-8e7d329bbb07 -->
# Unified GeneratableEntity System with Spatial Data

## Overview

Create consistent base structure where ALL game entities (Items, NPCs, Locations) share common properties and spatial awareness, enabling LLM to understand and manipulate the game world semantically.

## Core Data Structures

### GeneratableEntity (Base)

All entities share these required fields:

```typescript
interface GeneratableEntity {
  id: string            // Semantic ID: itemtype_001, npc_role_001, loc_name_001
  name: string          // Display name
  rarity: Rarity        // common | rare | epic | legendary
  image_url: string     // For Google ImageGen integration
  description: string   // Text description
  x: number            // X coordinate within region (unbounded)
  y: number            // Y coordinate within region (unbounded)  
  region: string       // Region ID where entity exists
  properties?: Record<string, any>  // Optional flexible data
}
```

### Item (extends GeneratableEntity)

```typescript
interface Item extends GeneratableEntity {
  category?: string  // weapon, armor, food, etc.
}
```

### NPC (extends GeneratableEntity)

```typescript
interface NPC extends GeneratableEntity {
  chatHistory: ChatMessage[]  // Required: conversation history
  role?: string  // merchant, guard, etc.
}

interface ChatMessage {
  id: string
  type: 'player' | 'npc'
  text: string
  timestamp: number
}
```

### Location (extends GeneratableEntity)

```typescript
interface Location extends GeneratableEntity {
  type?: string  // town, dungeon, building, etc.
}
```

### Region (Standalone - World Map Grid)

```typescript
interface Region {
  id: string         // medieval_kingdom_001, new_york_001
  name: string       // Medieval Kingdom, New York
  regionX: number    // Position in world map
  regionY: number    // Position in world map
  properties?: Record<string, any>  // biome, climate, etc.
}
```

**Region Grid:** Unbounded - locations can be at any (x,y) coordinates within a region

**World Map Example:**

```
new_york_001 (0,0) ----- new_jersey_001 (1,0)
      |                         |
connecticut_001 (0,1) ---- pennsylvania_001 (1,1)
      |
medieval_kingdom_001 (0,2)
```

## Implementation Steps

### 1. Create Type System

**1.1 Create types/base.types.ts**

- Define `GeneratableEntity` interface
- Define `ChatMessage` interface

**1.2 Update types/item.types.ts**

- Extend GeneratableEntity
- Add optional `category`
- Move `Rarity` to base.types.ts

**1.3 Update types/npc.types.ts**

- Extend GeneratableEntity
- Add required `chatHistory: ChatMessage[]`
- Add optional `role`

**1.4 Create types/location.types.ts**

- Extend GeneratableEntity
- Add optional `type`

**1.5 Create types/region.types.ts**

- Define Region interface (standalone, not extending GeneratableEntity)
- id, name, regionX, regionY, properties

**1.6 Update types/index.ts**

- Export all types centrally

### 2. Create Region Data

**2.1 Create data/regions.data.ts**

- Define initial regions with world map coordinates
```typescript
export const GAME_REGIONS: Region[] = [
  {
    id: 'medieval_kingdom_001',
    name: 'Medieval Kingdom',
    regionX: 0,
    regionY: 0,
    properties: {
      theme: 'medieval',
      biome: 'temperate'
    }
  }
]
```


**2.2 Create constants/regions.constants.ts**

- Region ID constants for easy reference
- Special region IDs (inventory, equipment)
```typescript
export const SPECIAL_REGIONS = {
  INVENTORY: 'inventory',
  EQUIPMENT: 'equipment',
}
```


### 3. Update Entity Data

**3.1 Update data/items.data.ts**

- Add to ALL items: image_url, description, x, y, region
- Inventory items: region='inventory', x=0, y=0
- World items: actual coordinates in medieval_kingdom_001
- Add category and properties
```typescript
{
  id: 'sword_001',
  name: 'Sword',
  rarity: 'common',
  image_url: '',
  description: 'A basic iron sword',
  x: 0,
  y: 0,
  region: 'inventory',
  category: 'weapon',
  properties: {
    damage: 10,
    equipSlot: 'leftHand'
  }
},
{
  id: 'key_001',
  name: 'Old Key',
  rarity: 'rare',
  image_url: '',
  description: 'An old rusty key',
  x: 5,
  y: 3,
  region: 'medieval_kingdom_001',
  properties: {}
}
```


**3.2 Update data/npcs.data.ts**

- Add: image_url, description, x, y, region, chatHistory
- Place at coordinates in medieval_kingdom_001
```typescript
{
  id: 'npc_guard_001',
  name: 'Castle Guard',
  rarity: 'common',
  image_url: '',
  description: 'A stern guard in chainmail armor',
  x: 5,
  y: 3,
  region: 'medieval_kingdom_001',
  chatHistory: [],
  role: 'guard',
  properties: {
    hostile: false
  }
}
```


**3.3 Create data/locations.data.ts**

- Define starting location and nearby areas
```typescript
{
  id: 'loc_castle_entrance_001',
  name: 'Castle Entrance',
  rarity: 'rare',
  image_url: '',
  description: 'Main gates of an ancient castle',
  x: 5,
  y: 3,
  region: 'medieval_kingdom_001',
  type: 'building',
  properties: {
    emoji: '🏰'
  }
}
```


**3.4 Update data/index.ts**

- Export regions and locations

### 4. Update GameContext

**4.1 Add Spatial State**

- `currentLocation: Location` - Player's current location
- `currentRegion: Region` - Player's current region
- `allLocations: Location[]` - All locations in game
- `allRegions: Region[]` - All regions in world map

**4.2 Add Location Functions**

- `moveToLocation(location: Location)`
- `getEntitiesAt(x: number, y: number, region: string)` - Get items/NPCs at coords
- `addChatMessage(npcId: string, message: ChatMessage)` - Add to NPC chatHistory

**4.3 Filter Interactables by Location**

- `interactableItems` - only items at current location coords
- `npcs` - only NPCs at current location coords

### 5. Update Components

**5.1 Update components/game/GameDisplay.tsx**

- Display currentLocation.emoji or image when not talking to NPC
- Show location name

**5.2 Update components/game/DescriptionBox.tsx**

- Show currentLocation.description by default
- Show activeNPC.description when talking to NPC

**5.3 Update components/inventory/Interactables.tsx**

- Filter NPCs by currentLocation (same x, y, region)
- Filter items by currentLocation
- Only show entities at player's position

**5.4 Update components/game/ChatInput.tsx**

- When talking to NPC: save messages to that NPC's chatHistory
- Load NPC's chatHistory when starting conversation

### 6. Migration Notes

**Special Regions:**

- `inventory` - for items in player inventory (x=0, y=0)
- `equipment` - for equipped items (x=slot_index, y=0)
- World regions - actual game world coordinates

**Coordinate System:**

- Within region: unbounded integers (can be negative)
- Between regions: regionX, regionY on world map grid

## Example Complete Entity

```typescript
// A legendary sword in the player's inventory
{
  id: 'sword_legendary_001',
  name: 'Excalibur',
  rarity: 'legendary',
  image_url: 'https://generated-image-url.com/excalibur.png',
  description: 'The legendary sword of King Arthur, glowing with ancient power',
  x: 0,
  y: 0,
  region: 'inventory',
  category: 'weapon',
  properties: {
    damage: 100,
    magicDamage: 50,
    durability: 999,
    equipSlot: 'leftHand',
    special: 'Light Beam Attack'
  }
}
```

## LLM Context Example

When LLM needs to understand game state:

```
Player at: Castle Entrance (5,3) in medieval_kingdom_001
Entities here:
- NPC: Castle Guard (5,3) - chatHistory: 3 messages
- Item: Old Key (5,3) - can be taken
- Item: Health Potion (5,3) - can be taken

Player inventory (region=inventory):
- Sword (0,0)
- Shield (0,0)
```

Clear, semantic, queryable! Perfect for LLM integration.

### To-dos

- [x] Create GeneratableEntity and ChatMessage in types/base.types.ts
- [x] Create Region type in types/region.types.ts
- [x] Update Item to extend GeneratableEntity
- [x] Update NPC to extend GeneratableEntity with chatHistory
- [x] Create Location type extending GeneratableEntity
- [x] Create regions.data.ts with world map regions
- [x] Add spatial fields to all items data
- [x] Add spatial fields and chatHistory to all NPCs
- [x] Create locations.data.ts with initial locations
- [x] Add location state and spatial functions to GameContext
- [x] Update components to use location filtering and display
- [x] Test all spatial features and entity positioning