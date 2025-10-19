// NPC Entity Generation Service
import type { NPC } from '../../types/npc.types'
import type {
  GameRules,
  GameContext,
  BaseEntityInfo,
  GenerationResult,
  GeminiResponse,
  Attribute,
} from './types'
import { STRUCTURED_FLASH_LITE_MODEL, STRUCTURED_IMAGE_MODEL, STRUCTURED_API_BASE_URL, NPC_SCHEMA } from './core'
import { getNextEntityId, NPC_CATEGORIES } from './categories'
import { getApiKey } from '../../config/gemini.config'

/**
 * Synthesize game context into narrative summary for NPC generation
 */
async function synthesizeNpcContext(gameContext: GameContext): Promise<{
  summary: string
  debugInfo: any
}> {
  const API_KEY = getApiKey()
  const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_FLASH_LITE_MODEL}:generateContent?key=${API_KEY}`

  const promptText = `You are a game design assistant helping to create contextually relevant NPCs.

Game Context Information:
${JSON.stringify(gameContext, null, 2)}

Entity type being generated: NPC

Create a brief narrative summary describing the context that will help guide NPC generation.
Your job is to provide all the information that is interesting or needed for the NPC generation to make sense within the context of the game.
The next LLM will use your summary to generate the NPC. Condense all information that is important or interesting for the NPC generation. And if there is a location or person or anything of interest nearby or far away, you should relay that information to the next LLM.

Return ONLY the narrative summary, no JSON, no extra explanation.`

  const requestBody = {
    contents: [{ parts: [{ text: promptText }] }],
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    const data: GeminiResponse = await response.json()
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    return {
      summary,
      debugInfo: {
        model: STRUCTURED_FLASH_LITE_MODEL,
        input: JSON.stringify(gameContext, null, 2),
        prompt: promptText,
        output: summary,
      },
    }
  } catch (error) {
    console.error('Context synthesis error:', error)
    return { summary: '', debugInfo: null }
  }
}

/**
 * Generate base NPC JSON using structured output
 */
async function generateNpcJSON(
  prompt: string,
  contextSummary: string,
  gameRules: GameRules
): Promise<{
  entity: any
  responseTime: string
  debugInfo: any
}> {
  const API_KEY = getApiKey()
  const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_FLASH_LITE_MODEL}:generateContent?key=${API_KEY}`

  const enhancedPrompt = `You are a historically accurate game NPC creator for the ${gameRules.historicalPeriod} setting.

${contextSummary ? `Context:\n${contextSummary}\n` : ''}

User Request: ${prompt}

Create a ${gameRules.genre} game NPC with authentic historical details:
- Use historically accurate names, occupations, and personalities for the ${gameRules.historicalPeriod} period
- Description should focus on historical context, appearance, and personality
- Rarity reflects historical importance (common villager vs. famous historical figures)
- Category must be one of the available types

Generate the complete NPC following the schema.`

  // Update schema with dynamic categories
  const schema = {
    ...NPC_SCHEMA,
    properties: {
      ...NPC_SCHEMA.properties,
      category: {
        ...NPC_SCHEMA.properties.category,
        enum: NPC_CATEGORIES,
      },
    },
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
    const entity = JSON.parse(jsonText)

    return {
      entity,
      responseTime,
      debugInfo: {
        model: STRUCTURED_FLASH_LITE_MODEL,
        step: 'Step 1: Base NPC JSON',
        prompt: enhancedPrompt,
        response: JSON.stringify(entity, null, 2),
        schema: 'NPC_SCHEMA',
      },
    }
  } catch (error: any) {
    throw new Error(`NPC JSON Generation Error: ${error.message}`)
  }
}

/**
 * Generate NPC attributes with full metadata
 */
async function generateNpcAttributes(
  baseNpcInfo: BaseEntityInfo,
  gameContext: GameContext,
  gameRules: GameRules
): Promise<{
  own_attributes: Record<string, Attribute>
  newAttributes: Record<string, Attribute & { category: string }>
  responseTime: string
  debugInfo: any
}> {
  const API_KEY = getApiKey()
  const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_FLASH_LITE_MODEL}:generateContent?key=${API_KEY}`

  const { name, rarity, category, description, historicalPeriod } = baseNpcInfo

  // Get attribute library for this category
  const categoryData = gameRules.categories?.[category]
  const commonData = gameRules.categories?.common
  const categoryAttrs = categoryData?.attributes || {}
  const commonAttrs = commonData?.attributes || {}
  const availableAttributes = { ...categoryAttrs, ...commonAttrs }

  // Format attribute library for LLM
  const attributeList = Object.entries(availableAttributes)
    .map(([name, meta]) => {
      const typeInfo = meta.range
        ? `${meta.type} (${meta.range.min}-${meta.range.max})`
        : meta.type
      const reference = meta.reference ? `\n  → ${meta.reference}` : ''
      return `- ${name} (${typeInfo}): ${meta.description}${reference}`
    })
    .join('\n')

  const promptText = `You are a historical game designer creating attributes for an NPC.

NPC Name: ${name}
Rarity/Significance: ${rarity}
Category: ${category}
Historical Setting: ${historicalPeriod}
Description: ${description}
${gameContext.spatial?.currentRegion ? `Region: ${gameContext.spatial.currentRegion.name}` : ''}

Generate historically accurate and interesting attributes for this NPC in the ${historicalPeriod} setting. 

Consider for historical accuracy:
- Period-specific skills and knowledge
- Appropriate social status and wealth
- Realistic personality traits and motivations
- Historical occupation and expertise
- Famous deeds or reputation if applicable
- How the NPC's rarity reflects historical significance (common villager vs. famous leader)

${attributeList ? `📚 AVAILABLE ATTRIBUTES FOR "${category}":\n${attributeList}` : ''}

🎯 INSTRUCTIONS:
${attributeList ? `1. Review the available attributes above (note the → reference examples for calibration)\n2. Select the ones relevant for this NPC in the ${historicalPeriod} setting\n3. For EXISTING attributes: reuse the reference from the library above\n4. For NEW attributes: create an appropriate reference calibration` : `Generate appropriate historical game attributes for this NPC based on its category, description, and the ${historicalPeriod} setting`}

Create attributes that are:
1. Historically accurate for the ${historicalPeriod} period
2. Interesting and meaningful for gameplay
3. Reflective of the NPC's historical significance (rarity = fame/importance in history)

📋 OUTPUT FORMAT:
Return a JSON object with ONE field: "attributes"

EVERY attribute MUST have ALL FOUR fields:
- value: The actual value for this specific NPC
- type: Data type (integer, number, string, boolean, or array)
- description: What this attribute represents
- reference: Concrete examples showing what different values mean

For EXISTING attributes from the library above:
→ Copy the type, description, and reference from the library
→ Add your chosen value

For NEW attributes you create:
→ Provide all four fields (value, type, description, reference)

Example:
{
  "attributes": {
    "trust": {
      "value": 65,
      "type": "integer",
      "description": "How much the NPC trusts the player",
      "reference": "0=hostile, 25=suspicious, 50=neutral, 75=friendly, 100=loyal ally"
    },
    "wealth": {
      "value": 30,
      "type": "integer",
      "description": "Economic status and available resources",
      "reference": "10=beggar, 30=peasant, 50=merchant, 75=noble, 100=royalty"
    },
    "occupation": {
      "value": "blacksmith",
      "type": "string",
      "description": "NPC's profession or role in society",
      "reference": "farmer=common, merchant=trader, knight=warrior, priest=clergy, king=ruler"
    }
  }
}

⚠️ DO NOT INCLUDE in attributes: id, name, rarity, description, or category (these are already set)
⚠️ CRITICAL: ALL attributes must have ALL FOUR fields (value, type, description, reference)!`

  const requestBody = {
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: {
      response_mime_type: 'application/json',
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
    const responseData = JSON.parse(jsonText)

    // Handle response format: {attributes: {name: {value, type, description, reference}}}
    const attributesRaw = responseData.attributes || {}

    // All attributes now have full structure
    const processedAttributes: Record<string, Attribute> = {}
    const newAttributes: Record<string, Attribute & { category: string }> = {}
    const attributeNames = Object.keys(availableAttributes)

    for (const attrName of Object.keys(attributesRaw)) {
      const attrData = attributesRaw[attrName]

      // Validate that all required fields are present
      if (!attrData.value || !attrData.type || !attrData.description || !attrData.reference) {
        console.warn(`⚠️ Attribute "${attrName}" missing required fields! Got:`, attrData)
      }

      // Store the complete attribute structure
      processedAttributes[attrName] = {
        value: attrData.value,
        type: attrData.type,
        description: attrData.description,
        reference: attrData.reference,
      }

      // Check if this is a new attribute not in library
      if (!attributeNames.includes(attrName)) {
        newAttributes[attrName] = {
          value: attrData.value,
          type: attrData.type,
          description: attrData.description,
          reference: attrData.reference,
          category: category,
        }
      }
    }

    // Log new attributes with their full metadata
    if (Object.keys(newAttributes).length > 0) {
      console.log(`🆕 NEW ATTRIBUTES CREATED for category "${category}":`, newAttributes)
    }

    return {
      own_attributes: processedAttributes,
      newAttributes,
      responseTime,
      debugInfo: {
        model: STRUCTURED_FLASH_LITE_MODEL,
        step: 'Step 2: NPC Attributes',
        prompt: promptText,
        response: JSON.stringify(processedAttributes, null, 2),
        availableAttributes: Object.keys(availableAttributes),
        newAttributesDetected: Object.keys(newAttributes),
      },
    }
  } catch (error: any) {
    console.error('NPC attributes generation error:', error)
    return {
      own_attributes: {},
      newAttributes: {},
      responseTime: '0',
      debugInfo: {
        model: STRUCTURED_FLASH_LITE_MODEL,
        step: 'Step 2: NPC Attributes',
        prompt: promptText,
        response: `Error: ${error.message}`,
      },
    }
  }
}

/**
 * Generate NPC image
 */
async function generateNpcImage(
  baseNpcInfo: BaseEntityInfo,
  artStyle = 'historical portrait'
): Promise<{
  imageBase64: string
  responseTime: string
  debugInfo: any
}> {
  const API_KEY = getApiKey()
  const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_IMAGE_MODEL}:generateContent?key=${API_KEY}`

  const imagePrompt = `Generate a game character portrait in ${artStyle} style.

NPC Name: ${baseNpcInfo.name}
Rarity/Significance: ${baseNpcInfo.rarity}
Category: ${baseNpcInfo.category}
Historical Setting: ${baseNpcInfo.historicalPeriod}

Description:
${baseNpcInfo.description}

Style Requirements:
- ${artStyle} art style
- Character portrait aesthetic
- Rarity level should influence visual quality (${baseNpcInfo.rarity})
- Clear, expressive face and personality
- Period-appropriate clothing and appearance
- Focus on the character with good detail
- Suitable for use as a game character portrait
- The character should be centered in the image
- ${artStyle} art style`

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
    console.log('NPC Image Generation Response:', data)

    // Extract image from response - API uses inline_data (with underscore)
    const parts = data.candidates?.[0]?.content?.parts || []
    let imageBase64 = ''

    for (const part of parts) {
      if (part.inline_data?.data || part.inlineData?.data) {
        imageBase64 = part.inline_data?.data || part.inlineData?.data
        break
      }
    }

    if (!imageBase64) {
      throw new Error('No image data in response')
    }

    return {
      imageBase64,
      responseTime,
      debugInfo: {
        model: STRUCTURED_IMAGE_MODEL,
        step: 'Step 3: NPC Image',
        prompt: imagePrompt,
        response: `Image generated successfully`,
        imageSize: imageBase64.length + ' characters',
      },
    }
  } catch (error: any) {
    throw new Error(`NPC Image Generation Error: ${error.message}`)
  }
}

/**
 * Create complete NPC with JSON + Attributes + Image
 * 
 * @param prompt - User prompt describing the NPC to create
 * @param gameContext - Game state context (spatial, player, world, economy, relationships, etc.)
 * @param gameRules - Game configuration (art style, period, attribute library)
 * @returns GenerationResult with 4 parts: entity, newAttributes, timing, debugData
 * 
 * @example
 * // Example Output:
 * {
 *   // 1. THE GENERATED ENTITY
 *   entity: {
 *     id: "mer_hans_blacksmith_001",
 *     name: "Hans the Blacksmith",
 *     rarity: "legendary",
 *     category: "merchant",
 *     description: "A legendary master blacksmith known throughout the kingdom for crafting royal weapons...",
 *     own_attributes: {
 *       trust: { value: 65, type: "integer", description: "Trust level toward player", reference: "0=hostile, 25=suspicious, 50=neutral, 75=friendly, 100=loyal" },
 *       wealth: { value: 75, type: "integer", description: "Economic status", reference: "10=beggar, 30=peasant, 50=merchant, 75=noble, 100=royalty" },
 *       charisma: { value: 80, type: "integer", description: "Social charm", reference: "20=awkward, 50=average, 75=charming, 100=legendary" }
 *     },
 *     image_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
 *     x: 456,
 *     y: -123,
 *     region: "medieval_kingdom_001",
 *     chatHistory: []
 *   },
 * 
 *   // 2. NEW ATTRIBUTES DISCOVERED (not in attribute library)
 *   newAttributes: {
 *     "crafting_skill": {
 *       value: 95,
 *       type: "integer",
 *       description: "Blacksmithing skill level",
 *       reference: "20=apprentice, 50=journeyman, 75=master, 95=legendary craftsman",
 *       category: "merchant"
 *     }
 *   },
 * 
 *   // 3. TIMING INFORMATION (in milliseconds)
 *   timing: {
 *     baseEntity: "1234.56",    // Step 1: Base JSON generation
 *     attributes: "2345.67",    // Step 2: Attribute generation
 *     image: "3456.78",         // Step 3: Image generation
 *     total: "7036.01"          // Total time
 *   },
 * 
 *   // 4. DEBUG DATA (LLM prompts and responses for each step)
 *   debugData: {
 *     step0: { model: "gemini-2.5-flash-lite", input: "{...}", prompt: "...", output: "narrative summary" },
 *     step1: { model: "gemini-2.5-flash-lite", prompt: "...", response: "{...}", schema: "NPC_SCHEMA" },
 *     step2: { model: "gemini-2.5-flash-lite", prompt: "...", response: "{...}", availableAttributes: ["trust", "wealth"], newAttributesDetected: ["crafting_skill"] },
 *     step3: { model: "gemini-2.5-flash-image", prompt: "...", response: "Image generated successfully", imageSize: "..." }
 *   }
 * }
 */
export async function createNpc(
  prompt: string,
  gameContext: GameContext = {},
  gameRules: GameRules
): Promise<GenerationResult<NPC>> {
  const entityType = 'npc'
  console.log(`\n=== Creating ${entityType} ===`)
  console.log(`Prompt: ${prompt}`)

  const debugData = {
    step0: null,
    step1: null,
    step2: null,
    step3: null,
  }

  try {
    // Step 0: Synthesize gameContext into narrative
    console.log('Step 0: Synthesizing NPC-specific context...')
    const contextResult = await synthesizeNpcContext(gameContext)
    const contextSummary = contextResult.summary || ''
    debugData.step0 = contextResult.debugInfo || null
    console.log('✓ NPC context synthesized')

    // Step 1: Generate base NPC
    console.log('Step 1: Generating base NPC JSON...')
    const jsonResult = await generateNpcJSON(prompt, contextSummary, gameRules)
    const entity = jsonResult.entity
    const jsonTime = jsonResult.responseTime
    debugData.step1 = jsonResult.debugInfo
    console.log('✓ Base NPC generated in', jsonTime, 'ms')

    // Override ID with auto-generated sequential ID
    entity.id = getNextEntityId('npc', entity.category, entity.name)
    console.log('NPC:', entity)

    // Create baseNpcInfo bundle
    const baseNpcInfo: BaseEntityInfo = {
      name: entity.name,
      rarity: entity.rarity,
      category: entity.category,
      description: entity.description,
      historicalPeriod: gameRules.historicalPeriod || 'Medieval Europe',
    }

    // Step 2: Generate NPC attributes
    console.log('Step 2: Generating NPC attributes...')
    const attrResult = await generateNpcAttributes(baseNpcInfo, gameContext, gameRules)
    const own_attributes = attrResult.own_attributes
    const newAttributes = attrResult.newAttributes
    const attributesTime = attrResult.responseTime
    debugData.step2 = attrResult.debugInfo
    console.log('✓ NPC attributes generated in', attributesTime, 'ms')
    console.log('NPC Attributes:', own_attributes)
    if (Object.keys(newAttributes).length > 0) {
      console.log('🆕 New Attributes:', newAttributes)
    }

    // Step 3: Generate NPC image
    console.log('Step 3: Generating NPC portrait...')
    const imageResult = await generateNpcImage(baseNpcInfo, gameRules.artStyle || 'historical portrait')
    const imageBase64 = imageResult.imageBase64
    const imageTime = imageResult.responseTime
    debugData.step3 = imageResult.debugInfo
    console.log('✓ NPC image generated in', imageTime, 'ms')

    // Step 4: Combine all parts + add system fields
    console.log('Step 4: Combining all parts and adding system fields...')

    const completeEntity: NPC = {
      ...entity,
      own_attributes,
      image_url: `data:image/png;base64,${imageBase64}`,
      x: Math.floor(Math.random() * 2000) - 1000,
      y: Math.floor(Math.random() * 2000) - 1000,
      region: 'medieval_kingdom_001',
      chatHistory: [],
    }

    const totalTime = (parseFloat(jsonTime) + parseFloat(attributesTime) + parseFloat(imageTime)).toFixed(2)
    console.log(`✓ Complete NPC created in ${totalTime}ms total`)

    return {
      entity: completeEntity,
      newAttributes,
      timing: {
        baseEntity: jsonTime,
        attributes: attributesTime,
        image: imageTime,
        total: totalTime,
      },
      debugData,
    }
  } catch (error) {
    console.error('NPC creation failed:', error)
    throw error
  }
}

