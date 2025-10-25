import { getApiKey } from '../../config/gemini.config'
import { GEMINI_CONFIG } from '../../config/gemini.config'
import { createNpc, createItem, createLocation } from '../entity-generation'
import type { GameConfiguration, GeneratedEntities, RegionSpec } from './types'
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

  const prompt = `You are a game design orchestrator creating a historically accurate RPG experience.

USER INPUT:
Character: ${characterName}
Description: ${userDescription}
Art Style: ${artStyle}

YOUR TASK:
Generate a complete, detailed game configuration with historical accuracy and depth.

1. SCRATCHPAD (Plain text, 500-800 words):
   Write a comprehensive game design document including:
   
   - GAME TITLE & SETTING: Clear title and historical context
   - HISTORICAL PERIOD: Exact dates and historical accuracy notes
   - MAIN GOAL: Specific, achievable objective with historical basis
   - NARRATIVE ARC: Detailed story progression with 5-7 key plot points
   - ESSENTIAL ENTITIES: List all critical NPCs, locations, and items with their roles
   - CORE GAME MECHANICS: Explain 4-6 specific gameplay systems and how they work
   - WHAT MAKES IT FUN: 3-4 engaging gameplay loops and player motivations
   - HISTORICAL ACCURACY: Notes on real historical figures, events, and locations used
   - GENRE & ART STYLE: Detailed description of visual and gameplay style
   - WIN CONDITION: How the player completes the game
   - PLAYER PROGRESSION: How the character grows and what they learn

   Be specific about dates, real historical figures, actual locations, and authentic historical details.
   Make the gameplay mechanics concrete and engaging.

2. GAME RULES with comprehensive categories for ALL entity types:
   
   a) historicalPeriod: Exact time period with dates (e.g., "1271-1295 CE - Late Medieval Period, Yuan Dynasty China")
   
   b) genre: Specific genre (e.g., "historical exploration RPG", "medieval political intrigue", "ancient warfare simulator")
   
   c) artStyle: Use the exact art style provided by the user: "${artStyle}"
      - This will be used for all image generation
      - Do NOT modify or change the user's art style preference
   
   d) SEPARATE categories for each entity type:
   
   ITEM CATEGORIES (4-6 categories):
   - "common" - universal attributes (durability, weight, value)
   - 3-5 genre-specific categories with 2-3 unique attributes each
   - Examples: "trade_good", "weapon", "document", "tool", "food", "luxury_item"
   
   NPC CATEGORIES (3-5 categories):
   - "common" - universal attributes (trust, disposition, knowledge)
   - 2-4 role-specific categories with 2-3 unique attributes each
   - Examples: "merchant", "noble", "guard", "scholar", "peasant", "religious_figure"
   
   LOCATION CATEGORIES (3-5 categories):
   - "common" - universal attributes (danger_level, accessibility, population)
   - 2-4 type-specific categories with 2-3 unique attributes each
   - Examples: "city", "landmark", "wilderness", "building", "trade_post", "sacred_site"
   
   Each category must have 2-3 starting attributes with name, type, description, and reference.
   All attributes must be historically appropriate and support the game mechanics.

3. ESSENTIAL ENTITIES TO GENERATE (be specific and historically accurate):
   
   regions: 3-5 historically accurate regions at COUNTRY or CITY scale
   - Use real historical region names: "Venice", "Persian Empire", "Yuan Dynasty China", "Holy Roman Empire"
   - NOT generic names like "Starting Region" or "Final Destination"
   - Accurate biomes and geographical features
   - Historical context for each region
   
   locations: 4-6 key locations with detailed prompts
   - Include real historical locations when relevant
   - Specific architectural and cultural details
   - Clear narrative significance
   
   npcs: 3-5 essential characters with rich descriptions
   - IMPORTANT: Each NPC must be ONE PERSON ONLY - never combine multiple people
   - Example: Create separate NPCs for "Niccolò Polo" and "Maffeo Polo", not "Niccolò and Maffeo Polo"
   - Use real historical figures when appropriate
   - Include their historical role, personality, and appearance
   - Specify the region, x, and y coordinates (in km) where they should be placed
   - NPCs can be at locations or anywhere in the region
   - Explain their relationship to the player character
   
   items: 3-5 important items with historical context
   - Real historical artifacts or period-appropriate items
   - Specify the region, x, and y coordinates (in km) where they should be placed
   - Items can be at locations or anywhere in the region
   - Explain their historical significance and game purpose
   - Include cultural and material details

COORDINATE SYSTEM:
- x and y coordinates are distances IN KILOMETERS within the region (not global coordinates)
- Coordinates MUST be integers only (no decimals like 5.5)
- Place the most important/central location of each region near (0, 0)
- Example: Beijing in "China" region should be at (0, 0), not (5000, 0)
- Other locations spread out from there: (10, 5), (20, 15), etc.
- regionX and regionY are for geographical layout - which regions neighbor each other
- Use regionX/regionY to position regions on a world map scale

CRITICAL REQUIREMENTS:
- Historical accuracy is paramount - use real dates, people, places, and events
- Be specific and detailed, not vague or generic
- Categories must support concrete gameplay mechanics
- Scratchpad should be comprehensive and engaging
- All entities should have clear narrative purpose
- Regions must be at country/city scale with real historical names

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
          scratchpad: {
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
                    regionX: { type: 'number' },
                    regionY: { type: 'number' }
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
          }
        },
        required: ['scratchpad', 'gameRules', 'entitiesToGenerate']
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
export async function generateGameEntities(config: GameConfiguration): Promise<GeneratedEntities> {
  const generatedEntities: GeneratedEntities = {
    regions: [],
    locations: [],
    npcs: [],
    items: []
  }

  console.log('🎮 Starting parallel entity generation...')
  const startTime = performance.now()

  // STEP 1: Generate regions (instant, no API calls)
  generatedEntities.regions = config.entitiesToGenerate.regions.map(regionSpec => {
    const region = createRegionFromSpec(regionSpec)
    console.log(`✓ Generated region: ${region.name}`)
    return region
  })

  // STEP 2: Generate ALL entities in parallel (locations, NPCs, items)
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

/**
 * Create a region from specification
 * 
 * @param spec - Region specification
 * @returns Region object
 */
function createRegionFromSpec(spec: RegionSpec): any {
  return {
    id: `region_${spec.name.toLowerCase().replace(/\s+/g, '_')}_001`,
    name: spec.name,
    regionX: spec.regionX,
    regionY: spec.regionY,
    properties: {
      theme: spec.theme,
      biome: spec.biome,
      description: spec.description
    }
  }
}
