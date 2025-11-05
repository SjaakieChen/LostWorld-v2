// Item Entity Generation Service
import type { Item } from '../../types'
import type {
  GameRules,
  BaseEntityInfo,
  GenerationResult,
  GeminiResponse,
  Attribute,
} from './types'
import { STRUCTURED_FLASH_LITE_MODEL, STRUCTURED_IMAGE_MODEL, STRUCTURED_API_BASE_URL, ITEM_SCHEMA } from './core'
import { getNextEntityId, ITEM_CATEGORIES } from './categories'
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
 * Add new attributes to the gameRules attribute library
 */
function addNewAttributesToLibrary(
  newAttributes: Record<string, Attribute & { category: string }>,
  gameRules: GameRules
): void {
  for (const [attrName, attrData] of Object.entries(newAttributes)) {
    const categoryName = attrData.category
    
    // Find the category in itemCategories array
    let categoryDef = gameRules.itemCategories.find(c => c.name === categoryName)
    
    // Create category if it doesn't exist
    if (!categoryDef) {
      categoryDef = {
        name: categoryName,
        attributes: []
      }
      gameRules.itemCategories.push(categoryDef)
      console.log(`✅ Created new category "${categoryName}" in itemCategories`)
    }
    
    // Check if attribute already exists
    const existingAttr = categoryDef.attributes.find(a => a.name === attrName)
    
    // Add new attribute if it doesn't exist
    if (!existingAttr) {
      categoryDef.attributes.push({
        name: attrName,
        type: attrData.type,
        description: attrData.description,
        reference: attrData.reference
      })
      console.log(`✅ Added new attribute "${attrName}" to ${categoryName} category`)
    }
  }
}


/**
 * Generate base item JSON using structured output
 */
async function generateItemJSON(
  prompt: string,
  gameRules: GameRules
): Promise<{
  entity: any
  responseTime: string
  debugInfo: any
}> {
  const API_KEY = getApiKey()
  const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_FLASH_LITE_MODEL}:generateContent?key=${API_KEY}`

  const enhancedPrompt = `You are a historically accurate game item generator for a game in this historical period: ${gameRules.historicalPeriod}.

  If you are given a prompt about a generic item that is not specific to this historical period, you should generate a generic item that is appropriate for the historical period.
  However if the prompt specifies a specific name or feature of an item. You should output the exact name, and/or describe the feature as part of the description.

  User Request: ${prompt}

Generate the complete item following the schema.`

  // Update schema with dynamic categories from gameRules
  const dynamicCategories = gameRules.itemCategories.map(cat => cat.name)
  const categoryEnum = dynamicCategories.length > 0 ? dynamicCategories : ITEM_CATEGORIES
  
  const schema = {
    ...ITEM_SCHEMA,
    properties: {
      ...ITEM_SCHEMA.properties,
      category: {
        ...ITEM_SCHEMA.properties.category,
        enum: categoryEnum,
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
    console.log('Raw LLM response (base entity):', jsonText.substring(0, 200) + '...')
    const cleanedJson = cleanJsonResponse(jsonText)
    const entity = JSON.parse(cleanedJson)

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

  // Get attribute library for this category using new array structure
  const categoryData = gameRules.itemCategories?.find(cat => cat.name === category)
  const commonData = gameRules.itemCategories?.find(cat => cat.name === 'common')
  const categoryAttrs = categoryData?.attributes || []
  const commonAttrs = commonData?.attributes || []
  
  // Convert array of attributes to object for compatibility
  const availableAttributes: Record<string, any> = {}
  const allAttrs = [...categoryAttrs, ...commonAttrs]
  allAttrs.forEach((attr: any) => {
    availableAttributes[attr.name] = attr
  })

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


${attributeList ? `📚 Previously Generated Attributes for "${category}":\n${attributeList}` : ''}

🎯 INSTRUCTIONS:
${attributeList
  ? [
      "1. Review the available attributes above (note the → reference examples for calibration)",
      "2. Select relevant attributes for this item",
      "3. For EXISTING attributes: reuse the reference from the library above",
      "4. For NEW attributes: create an appropriate reference calibration"
    ].join('\n')
  : ''
}

Attributes will be used for balancing the items inside the game, this will be done by a large language model that will read the attributes and then determining if something can or cannot be done.
Therefore new attributes should have a implied gamemechanic. For example if you introduced attribute 'damage' you should have a reference scale from 0-100 and give an example of what item would be expected to have 20 or 50 or 80 damage.
Or a reference scale of "weak" to "strong" is also a clear reference scale that can be used.
Remember that the genre of this game is ${gameRules.genre}.
Try not to introduce attributes that are not relevant to the genre of the game.
But new attribute creation is encouraged if it is relevant to the genre of the game.

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
      "reference": "any material that is clear to the user. like steel or wood etc."
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
    console.log('Raw LLM response (attributes):', jsonText.substring(0, 200) + '...')
    
    try {
      const cleanedJson = cleanJsonResponse(jsonText)
      const responseData = JSON.parse(cleanedJson)

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
    } catch (jsonError: any) {
      console.error('JSON Parse Error:', jsonError)
      console.error('Raw response:', jsonText)
      throw new Error(`Item attributes JSON parsing failed: ${jsonError.message}`)
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
- SQUARE FORMAT (1:1 aspect ratio)
- Game item icon/sprite aesthetic
- Item centered on neutral background
- Rarity level should influence visual detail and importance (${baseItemInfo.rarity})
- Clear, iconic representation suitable for inventory display
- Focus on the item itself with good detail
- Suitable for use as a game item
- the item should be in the center of the image
- no text should be in the image
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
      // Check if it was blocked by safety filters
      const finishReason = data.candidates?.[0]?.finishReason
      if (finishReason === 'SAFETY') {
        const safetyRatings = data.candidates?.[0]?.safetyRatings || []
        console.warn('🛡️ Image generation blocked by SAFETY filters:', safetyRatings)
        throw new Error(`Image generation blocked by safety filters: ${JSON.stringify(safetyRatings)}`)
      }
      
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
 * @param gameRules - Game configuration (art style, period, attribute library)
 * @param region - Region where the item should be placed
 * @param x - X coordinate where the item should be placed
 * @param y - Y coordinate where the item should be placed
 * @returns GenerationResult with 4 parts: entity, newAttributes, timing, debugData
 * 
 * @example
 * // Example Output:
 * {
 *   // 1. THE GENERATED ENTITY
 *   entity: {
 *     id: "ite_legendary_fire_sword_wea_001",
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
 *     attributes: "2345.67",    // Step 2: Attribute generation (parallel)
 *     image: "3456.78",         // Step 3: Image generation (parallel)
 *     total: "5791.23"          // Total time (optimized with parallelization)
 *   },
 * 
 *   // 4. DEBUG DATA (LLM prompts and responses for each step)
 *   debugData: {
 *     step1: { model: "gemini-2.5-flash-lite", prompt: "...", response: "{...}", schema: "ITEM_SCHEMA" },
 *     step2: { model: "gemini-2.5-flash-lite", prompt: "...", response: "{...}", availableAttributes: ["damage", "weight"], newAttributesDetected: ["fire_damage"] },
 *     step3: { model: "gemini-2.5-flash-image", prompt: "...", response: "Image generated successfully", imageSize: "..." }
 *   }
 * }
 */
export async function createItem(
  prompt: string,
  gameRules: GameRules,
  region: string,
  x: number,
  y: number
): Promise<GenerationResult<Item>> {
  const entityType = 'item'
  console.log(`\n=== Creating ${entityType} ===`)
  console.log(`Prompt: ${prompt}`)

  const debugData = {
    step1: null,
    step2: null,
    step3: null,
  }

  try {
    // Step 1: Generate base item
    console.log('Step 1: Generating base item JSON...')
    const jsonResult = await generateItemJSON(prompt, gameRules)
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

    // Step 2 & 3: Generate attributes and image in parallel
    console.log('Step 2 & 3: Generating item attributes and image in parallel...')
    const [attrResult, imageResult] = await Promise.all([
      generateItemAttributes(baseItemInfo, gameRules),
      generateItemImage(baseItemInfo, gameRules.artStyle || 'historical illustration')
    ])
    
    const own_attributes = attrResult.own_attributes
    const newAttributes = attrResult.newAttributes
    const attributesTime = attrResult.responseTime
    debugData.step2 = attrResult.debugInfo
    
    const imageBase64 = imageResult.imageBase64
    const imageTime = imageResult.responseTime
    debugData.step3 = imageResult.debugInfo
    
    console.log('✓ Item attributes generated in', attributesTime, 'ms')
    console.log('✓ Item image generated in', imageTime, 'ms')
    console.log('Item Attributes:', own_attributes)
    if (Object.keys(newAttributes).length > 0) {
      console.log('🆕 New Attributes:', newAttributes)
      addNewAttributesToLibrary(newAttributes, gameRules)
    }

    // Step 4: Combine all parts + add system fields
    console.log('Step 4: Combining all parts and adding system fields...')

    const completeEntity: Item = {
      ...entity,
      own_attributes,
      image_url: `data:image/png;base64,${imageBase64}`,
      x: x,
      y: y,
      region: region,
      purpose: entity.purpose || 'generic',  // Extract purpose from Step 1, default to "generic" if missing
    }

    const totalTime = (parseFloat(jsonTime) + Math.max(parseFloat(attributesTime), parseFloat(imageTime))).toFixed(2)
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

