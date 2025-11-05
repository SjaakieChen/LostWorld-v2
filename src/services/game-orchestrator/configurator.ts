import { getApiKey } from '../../config/gemini.config'
import { GEMINI_CONFIG } from '../../config/gemini.config'
import { createNpc, createItem, createLocation, createRegion } from '../entity-generation'
import type { GameConfiguration, GeneratedEntities } from './types'
import { appendToTimeline } from '../../context/timeline'
// GameRules type is used in the function parameters

const ORCHESTRATOR_MODEL = GEMINI_CONFIG.models.pro
const API_BASE_URL = GEMINI_CONFIG.apiBase

/**
 * Generate a complete game configuration using Gemini 2.5 Pro
 * 
 * @param characterName - Name of the character
 * @param userDescription - Free-form description of the game/character
 * @returns Promise<GameConfiguration>
 */
export async function generateGameConfiguration(
  characterName: string,
  userDescription: string,
  artStyle: string
): Promise<GameConfiguration> {
  const API_KEY = getApiKey()
  const endpoint = `${API_BASE_URL}/${ORCHESTRATOR_MODEL}:generateContent?key=${API_KEY}`

  const prompt = `You are a game design orchestrator creating the intial start of a game. The game is a historical role playing game.
  How our game is structured is as follows:

  The interface exists of 3 main panels:
  - The player panel (left): This is the panel that shows a image of our player charchter and it displays 2 status bars, one for health and one for energy.
  It then displays 6 bars which are the stats you will be generating. These can and will change during the game, this is the main way for us to signal progression 
  and other developments. These can be treated as currency skill or anything else.
  - The interface panel (middle): This is the panel that shows the location image of where we currently are. It will also display the npc if we are interacting with them.
  - The interaction panel (right): This is the panel that shows the inventory of the player. It displays a grid which is the map for the region we are in. 
  where the player can click on grids to move to.
  It contains a inventory section with 12 slots which are the inventory of the player. these can be moved around to different slots.
  It contains a interaction section with 3 input slots and 3 output slots. The output depends on what a llm deceide a plausible interaction might be 
  depending on the context. Your attributes and categories and GuideScratchpad will set the stage to provide a framework and context for future LLM's to
  consistently perform immersive or engaging interactions.

USER INPUT:
Character: ${characterName}
Description: ${userDescription}
Art Style: ${artStyle}

YOUR TASK:
Generate a complete, detailed game configuration with historical accuracy and depth.

1. THE GUIDE SCRATCHPAD (Plain text, 1000-1500 words):
   Write a comprehensive game design document including:
   
   - GAME TITLE & SETTING: Clear title and historical context
   - HISTORICAL PERIOD: A description of the time period relevant to the game. (for example victorian era or during the age of discovering the new world.)
   - MAIN GOAL: Specific, achievable objective with historical basis
   - PROGRESSION SYSTEM: How progression will be in the game. (for example, renown will be gained through conquering regions for playing as alexander the Great, or scientific understanding will be gained by increasing intelligence and finding clues playing as Newton.)
   - ESSENTIAL ENTITIES: List critical NPCs, locations, and items with their roles. Which need to be there for the game to be tailord to the historical charachter/timeperiod. (so you cant have a game about the crusades without jerusalem or the pope)
   - CUSTOM STATS: What the 6 different stats represent and how their value needs to shape game interactions.
   - CATEGORIES: How the different categories of items,location and npc's should affect how they are used and interacted with.
   - CORE GAME MECHANICS: Explain the specific gameplay systems and how they work. (this is linked to both the progression system and essential entities, determine a balanced quantity of how progression will be achieved.)
   - WHAT MAKES IT FUN: what makes the game fun and engaging for the player. (for example, discovering new technologies, trading goods, or exploring new regions.)
   - DIFFICULTY: how difficult should the game be, some game types might be better easy while genres like survival need to be hard. Describe what makes the game hard. fail conditions and how difficulty should be managed.
   - HISTORICAL ACCURACY: Notes on rules customs and subtleties that need to be followed for interactions to be historically immersive.
   - Scale of Regions and location: How the regions and locations are scaled and the overarching vision the geography of the world. 
   - GENRE: What type of genre is it.
   

   Be specific about dates, real historical figures, actual locations, and authentic historical details.
   Make the gameplay mechanics concrete and engaging.

2. GAME RULES with comprehensive categories for ALL entity types:
   
   a) historicalPeriod: a relevant term for the time period according to the game.
   
   b) genre: Specific genre (e.g., "Exploration and roleplay", "political intrigue", "warfare simulator")
   
   c) artStyle: Use the exact art style provided by the user: "${artStyle}"
      - This will be used for all image generation
      - Do NOT modify or change the user's art style preference
   
   d) SEPARATE categories for each entity type:
   
   ITEM CATEGORIES (4-6 categories):
   - "common" - universal attributes (durability, weight, value)
   - 3-5 genre-specific categories with 2-3 unique attributes each.
   - Examples: "trade_good", "weapon", "document", "tool", "food", "luxury_item"
   - Depending on the vision for the game our example categories might not be relevant, so you are incouraged to change them to fit the game.
   
   NPC CATEGORIES (3-5 categories):
   - "common" - universal attributes (trust, disposition, knowledge)
   - 2-4 role-specific categories with 2-3 unique attributes each
   - Examples: "merchant", "noble", "guard", "scholar", "peasant", "religious_figure"
   - Depending on the vision for the game our example categories might not be relevant, so you are incouraged to change them to fit the game.
   
   LOCATION CATEGORIES (3-5 categories):
   - "common" - universal attributes (danger_level, accessibility, population)
   - 2-4 type-specific categories with 2-3 unique attributes each
   - Examples: "city", "landmark", "wilderness", "building", "trade_post", "sacred_site"
   - Depending on the vision for the game our example categories might not be relevant, so you are incouraged to change them to fit the game.
       
   Each category must have 2-3 starting attributes with name, type, description, and reference.
   All attributes must be historically appropriate and support the game mechanics.

3. ESSENTIAL ENTITIES TO GENERATE (be specific and historically accurate):
   
   regions: 3-5 historically accurate regions
   
   REGION SCALE & GRID (CRITICAL):
   - First, decide on a CONSISTENT scale for ALL regions (continent/country/province/city/district)
   - Choose a scale so the ENTIRE game world fits in a ~5x5 grid (max 25 regions)
   - ALL regions MUST be at the SAME scale - don't mix continent-sized with city-sized regions
   - Adjacent regions in the real world should be adjacent on the grid (1 unit apart)
   - Leave gaps for oceans, seas, deserts, or unpopulated areas
   
   Scale Guidelines:
   • CONTINENT scale: For global/multi-continental games
   • COUNTRY/KINGDOM scale: For single-continent games
   • PROVINCE/REGION scale: For smaller geographical areas
   • CITY/DISTRICT scale: For city-focused games
   
   Examples of Appropriate Scales:
   ✓ WW2 Global: Use CONTINENTS (Europe, North America, Asia)
   ✓ Medieval Europe: Use KINGDOMS (Holy Roman Empire, France, England)
   ✓ Ancient Mediterranean: Use CULTURAL REGIONS (Greece, Egypt, Persia)
   ✓ Victorian London: Use DISTRICTS (Westminster, East End)
   
   ✗ WW2 with COUNTRIES = 50+ regions (TOO MANY)
   ✗ Global game with CITIES = 1000+ regions (TOO MANY)
   
   GRID SPACING RULES:
   - Adjacent regions (sharing a border) = 1 unit apart
   - Regions separated = 2-4 leave gaps
   - The furthest regions should be within ~5 units in region coordinates of origin in each direction
   - Use integer coordinates only
   
   Realistic Grid Examples:
   
   Example 1 - WW2 Global (CONTINENT scale, fits in 5x5):
     * "Western Europe" at regionX: 0, regionY: 0
     * "Eastern Europe" at regionX: 1, regionY: 0 (adjacent, shares border)
     * "North Africa" at regionX: 0, regionY: -1 (adjacent, shares Mediterranean)
     * "East Asia" at regionX: 3, regionY: 0
     * "North America" at regionX: -4, regionY: 0 (Atlantic gap of 4 units)
   
   For each region provide:
   - name: Real historical region name appropriate to the chosen scale
   - theme: Cultural/political theme of the region
   - biome: Geographical environment (desert, temperate forest, mountains, urban, coastal, etc.)
   - description: Rich historical and geographical details
   - regionX, regionY: Integer coordinates with realistic adjacency
   
   locations: 4-6 key locations with detailed prompts. Locations can be any scale smaller than the region they are in.
   - for example a forbidden palace. Or principals office.
   - Include real historical locations when relevant
   - Specific architectural and cultural details
   - Clear narrative significance
   
   npcs: 3-5 essential characters with rich descriptions
   - IMPORTANT: Each NPC must be ONE PERSON ONLY - never combine multiple people
   - Use real historical figures when appropriate
   - Include their historical role, personality, and appearance
   - Specify the region, x, and y coordinates (in km) where they should be placed
   - NPCs can be at any location without the location being specified. so if we want to place a merchant at x=10, y=10 that is fine, the location can be generated later.
   - these essential charachters should be relevant to our historical period or progression system.
   
   items: 3-5 important items with historical context
   - Real historical artifacts or period-appropriate items
   - Specify the region, x, and y coordinates (are in km within the region) where they should be placed
   - Items can be at locations or anywhere in the region
   - Explain their historical significance and game purpose
   - Include cultural and material details

COORDINATE SYSTEM:

REGION GRID (5x5 maximum):
- FIRST: Choose scale so entire game world fits in ~5x5 region grid (max 25 regions)
- For global games: Use CONTINENT/SUBCONTINENT scale
- For regional games: Use COUNTRY/LARGE REGION scale
- For city games: Use DISTRICT/NEIGHBORHOOD scale
- ALL regions MUST be at the SAME scale
- Adjacent regions (sharing borders) = 1 unit apart on grid
- Regions with barriers (ocean/mountains) = 2+ units apart
- regionX and regionY position regions on the world map grid
- Coordinates MUST be integers only (no decimals)

ENTITY POSITIONING (within regions):
- x and y coordinates are distances IN KILOMETERS within the region
- Place the most important/central location near (0, 0)
- Example: Beijing in "China" region at (0, 0), Great Wall at (50, 30)
- Other entities spread out from there with realistic distances

PLAYER STATS (Exactly 6 stats based on progression system):
Generate exactly 6 key stats/currencies that align with the game's progression system.

For each stat, provide:
1. Starting tier (1-5) appropriate for the character
2. Starting value (0-100) for that tier
3. 5 tier names representing progression levels

Tier names should be:
- Tier 1: Beginner/Low level (e.g., "Peasant" for wealth)
- Tier 2: Developing (e.g., "Merchant")
- Tier 3: Established (e.g., "Aristocrat")
- Tier 4: Elite (e.g., "Monarch")
- Tier 5: Legendary/Maximum (e.g., "Emperor")

Requirements:
- Historically appropriate for the time period
- Thematically consistent with the stat
- Progressively more impressive

Starting tier should reflect the character's background:
- Most characters start at tier 1
- Important/noble characters might start at tier 2-3
- Legendary figures might start at tier 4 (never tier 5)

Examples:
- Renown-based game: renown, influence, military_skill, diplomacy, loyalty, prestige
- Trading game: wealth, reputation, negotiation, market_knowledge, connections, inventory_capacity
- Exploration game: discovery, survival, navigation, endurance, observation, courage

Example for wealth stat:
stat1_tier: 1
stat1_value: 50
stat1_tier_names: ["Peasant", "Merchant", "Aristocrat", "Monarch", "Emperor"]

Example for renown stat:
stat2_tier: 2
stat2_value: 30
stat2_tier_names: ["Unknown", "Recognized", "Famous", "Renowned", "Legendary"]

STARTING LOCATION:
Specify which location the player should start at. This should be one of the key locations you're generating.
Provide the region ID and x,y coordinates that match one of your generated locations.

Example:
{
  "startingLocation": {
    "region": "region_medieval_kingdom_001",
    "x": 0,
    "y": 0
  }
}

CRITICAL REQUIREMENTS:
- Historical accuracy is paramount - use real dates, people, places, and events
- Be specific and detailed, not vague or generic
- Categories must support concrete gameplay mechanics
- TheGuideScratchpad should be comprehensive and engaging
- All entities should have clear narrative purpose
- Regions must have a larger scale than locations with real historical names

Output as JSON following the required schema.`

  const requestBody = {
    contents: [{ 
      parts: [{ text: prompt }] 
    }],
    generationConfig: {
      response_mime_type: 'application/json',
      response_schema: {
        type: 'object',
        properties: {
          theGuideScratchpad: {
            type: 'string',
            description: 'Plain text game design notes, narrative, mechanics, and key entities'
          },
          gameRules: {
            type: 'object',
            properties: {
              historicalPeriod: { type: 'string' },
              genre: { type: 'string' },
              artStyle: { type: 'string' },
              itemCategories: {
                type: 'array',
                description: 'Categories for items',
                items: {
                  type: 'object',
                  properties: {
                    name: { 
                      type: 'string',
                      description: 'Category name (e.g., trade_good, weapon, document)'
                    },
                    attributes: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string', description: 'Attribute name' },
                          type: { 
                            type: 'string', 
                            enum: ['integer', 'number', 'string', 'boolean', 'array'] 
                          },
                          description: { type: 'string', description: 'What this attribute represents' },
                          reference: { type: 'string', description: 'Reference scale or examples' }
                        },
                        required: ['name', 'type', 'description', 'reference']
                      }
                    }
                  },
                  required: ['name', 'attributes']
                }
              },
              npcCategories: {
                type: 'array',
                description: 'Categories for NPCs',
                items: {
                  type: 'object',
                  properties: {
                    name: { 
                      type: 'string',
                      description: 'Category name (e.g., merchant, noble, guard)'
                    },
                    attributes: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string', description: 'Attribute name' },
                          type: { 
                            type: 'string', 
                            enum: ['integer', 'number', 'string', 'boolean', 'array'] 
                          },
                          description: { type: 'string', description: 'What this attribute represents' },
                          reference: { type: 'string', description: 'Reference scale or examples' }
                        },
                        required: ['name', 'type', 'description', 'reference']
                      }
                    }
                  },
                  required: ['name', 'attributes']
                }
              },
              locationCategories: {
                type: 'array',
                description: 'Categories for locations',
                items: {
                  type: 'object',
                  properties: {
                    name: { 
                      type: 'string',
                      description: 'Category name (e.g., city, landmark, building)'
                    },
                    attributes: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string', description: 'Attribute name' },
                          type: { 
                            type: 'string', 
                            enum: ['integer', 'number', 'string', 'boolean', 'array'] 
                          },
                          description: { type: 'string', description: 'What this attribute represents' },
                          reference: { type: 'string', description: 'Reference scale or examples' }
                        },
                        required: ['name', 'type', 'description', 'reference']
                      }
                    }
                  },
                  required: ['name', 'attributes']
                }
              }
            },
            required: ['historicalPeriod', 'genre', 'artStyle', 'itemCategories', 'npcCategories', 'locationCategories']
          },
          playerStats: {
            type: 'object',
            description: 'Player stats/currencies (exactly 6 stats based on game progression system)',
            properties: {
              stat1_name: { type: 'string', description: 'Name of first stat' },
              stat1_value: { type: 'number', description: 'Value 0-100' },
              stat1_tier: { type: 'number', description: 'Starting tier 1-5' },
              stat1_tier_names: {
                type: 'array',
                description: '5 tier names for progression',
                items: { type: 'string' },
                minItems: 5,
                maxItems: 5
              },
              stat2_name: { type: 'string', description: 'Name of second stat' },
              stat2_value: { type: 'number', description: 'Value 0-100' },
              stat2_tier: { type: 'number', description: 'Starting tier 1-5' },
              stat2_tier_names: {
                type: 'array',
                items: { type: 'string' },
                minItems: 5,
                maxItems: 5
              },
              stat3_name: { type: 'string', description: 'Name of third stat' },
              stat3_value: { type: 'number', description: 'Value 0-100' },
              stat3_tier: { type: 'number', description: 'Starting tier 1-5' },
              stat3_tier_names: {
                type: 'array',
                items: { type: 'string' },
                minItems: 5,
                maxItems: 5
              },
              stat4_name: { type: 'string', description: 'Name of fourth stat' },
              stat4_value: { type: 'number', description: 'Value 0-100' },
              stat4_tier: { type: 'number', description: 'Starting tier 1-5' },
              stat4_tier_names: {
                type: 'array',
                items: { type: 'string' },
                minItems: 5,
                maxItems: 5
              },
              stat5_name: { type: 'string', description: 'Name of fifth stat' },
              stat5_value: { type: 'number', description: 'Value 0-100' },
              stat5_tier: { type: 'number', description: 'Starting tier 1-5' },
              stat5_tier_names: {
                type: 'array',
                items: { type: 'string' },
                minItems: 5,
                maxItems: 5
              },
              stat6_name: { type: 'string', description: 'Name of sixth stat' },
              stat6_value: { type: 'number', description: 'Value 0-100' },
              stat6_tier: { type: 'number', description: 'Starting tier 1-5' },
              stat6_tier_names: {
                type: 'array',
                items: { type: 'string' },
                minItems: 5,
                maxItems: 5
              }
            },
            required: ['stat1_name', 'stat1_value', 'stat1_tier', 'stat1_tier_names', 'stat2_name', 'stat2_value', 'stat2_tier', 'stat2_tier_names', 'stat3_name', 'stat3_value', 'stat3_tier', 'stat3_tier_names', 'stat4_name', 'stat4_value', 'stat4_tier', 'stat4_tier_names', 'stat5_name', 'stat5_value', 'stat5_tier', 'stat5_tier_names', 'stat6_name', 'stat6_value', 'stat6_tier', 'stat6_tier_names']
          },
          entitiesToGenerate: {
            type: 'object',
            properties: {
              regions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    theme: { type: 'string' },
                    biome: { type: 'string' },
                    description: { type: 'string' },
                    regionX: { type: 'integer' },
                    regionY: { type: 'integer' }
                  },
                  required: ['name', 'theme', 'biome', 'description', 'regionX', 'regionY']
                }
              },
              locations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    prompt: { type: 'string' },
                    region: { type: 'string' },
                    x: { type: 'integer' },
                    y: { type: 'integer' },
                    significance: { type: 'string' }
                  },
                  required: ['prompt', 'region', 'x', 'y', 'significance']
                }
              },
              npcs: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    prompt: { type: 'string' },
                    region: { type: 'string' },
                    x: { type: 'integer' },
                    y: { type: 'integer' },
                    significance: { type: 'string' }
                  },
                  required: ['prompt', 'region', 'x', 'y', 'significance']
                }
              },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    prompt: { type: 'string' },
                    region: { type: 'string' },
                    x: { type: 'integer' },
                    y: { type: 'integer' },
                    significance: { type: 'string' }
                  },
                  required: ['prompt', 'region', 'x', 'y', 'significance']
                }
              }
            },
            required: ['regions', 'locations', 'npcs', 'items']
          },
          startingLocation: {
            type: 'object',
            description: 'Starting location coordinates for the player',
            properties: {
              region: { type: 'string', description: 'Region ID where player starts' },
              x: { type: 'integer', description: 'X coordinate in km' },
              y: { type: 'integer', description: 'Y coordinate in km' }
            },
            required: ['region', 'x', 'y']
          }
        },
        required: ['theGuideScratchpad', 'gameRules', 'playerStats', 'startingLocation', 'entitiesToGenerate']
      },
      temperature: 0.7
    }
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`API Error: ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    const config = JSON.parse(jsonText)

    // Initialize theTimeline as empty array
    config.theTimeline = []

    return config as GameConfiguration
  } catch (error: any) {
    throw new Error(`Game configuration generation failed: ${error.message}`)
  }
}

/**
 * Generate all game entities based on the configuration
 * 
 * @param config - Game configuration from orchestrator
 * @returns Promise<GeneratedEntities>
 */
export async function generateGameEntities(config: GameConfiguration, currentTurn: number): Promise<GeneratedEntities> {
  const generatedEntities: GeneratedEntities = {
    regions: [],
    locations: [],
    npcs: [],
    items: []
  }

  console.log('🎮 Starting parallel entity generation...')
  const startTime = performance.now()

  // STEP 1: Generate regions with LLM in parallel
  console.log(`⚡ Generating ${config.entitiesToGenerate.regions.length} regions...`)
  const regionResults = await Promise.all(
    config.entitiesToGenerate.regions.map(regionSpec =>
      createRegion(
        `${regionSpec.description} (Theme: ${regionSpec.theme}, Biome: ${regionSpec.biome})`,
        config.gameRules,
        regionSpec.regionX,
        regionSpec.regionY
      ).then(result => {
        console.log(`✓ Generated region: ${result.entity.name}`)
        // Append to timeline
        config.theTimeline = appendToTimeline(
          config.theTimeline,
          '[generation][region]',
          `${result.entity.name} regionX:${result.entity.regionX}, regionY:${result.entity.regionY}`,
          currentTurn
        )
        return result
      }).catch(error => {
        console.error(`❌ Failed to generate region: ${regionSpec.name}`, error)
        return null
      })
    )
  )

  generatedEntities.regions = regionResults
    .filter(result => result !== null)
    .map(result => result!.entity)

  // STEP 2: Generate ALL other entities in parallel (locations, NPCs, items)
  const totalEntities = 
    config.entitiesToGenerate.locations.length +
    config.entitiesToGenerate.npcs.length +
    config.entitiesToGenerate.items.length

  console.log(`⚡ Generating ${totalEntities} entities in parallel (${config.entitiesToGenerate.locations.length} locations, ${config.entitiesToGenerate.npcs.length} NPCs, ${config.entitiesToGenerate.items.length} items)...`)

  const [locationResults, npcResults, itemResults] = await Promise.all([
    // All locations in parallel
    Promise.all(
      config.entitiesToGenerate.locations.map(locSpec =>
        createLocation(
          locSpec.prompt,
          config.gameRules,
          locSpec.region,
          locSpec.x,
          locSpec.y
        ).then(result => {
          console.log(`✓ Generated location: ${result.entity.name}`)
          // Append to timeline
          config.theTimeline = appendToTimeline(
            config.theTimeline,
            '[generation][location]',
            `${result.entity.name} location x:${result.entity.x}, location y:${result.entity.y}, regionname: ${result.entity.region}`,
            currentTurn
          )
          return result
        }).catch(error => {
          console.error(`❌ Failed to generate location: ${locSpec.prompt}`, error)
          return null
        })
      )
    ),

    // All NPCs in parallel
    Promise.all(
      config.entitiesToGenerate.npcs.map(npcSpec =>
        createNpc(
          npcSpec.prompt,
          config.gameRules,
          npcSpec.region,  // Use region from orchestrator
          npcSpec.x,       // Use x from orchestrator
          npcSpec.y        // Use y from orchestrator
        ).then(result => {
          console.log(`✓ Generated NPC: ${result.entity.name}`)
          // Append to timeline
          config.theTimeline = appendToTimeline(
            config.theTimeline,
            '[generation][npc]',
            `${result.entity.name} location x:${result.entity.x}, location y:${result.entity.y}, regionname: ${result.entity.region}`,
            currentTurn
          )
          return result
        }).catch(error => {
          console.error(`❌ Failed to generate NPC: ${npcSpec.prompt}`, error)
          return null
        })
      )
    ),

    // All items in parallel
    Promise.all(
      config.entitiesToGenerate.items.map(itemSpec =>
        createItem(
          itemSpec.prompt,
          config.gameRules,
          itemSpec.region,  // Use region from orchestrator
          itemSpec.x,       // Use x from orchestrator
          itemSpec.y        // Use y from orchestrator
        ).then(result => {
          console.log(`✓ Generated item: ${result.entity.name}`)
          // Append to timeline
          config.theTimeline = appendToTimeline(
            config.theTimeline,
            '[generation][item]',
            `${result.entity.name} location x:${result.entity.x}, location y:${result.entity.y}, regionname: ${result.entity.region}`,
            currentTurn
          )
          return result
        }).catch(error => {
          console.error(`❌ Failed to generate item: ${itemSpec.prompt}`, error)
          return null
        })
      )
    )
  ])

  // Filter out failed generations
  generatedEntities.locations = locationResults
    .filter(result => result !== null)
    .map(result => result!.entity)

  generatedEntities.npcs = npcResults
    .filter(result => result !== null)
    .map(result => result!.entity)

  generatedEntities.items = itemResults
    .filter(result => result !== null)
    .map(result => result!.entity)

  const endTime = performance.now()
  const totalTime = ((endTime - startTime) / 1000).toFixed(2)

  console.log('🎮 Entity generation complete!')
  console.log(`✅ Generated in ${totalTime}s: ${generatedEntities.regions.length} regions, ${generatedEntities.locations.length} locations, ${generatedEntities.npcs.length} NPCs, ${generatedEntities.items.length} items`)
  
  return generatedEntities
}

