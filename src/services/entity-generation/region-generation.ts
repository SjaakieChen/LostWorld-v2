// Region Entity Generation Service
import type { Region } from '../../types/region.types'
import type {
  GameRules,
  GenerationResult,
  GeminiResponse,
} from './types'
import { STRUCTURED_FLASH_LITE_MODEL, STRUCTURED_API_BASE_URL } from './core'
import { getApiKey } from '../../config/gemini.config'

// Helper function to clean JSON responses that may contain markdown code blocks
function cleanJsonResponse(text: string): string {
  let cleaned = text.trim()
  
  // Remove markdown code blocks if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3)
  }
  
  // Remove ``` at end
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3)
  }
  
  return cleaned.trim()
}

/**
 * Generate region details using structured output
 * Simple generation - just name, theme, biome, description
 */
async function generateRegionDetails(
  prompt: string,
  gameRules: GameRules
): Promise<{
  name: string
  theme: string
  biome: string
  description: string
  responseTime: string
}> {
  const API_KEY = getApiKey()
  const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_FLASH_LITE_MODEL}:generateContent?key=${API_KEY}`

  const enhancedPrompt = `You are generating a region for a historical game set in ${gameRules.historicalPeriod}.

User Request: ${prompt}

Generate a region with:
- name: A real or historically appropriate region name
- theme: Cultural/political theme of the region
- biome: Geographical environment (e.g., temperate forest, desert, mountains, urban, coastal, etc.)
- description: 2-3 sentences describing the region's geography, culture, and historical significance

Be historically accurate and specific to the time period: ${gameRules.historicalPeriod}
Genre: ${gameRules.genre}

Output as JSON with fields: name, theme, biome, description`

  const schema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      theme: { type: 'string' },
      biome: { type: 'string' },
      description: { type: 'string' }
    },
    required: ['name', 'theme', 'biome', 'description']
  }

  const requestBody = {
    contents: [{ parts: [{ text: enhancedPrompt }] }],
    generationConfig: {
      response_mime_type: 'application/json',
      response_schema: schema,
    },
  }

  const startTime = performance.now()

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    const endTime = performance.now()
    const responseTime = (endTime - startTime).toFixed(2)

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`API Error: ${errorData.error?.message || response.statusText}`)
    }

    const data: GeminiResponse = await response.json()
    const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    console.log('Raw LLM response (region):', jsonText.substring(0, 200) + '...')
    const cleanedJson = cleanJsonResponse(jsonText)
    const regionDetails = JSON.parse(cleanedJson)

    return {
      ...regionDetails,
      responseTime
    }
  } catch (error: any) {
    throw new Error(`Region generation error: ${error.message}`)
  }
}

/**
 * Create a region dynamically
 * Can be called by orchestrator or when player ventures into new areas
 * 
 * @param prompt - Description of what region to generate
 * @param gameRules - Game configuration
 * @param regionX - X coordinate on world map grid
 * @param regionY - Y coordinate on world map grid
 * @returns GenerationResult with the region
 */
export async function createRegion(
  prompt: string,
  gameRules: GameRules,
  regionX: number,
  regionY: number
): Promise<GenerationResult<Region>> {
  console.log(`\n=== Creating region at (${regionX}, ${regionY}) ===`)
  console.log(`Prompt: ${prompt}`)

  const startTime = performance.now()

  try {
    // Generate region details using LLM
    const details = await generateRegionDetails(prompt, gameRules)
    
    const endTime = performance.now()
    const totalTime = ((endTime - startTime) / 1000).toFixed(2)

    // Create region with simple structure
    const region: Region = {
      id: `region_${details.name.toLowerCase().replace(/\s+/g, '_')}_001`,
      name: details.name,
      regionX: regionX,
      regionY: regionY,
      properties: {
        theme: details.theme,
        biome: details.biome,
        description: details.description
      }
    }

    console.log(`✓ Region created in ${totalTime}s: ${region.name}`)

    return {
      entity: region,
      newAttributes: {}, // No attributes for regions
      timing: {
        baseEntity: details.responseTime,
        attributes: '0',
        image: '0',
        total: totalTime
      },
      debugData: {
        step1: {
          model: STRUCTURED_FLASH_LITE_MODEL,
          prompt: prompt,
          response: JSON.stringify(details, null, 2)
        },
        step2: {
          note: 'Region generation does not require attribute enrichment.'
        },
        step3: {
          note: 'Region generation does not invoke image workflows.'
        }
      }
    }
  } catch (error) {
    console.error('Region creation failed:', error)
    throw error
  }
}

