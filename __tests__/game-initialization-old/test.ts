// Historical Character Selection Testing with Gemini 2.5 Pro
// TypeScript test interface for character selection

import { createItem } from '../entity-generation/item-generation'
import { createNpc } from '../entity-generation/npc-generation'
import { createLocation } from '../entity-generation/location-generation'
import type { GameContext, GameRules } from '../entity-generation/types'

const GEMINI_PRO_MODEL = 'gemini-2.5-pro'
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

// Get API key from Vite environment
function getApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  if (!key) {
    throw new Error('VITE_GEMINI_API_KEY not found in environment variables')
  }
  return key
}

// Global variables for character data
let currentCharacterName = ''
let currentCharacterDescription = ''

/**
 * Build GameContext based on character information
 */
function buildCharacterGameContext(characterName: string, characterDescription: string): GameContext {
  // Extract historical period from character name
  const historicalPeriod = extractHistoricalPeriod(characterName)
  
  // Use character description to enhance context
  const hasMilitaryBackground = characterDescription.toLowerCase().includes('military') || 
                               characterDescription.toLowerCase().includes('warrior') ||
                               characterDescription.toLowerCase().includes('soldier')
  
  return {
    player: {
      stats: {
        strength: hasMilitaryBackground ? 18 : 15,
        dexterity: 12,
        intelligence: 18,
        wisdom: 14,
        stealth: hasMilitaryBackground ? 8 : 10,
        charisma: 16
      },
      status: {
        health: 100,
        maxHealth: 100,
        stamina: 100,
        maxStamina: 100,
        hunger: 50,
        maxHunger: 100,
        mana: 80,
        maxMana: 100
      }
    },
    world: {
      timeOfDay: 'afternoon',
      season: 'spring',
      weather: 'clear'
    },
    spatial: {
      currentLocation: {
        id: 'loc_character_start',
        name: `${characterName}'s Starting Location`,
        description: `A location appropriate for ${characterName}`,
        category: 'historical',
        x: 0,
        y: 0,
        region: 'character_region',
        rarity: 'legendary'
      },
      currentRegion: {
        id: 'region_character',
        name: `${characterName}'s Historical Period`,
        theme: historicalPeriod.toLowerCase(),
        biome: 'temperate',
        description: `The world during ${characterName}'s time`,
        regionX: 0,
        regionY: 0
      }
    },
    meta: {
      generationPurpose: 'world_building',
      preferredThemes: [historicalPeriod.toLowerCase(), 'historical', 'authentic'],
      targetEntityCategory: 'historical'
    }
  }
}

/**
 * Build GameRules based on character information
 */
function buildCharacterGameRules(characterName: string, characterDescription: string): GameRules {
  const historicalPeriod = extractHistoricalPeriod(characterName)
  
  // Use character description to enhance rules
  const isMilitaryCharacter = characterDescription.toLowerCase().includes('military') || 
                             characterDescription.toLowerCase().includes('warrior') ||
                             characterDescription.toLowerCase().includes('soldier')
  
  return {
    artStyle: isMilitaryCharacter ? 'military historical illustration' : 'historical illustration',
    genre: 'historical roleplay',
    historicalPeriod: historicalPeriod,
    categories: {
      weapon: {
        attributes: {
          damage: {
            type: 'integer',
            description: 'Damage output',
            reference: '10=basic, 25=good, 50=excellent, 75=legendary'
          },
          equipSlot: {
            type: 'string',
            description: 'Equipment slot',
            reference: 'leftHand, rightHand, head, chest, legs, feet'
          }
        }
      },
      armor: {
        attributes: {
          defense: {
            type: 'integer',
            description: 'Defense value',
            reference: '5=light, 15=medium, 25=heavy, 40=legendary'
          },
          equipSlot: {
            type: 'string',
            description: 'Equipment slot',
            reference: 'head, chest, legs, feet'
          }
        }
      },
      consumable: {
        attributes: {
          effect: {
            type: 'string',
            description: 'What it does',
            reference: 'heal, buff, restore, cure'
          }
        }
      }
    }
  }
}

/**
 * Extract historical period from character name
 */
function extractHistoricalPeriod(characterName: string): string {
  const name = characterName.toLowerCase()
  
  if (name.includes('napoleon') || name.includes('bonaparte')) {
    return 'Napoleonic Era 1800s'
  } else if (name.includes('cleopatra') || name.includes('egypt')) {
    return 'Ancient Egypt 1st Century BC'
  } else if (name.includes('alexander') || name.includes('great')) {
    return 'Ancient Greece 4th Century BC'
  } else if (name.includes('joan') || name.includes('arc')) {
    return 'Medieval France 15th Century'
  } else if (name.includes('leonardo') || name.includes('da vinci')) {
    return 'Renaissance Italy 15th-16th Century'
  } else if (name.includes('roman') || name.includes('centurion')) {
    return 'Roman Empire 1st-3rd Century AD'
  } else if (name.includes('vikings') || name.includes('viking')) {
    return 'Viking Age 8th-11th Century'
  } else {
    return 'Medieval Europe 12th-15th Century'
  }
}

/**
 * Function declarations for Gemini tools
 */
const FUNCTION_DECLARATIONS = {
  function_declarations: [
    {
      name: 'generate_item',
      description: 'Generate a game item appropriate for the character',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Description of the item to generate'
          }
        },
        required: ['prompt']
      }
    },
    {
      name: 'generate_npc',
      description: 'Generate an NPC appropriate for the character\'s historical period',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Description of the NPC to generate'
          }
        },
        required: ['prompt']
      }
    },
    {
      name: 'generate_location',
      description: 'Generate a location appropriate for the character\'s historical period',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Description of the location to generate'
          }
        },
        required: ['prompt']
      }
    }
  ]
}

/**
 * Wrapper functions for entity generation
 */
async function generate_item(args: { prompt: string }) {
  const gameContext = buildCharacterGameContext(currentCharacterName, currentCharacterDescription)
  const gameRules = buildCharacterGameRules(currentCharacterName, currentCharacterDescription)
  
  try {
    const result = await createItem(args.prompt, gameContext, gameRules)
    return {
      success: true,
      entity: result.entity,
      timing: result.timing
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function generate_npc(args: { prompt: string }) {
  const gameContext = buildCharacterGameContext(currentCharacterName, currentCharacterDescription)
  const gameRules = buildCharacterGameRules(currentCharacterName, currentCharacterDescription)
  
  try {
    const result = await createNpc(args.prompt, gameContext, gameRules)
    return {
      success: true,
      entity: result.entity,
      timing: result.timing
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function generate_location(args: { prompt: string }) {
  const gameContext = buildCharacterGameContext(currentCharacterName, currentCharacterDescription)
  const gameRules = buildCharacterGameRules(currentCharacterName, currentCharacterDescription)
  
  try {
    const result = await createLocation(args.prompt, gameContext, gameRules)
    return {
      success: true,
      entity: result.entity,
      timing: result.timing
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Handle function calls from Gemini
 */
async function handleFunctionCalls(functionCalls: any[]): Promise<any[]> {
  const results = []
  
  for (const call of functionCalls) {
    const { name, args } = call
    
    let result
    switch (name) {
      case 'generate_item':
        result = await generate_item(args)
        break
      case 'generate_npc':
        result = await generate_npc(args)
        break
      case 'generate_location':
        result = await generate_location(args)
        break
      default:
        result = { success: false, error: `Unknown function: ${name}` }
    }
    
    results.push({
      name,
      args,
      result
    })
  }
  
  return results
}

/**
 * Generate character analysis using Gemini 2.5 Pro with function calling
 * @param characterName - The historical character name
 * @param characterDescription - The character background/description
 * @returns Promise with input prompt, output response, function calls, and timing
 */
async function generateCharacterAnalysis(characterName: string, characterDescription: string) {
  const apiKey = getApiKey()
  const endpoint = `${API_BASE_URL}/${GEMINI_PRO_MODEL}:generateContent?key=${apiKey}`
  
  // Store character data globally
  currentCharacterName = characterName
  currentCharacterDescription = characterDescription
  
  // Build prompt for character analysis with function calling
  const prompt = `You are a historical roleplay expert. Analyze this character for a medieval fantasy game:

Character Name: ${characterName}
Character Description: ${characterDescription || 'No additional description provided'}

You have access to entity generation tools. Feel free to generate items, NPCs, or locations that would be appropriate for this character.

Please provide:
1. A brief historical context about this character
2. Their key personality traits and motivations
3. How they would fit into a medieval fantasy setting
4. Suggested starting equipment or abilities
5. Any interesting roleplay opportunities or challenges

If you want to generate specific items, NPCs, or locations for this character, use the available functions. For example, you might generate their signature weapon, a key ally, or an important location from their life.

Keep the response concise but informative, focusing on how this character would work in a game setting.`

  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    tools: [FUNCTION_DECLARATIONS]
  }

  const startTime = performance.now()
  const functionCalls: any[] = []
  const functionResults: any[] = []
  
  try {
    // First API call
    let response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`API Error: ${errorData.error?.message || response.statusText}`)
    }

    let data = await response.json()
    let finalResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated'
    
    // Check for function calls
    const functionCallParts = data.candidates?.[0]?.content?.parts?.filter((part: any) => part.functionCall)
    
    if (functionCallParts && functionCallParts.length > 0) {
      // Extract function calls
      for (const part of functionCallParts) {
        functionCalls.push({
          name: part.functionCall.name,
          args: part.functionCall.args
        })
      }
      
      // Execute function calls
      const results = await handleFunctionCalls(functionCalls)
      functionResults.push(...results)
      
      // Send function results back to Gemini
      const followUpRequest = {
        contents: [
          {
            parts: [{ text: prompt }]
          },
          {
            parts: [
              {
                functionResponse: {
                  name: functionCalls[0].name,
                  response: results[0].result
                }
              }
            ]
          }
        ],
        tools: [FUNCTION_DECLARATIONS]
      }
      
      // Get final response
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(followUpRequest)
      })
      
      if (response.ok) {
        data = await response.json()
        finalResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || finalResponse
      }
    }

    const endTime = performance.now()
    const responseTime = endTime - startTime
    
    return {
      inputPrompt: prompt,
      outputResponse: finalResponse,
      functionCalls,
      functionResults,
      responseTime: responseTime.toFixed(2),
      model: GEMINI_PRO_MODEL,
      success: true
    }
  } catch (error: any) {
    const endTime = performance.now()
    const responseTime = endTime - startTime
    
    return {
      inputPrompt: prompt,
      outputResponse: `Error: ${error.message}`,
      functionCalls,
      functionResults,
      responseTime: responseTime.toFixed(2),
      model: GEMINI_PRO_MODEL,
      success: false,
      error: error.message
    }
  }
}

/**
 * Test character analysis with Gemini 2.5 Pro
 */
async function testCharacterAnalysis(): Promise<void> {
  const nameInput = document.getElementById('characterName') as HTMLInputElement
  const descriptionInput = document.getElementById('characterDescription') as HTMLTextAreaElement
  
  const characterName = nameInput.value.trim()
  const characterDescription = descriptionInput.value.trim()

  if (!characterName) {
    alert('Please enter a character name.')
    return
  }

  // Show loading state
  showLoading()
  
  try {
    const result = await generateCharacterAnalysis(characterName, characterDescription)
    displayCharacterResult(result)
  } catch (error: any) {
    displayCharacterError(error.message)
  }
}

/**
 * Display loading state
 */
function showLoading(): void {
  const resultSection = document.getElementById('resultSection')
  if (!resultSection) return

  resultSection.classList.add('show')
  resultSection.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Analyzing character with Gemini 2.5 Pro...</p>
      <p><strong>Please wait 5-10 seconds...</strong></p>
    </div>
  `
}

/**
 * Display character analysis result
 */
function displayCharacterResult(result: any): void {
  const resultSection = document.getElementById('resultSection')
  if (!resultSection) return

  const timestamp = new Date().toLocaleString()
  
  // Build function calls section with entity displays
  let functionCallsHtml = ''
  if (result.functionCalls && result.functionCalls.length > 0) {
    functionCallsHtml = `
      <div class="function-calls-section">
        <h4>🔧 Generated Entities</h4>
        ${result.functionCalls.map((call: any, index: number) => {
          const functionResult = result.functionResults && result.functionResults[index]
          if (!functionResult || !functionResult.result.success) {
            return `
              <div class="function-call">
                <div class="function-call-header">
                  <span class="function-name">${call.name}</span>
                  <span class="function-args">${JSON.stringify(call.args)}</span>
                </div>
                <div class="function-result">
                  <strong>Error:</strong> ${functionResult?.result?.error || 'No result'}
                </div>
              </div>
            `
          }
          
          const entity = functionResult.result.entity
          const entityType = call.name.replace('generate_', '')
          
          return `
            <div class="entity-card">
              <div class="entity-header">
                <div class="entity-badges">
                  <span class="entity-badge ${entityType}-badge">${entityType.toUpperCase()}</span>
                  <span class="rarity-badge ${entity.rarity}">${entity.rarity}</span>
                </div>
                <div class="function-call-info">
                  <span class="function-name">${call.name}</span>
                  <span class="function-args">${JSON.stringify(call.args)}</span>
                </div>
              </div>
              
              <div class="entity-display">
                <div class="json-panel">
                  <h5>Generated JSON</h5>
                  <pre><code>${JSON.stringify(entity, null, 2)}</code></pre>
                  <button onclick="downloadJSON('${entityType}', '${JSON.stringify(JSON.stringify(entity))}')">Download JSON</button>
                </div>
                
                <div class="image-panel">
                  <h5>Generated Image</h5>
                  <img src="${entity.image_url}" alt="${entity.name}" onerror="this.style.display='none'">
                  <p class="description">${entity.description}</p>
                  <button onclick="downloadImage('${entity.image_url}', '${entity.id}')">Download Image</button>
                </div>
              </div>
            </div>
          `
        }).join('')}
      </div>
    `
  }
  
  resultSection.innerHTML = `
    <div class="result-content">
      <div class="result-header">
        <h3>Character Analysis Result</h3>
        <div class="result-meta">
          <span class="model-badge">${result.model}</span>
          <span class="time-badge">${result.responseTime}ms</span>
          <span class="timestamp">${timestamp}</span>
        </div>
      </div>

      <details class="prompt-sections">
        <summary>📝 View Prompts (Click to expand)</summary>
        <div class="input-output-sections">
          <div class="input-section">
            <h4>📝 Model Input (Prompt Sent)</h4>
            <div class="code-block">
              <pre><code>${result.inputPrompt}</code></pre>
            </div>
          </div>

          <div class="output-section">
            <h4>🤖 Model Output (Response Received)</h4>
            <div class="code-block">
              <pre><code>${result.outputResponse}</code></pre>
            </div>
          </div>
        </div>
      </details>

      ${functionCallsHtml}

      <div class="debug-info">
        <h4>🔍 Debug Information</h4>
        <div class="debug-grid">
          <div class="debug-item">
            <strong>Model:</strong> ${result.model}
          </div>
          <div class="debug-item">
            <strong>Response Time:</strong> ${result.responseTime}ms
          </div>
          <div class="debug-item">
            <strong>Success:</strong> ${result.success ? '✅ Yes' : '❌ No'}
          </div>
          <div class="debug-item">
            <strong>Function Calls:</strong> ${result.functionCalls ? result.functionCalls.length : 0}
          </div>
          ${result.error ? `<div class="debug-item"><strong>Error:</strong> ${result.error}</div>` : ''}
        </div>
      </div>
    </div>
  `
}

/**
 * Display error message
 */
function displayCharacterError(message: string): void {
  const resultSection = document.getElementById('resultSection')
  if (!resultSection) return

  resultSection.innerHTML = `
    <div class="error-message">
      <h3>❌ Analysis Failed</h3>
      <p>${message}</p>
      <p>Please check your API key and try again.</p>
    </div>
  `
}

/**
 * Download JSON file
 */
function downloadJSON(entityType: string, jsonString: string): void {
  const json = JSON.parse(jsonString)
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${entityType}_${json.id || 'entity'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Download image
 */
function downloadImage(dataUrl: string, filename: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `${filename}.png`
  a.click()
}

// Make functions available globally
;(window as any).testCharacterAnalysis = testCharacterAnalysis
;(window as any).downloadJSON = downloadJSON
;(window as any).downloadImage = downloadImage
