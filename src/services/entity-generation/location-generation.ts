// Location Entity Generation Service
import type { Location } from '../../types/location.types'
import type {
  GameRules,
  GameContext,
  BaseEntityInfo,
  GenerationResult,
  GeminiResponse,
  Attribute,
} from './types'
import { STRUCTURED_FLASH_LITE_MODEL, STRUCTURED_IMAGE_MODEL, STRUCTURED_API_BASE_URL, LOCATION_SCHEMA } from './core'
import { getNextEntityId, LOCATION_CATEGORIES } from './categories'
import { getApiKey } from '../../config/gemini.config'

/**
 * Synthesize game context into narrative summary for location generation
 */
async function synthesizeLocationContext(gameContext: GameContext): Promise<{
  summary: string
  debugInfo: any
}> {
  const API_KEY = getApiKey()
  const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_FLASH_LITE_MODEL}:generateContent?key=${API_KEY}`

  const promptText = `You are a game design assistant helping to create contextually relevant locations.

Game Context Information:
${JSON.stringify(gameContext, null, 2)}

Entity type being generated: LOCATION

Create a brief narrative summary describing the context that will help guide LOCATION generation.
Your job is to provide all the information that is interesting or needed for the location generation to make sense within the context of the game.
The next LLM will use your summary to generate the location. Condense all information that is important or interesting for the location generation. And if there is a location or person or anything of interest nearby or far away, you should relay that information to the next LLM.

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
 * Generate base location JSON using structured output
 */
async function generateLocationJSON(
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

  const enhancedPrompt = `You are a historically accurate game location creator for the ${gameRules.historicalPeriod} setting.

${contextSummary ? `Context:\n${contextSummary}\n` : ''}

User Request: ${prompt}

Create a ${gameRules.genre} game location with authentic historical details:
- Use historically accurate names, architecture, and atmosphere for the ${gameRules.historicalPeriod} period
- Description should focus on historical context, environment, and significance
- Rarity reflects historical importance (common village vs. famous landmarks)
- Category must be one of the available types

Generate the complete location following the schema.`

  // Update schema with dynamic categories
  const schema = {
    ...LOCATION_SCHEMA,
    properties: {
      ...LOCATION_SCHEMA.properties,
      category: {
        ...LOCATION_SCHEMA.properties.category,
        enum: LOCATION_CATEGORIES,
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
        step: 'Step 1: Base Location JSON',
        prompt: enhancedPrompt,
        response: JSON.stringify(entity, null, 2),
        schema: 'LOCATION_SCHEMA',
      },
    }
  } catch (error: any) {
    throw new Error(`Location JSON Generation Error: ${error.message}`)
  }
}

/**
 * Generate location attributes with full metadata
 */
async function generateLocationAttributes(
  baseLocationInfo: BaseEntityInfo,
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

  const { name, rarity, category, description, historicalPeriod } = baseLocationInfo

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

  const promptText = `You are a historical game designer creating attributes for a location.

Location Name: ${name}
Rarity/Significance: ${rarity}
Category: ${category}
Historical Setting: ${historicalPeriod}
Description: ${description}
${gameContext.spatial?.currentRegion ? `Region: ${gameContext.spatial.currentRegion.name}` : ''}

Generate historically accurate and interesting attributes for this location in the ${historicalPeriod} setting. 

Consider for historical accuracy:
- Period-specific architecture and construction
- Environmental conditions and geography
- Strategic or cultural significance
- Population and resources
- Famous events or battles that occurred here
- How the location's rarity reflects historical significance (common village vs. famous fortress)

${attributeList ? `📚 AVAILABLE ATTRIBUTES FOR "${category}":\n${attributeList}` : ''}

🎯 INSTRUCTIONS:
${attributeList ? `1. Review the available attributes above (note the → reference examples for calibration)\n2. Select the ones relevant for this location in the ${historicalPeriod} setting\n3. For EXISTING attributes: reuse the reference from the library above\n4. For NEW attributes: create an appropriate reference calibration` : `Generate appropriate historical game attributes for this location based on its category, description, and the ${historicalPeriod} setting`}

Create attributes that are:
1. Historically accurate for the ${historicalPeriod} period
2. Interesting and meaningful for gameplay
3. Reflective of the location's historical significance (rarity = fame/importance in history)

📋 OUTPUT FORMAT:
Return a JSON object with ONE field: "attributes"

EVERY attribute MUST have ALL FOUR fields:
- value: The actual value for this specific location
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
    "danger_level": {
      "value": 45,
      "type": "integer",
      "description": "How dangerous this location is",
      "reference": "0=safe haven, 25=minor threats, 50=moderate danger, 75=very dangerous, 100=deadly"
    },
    "population": {
      "value": 500,
      "type": "integer",
      "description": "Number of inhabitants",
      "reference": "50=hamlet, 500=village, 5000=town, 50000=city, 500000=metropolis"
    },
    "terrain": {
      "value": "forest",
      "type": "string",
      "description": "Primary terrain type",
      "reference": "plains=open, forest=wooded, mountain=elevated, swamp=wetland, desert=arid"
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
        step: 'Step 2: Location Attributes',
        prompt: promptText,
        response: JSON.stringify(processedAttributes, null, 2),
        availableAttributes: Object.keys(availableAttributes),
        newAttributesDetected: Object.keys(newAttributes),
      },
    }
  } catch (error: any) {
    console.error('Location attributes generation error:', error)
    return {
      own_attributes: {},
      newAttributes: {},
      responseTime: '0',
      debugInfo: {
        model: STRUCTURED_FLASH_LITE_MODEL,
        step: 'Step 2: Location Attributes',
        prompt: promptText,
        response: `Error: ${error.message}`,
      },
    }
  }
}

/**
 * Generate location image
 */
async function generateLocationImage(
  baseLocationInfo: BaseEntityInfo,
  artStyle = 'historical landscape'
): Promise<{
  imageBase64: string
  responseTime: string
  debugInfo: any
}> {
  const API_KEY = getApiKey()
  const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_IMAGE_MODEL}:generateContent?key=${API_KEY}`

  const imagePrompt = `Generate a game location scene in ${artStyle} style.

Location Name: ${baseLocationInfo.name}
Rarity/Significance: ${baseLocationInfo.rarity}
Category: ${baseLocationInfo.category}
Historical Setting: ${baseLocationInfo.historicalPeriod}

Description:
${baseLocationInfo.description}

Style Requirements:
- ${artStyle} art style
- Environment/landscape scene aesthetic
- Rarity level should influence visual quality (${baseLocationInfo.rarity})
- Clear, atmospheric environment
- Period-appropriate architecture and setting
- Focus on the location with good detail
- Suitable for use as a game location background
- The location should be well-framed in the image
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
    console.log('Location Image Generation Response:', data)

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
        step: 'Step 3: Location Image',
        prompt: imagePrompt,
        response: `Image generated successfully`,
        imageSize: imageBase64.length + ' characters',
      },
    }
  } catch (error: any) {
    throw new Error(`Location Image Generation Error: ${error.message}`)
  }
}

/**
 * Create complete Location with JSON + Attributes + Image
 * 
 * @param prompt - User prompt describing the location to create
 * @param gameContext - Game state context (spatial, player, world, exploration, combat, etc.)
 * @param gameRules - Game configuration (art style, period, attribute library)
 * @returns GenerationResult with 4 parts: entity, newAttributes, timing, debugData
 * 
 * @example
 * // Example Output:
 * {
 *   // 1. THE GENERATED ENTITY
 *   entity: {
 *     id: "dun_castle_dark_001",
 *     name: "The Dark Castle",
 *     rarity: "epic",
 *     category: "dungeon",
 *     description: "An ancient fortress shrouded in mist, its towers reach toward stormy skies...",
 *     own_attributes: {
 *       danger_level: { value: 75, type: "integer", description: "How dangerous this location is", reference: "20=minor threats, 50=moderate, 75=very dangerous, 100=deadly" },
 *       population: { value: 50, type: "integer", description: "Number of inhabitants", reference: "50=hamlet, 500=village, 5000=town" },
 *       accessibility: { value: 30, type: "integer", description: "How easy to reach", reference: "20=hidden, 50=off path, 75=well-traveled, 100=major road" }
 *     },
 *     image_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
 *     x: 456,
 *     y: -123,
 *     region: "medieval_kingdom_001"
 *   },
 * 
 *   // 2. NEW ATTRIBUTES DISCOVERED (not in attribute library)
 *   newAttributes: {
 *     "haunted_level": {
 *       value: 85,
 *       type: "integer",
 *       description: "Supernatural activity intensity",
 *       reference: "0=normal, 30=minor spirits, 60=active haunting, 85=extremely haunted, 100=cursed",
 *       category: "dungeon"
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
 *     step1: { model: "gemini-2.5-flash-lite", prompt: "...", response: "{...}", schema: "LOCATION_SCHEMA" },
 *     step2: { model: "gemini-2.5-flash-lite", prompt: "...", response: "{...}", availableAttributes: ["danger_level", "population"], newAttributesDetected: ["haunted_level"] },
 *     step3: { model: "gemini-2.5-flash-image", prompt: "...", response: "Image generated successfully", imageSize: "..." }
 *   }
 * }
 */
export async function createLocation(
  prompt: string,
  gameContext: GameContext = {},
  gameRules: GameRules
): Promise<GenerationResult<Location>> {
  const entityType = 'location'
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
    console.log('Step 0: Synthesizing location-specific context...')
    const contextResult = await synthesizeLocationContext(gameContext)
    const contextSummary = contextResult.summary || ''
    debugData.step0 = contextResult.debugInfo || null
    console.log('✓ Location context synthesized')

    // Step 1: Generate base location
    console.log('Step 1: Generating base location JSON...')
    const jsonResult = await generateLocationJSON(prompt, contextSummary, gameRules)
    const entity = jsonResult.entity
    const jsonTime = jsonResult.responseTime
    debugData.step1 = jsonResult.debugInfo
    console.log('✓ Base location generated in', jsonTime, 'ms')

    // Override ID with auto-generated sequential ID
    entity.id = getNextEntityId('location', entity.category, entity.name)
    console.log('Location:', entity)

    // Create baseLocationInfo bundle
    const baseLocationInfo: BaseEntityInfo = {
      name: entity.name,
      rarity: entity.rarity,
      category: entity.category,
      description: entity.description,
      historicalPeriod: gameRules.historicalPeriod || 'Medieval Europe',
    }

    // Step 2: Generate location attributes
    console.log('Step 2: Generating location attributes...')
    const attrResult = await generateLocationAttributes(baseLocationInfo, gameContext, gameRules)
    const own_attributes = attrResult.own_attributes
    const newAttributes = attrResult.newAttributes
    const attributesTime = attrResult.responseTime
    debugData.step2 = attrResult.debugInfo
    console.log('✓ Location attributes generated in', attributesTime, 'ms')
    console.log('Location Attributes:', own_attributes)
    if (Object.keys(newAttributes).length > 0) {
      console.log('🆕 New Attributes:', newAttributes)
    }

    // Step 3: Generate location image
    console.log('Step 3: Generating location scene...')
    const imageResult = await generateLocationImage(baseLocationInfo, gameRules.artStyle || 'historical landscape')
    const imageBase64 = imageResult.imageBase64
    const imageTime = imageResult.responseTime
    debugData.step3 = imageResult.debugInfo
    console.log('✓ Location image generated in', imageTime, 'ms')

    // Step 4: Combine all parts + add system fields
    console.log('Step 4: Combining all parts and adding system fields...')

    const completeEntity: Location = {
      ...entity,
      own_attributes,
      image_url: `data:image/png;base64,${imageBase64}`,
      x: Math.floor(Math.random() * 2000) - 1000,
      y: Math.floor(Math.random() * 2000) - 1000,
      region: 'medieval_kingdom_001',
    }

    const totalTime = (parseFloat(jsonTime) + parseFloat(attributesTime) + parseFloat(imageTime)).toFixed(2)
    console.log(`✓ Complete location created in ${totalTime}ms total`)

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
    console.error('Location creation failed:', error)
    throw error
  }
}

