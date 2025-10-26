// Player Character Generation Service
import type { PlayerCharacter, OrchestratorPlayerStats } from './types'
import type { GameRules, PlayerStats, PlayerStatus } from '../entity-generation/types'
import { STRUCTURED_IMAGE_MODEL, STRUCTURED_API_BASE_URL } from '../entity-generation/core'
import { getApiKey } from '../../config/gemini.config'

/**
 * Convert orchestrator's player stats format to PlayerStats
 */
function convertOrchestratorStats(orchestratorStats: OrchestratorPlayerStats): PlayerStats {
  return {
    [orchestratorStats.stat1_name]: {
      value: orchestratorStats.stat1_value,
      tier: orchestratorStats.stat1_tier,
      tierNames: orchestratorStats.stat1_tier_names
    },
    [orchestratorStats.stat2_name]: {
      value: orchestratorStats.stat2_value,
      tier: orchestratorStats.stat2_tier,
      tierNames: orchestratorStats.stat2_tier_names
    },
    [orchestratorStats.stat3_name]: {
      value: orchestratorStats.stat3_value,
      tier: orchestratorStats.stat3_tier,
      tierNames: orchestratorStats.stat3_tier_names
    },
    [orchestratorStats.stat4_name]: {
      value: orchestratorStats.stat4_value,
      tier: orchestratorStats.stat4_tier,
      tierNames: orchestratorStats.stat4_tier_names
    },
    [orchestratorStats.stat5_name]: {
      value: orchestratorStats.stat5_value,
      tier: orchestratorStats.stat5_tier,
      tierNames: orchestratorStats.stat5_tier_names
    },
    [orchestratorStats.stat6_name]: {
      value: orchestratorStats.stat6_value,
      tier: orchestratorStats.stat6_tier,
      tierNames: orchestratorStats.stat6_tier_names
    }
  }
}

/**
 * Generate full-body player portrait
 */
async function generatePlayerImage(
  characterName: string,
  characterDescription: string,
  historicalPeriod: string,
  artStyle: string
): Promise<{
  imageBase64: string
  responseTime: string
}> {
  const API_KEY = getApiKey()
  const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_IMAGE_MODEL}:generateContent?key=${API_KEY}`

  const imagePrompt = `Generate a full body character portrait in ${artStyle} style.

Character Name: ${characterName}
Historical Setting: ${historicalPeriod}

Description:
${characterDescription}

Style Requirements:
- ${artStyle} art style
- Full body character portrait
- Character in starfish position (standing pose with arms and legs spread, full body visible from head to toe)
- SQUARE FORMAT (1:1 aspect ratio)
- Character centered in frame
- Full body visible from head to toe, centered in frame
- Period-appropriate clothing and appearance
- Good detail for use as a game character portrait
- no text should be in the image
- have a minimal non-distracting background that is appropriate for the historical period
`

  const requestBody = {
    contents: [{ parts: [{ text: imagePrompt }] }],
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

    const data: any = await response.json()
    console.log('Player Image Generation Response:', data)

    // Check for safety blocks first
    const finishReason = data.candidates?.[0]?.finishReason
    if (finishReason === 'SAFETY') {
      const safetyRatings = data.candidates?.[0]?.safetyRatings || []
      console.warn('🛡️ Image generation blocked by SAFETY filters:', safetyRatings)
      console.warn('Safety details:', JSON.stringify(safetyRatings, null, 2))
      // Return placeholder instead of throwing
      return {
        imageBase64: '', // Empty placeholder
        responseTime,
      }
    }

    // Extract image from response - check multiple possible structures
    const parts = data.candidates?.[0]?.content?.parts || []
    let imageBase64 = ''

    for (const part of parts) {
      if (part.inline_data?.data) {
        imageBase64 = part.inline_data.data
        break
      }
      if (part.inlineData?.data) {
        imageBase64 = part.inlineData.data
        break
      }
    }

    if (!imageBase64) {
      console.warn('⚠️ No image data in response, using placeholder')
      console.log('Response structure:', JSON.stringify(data, null, 2))
      return {
        imageBase64: '', // Empty placeholder
        responseTime,
      }
    }

    return {
      imageBase64,
      responseTime,
    }
  } catch (error: any) {
    console.warn('⚠️ Player image generation failed:', error.message)
    // Return placeholder instead of throwing
    return {
      imageBase64: '',
      responseTime: '0',
    }
  }
}

/**
 * Create complete player character
 * 
 * @param characterName - Name of the player character
 * @param characterDescription - Description of the player character
 * @param orchestratorStats - Stats from orchestrator (6 stat name/value/tier pairs)
 * @param gameRules - Game configuration
 * @param startingLocation - Starting location coordinates from orchestrator
 * @returns PlayerCharacter with full portrait and stats
 */
export async function createPlayer(
  characterName: string,
  characterDescription: string,
  orchestratorStats: OrchestratorPlayerStats,
  gameRules: GameRules,
  startingLocation: { region: string; x: number; y: number }
): Promise<PlayerCharacter> {
  
  console.log('\n=== Creating Player Character ===')
  console.log(`Character: ${characterName}`)
  console.log(`Description: ${characterDescription}`)
  
  try {
    // Step 1: Convert orchestrator stats to PlayerStats
    const stats = convertOrchestratorStats(orchestratorStats)
    console.log('✓ Player stats converted:', stats)
    
    // Step 2: Hardcoded status (health + energy at 100)
    const status: PlayerStatus = {
      health: 100,
      maxHealth: 100,
      energy: 100,
      maxEnergy: 100
    }
    console.log('✓ Player status initialized:', status)
    
    // Step 3: Generate full-body portrait
    console.log('Step 3: Generating full-body player portrait...')
    const { imageBase64, responseTime } = await generatePlayerImage(
      characterName,
      characterDescription,
      gameRules.historicalPeriod,
      gameRules.artStyle
    )
    console.log('✓ Player portrait generated in', responseTime, 'ms')
    if (!imageBase64) {
      console.log('⚠️ Using placeholder image (generation failed or was blocked)')
    }
    
    // Step 4: Format starting location as string
    const startingLocationStr = `${startingLocation.region}:${startingLocation.x}:${startingLocation.y}`
    
    // Use image_url if imageBase64 exists, otherwise empty string for placeholder
    const image_url = imageBase64 
      ? `data:image/png;base64,${imageBase64}`
      : ''
    
    const playerCharacter: PlayerCharacter = {
      name: characterName,
      description: characterDescription,
      stats,
      status,
      startingLocation: startingLocationStr,
      background: characterDescription,
      image_url
    }
    
    console.log('✓ Complete player character created')
    console.log('📍 Starting location:', startingLocationStr)
    
    return playerCharacter
  } catch (error) {
    console.error('Player creation failed:', error)
    // Return player with placeholder data even on error
    const startingLocationStr = `${startingLocation.region}:${startingLocation.x}:${startingLocation.y}`
    return {
      name: characterName,
      description: characterDescription,
      stats: convertOrchestratorStats(orchestratorStats),
      status: {
        health: 100,
        maxHealth: 100,
        energy: 100,
        maxEnergy: 100
      },
      startingLocation: startingLocationStr,
      background: characterDescription,
      image_url: ''
    }
  }
}
