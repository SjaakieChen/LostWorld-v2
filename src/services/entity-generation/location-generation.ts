// Location Entity Generation Service
import type { Location } from '../../types/location.types'
import type {
  GameRules,
  BaseEntityInfo,
  GenerationResult,
  GeminiResponse,
  Attribute,
} from './types'
import { STRUCTURED_FLASH_LITE_MODEL, STRUCTURED_IMAGE_MODEL, STRUCTURED_API_BASE_URL, LOCATION_SCHEMA } from './core'
import { getNextEntityId, LOCATION_CATEGORIES } from './categories'
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
    
    // Find the category in locationCategories array
    let categoryDef = gameRules.locationCategories.find(c => c.name === categoryName)
    
    // Create category if it doesn't exist
    if (!categoryDef) {
      categoryDef = {
        name: categoryName,
        attributes: []
      }
      gameRules.locationCategories.push(categoryDef)
      console.log(`✅ Created new category "${categoryName}" in locationCategories`)
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
 * Generate base location JSON using structured output
 */
async function generateLocationJSON(
  prompt: string,
  gameRules: GameRules
): Promise<{
  entity: any
  responseTime: string
  debugInfo: any
}> {
  const API_KEY = getApiKey()
  const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_FLASH_LITE_MODEL}:generateContent?key=${API_KEY}`

  const enhancedPrompt = `You are a historically accurate game location generator for a game in this historical period: ${gameRules.historicalPeriod}.

  If you are given a prompt about a generic location that is not specific, you should generate a generic location that is appropriate for the historical period.
  However if the prompt specifies a specific name or feature of a location. You should output the exact name, and/or describe the feature as part of the description.

User Request: ${prompt}

  User Request: ${prompt}

  Generate the complete location following the schema.`

  // Update schema with dynamic categories from gameRules
  const dynamicCategories = gameRules.locationCategories.map(cat => cat.name)
  const categoryEnum = dynamicCategories.length > 0 ? dynamicCategories : LOCATION_CATEGORIES
  
  const schema = {
    ...LOCATION_SCHEMA,
    properties: {
      ...LOCATION_SCHEMA.properties,
      category: {
        ...LOCATION_SCHEMA.properties.category,
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

  // Get attribute library for this category using new array structure
  const categoryData = gameRules.locationCategories?.find(cat => cat.name === category)
  const commonData = gameRules.locationCategories?.find(cat => cat.name === 'common')
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

    Location Name: ${name}
    Rarity/Significance: ${rarity}
    Category: ${category}
    Historical Setting: ${historicalPeriod}
    Description: ${description}
    
    
    ${attributeList ? `📚 Previously Generated Attributes for "${category}":\n${attributeList}` : ''}
    
    🎯 INSTRUCTIONS:
    ${attributeList
      ? [
          "1. Review the available attributes above (note the → reference examples for calibration)",
          "2. Select relevant attributes for this location",
          "3. For EXISTING attributes: reuse the reference from the library above",
          "4. For NEW attributes: create an appropriate reference calibration"
        ].join('\n')
      : ''
    }
    
    Attributes will be used for balancing the i tems inside the game, this will be done by a large language model that will read the attributes and then determining if something can or cannot be done.
    Therefore new attributes should have a implied gamemechanic. For example if you introduced attribute 'danger_level' you should have a reference scale from 0-100 and give an example of what location would be expected to have 20 or 50 or 80 danger_level.
    Or a reference scale of "very safe" to "very dangerous" is also a clear reference scale that can be used.
    Remember that the genre of this game is ${gameRules.genre}.
    Try not to introduce attributes that are not relevant to the genre of the game.
    But new attribute creation is encouraged if it is relevant to the genre of the game.
    
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
      "reference": "plains, forest, mountain, swamp, desert or any other terrain type that is clear to the user."
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
        step: 'Step 2: Location Attributes',
        prompt: promptText,
        response: JSON.stringify(processedAttributes, null, 2),
        availableAttributes: Object.keys(availableAttributes),
        newAttributesDetected: Object.keys(newAttributes),
      },
    }
    } catch (jsonError: any) {
      console.error('JSON Parse Error:', jsonError)
      console.error('Raw response:', jsonText)
      throw new Error(`Location attributes JSON parsing failed: ${jsonError.message}`)
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
- Rarity level should influence visual detail and importance (${baseLocationInfo.rarity})
- Clear, atmospheric environment
- Period-appropriate architecture and setting
- Focus on the location with good detail
- Suitable for use as a game location scene
- The location should be well-framed in the image
- It should be in the point of view of a person at the location
- If the location is a real specific historical location, then the image should be a representation of the location at that time.
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
 * @param gameRules - Game configuration (art style, period, attribute library)
 * @param region - Region where the location should be placed
 * @param x - X coordinate where the location should be placed
 * @param y - Y coordinate where the location should be placed
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
 *     region: "region_medieval_kingdom_001"
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
  gameRules: GameRules,
  region: string,
  x: number,
  y: number
): Promise<GenerationResult<Location>> {
  const entityType = 'location'
  console.log(`\n=== Creating ${entityType} ===`)
  console.log(`Prompt: ${prompt}`)

  const debugData = {
    step1: null,
    step2: null,
    step3: null,
  }

  try {
    // Step 1: Generate base location
    console.log('Step 1: Generating base location JSON...')
    const jsonResult = await generateLocationJSON(prompt, gameRules)
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

    // Step 2 & 3: Generate attributes and image in parallel
    console.log('Step 2 & 3: Generating location attributes and image in parallel...')
    const [attrResult, imageResult] = await Promise.all([
      generateLocationAttributes(baseLocationInfo, gameRules),
      generateLocationImage(baseLocationInfo, gameRules.artStyle || 'historical landscape')
    ])
    
    const own_attributes = attrResult.own_attributes
    const newAttributes = attrResult.newAttributes
    const attributesTime = attrResult.responseTime
    debugData.step2 = attrResult.debugInfo
    
    const imageBase64 = imageResult.imageBase64
    const imageTime = imageResult.responseTime
    debugData.step3 = imageResult.debugInfo
    
    console.log('✓ Location attributes generated in', attributesTime, 'ms')
    console.log('✓ Location image generated in', imageTime, 'ms')
    console.log('Location Attributes:', own_attributes)
    if (Object.keys(newAttributes).length > 0) {
      console.log('🆕 New Attributes:', newAttributes)
      addNewAttributesToLibrary(newAttributes, gameRules)
    }

    // Step 4: Combine all parts + add system fields
    console.log('Step 4: Combining all parts and adding system fields...')

    const completeEntity: Location = {
      ...entity,
      own_attributes,
      image_url: `data:image/png;base64,${imageBase64}`,
      x: x,
      y: y,
      region: region,
    }

    const totalTime = (parseFloat(jsonTime) + Math.max(parseFloat(attributesTime), parseFloat(imageTime))).toFixed(2)
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

