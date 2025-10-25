# Entity Generation Service

This module provides AI-powered entity generation using Google Gemini models.

## Features

- **Standardized Attributes**: All attributes include `value`, `type`, `description`, and `reference`
- **Auto-incrementing IDs**: Semantic IDs with category prefixes
- **Context-aware generation**: Uses game context to create relevant entities
- **Full metadata**: Complete entity objects with images and attributes

## Setup

1. Add your Gemini API key to `.env`:
```bash
VITE_GEMINI_API_KEY=your_api_key_here
```

2. Import the service:
```typescript
import { createItem, type GameRules, type GameContext } from './services/entity-generation'
```

## Usage Example

```typescript
import { createItem } from './services/entity-generation'

// Define game rules (attribute library + settings)
const gameRules: GameRules = {
  artStyle: 'historical illustration',
  genre: 'exploration',
  historicalPeriod: 'Medieval Europe 1200s',
  categories: {
    common: {
      attributes: {
        durability: {
          type: 'integer',
          description: 'Item durability/condition',
          reference: '0=broken, 50=worn, 100=pristine'
        }
      }
    },
    weapon: {
      attributes: {
        damage: {
          type: 'integer',
          description: 'Damage dealt in combat',
          reference: '10=dagger, 40=sword, 80=greatsword, 100=legendary'
        },
        weight: {
          type: 'integer',
          description: 'Weight in pounds',
          reference: '5=dagger, 15=sword, 30=greatsword'
        }
      }
    }
  }
}

// Generate an item
const result = await createItem(
  'Create a tournament sword',
  gameRules,
  'region_medieval_kingdom_001',
  450,
  -123
)

// Result structure:
// {
//   entity: Item {
//     id: 'wea_tournament_sword_001',
//     name: 'Tournament Sword',
//     rarity: 'rare',
//     category: 'weapon',
//     description: '...',
//     own_attributes: {
//       damage: {
//         value: 55,
//         type: 'integer',
//         description: 'Damage dealt in combat',
//         reference: '10=dagger, 40=sword, 80=greatsword, 100=legendary'
//       },
//       weight: {
//         value: 18,
//         type: 'integer',
//         description: 'Weight in pounds',
//         reference: '5=dagger, 15=sword, 30=greatsword'
//       }
//     },
//     image_url: 'data:image/png;base64,...',
//     x: 123,
//     y: 456,
//     region: 'region_medieval_kingdom_001'
//   },
//   newAttributes: {}, // Any new attributes not in library
//   timing: {...},
//   debugData: {...}
// }
```

## Integration with GameContext

Add generation functions to your GameContext:

```typescript
// In GameContext.tsx
import { createItem, type GameRules } from '../services/entity-generation'

const [gameRules] = useState<GameRules>({
  artStyle: 'historical illustration',
  genre: 'exploration',
  historicalPeriod: 'Medieval Europe 1200s',
  categories: { /* ... */ }
})

const generateNewItem = async (prompt: string, region: string, x: number, y: number) => {
  const result = await createItem(prompt, gameRules, region, x, y)
  
  // Add to world items
  setAllWorldItems(prev => [...prev, result.entity])
  
  return result.entity
}
```

## Dynamic Positioning

Entities are placed at specific coordinates and regions as specified by the caller:

- **region**: The region where the entity should be placed (e.g., 'region_medieval_kingdom_001')
- **x, y**: Exact coordinates where the entity should be positioned
- **No random placement**: Entities appear exactly where you specify them
- **LLM or human controlled**: An LLM can decide placement based on context, or humans can specify precise locations

## Automatic Attribute Library Updates

The system automatically learns and stores new attributes as they are discovered:

- When the LLM creates attributes not in your library, they are automatically added to the appropriate category array (`gameRules.itemCategories`, `gameRules.npcCategories`, or `gameRules.locationCategories`)
- This makes the system self-improving - each generation makes future generations more consistent
- New attributes are logged to console: `✅ Added new attribute "fire_damage" to weapon library`

## Entity Structure

All generated entities follow this structure:

```typescript
{
  // Base fields (from schema)
  id: string              // Auto-generated: "wea_sword_001"
  name: string
  rarity: Rarity
  category: string
  description: string
  
  // Attributes (with full metadata)
  own_attributes: {
    [attributeName]: {
      value: any          // Actual value
      type: string        // Data type
      description: string // What it represents
      reference: string   // Calibration examples
    }
  }
  
  // Image
  image_url: string       // Base64 data URL
  
  // System fields
  x: number
  y: number
  region: string
  chatHistory?: ChatMessage[]  // NPCs only
}
```

## Available Functions

- `createItem(prompt, gameContext, gameRules)` - Generate a complete item
- More entity types coming soon (NPC, Location)

## Category System

Categories have predefined prefixes for ID generation:

**Items:**
- `weapon` → `wea_`
- `armor` → `arm_`
- `consumable` → `con_`

**NPCs:**
- `merchant` → `mer_`
- `guard` → `gua_`
- `quest_giver` → `que_`

**Locations:**
- `town` → `tow_`
- `dungeon` → `dun_`
- `building` → `bui_`
- `wilderness` → `wil_`

Add new categories by updating `categories.ts`.

## Testing

A standalone testing UI is available to test the entity generation services.

### How to Run Tests

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open the test page:**
   Navigate to: `http://localhost:5173/src/services/entity-generation/test.html`

3. **Enter your API key:**
   - Click on the API Configuration section
   - Enter your Gemini API key
   - Click "Save Key" (it will be stored in localStorage)

4. **Generate an item:**
   - Enter a prompt (e.g., "Create a legendary fire sword")
   - Optionally modify the Game Context and Game Rules JSON
   - Click "Generate Item"
   - Wait 15-25 seconds for the complete entity to be generated

### Test Interface Features

- **Real-time generation**: See each step of the generation process
- **Complete entity display**: View JSON, image, and attributes
- **Debug information**: Inspect all LLM prompts and responses
- **Timing metrics**: See performance of each step
- **Validation**: Automatically checks if entity has all required fields
- **New attribute detection**: Highlights attributes not in the library
- **Download options**: Download both JSON and image files

### Test Files

- `test.html` - Test interface HTML
- `test.css` - Styling (copied from google-ai-tests)
- `test.ts` - TypeScript test logic
- `test.js` - Compiled JavaScript (generated by Vite)

The test interface uses the same TypeScript services that your game will use, ensuring consistency between testing and production.

