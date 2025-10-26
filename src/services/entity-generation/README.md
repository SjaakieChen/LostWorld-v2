# Entity Generation Service

This module provides AI-powered entity generation using Google Gemini models with automatic attribute library learning and parallel generation optimization.

## Features

- **Complete Entity Generation**: Full JSON metadata, attributes with full metadata (`value`, `type`, `description`, `reference`), and AI-generated images
- **Auto-incrementing IDs**: Semantic IDs with category prefixes using internal counter system
- **Context-aware generation**: Uses game context and historical period for accurate entities
- **Automatic attribute learning**: New attributes automatically added to library for consistency
- **Parallel generation**: Optimized performance by generating attributes and images simultaneously
- **Structually sound regions**: Region generation for world map with theme, biome, and description

## Setup

### 1. Environment Configuration

Add your Gemini API key to `.env`:

```bash
VITE_GEMINI_API_KEY=your_api_key_here
```

### 2. Import the Service

```typescript
import { 
  createItem, 
  createLocation, 
  createNpc, 
  createRegion,
  type GameRules 
} from './services/entity-generation'
```

## Models Used

- **`gemini-2.5-flash-lite`**: Fast JSON generation for entity metadata and attributes
- **`gemini-2.5-flash-image`**: Image generation (Nano Banana) for entity sprites/icons
- **API Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`

## Usage Example - Complete Workflow

### 1. Define Your Game Rules

```typescript
import type { GameRules } from './services/entity-generation'

const gameRules: GameRules = {
  artStyle: 'historical illustration',
  genre: 'exploration',
  historicalPeriod: 'Medieval Europe 1200s',
  
  // Category definitions with attribute libraries
  itemCategories: [
    {
      name: 'common',
      attributes: [
        {
          name: 'durability',
          type: 'integer',
          description: 'Item durability/condition',
          reference: '0=broken, 50=worn, 100=pristine'
        }
      ]
    },
    {
      name: 'weapon',
      attributes: [
        {
          name: 'damage',
          type: 'integer',
          description: 'Damage dealt in combat',
          reference: '10=dagger, 40=sword, 80=greatsword, 100=legendary'
        },
        {
          name: 'weight',
          type: 'integer',
          description: 'Weight in pounds',
          reference: '5=dagger, 15=sword, 30=greatsword'
        }
      ]
    }
  ],
  npcCategories: [],
  locationCategories: []
}
```

### 2. Generate an Item

```typescript
import { createItem } from './services/entity-generation'

const result = await createItem(
  'Create a tournament sword',           // Prompt
  gameRules,                             // Game configuration
  'region_medieval_kingdom_001',         // Region ID
  450,                                   // X coordinate
  -123                                   // Y coordinate
)
```

### 3. Use the Complete Result

```typescript
// Result includes 4 parts:
const { entity, newAttributes, timing, debugData } = result

// 1. THE GENERATED ENTITY
console.log('Entity:', entity)
// Output:
// {
//   id: 'ite_tournament_sword_wea_001',  // Auto-generated
//   name: 'Tournament Sword',
//   rarity: 'rare',
//   category: 'weapon',
//   description: 'A finely crafted sword used in medieval tournaments...',
//   own_attributes: {
//     damage: {
//       value: 55,
//       type: 'integer',
//       description: 'Damage dealt in combat',
//       reference: '10=dagger, 40=sword, 80=greatsword, 100=legendary'
//     },
//     weight: {
//       value: 18,
//       type: 'integer',
//       description: 'Weight in pounds',
//       reference: '5=dagger, 15=sword, 30=greatsword'
//     }
//   },
//   image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...',
//   x: 450,
//   y: -123,
//   region: 'region_medieval_kingdom_001'
// }

// 2. NEW ATTRIBUTES DISCOVERED (auto-learned)
if (Object.keys(newAttributes).length > 0) {
  console.log('🆕 New attributes found:', newAttributes)
  // Attributes automatically added to gameRules.itemCategories
}

// 3. TIMING INFORMATION
console.log('Timing:', timing)
// Output:
// {
//   baseEntity: '1234.56',   // Step 1: JSON generation
//   attributes: '2345.67',     // Step 2: Attributes (parallel)
//   image: '3456.78',          // Step 3: Image (parallel)
//   total: '5791.23'           // Total (Steps 1 + max(2, 3))
// }

// 4. DEBUG DATA (for troubleshooting)
console.log('Debug:', debugData)
// Contains model names, prompts, responses for each step
```

## Generation Process

Each entity is created through a 3-step process:

1. **Step 1: Base JSON** - Generate entity metadata (name, rarity, category, description) using structured output
2. **Step 2 & 3 (Parallel)**: Generate attributes and image simultaneously for optimized performance
   - Attributes include full metadata: `value`, `type`, `description`, `reference`
   - Image is base64-encoded PNG suitable for game sprites

The system uses `gemini-2.5-flash-lite` for JSON/attributes and `gemini-2.5-flash-image` for images.

## Entity Types

### Items, Locations, NPCs

**Full generation** with:
- Base entity JSON (name, rarity, category, description)
- Attributes with complete metadata structure
- AI-generated images (Base64 PNG)
- Rarity levels: `common`, `rare`, `epic`, `legendary`

**Category System - Orchestrator-Driven**

Categories are dynamically generated by the orchestrator based on the game's historical period and genre. This ensures all entities use appropriate, historically-accurate categories that support the specific gameplay mechanics.

**How Categories Work:**

1. **Orchestrator generates categories** when you create a new game:
```typescript
// Orchestrator creates game-specific categories
const config = await generateGameConfiguration(characterName, description, artStyle)

// config.gameRules contains:
// {
//   itemCategories: [
//     { name: 'common', attributes: [...] },
//     { name: 'trade_good', attributes: [...] },
//     { name: 'weapon', attributes: [...] }
//   ],
//   npcCategories: [
//     { name: 'merchant', attributes: [...] },
//     { name: 'noble', attributes: [...] }
//   ],
//   locationCategories: [
//     { name: 'city', attributes: [...] },
//     { name: 'landmark', attributes: [...] }
//   ]
// }
```

2. **Entity generation uses these categories**:
   - LLM selects from orchestrator-defined categories (4-6 item, 3-5 NPC, 3-5 location categories)
   - Each category includes starter attributes (2-3 per category)
   - Categories are historically appropriate and support game mechanics

3. **Fallback categories** (when orchestrator isn't used):
   - Hardcoded fallback list in `categories.ts`
   - **Items**: weapon, armor, consumable, tool, food, key
   - **NPCs**: merchant, guard, quest_giver, bandit, villager
   - **Locations**: town, dungeon, building, wilderness
   - Used only when `gameRules.itemCategories` is empty

**Example Orchestrator Categories** for different games:
- **Medieval Trading Game**: trade_good, weapon, document, luxury_item
- **Ancient Greek Game**: artifact, treatise, ceremonial_item
- **Industrial Revolution**: tool, machinery, document, manufactured_good

The orchestrator analyzes your game concept and creates contextually-appropriate categories tailored to the historical period.

### Regions

**Simple generation** for world map structure:
- Name, theme, biome, description only
- No categories, attributes, or images
- Used for geographic organization and position tracking
- Coordinate system: `regionX`, `regionY` on world map grid

```typescript
// Region example
const region = await createRegion(
  'A prosperous coastal trading region',  // Prompt
  gameRules,                                // Configuration
  5,                                        // regionX (grid coordinate)
  10                                        // regionY (grid coordinate)
)

// Result structure:
// {
//   entity: {
//     id: 'region_coastal_merchant_kingdom_001',
//     name: 'Coastal Merchant Kingdom',
//     regionX: 5,
//     regionY: 10,
//     properties: {
//       theme: 'Maritime trade and commerce',
//       biome: 'Coastal plains',
//       description: 'A prosperous coastal region known for its bustling ports...'
//     }
//   },
//   newAttributes: {},  // No attributes for regions
//   timing: { ... },
//   debugData: { ... }
// }
```

## Attribute System

### Structure

Every attribute includes 4 required fields:

```typescript
{
  name: 'damage',
  value: 45,                                    // Actual value
  type: 'integer',                              // Data type
  description: 'Damage dealt in combat',         // What it represents
  reference: '10=dagger, 40=sword, 80=greatsword, 100=legendary'  // Calibration scale
}
```

### Automatic Learning

The system automatically learns and stores new attributes:

1. When generating an item, if new attributes are created that aren't in your library
2. They are automatically added to the appropriate category in `gameRules.itemCategories`
3. Future generations will use these attributes for consistency
4. Console logs: `✅ Added new attribute "fire_damage" to weapon category`

Example:
```typescript
// First generation might create:
{
  own_attributes: {
    damage: { value: 50, type: 'integer', description: '...', reference: '...' }
  },
  newAttributes: {
    fire_damage: { 
      value: 25, 
      type: 'integer', 
      description: 'Additional fire damage',
      reference: '10=weak flames, 50=strong fire, 100=inferno',
      category: 'weapon'
    }
  }
}

// Next generation will have 'fire_damage' available in the weapon library
```

### Built-in vs New Attributes

- **Built-in attributes**: Use the reference from your library exactly as defined
- **New attributes**: Must include all 4 fields (`value`, `type`, `description`, `reference`)
- The reference should provide clear calibration examples for game mechanics

## Dynamic Positioning

Entities are placed at exact coordinates you specify:

- **region**: The region where the entity should be placed (e.g., `'region_medieval_kingdom_001'`)
- **x, y**: Exact coordinates where the entity should be positioned
- **No random placement**: Entities appear exactly where specified
- **LLM or human controlled**: An orchestrator LLM can decide placement based on context, or humans can specify precise locations

## Complete Function Signatures

### createItem()

```typescript
async function createItem(
  prompt: string,
  gameRules: GameRules,
  region: string,
  x: number,
  y: number
): Promise<GenerationResult<Item>>
```

Returns complete Item with:
- Auto-generated ID (e.g., `ite_tournament_sword_wea_001`)
- Full attributes with metadata
- Base64-encoded image
- Position (x, y, region)

### createNpc()

```typescript
async function createNpc(
  prompt: string,
  gameRules: GameRules,
  region: string,
  x: number,
  y: number
): Promise<GenerationResult<Npc>>
```

Similar to `createItem()` but generates NPCs with conversation history support.

### createLocation()

```typescript
async function createLocation(
  prompt: string,
  gameRules: GameRules,
  region: string,
  x: number,
  y: number
): Promise<GenerationResult<Location>>
```

Generates locations (towns, dungeons, buildings, wilderness) with themes and biomes.

### createRegion()

```typescript
async function createRegion(
  prompt: string,
  gameRules: GameRules,
  regionX: number,
  regionY: number
): Promise<GenerationResult<Region>>
```

Generates region with simple structure (no attributes, no images):
- name, theme, biome, description
- Grid coordinates for world map organization

## ID Generation System

IDs are automatically generated with semantic structure:

**Format**: `<typePrefix>_<sanitizedName>_<categoryPrefix>_<counter>`

Examples:
- Item weapon: `ite_sword_wea_001`, `ite_sword_wea_002`, ...
- Item armor: `ite_plate_arm_arm_001`, `ite_plate_arm_arm_002`, ...
- NPC merchant: `npc_merchant_mer_001`, `npc_merchant_mer_002`, ...
- Location town: `loc_village_tow_001`, `loc_village_tow_002`, ...

**Type prefixes:**
- Items: `ite_` → `ite_`
- NPCs: `npc_` → `npc_`
- Locations: `loc_` → `loc_`
- Regions: Direct ID generation (e.g., `region_name_001`)

**Category prefixes** (first 3 letters):
- `weapon` → `wea_`
- `armor` → `arm_`
- `merchant` → `mer_`
- `town` → `tow_`

The counter auto-increments per category, ensuring unique IDs even if names are reused.

## Category System

Categories are defined in your `GameRules` as arrays with attribute libraries:

```typescript
itemCategories: [
  {
    name: 'weapon',
    attributes: [
      { name: 'damage', type: 'integer', description: '...', reference: '...' },
      { name: 'weight', type: 'integer', description: '...', reference: '...' }
    ]
  },
  {
    name: 'common',
    attributes: [
      { name: 'durability', type: 'integer', description: '...', reference: '...' }
    ]
  }
]
```

- Each category has its own attribute library
- The `common` category attributes are inherited by all items
- New categories are automatically created if needed

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

4. **Generate an entity:**
   - Enter a prompt (e.g., "Create a legendary fire sword")
   - Optionally modify the Game Context and Game Rules JSON
   - Click "Generate Item"
   - Wait 15-25 seconds for the complete entity to be generated

### Test Interface Features

- **Real-time generation**: See each step of the generation process
- **Complete entity display**: View JSON, image, and attributes
- **Debug information**: Inspect all LLM prompts and responses
- **Timing metrics**: See performance of each step
  - Base entity generation time
  - Parallel attributes + image generation time
  - Total time with optimization
- **Validation**: Automatically checks if entity has all required fields
- **New attribute detection**: Highlights attributes not in the library
- **Download options**: Download both JSON and image files

### Test Files

- `test.html` - Test interface HTML
- `test.css` - Styling (copied from google-ai-tests)
- `test.ts` - TypeScript test logic
- `test.js` - Compiled JavaScript (generated by Vite)

The test interface uses the same TypeScript services that your game will use, ensuring consistency between testing and production.

## Performance Optimization

The generation process is optimized with parallel execution:

1. Step 1: Generate base JSON (sequential)
2. Steps 2 & 3: Generate attributes AND image **simultaneously**
3. Total time = Step 1 + max(Step 2, Step 3)

This typically reduces total time by 30-40% compared to sequential generation.

Example timing:
```
Base Entity:  1234.56ms  (Step 1)
Attributes:   2345.67ms  (Step 2, parallel)
Image:        3456.78ms  (Step 3, parallel)
────────────────────────
Total:        5791.23ms  (1 + max(2, 3))
```

Without parallelization, this would take ~7037ms instead.
