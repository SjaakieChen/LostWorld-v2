// NPC Entity Generation Service
import type { NPC } from '../../types/npc.types'
import type {
  GameRules,
  BaseEntityInfo,
  GenerationResult,
  GeminiResponse,
  Attribute,
} from './types'
import { STRUCTURED_FLASH_LITE_MODEL, STRUCTURED_IMAGE_MODEL, STRUCTURED_API_BASE_URL, NPC_SCHEMA } from './core'
import { getNextEntityId, NPC_CATEGORIES } from './categories'
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
    
    // Find the category in npcCategories array
    let categoryDef = gameRules.npcCategories.find(c => c.name === categoryName)
    
    // Create category if it doesn't exist
    if (!categoryDef) {
      categoryDef = {
        name: categoryName,
        attributes: []
      }
      gameRules.npcCategories.push(categoryDef)
      console.log(`✅ Created new category "${categoryName}" in npcCategories`)
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
 * Generate base NPC JSON using structured output
 */
async function generateNpcJSON(
  prompt: string,
  gameRules: GameRules
): Promise<{
  entity: any
  responseTime: string
  debugInfo: any
}> {
  const API_KEY = getApiKey()
  const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_FLASH_LITE_MODEL}:generateContent?key=${API_KEY}`

  const enhancedPrompt = `You are a historically accurate game NPC generator for a game in this historical period: ${gameRules.historicalPeriod}.

  If you are given a prompt about a generic NPC that is not specific to this historical period, you should generate a generic NPC that is appropriate for the historical period.
  However if the prompt specifies a specific name or feature of an NPC. You should output the exact name, and/or describe the feature as part of the descriptions.

User Request: ${prompt}

Generate the complete NPC following the schema.`

  // Update schema with dynamic categories from gameRules
  const dynamicCategories = gameRules.npcCategories.map(cat => cat.name)
  const categoryEnum = dynamicCategories.length > 0 ? dynamicCategories : NPC_CATEGORIES
  
  const schema = {
    ...NPC_SCHEMA,
    properties: {
      ...NPC_SCHEMA.properties,
      category: {
        ...NPC_SCHEMA.properties.category,
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
  gameRules: GameRules
): Promise<{
  own_attributes: Record<string, Attribute>
  newAttributes: Record<string, Attribute & { category: string }>
  responseTime: string
  debugInfo: any
}> {
  const API_KEY = getApiKey()
  const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_FLASH_LITE_MODEL}:generateContent?key=${API_KEY}`

  const { name, rarity, category, functionalDescription, historicalPeriod } = baseNpcInfo

  // Get attribute library for this category using new array structure
  const categoryData = gameRules.npcCategories?.find(cat => cat.name === category)
  const commonData = gameRules.npcCategories?.find(cat => cat.name === 'common')
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

  const promptText = `You are a historical game designer creating attributes for an NPC.

NPC Name: ${name}
Rarity/Significance: ${rarity}
Category: ${category}
Historical Setting: ${historicalPeriod}
Functional Description: ${functionalDescription}

Attributes will be used for balancing the NPCs inside the game, this will be done by a large language model that will read the attributes and then determining if something can or cannot be done.
Therefore new attributes should have a implied gamemechanic. For example if you introduced attribute 'trust' you should have a reference scale from 0-100 and give an example of what NPC would be expected to have 20 or 50 or 80 trust.
Or a reference scale of "hostile" to "friendly" is also a clear reference scale that can be used.
Remember that the genre of this game is ${gameRules.genre}.
Try not to introduce attributes that are not relevant to the genre of the game.
But new attribute creation is encouraged if it is relevant to the genre of the game.

${attributeList ? `📚 Previously Generated Attributes for "${category}":\n${attributeList}` : ''}

🎯 INSTRUCTIONS:
${attributeList ? [
      "1. Review the available attributes above (note the → reference examples for calibration)",
      "2. Select relevant attributes for this NPC",
      "3. For EXISTING attributes: reuse the reference from the library above",
      "4. For NEW attributes: create an appropriate reference calibration"
    ].join('\n')
  : ''
}

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
      "reference": "any profession or role that is clear to the user. like farmer or merchant or knight or priest or king etc."
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
        step: 'Step 2: NPC Attributes',
        prompt: promptText,
        response: JSON.stringify(processedAttributes, null, 2),
        availableAttributes: Object.keys(availableAttributes),
        newAttributesDetected: Object.keys(newAttributes),
      },
    }
    } catch (jsonError: any) {
      console.error('JSON Parse Error:', jsonError)
      console.error('Raw response:', jsonText)
      throw new Error(`NPC attributes JSON parsing failed: ${jsonError.message}`)
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

Visual Description:
${baseNpcInfo.visualDescription}

Style Requirements:
- ${artStyle} art style
- SQUARE FORMAT (1:1 aspect ratio)
- Character portrait aesthetic (shoulders and head visible)
- Rarity level should influence visual detail and importance (${baseNpcInfo.rarity})
- Clear, expressive face and personality
- Period-appropriate clothing and appearance
- Focus on the character with good detail
- Suitable for use as a game character portrait
- The character should be centered in the image
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
 * @param gameRules - Game configuration (art style, period, attribute library)
 * @param region - Region where the NPC should be placed
 * @param x - X coordinate where the NPC should be placed
 * @param y - Y coordinate where the NPC should be placed
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
 *     region: "region_medieval_kingdom_001",
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
  gameRules: GameRules,
  region: string,
  x: number,
  y: number
): Promise<GenerationResult<NPC>> {
  const entityType = 'npc'
  console.log(`\n=== Creating ${entityType} ===`)
  console.log(`Prompt: ${prompt}`)

  const debugData = {
    step1: null,
    step2: null,
    step3: null,
  }

  try {
    // Step 1: Generate base NPC
    console.log('Step 1: Generating base NPC JSON...')
    const jsonResult = await generateNpcJSON(prompt, gameRules)
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
      visualDescription: entity.visualDescription,
      functionalDescription: entity.functionalDescription,
      historicalPeriod: gameRules.historicalPeriod || 'Medieval Europe',
    }

    // Step 2 & 3: Generate attributes and image in parallel
    console.log('Step 2 & 3: Generating NPC attributes and image in parallel...')
    const [attrResult, imageResult] = await Promise.all([
      generateNpcAttributes(baseNpcInfo, gameRules),
      generateNpcImage(baseNpcInfo, gameRules.artStyle || 'historical portrait')
    ])
    
    const own_attributes = attrResult.own_attributes
    const newAttributes = attrResult.newAttributes
    const attributesTime = attrResult.responseTime
    debugData.step2 = attrResult.debugInfo
    
    const imageBase64 = imageResult.imageBase64
    const imageTime = imageResult.responseTime
    debugData.step3 = imageResult.debugInfo
    
    console.log('✓ NPC attributes generated in', attributesTime, 'ms')
    console.log('✓ NPC image generated in', imageTime, 'ms')
    console.log('NPC Attributes:', own_attributes)
    if (Object.keys(newAttributes).length > 0) {
      console.log('🆕 New Attributes:', newAttributes)
      addNewAttributesToLibrary(newAttributes, gameRules)
    }

    // Step 4: Combine all parts + add system fields
    console.log('Step 4: Combining all parts and adding system fields...')

    const completeEntity: NPC = {
      ...entity,
      visualDescription: entity.visualDescription,
      functionalDescription: entity.functionalDescription,
      own_attributes,
      image_url: `data:image/png;base64,${imageBase64}`,
      x: x,
      y: y,
      region: region,
      chatHistory: [],
      purpose: entity.purpose || 'generic',  // Extract purpose from Step 1, default to "generic" if missing
    }

    const totalTime = (parseFloat(jsonTime) + Math.max(parseFloat(attributesTime), parseFloat(imageTime))).toFixed(2)
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

