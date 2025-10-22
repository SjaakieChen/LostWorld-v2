# Structured Output Testing Guide

## Overview

This guide explains how to use the **Structured Output Testing** feature to generate complete game entities for the Lost World RPG using AI-powered JSON generation combined with image generation.

## What Is Structured Output?

Structured output ensures the AI returns **valid JSON** that matches your TypeScript type definitions, rather than free-form text. This is crucial for game development where entities must have specific fields and data types.

## ⚠️ The Three-Model Architecture (CRITICAL)

Our implementation uses **THREE AI models working together** - this is critical for quality and separation of concerns:

### Why Three Models Instead of Two?

**Better Separation:** Each model focuses on what it does best
- Model 1: Semantic content
- Model 2: Game mechanics (contextual to the entity)
- Model 3: Visual representation

**Better Quality:** Properties are generated based on the full description, not just the prompt
**Cleaner Schemas:** No complex nested objects that Gemini API doesn't support well

### Step 1: Base Entity Generation (Flash Lite)
- **Model:** `gemini-2.5-flash-lite`
- **Purpose:** Generate semantic content
- **Uses:** `response_mime_type: "application/json"` + `response_schema`
- **Input:** User prompt ("create a legendary fire sword")
- **Output:** `{id, name, rarity, description, category}`
- **Time:** ~2-3 seconds

### Step 2: Own Properties Generation (Flash Lite)
- **Model:** `gemini-2.5-flash-lite` (same model, different call)
- **Purpose:** Generate contextual game mechanics
- **Uses:** `response_mime_type: "application/json"` (NO schema - flexible)
- **Input:** `description` + `category` from Step 1
- **Output:** `own_properties` object (e.g., `{damage: 85, attackSpeed: "slow", element: "fire"}`)
- **Time:** ~2-3 seconds

### Step 3: Image Generation (Flash Image)
- **Model:** `gemini-2.5-flash-image`
- **Purpose:** Create visual representation
- **Input:** `description` field from Step 1
- **Output:** Base64-encoded PNG image
- **Time:** ~4-8 seconds

### Step 4: Code Combination
- **Done by:** Your application code
- **Purpose:** Merge all parts + add system fields
- **Adds:** `image_url` (base64), `x`, `y`, `region`, `chatHistory` (for NPCs)
- **Time:** Instant
- **Output:** Complete entity ready for game use

**Total Time:** ~10-15 seconds for a complete entity

## Entity Types

### 1. Item Entity

**Use Cases:** Weapons, armor, consumables, tools, quest items

**TypeScript Interface:**
```typescript
interface Item extends GeneratableEntity {
  id: string              // e.g., "sword_fire_001"
  name: string            // e.g., "Flamebrand"
  rarity: Rarity          // "common" | "rare" | "epic" | "legendary"
  image_url: string       // Base64 data URI
  description: string     // Visual description
  x: number               // X coordinate
  y: number               // Y coordinate
  region: string          // e.g., "medieval_kingdom_001"
  category?: string       // e.g., "weapon", "armor"
  properties?: object     // e.g., { damage: 50, element: "fire" }
}
```

**Example Prompts:**
- "Create a legendary fire sword"
- "Generate a rare healing potion"
- "Make an epic suit of armor"
- "Create a common wooden shield"

**Generated Properties Examples:**
```json
{
  "category": "weapon",
  "properties": {
    "damage": 45,
    "element": "fire",
    "equipSlot": "rightHand",
    "durability": 100
  }
}
```

### 2. NPC Entity

**Use Cases:** Merchants, guards, quest givers, enemies, companions

**TypeScript Interface:**
```typescript
interface NPC extends GeneratableEntity {
  id: string              // e.g., "npc_merchant_001"
  name: string            // e.g., "Eldric the Wise"
  rarity: Rarity          // Determines NPC importance
  image_url: string       // Base64 data URI
  description: string     // Visual description
  x: number               // X coordinate
  y: number               // Y coordinate
  region: string          // e.g., "medieval_kingdom_001"
  chatHistory: ChatMessage[]  // Initially empty []
  category?: string       // e.g., "merchant", "guard"
  properties?: object     // e.g., { hostile: false, faction: "castle" }
}
```

**Example Prompts:**
- "Create a wise old merchant NPC"
- "Generate a hostile orc warrior"
- "Make a friendly quest-giving wizard"
- "Create a mysterious hooded stranger"

**Generated Properties Examples:**
```json
{
  "category": "merchant",
  "properties": {
    "hostile": false,
    "faction": "traders_guild",
    "greeting": "Welcome, traveler! I have wares for sale.",
    "sells": ["potions", "scrolls", "maps"],
    "buysPriceMultiplier": 0.5
  }
}
```

### 3. Location Entity

**Use Cases:** Towns, dungeons, buildings, landmarks, wilderness areas

**TypeScript Interface:**
```typescript
interface Location extends GeneratableEntity {
  id: string              // e.g., "loc_tavern_001"
  name: string            // e.g., "The Prancing Pony"
  rarity: Rarity          // Determines location importance
  image_url: string       // Base64 data URI
  description: string     // Visual description
  x: number               // X coordinate
  y: number               // Y coordinate
  region: string          // e.g., "medieval_kingdom_001"
  category?: string       // e.g., "town", "dungeon"
  properties?: object     // e.g., { biome: "forest", safe: true }
}
```

**Example Prompts:**
- "Create a mystical forest location"
- "Generate a dark dungeon entrance"
- "Make a cozy tavern location"
- "Create an ancient ruins landmark"

**Generated Properties Examples:**
```json
{
  "category": "building",
  "properties": {
    "biome": "forest",
    "safe": true,
    "canRest": true,
    "hasShop": true,
    "inhabitants": ["merchant", "innkeeper", "bard"]
  }
}
```

## ⚠️ CRITICAL PATTERNS & CONVENTIONS

### 1. Schema vs Prompt - The Golden Rule

**THE GOLDEN RULE:** Schema enforces structure, prompt provides context ONLY.

#### ❌ WRONG: Repeating field definitions in both

```javascript
// Step 1 Schema
const schema = {
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    rarity: { type: "string", enum: [...] }
  }
};

// Step 1 Prompt
const prompt = `Generate JSON with:
- 'id': Create a semantic ID  
- 'name': The display name
- 'rarity': Choose from common, rare, epic, legendary`;  // ❌ REDUNDANT!
```

**Problem:** You're defining fields twice. The schema already enforces what fields exist and their types.

#### ✅ RIGHT: Schema enforces, prompt contextualizes

```javascript
// Step 1 Schema
const schema = {
  properties: {
    id: { type: "string", description: "Semantic ID like 'sword_fire_001'" },
    name: { type: "string", description: "Display name" },
    rarity: { type: "string", enum: ["common", "rare", "epic", "legendary"] }
  }
};

// Step 1 Prompt  
const prompt = `You are generating an item for Lost World RPG.

User request: ${userPrompt}

Create this item with a semantic ID, appropriate name and rarity level, 
an appropriate category, and a detailed visual description.

Return ONLY valid JSON matching the schema.`;  // ✅ Context only!
```

**Why:** The schema already defines structure. The prompt just gives context about what you're creating.

### 2. Naming Convention: own_properties (NOT properties!)

**CRITICAL:** Use `own_properties` for entity game attributes, NOT `properties`

#### ❌ WRONG: Using 'properties'

```javascript
entity.properties = { damage: 50, element: "fire" };  // ❌ Conflicts with JSON Schema keyword!
```

#### ✅ RIGHT: Using 'own_properties'

```javascript
entity.own_properties = { damage: 50, element: "fire" };  // ✅ Clear and unambiguous
```

**Why:** `properties` is a reserved keyword in JSON Schema. Using it causes confusion and potential conflicts. `own_properties` is explicit and clear.

### 3. Schema Descriptions MUST Include Examples

**CRITICAL RULE:** Every schema property MUST have at least one concrete example in its description.

#### ❌ WRONG: Vague descriptions

```javascript
const schema = {
  properties: {
    id: { type: "string", description: "Semantic ID" },  // ❌ What format?
    name: { type: "string", description: "Name" },  // ❌ What kind?
    category: { type: "string", description: "Category" }  // ❌ What options?
  }
};
```

**Problem:** LLM doesn't know what format or values are appropriate.

#### ✅ RIGHT: Example-driven descriptions

```javascript
const schema = {
  properties: {
    id: { 
      type: "string", 
      description: "Semantic ID like 'sword_fire_001' or 'potion_health_001'" 
    },
    name: { 
      type: "string", 
      description: "Display name like 'Flamebrand' or 'Healing Potion'" 
    },
    category: { 
      type: "string", 
      description: "Category like 'weapon', 'armor', 'consumable'" 
    }
  }
};
```

**Why:** Examples guide the LLM to generate appropriate formats, naming conventions, and value choices.

### 4. Field Source Separation

**Know which model/code generates which fields:**

#### Base Entity (Step 1 - Flash Lite with schema)
- `id` - Semantic identifier
- `name` - Display name  
- `rarity` - Importance level
- `description` - Visual description (drives everything else)
- `category` - Entity subtype

#### Own Properties (Step 2 - Flash Lite without schema)
- `own_properties` - Game mechanics object
  - Items: damage, attackSpeed, element, value, weight, durability
  - NPCs: hostile, faction, greeting, services, level
  - Locations: biome, safe, canRest, hasShop, encounters, accessLevel

#### Image (Step 3 - Flash Image)
- Base64 image data (NOT the image_url field itself)

#### System Fields (Step 4 - Your code)
- `image_url` - Injected with base64 from Step 3
- `x`, `y` - Spatial coordinates (game context determines)
- `region` - World region (game context determines)
- `chatHistory` - For NPCs only, starts as empty array `[]`

### 5. Gemini API Limitations

**What Gemini API DOES NOT support:**
- ❌ `additionalProperties` keyword
- ❌ Complex nested schemas with deep hierarchies
- ❌ Many advanced JSON Schema features

**Solution:** Keep schemas simple. For flexible fields:
- Either omit from schema entirely (Step 2 has NO schema)
- Or define at top level only

## Exact Data Flow Example

Let's trace **exactly** what happens when you input "create a legendary fire sword":

### User Input
```
"create a legendary fire sword"
```

### Step 1: Base Entity (Flash Lite)

**API Request:**
```javascript
{
  contents: [{
    parts: [{
      text: `You are generating an item for Lost World RPG.

User request: create a legendary fire sword

Create this item with a semantic ID, appropriate name and rarity level, 
an appropriate category, and a detailed visual description.

Return ONLY valid JSON matching the schema.`
    }]
  }],
  generationConfig: {
    response_mime_type: "application/json",
    response_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Semantic ID like 'sword_fire_001'" },
        name: { type: "string", description: "Display name like 'Flamebrand'" },
        rarity: { type: "string", enum: ["common", "rare", "epic", "legendary"] },
        description: { type: "string", description: "Detailed visual description" },
        category: { type: "string", description: "Category like 'weapon', 'armor'" }
      },
      required: ["id", "name", "rarity", "description"]
    }
  }
}
```

**API Response (~2-3 seconds):**
```json
{
  "id": "sword_fire_legendary_001",
  "name": "Flamebrand",
  "rarity": "legendary",
  "description": "A magnificent greatsword with flames dancing along its obsidian blade, golden runes etched into the crossguard",
  "category": "weapon"
}
```

### Step 2: Own Properties (Flash Lite)

**API Request:**
```javascript
{
  contents: [{
    parts: [{
      text: `Based on this item description: "A magnificent greatsword with flames dancing along its obsidian blade, golden runes etched into the crossguard"

Category: weapon

Generate a JSON object with game attributes for this item. Include:
- For weapons: damage (number), attackSpeed (string: fast/normal/slow), element (if applicable)
- For all items: value (number in gold), weight (number), durability (number: 0-100)

Return ONLY a JSON object with these properties.`
    }]
  }],
  generationConfig: {
    response_mime_type: "application/json"
    // NO schema - flexible properties
  }
}
```

**API Response (~2-3 seconds):**
```json
{
  "damage": 85,
  "attackSpeed": "slow",
  "element": "fire",
  "value": 5000,
  "weight": 12,
  "durability": 100
}
```

### Step 3: Image (Flash Image)

**API Request:**
```javascript
{
  contents: [{
    parts: [{
      text: "Generate a high-quality image for: A magnificent greatsword with flames dancing along its obsidian blade, golden runes etched into the crossguard"
    }]
  }],
  generationConfig: {
    temperature: 1.0,
    topK: 40,
    topP: 0.95
  }
}
```

**API Response (~4-8 seconds):**
```json
{
  "candidates": [{
    "content": {
      "parts": [{
        "inline_data": {
          "mime_type": "image/png",
          "data": "iVBORw0KGgoAAAANSUhEUgAA..." // base64 image
        }
      }]
    }
  }]
}
```

### Step 4: Code Combines Everything

```javascript
// From Step 1
const baseEntity = {
  id: "sword_fire_legendary_001",
  name: "Flamebrand",
  rarity: "legendary",
  description: "A magnificent greatsword...",
  category: "weapon"
};

// From Step 2
const ownProperties = {
  damage: 85,
  attackSpeed: "slow",
  element: "fire",
  value: 5000,
  weight: 12,
  durability: 100
};

// From Step 3
const imageBase64 = "iVBORw0KGgoAAAANSUhEUgAA...";

// Code combines:
const completeEntity = {
  ...baseEntity,
  own_properties: ownProperties,
  image_url: `data:image/png;base64,${imageBase64}`,
  x: Math.floor(Math.random() * 2000) - 1000,  // -456
  y: Math.floor(Math.random() * 2000) - 1000,  // 732
  region: "medieval_kingdom_001"
};
```

**Final Complete Entity:**
```json
{
  "id": "sword_fire_legendary_001",
  "name": "Flamebrand",
  "rarity": "legendary",
  "description": "A magnificent greatsword with flames dancing along its obsidian blade...",
  "category": "weapon",
  "own_properties": {
    "damage": 85,
    "attackSpeed": "slow",
    "element": "fire",
    "value": 5000,
    "weight": 12,
    "durability": 100
  },
  "image_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "x": -456,
  "y": 732,
  "region": "medieval_kingdom_001"
}
```

## ⚠️ Common Mistakes & Solutions

### Mistake 1: Repeating schema in prompt
**❌ Bad:** Listing all field names and types in the prompt when schema exists  
**✅ Good:** Schema enforces structure, prompt gives context only  
**Why:** Reduces redundancy, keeps prompts short and focused

### Mistake 2: Using 'properties' field name
**❌ Bad:** `entity.properties = {...}`  
**✅ Good:** `entity.own_properties = {...}`  
**Why:** Avoids JSON Schema keyword conflict

### Mistake 3: Two-model approach
**❌ Bad:** Trying to generate own_properties with base entity in one call  
**✅ Good:** Separate call for contextual own_properties generation  
**Why:** Better quality, contextual properties based on full description

### Mistake 4: Using additionalProperties in schema
**❌ Bad:** Adding `additionalProperties: true` to schema  
**✅ Good:** Omit flexible fields from schema entirely  
**Why:** Gemini API doesn't support this keyword

### Mistake 5: Vague schema descriptions
**❌ Bad:** `{ type: "string", description: "ID" }`  
**✅ Good:** `{ type: "string", description: "ID like 'sword_fire_001'" }`  
**Why:** Examples guide LLM output format

### Mistake 6: Generating system fields in Step 1
**❌ Bad:** Asking LLM to generate x, y, region, image_url  
**✅ Good:** Add these fields programmatically in Step 4  
**Why:** These are runtime/infrastructure, not content

### Mistake 7: Prompt defines fields when schema exists
**❌ Bad:** 
```
"Generate JSON with id (string), name (string), rarity (enum)..."
```
**✅ Good:**
```
"Create this item with appropriate name and rarity..."
```
**Why:** Schema already defines fields, prompt provides context

### Mistake 8: ⚠️ CRITICAL - Mentioning field name in Step 2 prompt
**❌ Bad (CAUSES NESTED STRUCTURE):**
```javascript
// Step 2 Prompt
"Generate an own_properties object with game attributes..."
```

**Result:**
```json
{
  "own_properties": {           // ❌ Nested!
    "damage": 50,
    "weight": 5
  }
}
```

**✅ Good:**
```javascript
// Step 2 Prompt
"Generate a JSON object with game attributes for this item..."
```

**Result:**
```json
{
  "damage": 50,                  // ✅ Direct properties
  "weight": 5
}
```

**Why:** When you say "Generate an own_properties object", the LLM interprets this as "create an object that HAS a field called own_properties". Instead, say "Generate a JSON object with game attributes" and your code will later assign it to `entity.own_properties = result`.

**Critical Rule:** In Step 2, NEVER mention "own_properties" in the prompt. Just ask for "a JSON object with game attributes".

## Using the Test Interface

### 1. Open the Test Page
- Navigate to `google-ai-tests/index.html`
- Ensure your API key is saved

### 2. Scroll to Structured Output Section
- Look for the orange/pink gradient section
- Three subsections: Item, NPC, Location

### 3. Generate an Entity

**For Items:**
```
1. Enter prompt: "Create a legendary fire sword"
2. Click "Generate Item"
3. Wait 5-15 seconds (JSON + Image generation)
4. View results: JSON on left, image on right
```

**For NPCs:**
```
1. Enter prompt: "Create a wise old merchant"
2. Click "Generate NPC"
3. Wait 5-15 seconds
4. View results with chatHistory array initialized
```

**For Locations:**
```
1. Enter prompt: "Create a mystical forest"
2. Click "Generate Location"
3. Wait 5-15 seconds
4. View results with location properties
```

### 4. Understand the Results

**Result Display Includes:**
- **Entity Badge:** Shows type (ITEM/NPC/LOCATION)
- **Rarity Badge:** Shows rarity level with color coding
- **Validation Badge:** ✓ Valid or ✗ Invalid
- **Timing Info:** JSON generation time + Image generation time
- **JSON Panel:** Complete entity object with syntax highlighting
- **Image Panel:** Generated image + description

### 5. Download Results
- **Download JSON:** Saves entity as `.json` file
- **Download Image:** Saves image as `.png` file

## JSON Schema Validation

The system validates that all **required fields** are present:

### Common Required Fields (All Entities)
- ✓ `id` (string)
- ✓ `name` (string)
- ✓ `rarity` (enum: common/rare/epic/legendary)
- ✓ `image_url` (string, filled with base64)
- ✓ `description` (string)
- ✓ `x` (number)
- ✓ `y` (number)
- ✓ `region` (string)

### NPC-Specific Required Fields
- ✓ `chatHistory` (array, initially empty)

### Validation Indicators
- **Green ✓ Valid:** All required fields present
- **Red ✗ Invalid:** Shows which fields are missing

## Understanding the Output

### Image URL Field

The `image_url` field contains a **data URI** with embedded base64 image:

```json
{
  "image_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Advantages:**
- Self-contained entity
- Immediate display in browser
- No external dependencies
- Perfect for testing

**Production Note:**
For production, replace with actual URL after uploading to blob storage:
```json
{
  "image_url": "https://storage.example.com/images/sword_fire_001.png"
}
```

### Rarity System

Rarity affects visual styling and game importance:

| Rarity | Color | Use Case |
|--------|-------|----------|
| **Common** | Gray | Basic items, regular NPCs, common locations |
| **Rare** | Blue | Quality items, important NPCs, notable locations |
| **Epic** | Purple | Powerful items, key NPCs, major locations |
| **Legendary** | Orange (glowing) | Unique items, boss NPCs, landmark locations |

### Coordinate System

- **X, Y:** Coordinates within the region
- **Range:** -1000 to 1000 (can extend beyond)
- **Origin:** (0, 0) is region center
- **Purpose:** Spatial positioning in game world

### Region System

All entities exist within a **region**:
- Default: `"medieval_kingdom_001"`
- Custom regions: Define in your game data
- Purpose: World organization and chunking

## Response Times

Typical generation times:

| Step | Time Range | Average |
|------|------------|---------|
| JSON Generation | 1-3 seconds | 2s |
| Image Generation | 4-10 seconds | 6s |
| **Total** | **5-15 seconds** | **8s** |

Factors affecting speed:
- Prompt complexity
- API load
- Network latency
- Image detail requirements

## Best Practices

### 1. Be Specific in Prompts

❌ **Vague:** "Create a sword"
✅ **Specific:** "Create a legendary two-handed greatsword with fire enchantments"

❌ **Vague:** "Make an NPC"
✅ **Specific:** "Create a friendly elven merchant who sells magical scrolls"

### 2. Use Descriptive Language

The `description` field drives image generation, so encourage detailed descriptions:

```
"A gleaming longsword with flames dancing along its blade, 
ornate golden hilt wrapped in red leather, ruby pommel stone"
```

### 3. Validate Before Using

Always check the **validation badge** before using entities in your game:
- ✓ Green = Safe to use
- ✗ Red = Check console for missing fields

### 4. Handle Properties Flexibly

The `properties` field is intentionally flexible. Different entity types will have different properties:

```javascript
// Item properties
{ damage: 50, durability: 100, weight: 5 }

// NPC properties
{ hostile: false, faction: "castle", dialogue: [...] }

// Location properties
{ safe: true, canRest: true, hasShop: true }
```

### 5. Save Generated Entities

Use the download buttons to save entities for later use:
- JSON files can be imported into your game
- Images can be uploaded to your asset storage

## Troubleshooting

### "Please set your API key first"

**Problem:** API key not configured

**Solution:**
1. Scroll to "API Configuration" section
2. Enter your Google AI API key
3. Click "Save Key"

### Generation Takes Too Long

**Problem:** Request exceeding 20 seconds

**Solution:**
- Check network connection
- Simplify prompt
- Try again (API may be under heavy load)

### Invalid JSON Error

**Problem:** Response isn't valid JSON

**Solution:**
- Check console for details
- Try rephrasing prompt
- Ensure API key has proper permissions

### Missing Image

**Problem:** Entity generated but no image

**Solution:**
- Check if description field is detailed enough
- Try regenerating with more descriptive prompt
- Check browser console for error messages

### Wrong Entity Type

**Problem:** Generated entity doesn't match expected type

**Solution:**
- Use specific category keywords in prompt
- Example: "weapon item", "merchant NPC", "tavern location"

## Integration with Your Game

### 1. Copy the Functions

Copy `createEntity()` function from `test-structured.js` to your game code.

### 2. Modify for Production

```javascript
async function createGameEntity(prompt, entityType) {
  // Step 1: Generate JSON
  const entity = await generateStructuredJSON(prompt, entityType);
  
  // Step 2: Generate image
  const imageBase64 = await generateImage(entity.description);
  
  // Step 3: Upload to storage (PRODUCTION)
  const imageUrl = await uploadToStorage(imageBase64, entity.id);
  entity.image_url = imageUrl;  // Use URL instead of base64
  
  // Step 4: Save to database
  await saveEntityToDatabase(entity);
  
  return entity;
}
```

### 3. Add Error Handling

```javascript
try {
  const entity = await createEntity(prompt, type);
  // Use entity in game
} catch (error) {
  console.error('Entity generation failed:', error);
  // Show user-friendly error message
}
```

### 4. Implement Caching

Cache generated entities to avoid regeneration:

```javascript
const entityCache = new Map();

async function getOrCreateEntity(id, prompt, type) {
  if (entityCache.has(id)) {
    return entityCache.get(id);
  }
  
  const entity = await createEntity(prompt, type);
  entityCache.set(id, entity);
  return entity;
}
```

## Advanced Usage

### Batch Generation

Generate multiple entities at once:

```javascript
async function generateLoot(count) {
  const prompts = [
    "Create a common healing potion",
    "Create a rare dagger",
    "Create common gold coins"
  ];
  
  const entities = await Promise.all(
    prompts.map(p => createEntity(p, 'item'))
  );
  
  return entities;
}
```

### Contextual Generation

Use game context in prompts:

```javascript
const context = {
  region: "medieval_kingdom_001",
  questLine: "dragon_slayer",
  playerLevel: 15
};

const prompt = `Create an epic sword suitable for level ${context.playerLevel} 
in the ${context.questLine} questline`;

const sword = await createEntity(prompt, 'item');
```

### Dynamic Properties

Add computed properties after generation:

```javascript
const entity = await createEntity(prompt, type);

// Add runtime properties
entity.properties.generatedAt = Date.now();
entity.properties.ownerPlayerId = currentPlayer.id;
entity.properties.instanceId = generateUUID();
```

## Schema Customization

### Adding Custom Fields

Modify schemas in `test-structured.js`:

```javascript
const ITEM_SCHEMA = {
  type: "object",
  properties: {
    // ... existing fields
    
    // Add custom fields
    value: { type: "number", description: "Gold value" },
    weight: { type: "number", description: "Weight in kg" },
    stackable: { type: "boolean", description: "Can stack in inventory" },
    maxStack: { type: "number", description: "Maximum stack size" }
  },
  required: ["id", "name", "rarity", "image_url", "description", "x", "y", "region", "value"]
};
```

### Enum Constraints

Add enum constraints for specific fields:

```javascript
category: { 
  type: "string", 
  enum: ["weapon", "armor", "consumable", "tool", "quest"],
  description: "Item category"
}
```

## Examples

### Example 1: Legendary Weapon

**Prompt:** "Create a legendary two-handed sword forged from dragon scales"

**Generated Output:**
```json
{
  "id": "sword_dragon_001",
  "name": "Dragonscale Greatsword",
  "rarity": "legendary",
  "image_url": "data:image/png;base64,...",
  "description": "A massive two-handed greatsword forged from iridescent dragon scales...",
  "x": -245,
  "y": 678,
  "region": "medieval_kingdom_001",
  "category": "weapon",
  "properties": {
    "damage": 85,
    "attackSpeed": "slow",
    "weight": 15,
    "twoHanded": true,
    "element": "fire",
    "special": "Deals bonus damage to dragons"
  }
}
```

### Example 2: Merchant NPC

**Prompt:** "Create a friendly dwarf merchant who sells weapons"

**Generated Output:**
```json
{
  "id": "npc_merchant_dwarf_001",
  "name": "Thorin Ironforge",
  "rarity": "rare",
  "image_url": "data:image/png;base64,...",
  "description": "A stout dwarf with a braided red beard, wearing leather apron...",
  "x": 120,
  "y": -56,
  "region": "medieval_kingdom_001",
  "chatHistory": [],
  "category": "merchant",
  "properties": {
    "hostile": false,
    "faction": "merchants_guild",
    "greeting": "Aye! Welcome to me shop, finest weapons in the realm!",
    "sells": ["swords", "axes", "shields", "armor"],
    "specialty": "weapons",
    "priceMultiplier": 1.2
  }
}
```

### Example 3: Mystical Location

**Prompt:** "Create an ancient library filled with magical tomes"

**Generated Output:**
```json
{
  "id": "loc_library_ancient_001",
  "name": "The Eternal Archives",
  "rarity": "epic",
  "image_url": "data:image/png;base64,...",
  "description": "A vast library with towering bookshelves reaching into shadows...",
  "x": 450,
  "y": -120,
  "region": "medieval_kingdom_001",
  "category": "building",
  "properties": {
    "biome": "urban",
    "safe": true,
    "canRest": false,
    "hasShop": false,
    "access": "public",
    "inhabitants": ["librarian", "scholars"],
    "features": ["spell_learning", "lore_research", "quest_clues"]
  }
}
```

## Summary

The Structured Output Testing system provides:

✅ **Type-safe entity generation** with JSON schemas
✅ **Automatic image creation** from descriptions  
✅ **Complete entities** ready for game use
✅ **Validation** to ensure data integrity
✅ **Two-model approach** for optimal results
✅ **Flexible properties** for custom game logic
✅ **Testing interface** for experimentation

Use this system to rapidly prototype game content, generate dynamic loot, create NPCs on-the-fly, and build expansive game worlds with AI assistance!

## Next Steps

1. **Experiment** with different prompts
2. **Test** all three entity types
3. **Download** generated entities
4. **Integrate** into your game code
5. **Customize** schemas for your needs
6. **Scale** to production with proper storage

Happy generating! 🎮✨

