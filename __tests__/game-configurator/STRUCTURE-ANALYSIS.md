# GameRules Structure Analysis

## Current Structure Verification

### ✅ GameRules Interface (Correct)

**Location**: `src/services/entity-generation/types.ts`

```typescript
export interface GameRules {
  artStyle: string
  genre: string
  historicalPeriod: string
  categories: {
    [categoryName: string]: {
      attributes: Record<string, AttributeMetadata>
    }
  }
}

export interface AttributeMetadata {
  type: 'integer' | 'number' | 'string' | 'boolean' | 'array'
  description: string
  reference: string
  range?: {
    min: number
    max: number
  }
}
```

### ✅ Orchestrator Schema (Matches Interface)

**Location**: `src/services/game-orchestrator/configurator.ts`

The JSON schema in the orchestrator correctly matches the TypeScript interface:

```json
{
  "gameRules": {
    "type": "object",
    "properties": {
      "historicalPeriod": { "type": "string" },
      "genre": { "type": "string" },
      "artStyle": { "type": "string" },
      "categories": {
        "type": "object",
        "additionalProperties": {
          "type": "object",
          "properties": {
            "attributes": {
              "type": "object",
              "additionalProperties": {
                "type": "object",
                "properties": {
                  "type": { "type": "string" },
                  "description": { "type": "string" },
                  "reference": { "type": "string" }
                },
                "required": ["type", "description", "reference"]
              }
            }
          }
        }
      }
    },
    "required": ["historicalPeriod", "genre", "artStyle", "categories"]
  }
}
```

### ✅ Entity Generation Functions (Use GameRules Correctly)

All three entity generation functions now use dynamic categories:

**item-generation.ts, npc-generation.ts, location-generation.ts**:
```typescript
const dynamicCategories = Object.keys(gameRules.categories).filter(cat => cat !== 'common')
const categoryEnum = dynamicCategories.length > 0 ? dynamicCategories : FALLBACK_CATEGORIES
```

## Expected Output Structure

### Example: Marco Polo Game

```json
{
  "scratchpad": "GAME: Marco Polo's Journey to the East (1271-1295 CE)\n\n[500-800 words of detailed game design]...",
  
  "gameRules": {
    "historicalPeriod": "1271-1295 CE - Late Medieval Period, Yuan Dynasty China",
    "genre": "historical exploration and trading RPG",
    "artStyle": "13th century manuscript illumination style",
    "categories": {
      "common": {
        "attributes": {
          "durability": {
            "type": "integer",
            "description": "Item condition",
            "reference": "0=broken, 50=worn, 100=pristine"
          },
          "weight": {
            "type": "integer",
            "description": "Weight in pounds",
            "reference": "1=very light, 10=heavy, 50=very heavy"
          }
        }
      },
      "trade_good": {
        "attributes": {
          "value": {
            "type": "integer",
            "description": "Trading value in gold",
            "reference": "10=common goods, 50=valuable, 100=rare luxury"
          },
          "origin": {
            "type": "string",
            "description": "Where this good comes from",
            "reference": "Venice, Persia, China, India, etc."
          },
          "demand": {
            "type": "integer",
            "description": "Market demand level",
            "reference": "10=low demand, 50=moderate, 100=highly sought"
          }
        }
      },
      "document": {
        "attributes": {
          "authenticity": {
            "type": "integer",
            "description": "How official/trusted",
            "reference": "20=forged, 50=merchant letter, 100=papal decree"
          },
          "issuing_authority": {
            "type": "string",
            "description": "Who issued this document",
            "reference": "Pope, Emperor, King, Merchant Guild, etc."
          }
        }
      },
      "merchant": {
        "attributes": {
          "wealth": {
            "type": "integer",
            "description": "Economic status",
            "reference": "10=poor trader, 50=successful merchant, 100=wealthy magnate"
          },
          "trading_expertise": {
            "type": "integer",
            "description": "Skill in trading",
            "reference": "20=novice, 50=experienced, 80=master trader"
          },
          "trustworthiness": {
            "type": "integer",
            "description": "Reputation for honesty",
            "reference": "10=known cheat, 50=average, 100=completely trustworthy"
          }
        }
      },
      "noble": {
        "attributes": {
          "political_power": {
            "type": "integer",
            "description": "Influence in politics",
            "reference": "20=minor noble, 50=baron, 80=duke, 100=emperor"
          },
          "diplomatic_skill": {
            "type": "integer",
            "description": "Ability in diplomacy",
            "reference": "20=blunt, 50=competent, 100=master diplomat"
          }
        }
      },
      "city": {
        "attributes": {
          "population": {
            "type": "integer",
            "description": "Number of inhabitants",
            "reference": "100=hamlet, 5000=town, 50000=city, 500000=metropolis"
          },
          "trade_importance": {
            "type": "integer",
            "description": "Significance for trade",
            "reference": "10=isolated, 50=regional hub, 100=major trade center"
          },
          "cultural_significance": {
            "type": "integer",
            "description": "Historical/cultural importance",
            "reference": "20=ordinary, 50=notable, 100=legendary"
          }
        }
      },
      "landmark": {
        "attributes": {
          "historical_importance": {
            "type": "integer",
            "description": "Historical significance",
            "reference": "20=local interest, 50=regional, 100=world-famous"
          },
          "accessibility": {
            "type": "integer",
            "description": "How easy to reach",
            "reference": "10=remote, 50=off main path, 100=on major route"
          }
        }
      }
    }
  },
  
  "entitiesToGenerate": {
    "regions": [
      {
        "name": "Venice",
        "theme": "medieval_italian_city_state",
        "biome": "coastal_mediterranean",
        "description": "Wealthy trading republic in northern Italy, gateway to the East",
        "regionX": 0,
        "regionY": 0
      },
      {
        "name": "Persian Empire",
        "theme": "islamic_golden_age",
        "biome": "arid_desert",
        "description": "Vast empire controlling key Silk Road routes through Persia",
        "regionX": 1,
        "regionY": 0
      },
      {
        "name": "Yuan Dynasty China",
        "theme": "mongol_empire",
        "biome": "temperate_steppe",
        "description": "Kublai Khan's empire, the largest contiguous empire in history",
        "regionX": 2,
        "regionY": 0
      }
    ],
    "locations": [
      {
        "prompt": "The Polo family merchant house in Venice, a grand building near the Rialto Bridge where Marco grew up",
        "region": "Venice",
        "x": 0,
        "y": 0,
        "significance": "Starting location where the journey begins"
      },
      {
        "prompt": "Kublai Khan's summer palace in Xanadu (Shangdu), a magnificent complex with gardens and hunting grounds",
        "region": "Yuan Dynasty China",
        "x": 100,
        "y": 50,
        "significance": "Final destination where Marco will meet the Great Khan"
      }
    ],
    "npcs": [
      {
        "prompt": "Kublai Khan, the legendary Mongol Emperor and founder of the Yuan Dynasty, grandson of Genghis Khan, known for his wisdom and patronage of arts",
        "locationRef": "Xanadu",
        "significance": "Main quest giver, the most powerful ruler of the time"
      },
      {
        "prompt": "Niccolo Polo, Marco's father, an experienced Venetian merchant who has already traveled to China once before",
        "locationRef": "Venice",
        "significance": "Mentor and starting companion who guides Marco"
      }
    ],
    "items": [
      {
        "prompt": "Papal letter of introduction from Pope Gregory X to Kublai Khan, sealed with the papal seal",
        "locationRef": "starting_inventory",
        "significance": "Quest item that grants audience with the Emperor"
      },
      {
        "prompt": "Venetian glass beads and silk fabrics, valuable trade goods from Venice",
        "locationRef": "starting_inventory",
        "significance": "Starting trade currency for economic gameplay"
      }
    ]
  }
}
```

## Category Structure Breakdown

### How Categories Work

1. **"common" category**: Contains universal attributes shared by all entities of that type
   - Items: durability, weight
   - NPCs: trust, disposition
   - Locations: danger_level, accessibility

2. **Specific categories**: Genre and period-appropriate categories
   - Each has 2-3 unique attributes
   - Attributes have clear reference scales
   - Support specific game mechanics

3. **Dynamic generation**: Categories are generated by the LLM, not hardcoded
   - Adapts to any genre (medieval, sci-fi, fantasy, etc.)
   - Historically appropriate for the time period
   - Supports the core gameplay loops

### How Entity Generation Uses Categories

When generating an entity:

1. **Extract dynamic categories**:
```typescript
const dynamicCategories = Object.keys(gameRules.categories).filter(cat => cat !== 'common')
```

2. **Use for schema enum**:
```typescript
const categoryEnum = dynamicCategories.length > 0 ? dynamicCategories : FALLBACK_CATEGORIES
```

3. **LLM selects appropriate category**:
   - For items: "trade_good", "document", "tool", etc.
   - For NPCs: "merchant", "noble", "guard", etc.
   - For locations: "city", "landmark", "building", etc.

4. **Attributes are generated**:
   - Common attributes (from "common" category)
   - Category-specific attributes (from selected category)
   - New attributes if needed (added to library)

## Environment Variables

### Current Setup

**File**: `src/config/gemini.config.ts`
```typescript
export const getApiKey = (): string => {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  if (!key) {
    throw new Error('VITE_GEMINI_API_KEY not found in environment variables')
  }
  return key
}
```

### Required .env File

Create `.env` in project root:
```
VITE_GEMINI_API_KEY=your_actual_api_key_here
```

### For Dashboard

The dashboard will automatically use the same environment variable through Vite's build system.

## Verification Checklist

✅ **GameRules interface matches orchestrator schema**
✅ **Entity generation functions use dynamic categories**
✅ **Orchestrator generates separate categories for items, NPCs, and locations**
✅ **Each category has 2-3 starting attributes**
✅ **Attributes have type, description, and reference**
✅ **Environment variable setup is correct**
✅ **Fallback to hardcoded categories if none provided**

## Potential Issues & Solutions

### Issue 1: LLM doesn't separate categories by entity type

**Current prompt asks for separate categories**, but LLM might mix them.

**Solution**: The current implementation is flexible - all categories go into one pool, and each entity type can use any category. This is actually fine because:
- Items will naturally get item-appropriate categories
- NPCs will get NPC-appropriate categories
- Locations will get location-appropriate categories

### Issue 2: Category names might not match between generation and usage

**Example**: Orchestrator generates "trade_goods" but entity refers to "trade_good"

**Solution**: The `findLocationByName` function already does fuzzy matching. We could add similar logic for categories if needed.

### Issue 3: Too many or too few categories

**Current prompt**: 4-6 for items, 3-5 for NPCs, 3-5 for locations = 10-16 total

**Solution**: This is reasonable. The LLM will generate what makes sense for the genre.

## Conclusion

The structure is **correct and ready to use**. The orchestrator will generate:

1. ✅ Detailed 500-800 word scratchpad
2. ✅ GameRules with dynamic categories
3. ✅ Separate categories for different entity types
4. ✅ 2-3 starting attributes per category
5. ✅ Historical accuracy with real names and dates
6. ✅ Country/city scale regions

The entity generation functions will:

1. ✅ Use dynamic categories from GameRules
2. ✅ Fall back to hardcoded categories if needed
3. ✅ Generate entities with appropriate categories
4. ✅ Create attributes based on category definitions

**Ready to implement the dashboard integration!**
