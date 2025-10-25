# Game Data Structure Explanation

## Overview

This document explains how the main components of the game are stored and structured, using the Marco Polo example to illustrate the complete data flow.

## 1. GameRules Structure

The `GameRules` interface defines the core game configuration with **separate category arrays** for each entity type:

```typescript
interface GameRules {
  artStyle: string                    // "13th century manuscript illumination style"
  genre: string                      // "historical exploration and trading RPG"
  historicalPeriod: string           // "1271-1295 CE - Late Medieval Period, Yuan Dynasty China"
  itemCategories: CategoryDefinition[]     // Categories for items
  npcCategories: CategoryDefinition[]      // Categories for NPCs
  locationCategories: CategoryDefinition[] // Categories for locations
}

interface CategoryDefinition {
  name: string                       // "trade_good", "merchant", "city"
  attributes: AttributeDefinition[]  // Array of attributes for this category
}

interface AttributeDefinition {
  name: string                       // "value", "wealth", "population"
  type: 'integer' | 'number' | 'string' | 'boolean' | 'array'
  description: string                // "Trading value in gold"
  reference: string                  // "10=common goods, 50=valuable, 100=rare luxury"
  range?: { min: number, max: number }
}
```

### Example: Marco Polo GameRules

```json
{
  "artStyle": "13th century manuscript illumination style",
  "genre": "historical exploration and trading RPG",
  "historicalPeriod": "1271-1295 CE - Late Medieval Period, Yuan Dynasty China",
  "itemCategories": [
    {
      "name": "common",
      "attributes": [
        {
          "name": "durability",
          "type": "integer",
          "description": "Item condition",
          "reference": "0=broken, 50=worn, 100=pristine"
        },
        {
          "name": "weight",
          "type": "integer",
          "description": "Weight in pounds",
          "reference": "1=very light, 10=heavy, 50=very heavy"
        }
      ]
    },
    {
      "name": "trade_good",
      "attributes": [
        {
          "name": "value",
          "type": "integer",
          "description": "Trading value in gold",
          "reference": "10=common goods, 50=valuable, 100=rare luxury"
        },
        {
          "name": "origin",
          "type": "string",
          "description": "Where this good comes from",
          "reference": "Venice, Persia, China, India, etc."
        },
        {
          "name": "demand",
          "type": "integer",
          "description": "Market demand level",
          "reference": "10=low demand, 50=moderate, 100=highly sought"
        }
      ]
    }
  ],
  "npcCategories": [
    {
      "name": "common",
      "attributes": [
        {
          "name": "trust",
          "type": "integer",
          "description": "How much this person trusts the player",
          "reference": "10=hostile, 50=neutral, 100=completely trusting"
        },
        {
          "name": "disposition",
          "type": "integer",
          "description": "General attitude toward the player",
          "reference": "10=hostile, 50=neutral, 100=friendly"
        }
      ]
    },
    {
      "name": "merchant",
      "attributes": [
        {
          "name": "wealth",
          "type": "integer",
          "description": "Economic status",
          "reference": "10=poor trader, 50=successful merchant, 100=wealthy magnate"
        },
        {
          "name": "trading_expertise",
          "type": "integer",
          "description": "Skill in trading",
          "reference": "20=novice, 50=experienced, 80=master trader"
        }
      ]
    }
  ],
  "locationCategories": [
    {
      "name": "common",
      "attributes": [
        {
          "name": "danger_level",
          "type": "integer",
          "description": "How dangerous this place is",
          "reference": "10=safe, 50=risky, 100=extremely dangerous"
        },
        {
          "name": "accessibility",
          "type": "integer",
          "description": "How easy to reach",
          "reference": "10=remote, 50=off main path, 100=on major route"
        }
      ]
    },
    {
      "name": "city",
      "attributes": [
        {
          "name": "population",
          "type": "integer",
          "description": "Number of inhabitants",
          "reference": "100=hamlet, 5000=town, 50000=city, 500000=metropolis"
        },
        {
          "name": "trade_importance",
          "type": "integer",
          "description": "Significance for trade",
          "reference": "10=isolated, 50=regional hub, 100=major trade center"
        }
      ]
    }
  ]
}
```

## 2. Entity Structure

Each entity (Item, NPC, Location) follows a consistent structure with **dynamic attributes** based on their category:

### Item Structure

```typescript
interface Item {
  id: string                    // "ite_papal_letter_doc_001"
  name: string                  // "Papal Letter of Introduction"
  description: string           // "Official letter from Pope Gregory X..."
  category: string              // "document" (from itemCategories)
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  image: string                 // Base64 encoded image
  region: string                // "Venice"
  x: number                     // 0
  y: number                     // 0
  own_attributes: Record<string, any>  // Dynamic attributes based on category
}
```

### Example: Marco Polo Items

```json
{
  "id": "ite_papal_letter_doc_001",
  "name": "Papal Letter of Introduction",
  "description": "Official letter from Pope Gregory X to Kublai Khan, sealed with the papal seal",
  "category": "document",
  "rarity": "legendary",
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "region": "Venice",
  "x": 0,
  "y": 0,
  "own_attributes": {
    "authenticity": 100,
    "issuing_authority": "Pope Gregory X",
    "durability": 95,
    "weight": 1
  }
}
```

### NPC Structure

```typescript
interface NPC {
  id: string                    // "npc_kublai_khan_nob_001"
  name: string                  // "Kublai Khan"
  description: string           // "Legendary Mongol Emperor..."
  category: string              // "noble" (from npcCategories)
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  image: string                 // Base64 encoded portrait
  region: string                // "Yuan Dynasty China"
  x: number                     // 100
  y: number                     // 50
  own_attributes: Record<string, any>  // Dynamic attributes based on category
}
```

### Example: Marco Polo NPCs

```json
{
  "id": "npc_kublai_khan_nob_001",
  "name": "Kublai Khan",
  "description": "Legendary Mongol Emperor and founder of the Yuan Dynasty, grandson of Genghis Khan",
  "category": "noble",
  "rarity": "legendary",
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "region": "Yuan Dynasty China",
  "x": 100,
  "y": 50,
  "own_attributes": {
    "political_power": 100,
    "diplomatic_skill": 95,
    "trust": 20,
    "disposition": 30
  }
}
```

### Location Structure

```typescript
interface Location {
  id: string                    // "loc_xanadu_cit_001"
  name: string                  // "Xanadu (Shangdu)"
  description: string           // "Kublai Khan's summer palace..."
  category: string              // "city" (from locationCategories)
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  image: string                 // Base64 encoded image
  region: string                // "Yuan Dynasty China"
  x: number                     // 100
  y: number                     // 50
  own_attributes: Record<string, any>  // Dynamic attributes based on category
}
```

### Example: Marco Polo Locations

```json
{
  "id": "loc_xanadu_cit_001",
  "name": "Xanadu (Shangdu)",
  "description": "Kublai Khan's summer palace, a magnificent complex with gardens and hunting grounds",
  "category": "city",
  "rarity": "legendary",
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "region": "Yuan Dynasty China",
  "x": 100,
  "y": 50,
  "own_attributes": {
    "population": 100000,
    "trade_importance": 100,
    "danger_level": 20,
    "accessibility": 80
  }
}
```

## 3. GameConfiguration Structure

The orchestrator outputs a complete game configuration:

```typescript
interface GameConfiguration {
  scratchpad: string                    // 500-800 word game design document
  gameRules: GameRules                  // Categories and attributes
  entitiesToGenerate: {
    regions: RegionSpec[]              // What regions to create
    locations: LocationSpec[]          // What locations to create
    npcs: NpcSpec[]                    // What NPCs to create
    items: ItemSpec[]                  // What items to create
  }
}
```

### Example: Marco Polo GameConfiguration

```json
{
  "scratchpad": "GAME: Marco Polo's Journey to the East (1271-1295 CE)\n\nHISTORICAL PERIOD: 1271-1295 CE - Late Medieval Period, Yuan Dynasty China\nThis game takes place during the height of the Mongol Empire under Kublai Khan...\n\n[500-800 words of detailed game design]",
  "gameRules": {
    // ... GameRules as shown above
  },
  "entitiesToGenerate": {
    "regions": [
      {
        "name": "Venice",
        "theme": "medieval_italian_city_state",
        "biome": "coastal_mediterranean",
        "description": "Wealthy trading republic in northern Italy",
        "regionX": 0,
        "regionY": 0
      },
      {
        "name": "Persian Empire",
        "theme": "islamic_golden_age",
        "biome": "arid_desert",
        "description": "Vast empire controlling key Silk Road routes",
        "regionX": 1,
        "regionY": 0
      },
      {
        "name": "Yuan Dynasty China",
        "theme": "mongol_empire",
        "biome": "temperate_steppe",
        "description": "Kublai Khan's empire, the largest in history",
        "regionX": 2,
        "regionY": 0
      }
    ],
    "locations": [
      {
        "prompt": "The Polo family merchant house in Venice, a grand building near the Rialto Bridge",
        "region": "Venice",
        "x": 0,
        "y": 0,
        "significance": "Starting location where the journey begins"
      },
      {
        "prompt": "Kublai Khan's summer palace in Xanadu, a magnificent complex with gardens",
        "region": "Yuan Dynasty China",
        "x": 100,
        "y": 50,
        "significance": "Final destination where Marco will meet the Great Khan"
      }
    ],
    "npcs": [
      {
        "prompt": "Kublai Khan, the legendary Mongol Emperor and founder of the Yuan Dynasty",
        "locationRef": "Xanadu",
        "significance": "Main quest giver, the most powerful ruler of the time"
      },
      {
        "prompt": "Niccolo Polo, Marco's father, an experienced Venetian merchant",
        "locationRef": "Venice",
        "significance": "Mentor and starting companion who guides Marco"
      }
    ],
    "items": [
      {
        "prompt": "Papal letter of introduction from Pope Gregory X to Kublai Khan",
        "locationRef": "starting_inventory",
        "significance": "Quest item that grants audience with the Emperor"
      },
      {
        "prompt": "Venetian glass beads and silk fabrics, valuable trade goods",
        "locationRef": "starting_inventory",
        "significance": "Starting trade currency for economic gameplay"
      }
    ]
  }
}
```

## 4. Complete Data Flow Example

### Step 1: Orchestrator Generates GameRules

The Gemini 2.5 Pro orchestrator analyzes the Marco Polo prompt and generates:

```typescript
gameRules = {
  itemCategories: [
    { name: "common", attributes: [...] },
    { name: "trade_good", attributes: [...] },
    { name: "document", attributes: [...] }
  ],
  npcCategories: [
    { name: "common", attributes: [...] },
    { name: "merchant", attributes: [...] },
    { name: "noble", attributes: [...] }
  ],
  locationCategories: [
    { name: "common", attributes: [...] },
    { name: "city", attributes: [...] },
    { name: "landmark", attributes: [...] }
  ]
}
```

### Step 2: Entity Generation Uses Categories

When generating a location:

1. **Location prompt**: "Kublai Khan's summer palace in Xanadu"
2. **Category selection**: LLM chooses "city" from `locationCategories`
3. **Attribute generation**: LLM generates values for city attributes:
   - `population: 100000` (from city category)
   - `trade_importance: 100` (from city category)
   - `danger_level: 20` (from common category)
   - `accessibility: 80` (from common category)

### Step 3: Dynamic Attribute Addition

If the LLM creates a new attribute not in the library:

```typescript
// New attribute discovered: "cultural_significance"
addNewAttributesToLibrary({
  "cultural_significance": {
    name: "cultural_significance",
    type: "integer",
    description: "Historical and cultural importance",
    reference: "20=local interest, 50=regional, 100=world-famous",
    category: "city"
  }
}, gameRules)

// This adds the attribute to the "city" category in locationCategories
```

### Step 4: Final Entity Structure

The generated location becomes:

```json
{
  "id": "loc_xanadu_cit_001",
  "name": "Xanadu (Shangdu)",
  "category": "city",
  "own_attributes": {
    "population": 100000,           // From city category
    "trade_importance": 100,        // From city category
    "danger_level": 20,             // From common category
    "accessibility": 80,            // From common category
    "cultural_significance": 100    // Newly added attribute
  }
}
```

## 5. Key Benefits of This Structure

### ✅ **Separation of Concerns**
- Items, NPCs, and locations each have their own category systems
- No confusion between different entity types
- Clear attribute inheritance

### ✅ **Dynamic Learning**
- New attributes are automatically added to the appropriate category
- System becomes more sophisticated over time
- No hardcoded limitations

### ✅ **Type Safety**
- TypeScript interfaces ensure data consistency
- Compile-time error checking
- Clear data contracts

### ✅ **Flexibility**
- Categories can be completely different for different games
- Historical accuracy through period-appropriate attributes
- Genre-specific mechanics through custom attributes

### ✅ **Scalability**
- Easy to add new entity types
- Simple to extend with new attributes
- Clean separation allows independent evolution

## 6. Storage Format

All data is stored in **TypeScript interfaces** and **JSON format**:

- **Development**: TypeScript interfaces for type safety
- **Runtime**: JSON objects for API communication
- **Persistence**: JSON files for seed data
- **Display**: Formatted text in dashboard

This structure provides a robust, flexible, and maintainable foundation for the game's data management system.
