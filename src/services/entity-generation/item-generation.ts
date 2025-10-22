// Item Entity Generation Service
import type { Item } from '../../types'
import type {
  GameRules,
  GameContext,
  BaseEntityInfo,
  GenerationResult,
  GeminiResponse,
  Attribute,
} from './types'
import { STRUCTURED_FLASH_LITE_MODEL, STRUCTURED_IMAGE_MODEL, STRUCTURED_API_BASE_URL, ITEM_SCHEMA } from './core'
import { getNextEntityId, ITEM_CATEGORIES } from './categories'
import { getApiKey } from '../../config/gemini.config'

/**
 * Synthesize game context into narrative summary for item generation
 */
async function synthesizeItemContext(gameContext: GameContext): Promise<{
  summary: string
  debugInfo: any
}> {
  const API_KEY = getApiKey()
  const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_FLASH_LITE_MODEL}:generateContent?key=${API_KEY}`

  const promptText = `You are a game design assistant helping to create contextually relevant items.

Game Context Information:
${JSON.stringify(gameContext, null, 2)}

Entity type being generated: ITEM

Create a brief narrative summary describing the context that will help guide ITEM generation.
Your job is to provide all the information that is interesting or needed for the item generation to make sense within the context of the game.
The next LLM will use your summary to generate the item. Condense all information that is important or interesting for the item generation. And if there is a location or person or anything of interest nearby or far away. you should relay that information to the next LLM.

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
 * Generate base item JSON using structured output
 */
async function generateItemJSON(
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

  const enhancedPrompt = `You are a historically accurate game item creator for the ${gameRules.historicalPeriod} setting.

${contextSummary ? `Context:\n${contextSummary}\n` : ''}

User Request: ${prompt}

Create a ${gameRules.genre} game item with authentic historical details:
- Use historically accurate names, materials, and craftsmanship for the ${gameRules.historicalPeriod} period
- Description should focus on historical context and significance
- Rarity reflects historical importance (common soldier's gear vs. famous artifacts)
- Category must be one of the available types

Generate the complete item following the schema.`

  // Update schema with dynamic categories
  const schema = {
    ...ITEM_SCHEMA,
    properties: {
      ...ITEM_SCHEMA.properties,
      category: {
        ...ITEM_SCHEMA.properties.category,
        enum: ITEM_CATEGORIES,
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
        step: 'Step 1: Base Item JSON',
        prompt: enhancedPrompt,
        response: JSON.stringify(entity, null, 2),
        schema: 'ITEM_SCHEMA',
      },
    }
  } catch (error: any) {
    throw new Error(`Item JSON Generation Error: ${error.message}`)
  }
}

/**
 * Generate item attributes with full metadata
 */
async function generateItemAttributes(
  baseItemInfo: BaseEntityInfo,
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

  const { name, rarity, category, description, historicalPeriod } = baseItemInfo

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

  const promptText = `You are a historical game designer creating attributes for an item.

Item Name: ${name}
Rarity/Significance: ${rarity}
Category: ${category}
Historical Setting: ${historicalPeriod}
Description: ${description}
${gameContext.spatial?.currentRegion ? `Region: ${gameContext.spatial.currentRegion.name}` : ''}

Generate historically accurate and interesting attributes for this item in the ${historicalPeriod} setting. 

Consider for historical accuracy:
- Period-specific craftsmanship techniques and materials
- Authentic wear and condition reflecting actual use
- Historical value and cultural significance
- Famous ownership or provenance if applicable
- Battle history or significant events
- How the item's rarity reflects historical significance (common soldier's sword vs. famous general's blade)

${attributeList ? `📚 AVAILABLE ATTRIBUTES FOR "${category}":\n${attributeList}` : ''}

🎯 INSTRUCTIONS:
${attributeList ? `1. Review the available attributes above (note the → reference examples for calibration)\n2. Select the ones relevant for this item in the ${historicalPeriod} setting\n3. For EXISTING attributes: reuse the reference from the library above\n4. For NEW attributes: create an appropriate reference calibration` : `Generate appropriate historical game attributes for this item based on its category, description, and the ${historicalPeriod} setting`}

Create attributes that are:
1. Historically accurate for the ${historicalPeriod} period
2. Interesting and meaningful for gameplay
3. Reflective of the item's historical significance (rarity = fame/importance in history)

📋 OUTPUT FORMAT:
Return a JSON object with ONE field: "attributes"

EVERY attribute MUST have ALL FOUR fields:
- value: The actual value for this specific item
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
    "damage": {
      "value": 45,
      "type": "integer",
      "description": "Damage dealt in combat",
      "reference": "10=dagger, 40=sword, 80=greatsword, 100=legendary blade"
    },
    "weight": {
      "value": 8,
      "type": "integer",
      "description": "Weight in pounds",
      "reference": "5=dagger, 15=sword, 30=greatsword, 45=heavy armor"
    },
    "material": {
      "value": "steel",
      "type": "string",
      "description": "Primary material the item is made from",
      "reference": "iron=common, steel=quality, mithril=rare, adamantine=legendary"
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
        step: 'Step 2: Item Attributes',
        prompt: promptText,
        response: JSON.stringify(processedAttributes, null, 2),
        availableAttributes: Object.keys(availableAttributes),
        newAttributesDetected: Object.keys(newAttributes),
      },
    }
  } catch (error: any) {
    console.error('Item attributes generation error:', error)
    return {
      own_attributes: {},
      newAttributes: {},
      responseTime: '0',
      debugInfo: {
        model: STRUCTURED_FLASH_LITE_MODEL,
        step: 'Step 2: Item Attributes',
        prompt: promptText,
        response: `Error: ${error.message}`,
      },
    }
  }
}

/**
 * Generate item image
 */
async function generateItemImage(
  baseItemInfo: BaseEntityInfo,
  artStyle = 'historical illustration'
): Promise<{
  imageBase64: string
  responseTime: string
  debugInfo: any
}> {
  const API_KEY = getApiKey()
  const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_IMAGE_MODEL}:generateContent?key=${API_KEY}`

  const imagePrompt = `Generate a game item sprite/icon in ${artStyle} style.

Item Name: ${baseItemInfo.name}
Rarity/Significance: ${baseItemInfo.rarity}
Category: ${baseItemInfo.category}
Historical Setting: ${baseItemInfo.historicalPeriod}

Description:
${baseItemInfo.description}

Style Requirements:
- ${artStyle} art style
- Game item icon/sprite aesthetic
- Rarity level should influence visual quality (${baseItemInfo.rarity})
- Clear, iconic representation suitable for inventory display
- Clean transparent-style background
- Focus on the item itself with good detail
- Suitable for use as a game item
- the item should be in the center of the image
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
    console.log('Item Image Generation Response:', data)

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
        step: 'Step 3: Item Image',
        prompt: imagePrompt,
        response: `Image generated successfully`,
        imageSize: imageBase64.length + ' characters',
      },
    }
  } catch (error: any) {
    throw new Error(`Item Image Generation Error: ${error.message}`)
  }
}

/**
 * Create complete Item with JSON + Attributes + Image
 * 
 * @param prompt - User prompt describing the item to create
 * @param gameContext - Game state context (spatial, player, world, inventory, etc.)
 * @param gameRules - Game configuration (art style, period, attribute library)
 * @returns GenerationResult with 4 parts: entity, newAttributes, timing, debugData
 * 
 * @example
 * // Example Output:
 * {
 *   // 1. THE GENERATED ENTITY
 *   entity: {
 *     id: "wea_sword_fire_001",
 *     name: "Legendary Fire Sword",
 *     rarity: "legendary",
 *     category: "weapon",
 *     description: "A blade forged in dragon fire, its edge glows with ancient flames...",
 *     own_attributes: {
 *       damage: { value: 80, type: "integer", description: "Damage dealt in combat", reference: "20=common sword, 40=quality, 60=rare, 80=legendary" },
 *       weight: { value: 8, type: "integer", description: "Weight in pounds", reference: "5=dagger, 15=sword, 30=greatsword" },
 *       durability: { value: 95, type: "integer", description: "Item durability", reference: "50=average, 75=durable, 90=very durable, 100=indestructible" }
 *     },
 *     image_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
 *     x: 456,
 *     y: -123,
 *     region: "region_medieval_kingdom_001"
 *   },
 * 
 *   // 2. NEW ATTRIBUTES DISCOVERED (not in attribute library)
 *   newAttributes: {
 *     "fire_damage": {
 *       value: 50,
 *       type: "integer",
 *       description: "Additional fire damage dealt",
 *       reference: "10=weak flames, 30=steady fire, 50=strong flames, 100=inferno",
 *       category: "weapon"
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
 *     step1: { model: "gemini-2.5-flash-lite", prompt: "...", response: "{...}", schema: "ITEM_SCHEMA" },
 *     step2: { model: "gemini-2.5-flash-lite", prompt: "...", response: "{...}", availableAttributes: ["damage", "weight"], newAttributesDetected: ["fire_damage"] },
 *     step3: { model: "gemini-2.5-flash-image", prompt: "...", response: "Image generated successfully", imageSize: "..." }
 *   }
 * }
 */
export async function createItem(
  prompt: string,
  gameContext: GameContext = {},
  gameRules: GameRules
): Promise<GenerationResult<Item>> {
  const entityType = 'item'
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
    console.log('Step 0: Synthesizing item-specific context...')
    const contextResult = await synthesizeItemContext(gameContext)
    const contextSummary = contextResult.summary || ''
    debugData.step0 = contextResult.debugInfo || null
    console.log('✓ Item context synthesized')

    // Step 1: Generate base item
    console.log('Step 1: Generating base item JSON...')
    const jsonResult = await generateItemJSON(prompt, contextSummary, gameRules)
    const entity = jsonResult.entity
    const jsonTime = jsonResult.responseTime
    debugData.step1 = jsonResult.debugInfo
    console.log('✓ Base item generated in', jsonTime, 'ms')

    // Override ID with auto-generated sequential ID
    entity.id = getNextEntityId('item', entity.category, entity.name)
    console.log('Item:', entity)

    // Create baseItemInfo bundle
    const baseItemInfo: BaseEntityInfo = {
      name: entity.name,
      rarity: entity.rarity,
      category: entity.category,
      description: entity.description,
      historicalPeriod: gameRules.historicalPeriod || 'Medieval Europe',
    }

    // Step 2: Generate item attributes
    console.log('Step 2: Generating item attributes...')
    const attrResult = await generateItemAttributes(baseItemInfo, gameContext, gameRules)
    const own_attributes = attrResult.own_attributes
    const newAttributes = attrResult.newAttributes
    const attributesTime = attrResult.responseTime
    debugData.step2 = attrResult.debugInfo
    console.log('✓ Item attributes generated in', attributesTime, 'ms')
    console.log('Item Attributes:', own_attributes)
    if (Object.keys(newAttributes).length > 0) {
      console.log('🆕 New Attributes:', newAttributes)
    }

    // Step 3: Generate item image
    console.log('Step 3: Generating item sprite/icon...')
    const imageResult = await generateItemImage(baseItemInfo, gameRules.artStyle || 'historical illustration')
    const imageBase64 = imageResult.imageBase64
    const imageTime = imageResult.responseTime
    debugData.step3 = imageResult.debugInfo
    console.log('✓ Item image generated in', imageTime, 'ms')

    // Step 4: Combine all parts + add system fields
    console.log('Step 4: Combining all parts and adding system fields...')

    const completeEntity: Item = {
      ...entity,
      own_attributes,
      image_url: `data:image/png;base64,${imageBase64}`,
      x: Math.floor(Math.random() * 2000) - 1000,
      y: Math.floor(Math.random() * 2000) - 1000,
      region: 'region_medieval_kingdom_001',
    }

    const totalTime = (parseFloat(jsonTime) + parseFloat(attributesTime) + parseFloat(imageTime)).toFixed(2)
    console.log(`✓ Complete item created in ${totalTime}ms total`)

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
    console.error('Item creation failed:', error)
    throw error
  }
}

