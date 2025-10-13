// Google Gemini API Structured Output Testing
// Tests generation of Lost World game entities with proper TypeScript types

const STRUCTURED_FLASH_LITE_MODEL = 'gemini-2.5-flash-lite';
const STRUCTURED_IMAGE_MODEL = 'gemini-2.5-flash-image';
const STRUCTURED_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// JSON Schemas for each entity type

// Schema for base entity - only semantic/content fields
const ITEM_SCHEMA = {
    type: "object",
    properties: {
        id: { 
            type: "string", 
            description: "ID format: XXX_itemname_### where XXX = first 3 letters of category (wea=weapon, arm=armor, con=consumable), itemname is descriptive name, ### is sequential number starting at 001. Examples: 'wea_sword_fire_001', 'arm_shield_wooden_001', 'con_potion_health_001'" 
        },
        name: { type: "string", description: "Display name of the item" },
        rarity: { type: "string", enum: ["common", "rare", "epic", "legendary"] },
        description: { type: "string", description: "Detailed visual description for image generation" },
        category: { type: "string", description: "Category like 'weapon', 'armor', 'consumable'" }
    },
    required: ["id", "name", "rarity", "description"]
};

// Schema for base entity - only semantic/content fields
const NPC_SCHEMA = {
    type: "object",
    properties: {
        id: { 
            type: "string", 
            description: "ID format: XXX_npcname_### where XXX = first 3 letters of category (mer=merchant, gua=guard, que=quest_giver), npcname is descriptive name, ### is sequential number starting at 001. Examples: 'mer_hans_001', 'gua_castle_001', 'que_elder_001'" 
        },
        name: { type: "string", description: "Display name of the NPC" },
        rarity: { type: "string", enum: ["common", "rare", "epic", "legendary"] },
        description: { type: "string", description: "Detailed visual description for image generation" },
        category: { type: "string", description: "Category like 'merchant', 'guard', 'quest_giver'" }
    },
    required: ["id", "name", "rarity", "description"]
};

// Schema for base entity - only semantic/content fields
const LOCATION_SCHEMA = {
    type: "object",
    properties: {
        id: { 
            type: "string", 
            description: "ID format: XXX_locationname_### where XXX = first 3 letters of category (wil=wilderness, tow=town, dun=dungeon, bui=building), locationname is descriptive name, ### is sequential number starting at 001. Examples: 'wil_forest_dark_001', 'tow_village_001', 'dun_crypt_001'" 
        },
        name: { type: "string", description: "Display name of the location" },
        rarity: { type: "string", enum: ["common", "rare", "epic", "legendary"] },
        description: { type: "string", description: "Detailed visual description for image generation" },
        category: { type: "string", description: "Category like 'town', 'dungeon', 'building', 'wilderness'" }
    },
    required: ["id", "name", "rarity", "description"]
};

/**
 * Synthesize gameContext into narrative summary using Flash Lite
 * @param {Object} gameContext - Raw spatial/regional data
 * @param {string} entityType - Type: 'item', 'npc', or 'location'
 * @returns {Promise<string>} Narrative context summary
 */
async function synthesizeGameContext(gameContext = {}, entityType = 'item') {
    if (!API_KEY) {
        throw new Error('Please set your API key first');
    }
    
    // If no context provided, return empty string
    if (Object.keys(gameContext).length === 0) {
        return '';
    }

    const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_FLASH_LITE_MODEL}:generateContent?key=${API_KEY}`;
    
    const synthesisPrompt = `You are a game context analyzer for Lost World RPG.

Raw spatial/regional data:
${JSON.stringify(gameContext, null, 2)}

Entity type being generated: ${entityType}

Create a brief narrative summary (2-3 sentences) describing this location/region context that will help guide ${entityType} generation. Focus on atmosphere, setting, and what would fit here.

Return ONLY the narrative summary, no JSON, no extra explanation.`;

    const requestBody = {
        contents: [{
            parts: [{
                text: synthesisPrompt
            }]
        }]
    };

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            console.warn('Context synthesis failed, using empty context');
            return '';
        }

        const data = await response.json();
        const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        console.log('📝 Synthesized Context:', summary);
        
        return {
            summary: summary.trim(),
            debugInfo: {
                model: 'gemini-2.5-flash-lite',
                step: 'Step 0: Context Synthesis',
                input: JSON.stringify(gameContext, null, 2),
                prompt: synthesisPrompt,
                output: summary.trim()
            }
        };
    } catch (error) {
        console.error('Context synthesis error:', error);
        return {
            summary: '',
            debugInfo: {
                model: 'gemini-2.5-flash-lite',
                step: 'Step 0: Context Synthesis',
                input: JSON.stringify(gameContext, null, 2),
                prompt: synthesisPrompt,
                output: `Error: ${error.message}`
            }
        };
    }
}

/**
 * Generate structured JSON for items using Flash Lite model
 * @param {string} prompt - User prompt like "create a legendary fire sword"
 * @param {string} contextSummary - AI-synthesized narrative context (from synthesizeGameContext)
 * @param {Object} gameRules - Game mechanics/rules (ID format, damage ranges, art style)
 * @returns {Promise<Object>} Generated item JSON
 */
async function generateItemJSON(prompt, contextSummary = '', gameRules = {}) {
    if (!API_KEY) {
        throw new Error('Please set your API key first');
    }

    const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_FLASH_LITE_MODEL}:generateContent?key=${API_KEY}`;
    
    // Extract available categories from gameRules
    const availableCategories = gameRules.categories 
        ? Object.keys(gameRules.categories).filter(c => c !== 'common')
        : [];
    
    const categoryList = availableCategories.length > 0
        ? `📦 AVAILABLE CATEGORIES: ${availableCategories.join(', ')}`
        : '';
    
    // Item-specific prompt with AI-synthesized context
    const enhancedPrompt = `You are generating an ITEM for Lost World RPG.

${contextSummary ? `📍 LOCATION CONTEXT: ${contextSummary}` : ''}

${gameRules.artStyle ? `🎨 ART STYLE: ${gameRules.artStyle}` : ''}
${gameRules.theme ? `🎭 THEME: ${gameRules.theme}` : ''}
${categoryList}

User request: ${prompt}

Create this item fitting the location context. ${availableCategories.length > 0 ? `Choose an appropriate category from the available categories.` : ''} Visual description should match the ${gameRules.artStyle || 'fantasy'} art style for sprite/icon generation.

Return ONLY valid JSON matching the schema.`;

    const requestBody = {
        contents: [{
            parts: [{
                text: enhancedPrompt
            }]
        }],
        generationConfig: {
            response_mime_type: "application/json",
            response_schema: ITEM_SCHEMA
        }
    };

    const startTime = performance.now();
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        console.log('Item JSON Response:', data);
        
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const entity = JSON.parse(jsonText);
        
        return {
            entity,
            responseTime: responseTime.toFixed(2),
            debugInfo: {
                model: 'gemini-2.5-flash-lite',
                step: 'Step 1: Base Entity JSON',
                prompt: enhancedPrompt,
                response: JSON.stringify(entity, null, 2),
                schema: 'ITEM_SCHEMA'
            }
        };
    } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        throw new Error(`Item JSON Generation Error: ${error.message}`);
    }
}

/**
 * Generate structured JSON for NPCs using Flash Lite model
 * @param {string} prompt - User prompt like "create a wise old merchant"
 * @param {string} contextSummary - AI-synthesized narrative context (from synthesizeGameContext)
 * @param {Object} gameRules - Game mechanics/rules (ID format, level ranges, factions, art style)
 * @returns {Promise<Object>} Generated NPC JSON
 */
async function generateNPCJSON(prompt, contextSummary = '', gameRules = {}) {
    if (!API_KEY) {
        throw new Error('Please set your API key first');
    }

    const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_FLASH_LITE_MODEL}:generateContent?key=${API_KEY}`;
    
    // Extract available categories from gameRules (same as Items)
    const availableCategories = gameRules.categories 
        ? Object.keys(gameRules.categories).filter(c => c !== 'common')
        : [];
    
    const categoryList = availableCategories.length > 0
        ? `📦 AVAILABLE CATEGORIES: ${availableCategories.join(', ')}`
        : '';
    
    // NPC-specific prompt with AI-synthesized context
    const enhancedPrompt = `You are generating an NPC CHARACTER for Lost World RPG.

${contextSummary ? `📍 LOCATION CONTEXT: ${contextSummary}` : ''}

${gameRules.artStyle ? `🎨 ART STYLE: ${gameRules.artStyle}` : ''}
${gameRules.theme ? `🎭 THEME: ${gameRules.theme}` : ''}
${categoryList}

User request: ${prompt}

Create this NPC fitting the location context. ${availableCategories.length > 0 ? `Choose an appropriate category from the available categories.` : ''} Visual description should match the ${gameRules.artStyle || 'fantasy'} art style for character portrait.

Return ONLY valid JSON matching the schema.`;

    const requestBody = {
        contents: [{
            parts: [{
                text: enhancedPrompt
            }]
        }],
        generationConfig: {
            response_mime_type: "application/json",
            response_schema: NPC_SCHEMA
        }
    };

    const startTime = performance.now();
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        console.log('NPC JSON Response:', data);
        
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const entity = JSON.parse(jsonText);
        
        return {
            entity,
            responseTime: responseTime.toFixed(2),
            debugInfo: {
                model: 'gemini-2.5-flash-lite',
                step: 'Step 1: Base Entity JSON',
                prompt: enhancedPrompt,
                response: JSON.stringify(entity, null, 2),
                schema: 'NPC_SCHEMA'
            }
        };
    } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        throw new Error(`NPC JSON Generation Error: ${error.message}`);
    }
}

/**
 * Generate structured JSON for locations using Flash Lite model
 * @param {string} prompt - User prompt like "create a mystical forest"
 * @param {string} contextSummary - AI-synthesized narrative context (from synthesizeGameContext)
 * @param {Object} gameRules - Game mechanics/rules (ID format, location types, art style)
 * @returns {Promise<Object>} Generated location JSON
 */
async function generateLocationJSON(prompt, contextSummary = '', gameRules = {}) {
    if (!API_KEY) {
        throw new Error('Please set your API key first');
    }

    const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_FLASH_LITE_MODEL}:generateContent?key=${API_KEY}`;
    
    // Extract available categories from gameRules (same as Items)
    const availableCategories = gameRules.categories 
        ? Object.keys(gameRules.categories).filter(c => c !== 'common')
        : [];
    
    const categoryList = availableCategories.length > 0
        ? `📦 AVAILABLE CATEGORIES: ${availableCategories.join(', ')}`
        : '';
    
    // Location-specific prompt with AI-synthesized context
    const enhancedPrompt = `You are generating a LOCATION for Lost World RPG.

${contextSummary ? `📍 REGIONAL CONTEXT: ${contextSummary}` : ''}

${gameRules.artStyle ? `🎨 ART STYLE: ${gameRules.artStyle}` : ''}
${gameRules.theme ? `🎭 THEME: ${gameRules.theme}` : ''}
${categoryList}

User request: ${prompt}

Create this location fitting the regional context. ${availableCategories.length > 0 ? `Choose an appropriate category from the available categories.` : ''} Visual description should match the ${gameRules.artStyle || 'fantasy'} art style for environment/landscape image.

Return ONLY valid JSON matching the schema.`;

    const requestBody = {
        contents: [{
            parts: [{
                text: enhancedPrompt
            }]
        }],
        generationConfig: {
            response_mime_type: "application/json",
            response_schema: LOCATION_SCHEMA
        }
    };

    const startTime = performance.now();
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        console.log('Location JSON Response:', data);
        
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const entity = JSON.parse(jsonText);
        
        return {
            entity,
            responseTime: responseTime.toFixed(2),
            debugInfo: {
                model: 'gemini-2.5-flash-lite',
                step: 'Step 1: Base Entity JSON',
                prompt: enhancedPrompt,
                response: JSON.stringify(entity, null, 2),
                schema: 'LOCATION_SCHEMA'
            }
        };
    } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        throw new Error(`Location JSON Generation Error: ${error.message}`);
    }
}

/**
 * Generate image from description using Image model
 * @param {string} description - Description text from entity
 * @returns {Promise<string>} Base64 image data
 */
async function generateImageFromDescription(description) {
    if (!API_KEY) {
        throw new Error('Please set your API key first');
    }

    const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_IMAGE_MODEL}:generateContent?key=${API_KEY}`;
    
    const imagePrompt = `Generate a high-quality image for: ${description}`;
    
    const requestBody = {
        contents: [{
            parts: [{
                text: imagePrompt
            }]
        }],
        generationConfig: {
            temperature: 1.0,
            topK: 40,
            topP: 0.95
        }
    };

    const startTime = performance.now();
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        console.log('Image Generation Response:', data);
        
        // Extract image from response
        const parts = data.candidates?.[0]?.content?.parts || [];
        let imageBase64 = null;
        
        for (const part of parts) {
            if (part.inline_data?.data || part.inlineData?.data) {
                imageBase64 = part.inline_data?.data || part.inlineData?.data;
                break;
            }
        }
        
        if (!imageBase64) {
            throw new Error('No image data in response');
        }
        
        return {
            imageBase64,
            responseTime: responseTime.toFixed(2),
            debugInfo: {
                model: 'gemini-2.5-flash-image',
                step: 'Step 3: Image Generation',
                prompt: imagePrompt,
                response: 'Image generated successfully (base64 data)',
                imageSize: imageBase64.length + ' characters'
            }
        };
    } catch (error) {
        throw new Error(`Image Generation Error: ${error.message}`);
    }
}

/**
 * Generate contextual own_attributes for items
 * @param {string} description - Item description
 * @param {string} category - Item category
 * @param {Object} gameContext - Spatial/regional context
 * @param {Object} gameRules - Game mechanics/rules with categories.attributes library
 * @returns {Promise<Object>} Own attributes object with timing
 */
async function generateItemAttributes(description, category, gameContext = {}, gameRules = {}) {
    if (!API_KEY) {
        throw new Error('Please set your API key first');
    }

    const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_FLASH_LITE_MODEL}:generateContent?key=${API_KEY}`;
    
    // Get attribute library for this category
    const categoryData = gameRules.categories?.[category];
    const commonData = gameRules.categories?.common;
    
    const categoryAttrs = categoryData?.attributes || {};
    const commonAttrs = commonData?.attributes || {};
    const availableAttributes = { ...categoryAttrs, ...commonAttrs };
    
    // Format attribute library for LLM with reference calibrations
    const attributeList = Object.entries(availableAttributes)
        .map(([name, meta]) => {
            const typeInfo = meta.range 
                ? `${meta.type} (${meta.range.min}-${meta.range.max})`
                : meta.values 
                ? `${meta.type} (${meta.values.join('/')})` 
                : meta.type;
            
            const reference = meta.reference ? `\n  → ${meta.reference}` : '';
            
            return `- ${name} (${typeInfo}): ${meta.description}${reference}`;
        })
        .join('\n');
    
    const promptText = `Based on this item description: "${description}"

Category: ${category}
${gameContext.region ? `Region: ${gameContext.region}` : ''}

${attributeList ? `📚 AVAILABLE ATTRIBUTES FOR "${category}":\n${attributeList}` : ''}

🎯 INSTRUCTIONS:
${attributeList ? '1. Review the available attributes above (note the → reference examples for calibration)\n2. Select the ones relevant for this item\n3. Assign values based on descriptions, ranges, and reference examples\n4. You may create new attributes if needed (just add them)' : 'Generate appropriate game attributes for this item based on its category and description'}

⚠️ DO NOT INCLUDE: id, name, rarity, description, or category (these are already set)

Return ONLY a JSON object with the selected attributes and their values.`;

    const requestBody = {
        contents: [{
            parts: [{
                text: promptText
            }]
        }],
        generationConfig: {
            response_mime_type: "application/json"
        }
    };

    const startTime = performance.now();
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        console.log('Item Attributes Response:', data);
        
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const attributes = JSON.parse(jsonText);
        
        // Detect new attributes not in library
        const newAttributes = {};
        const attributeNames = Object.keys(availableAttributes);
        
        for (const attrName of Object.keys(attributes)) {
            if (!attributeNames.includes(attrName)) {
                newAttributes[attrName] = {
                    value: attributes[attrName],
                    type: typeof attributes[attrName],
                    category: category
                };
            }
        }
        
        // Log new attributes for library addition
        if (Object.keys(newAttributes).length > 0) {
            console.log(`🆕 NEW ATTRIBUTES CREATED for category "${category}":`, newAttributes);
        }
        
        return {
            own_attributes: attributes,
            newAttributes,
            responseTime: responseTime.toFixed(2),
            debugInfo: {
                model: 'gemini-2.5-flash-lite',
                step: 'Step 2: Attributes',
                prompt: promptText,
                response: JSON.stringify(attributes, null, 2),
                availableAttributes: Object.keys(availableAttributes),
                newAttributesDetected: Object.keys(newAttributes)
            }
        };
    } catch (error) {
        console.error('Item attributes generation error:', error);
        return {
            own_attributes: {},
            newAttributes: {},
            responseTime: '0',
            debugInfo: {
                model: 'gemini-2.5-flash-lite',
                step: 'Step 2: Attributes',
                prompt: promptText,
                response: `Error: ${error.message}`
            }
        };
    }
}

/**
 * Generate contextual own_attributes for NPCs
 * @param {string} description - NPC description
 * @param {string} category - NPC category
 * @param {Object} gameContext - Spatial/regional context
 * @param {Object} gameRules - Game mechanics/rules with categories.attributes library
 * @returns {Promise<Object>} Own attributes object with timing
 */
async function generateNPCAttributes(description, category, gameContext = {}, gameRules = {}) {
    if (!API_KEY) {
        throw new Error('Please set your API key first');
    }

    const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_FLASH_LITE_MODEL}:generateContent?key=${API_KEY}`;
    
    // Get attribute library for this NPC category
    const categoryData = gameRules.categories?.[category];
    const commonData = gameRules.categories?.common;
    
    const categoryAttrs = categoryData?.attributes || {};
    const commonAttrs = commonData?.attributes || {};
    const availableAttributes = { ...categoryAttrs, ...commonAttrs };
    
    // Format attribute library for LLM with reference calibrations
    const attributeList = Object.entries(availableAttributes)
        .map(([name, meta]) => {
            const typeInfo = meta.range 
                ? `${meta.type} (${meta.range.min}-${meta.range.max})`
                : meta.values 
                ? `${meta.type} (${meta.values.join('/')})` 
                : meta.type;
            
            const reference = meta.reference ? `\n  → ${meta.reference}` : '';
            
            return `- ${name} (${typeInfo}): ${meta.description}${reference}`;
        })
        .join('\n');
    
    const promptText = `Based on this NPC description: "${description}"

Category: ${category}
${gameContext.region ? `Region: ${gameContext.region}` : ''}

${attributeList ? `📚 AVAILABLE ATTRIBUTES FOR "${category}":\n${attributeList}` : ''}

🎯 INSTRUCTIONS:
${attributeList ? '1. Review the available attributes above (note the → reference examples for calibration)\n2. Select the ones relevant for this NPC\n3. Assign values based on descriptions, ranges, and reference examples\n4. You may create new attributes if needed (just add them)' : 'Generate appropriate game attributes for this NPC based on its category and description'}

⚠️ DO NOT INCLUDE: id, name, rarity, description, or category (these are already set)

Return ONLY a JSON object with the selected attributes and their values.`;

    const requestBody = {
        contents: [{
            parts: [{
                text: promptText
            }]
        }],
        generationConfig: {
            response_mime_type: "application/json"
        }
    };

    const startTime = performance.now();
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        console.log('NPC Attributes Response:', data);
        
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const attributes = JSON.parse(jsonText);
        
        // Detect new attributes not in library
        const newAttributes = {};
        const attributeNames = Object.keys(availableAttributes);
        
        for (const attrName of Object.keys(attributes)) {
            if (!attributeNames.includes(attrName)) {
                newAttributes[attrName] = {
                    value: attributes[attrName],
                    type: typeof attributes[attrName],
                    category: category
                };
            }
        }
        
        // Log new attributes for library addition
        if (Object.keys(newAttributes).length > 0) {
            console.log(`🆕 NEW ATTRIBUTES CREATED for NPC category "${category}":`, newAttributes);
        }
        
        return {
            own_attributes: attributes,
            newAttributes,
            responseTime: responseTime.toFixed(2),
            debugInfo: {
                model: 'gemini-2.5-flash-lite',
                step: 'Step 2: Attributes',
                prompt: promptText,
                response: JSON.stringify(attributes, null, 2),
                availableAttributes: Object.keys(availableAttributes),
                newAttributesDetected: Object.keys(newAttributes)
            }
        };
    } catch (error) {
        console.error('NPC attributes generation error:', error);
        return {
            own_attributes: {},
            newAttributes: {},
            responseTime: '0',
            debugInfo: {
                model: 'gemini-2.5-flash-lite',
                step: 'Step 2: Attributes',
                prompt: promptText,
                response: `Error: ${error.message}`
            }
        };
    }
}

/**
 * Generate contextual own_attributes for locations
 * @param {string} description - Location description
 * @param {string} category - Location category
 * @param {Object} gameContext - Spatial/regional context
 * @param {Object} gameRules - Game mechanics/rules with categories.attributes library
 * @returns {Promise<Object>} Own attributes object with timing
 */
async function generateLocationAttributes(description, category, gameContext = {}, gameRules = {}) {
    if (!API_KEY) {
        throw new Error('Please set your API key first');
    }

    const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_FLASH_LITE_MODEL}:generateContent?key=${API_KEY}`;
    
    // Get attribute library for this location category
    const categoryData = gameRules.categories?.[category];
    const commonData = gameRules.categories?.common;
    
    const categoryAttrs = categoryData?.attributes || {};
    const commonAttrs = commonData?.attributes || {};
    const availableAttributes = { ...categoryAttrs, ...commonAttrs };
    
    // Format attribute library for LLM with reference calibrations
    const attributeList = Object.entries(availableAttributes)
        .map(([name, meta]) => {
            const typeInfo = meta.range 
                ? `${meta.type} (${meta.range.min}-${meta.range.max})`
                : meta.values 
                ? `${meta.type} (${meta.values.join('/')})` 
                : meta.type;
            
            const reference = meta.reference ? `\n  → ${meta.reference}` : '';
            
            return `- ${name} (${typeInfo}): ${meta.description}${reference}`;
        })
        .join('\n');
    
    const promptText = `Based on this location description: "${description}"

Category: ${category}
${gameContext.region ? `Region: ${gameContext.region}` : ''}
${gameContext.biome ? `Biome: ${gameContext.biome}` : ''}

${attributeList ? `📚 AVAILABLE ATTRIBUTES FOR "${category}":\n${attributeList}` : ''}

🎯 INSTRUCTIONS:
${attributeList ? '1. Review the available attributes above (note the → reference examples for calibration)\n2. Select the ones relevant for this location\n3. Assign values based on descriptions, ranges, and reference examples\n4. You may create new attributes if needed (just add them)' : 'Generate appropriate game attributes for this location based on its category and description'}

⚠️ DO NOT INCLUDE: id, name, rarity, description, or category (these are already set)

Return ONLY a JSON object with the selected attributes and their values.`;

    const requestBody = {
        contents: [{
            parts: [{
                text: promptText
            }]
        }],
        generationConfig: {
            response_mime_type: "application/json"
        }
    };

    const startTime = performance.now();
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        console.log('Location Attributes Response:', data);
        
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const attributes = JSON.parse(jsonText);
        
        // Detect new attributes not in library
        const newAttributes = {};
        const attributeNames = Object.keys(availableAttributes);
        
        for (const attrName of Object.keys(attributes)) {
            if (!attributeNames.includes(attrName)) {
                newAttributes[attrName] = {
                    value: attributes[attrName],
                    type: typeof attributes[attrName],
                    category: category
                };
            }
        }
        
        // Log new attributes for library addition
        if (Object.keys(newAttributes).length > 0) {
            console.log(`🆕 NEW ATTRIBUTES CREATED for location category "${category}":`, newAttributes);
        }
        
        return {
            own_attributes: attributes,
            newAttributes,
            responseTime: responseTime.toFixed(2),
            debugInfo: {
                model: 'gemini-2.5-flash-lite',
                step: 'Step 2: Attributes',
                prompt: promptText,
                response: JSON.stringify(attributes, null, 2),
                availableAttributes: Object.keys(availableAttributes),
                newAttributesDetected: Object.keys(newAttributes)
            }
        };
    } catch (error) {
        console.error('Location attributes generation error:', error);
        return {
            own_attributes: {},
            newAttributes: {},
            responseTime: '0',
            debugInfo: {
                model: 'gemini-2.5-flash-lite',
                step: 'Step 2: Attributes',
                prompt: promptText,
                response: `Error: ${error.message}`
            }
        };
    }
}

/**
 * Create complete item with JSON + Attributes + Image
 * @param {string} prompt - User prompt like "create a fire sword"
 * @param {Object} gameContext - Spatial/regional context
 * @param {Object} gameRules - Game mechanics/rules
 * @returns {Promise<Object>} Complete item with base64 image in image_url
 */
async function createItem(prompt, gameContext = {}, gameRules = {}) {
    const entityType = 'item';
    console.log(`\n=== Creating ${entityType} ===`);
    console.log(`Prompt: ${prompt}`);
    
    const debugData = {
        step0: null,
        step1: null,
        step2: null,
        step3: null
    };
    
    try {
        // Step 0: Synthesize gameContext into narrative (Flash Lite)
        console.log('Step 0: Synthesizing gameContext into narrative...');
        const contextResult = await synthesizeGameContext(gameContext, entityType);
        const contextSummary = contextResult.summary || contextResult;
        debugData.step0 = contextResult.debugInfo || null;
        console.log('✓ Context synthesized');
        
        // Step 1: Generate base item (Flash Lite)
        console.log('Step 1: Generating base item JSON...');
        const jsonResult = await generateItemJSON(prompt, contextSummary, gameRules);
        const entity = jsonResult.entity;
        const jsonTime = jsonResult.responseTime;
        debugData.step1 = jsonResult.debugInfo;
        console.log('✓ Base item generated in', jsonTime, 'ms');
        console.log('Item:', entity);
        
        // Step 2: Generate item attributes (Flash Lite)
        console.log('Step 2: Generating item attributes...');
        const attrResult = await generateItemAttributes(
            entity.description, 
            entity.category || 'general',
            gameContext,
            gameRules
        );
        const own_attributes = attrResult.own_attributes;
        const newAttributes = attrResult.newAttributes;
        const attributesTime = attrResult.responseTime;
        debugData.step2 = attrResult.debugInfo;
        console.log('✓ Item attributes generated in', attributesTime, 'ms');
        console.log('Item Attributes:', own_attributes);
        if (Object.keys(newAttributes).length > 0) {
            console.log('🆕 New Attributes:', newAttributes);
        }
        
        // Step 3: Generate image from description (Flash Image)
        console.log('Step 3: Generating image from description...');
        const imageResult = await generateImageFromDescription(entity.description);
        const imageBase64 = imageResult.imageBase64;
        const imageTime = imageResult.responseTime;
        debugData.step3 = imageResult.debugInfo;
        console.log('✓ Image generated in', imageTime, 'ms');
        
        // Step 4: Combine all parts + add system fields
        console.log('Step 4: Combining all parts and adding system fields...');
        
        entity.own_attributes = own_attributes;
        entity.image_url = `data:image/png;base64,${imageBase64}`;
        entity.x = Math.floor(Math.random() * 2000) - 1000;
        entity.y = Math.floor(Math.random() * 2000) - 1000;
        entity.region = 'medieval_kingdom_001';
        
        const totalTime = (parseFloat(jsonTime) + parseFloat(attributesTime) + parseFloat(imageTime)).toFixed(2);
        console.log(`✓ Complete item created in ${totalTime}ms total`);
        
        return {
            entity,
            newAttributes,
            timing: {
                baseEntity: jsonTime,
                attributes: attributesTime,
                image: imageTime,
                total: totalTime
            },
            debugData
        };
    } catch (error) {
        console.error('Item creation failed:', error);
        throw error;
    }
}

/**
 * Create complete NPC with JSON + Properties + Image
 * @param {string} prompt - User prompt like "create a wise merchant"
 * @param {Object} gameContext - Spatial/regional context
 * @param {Object} gameRules - Game mechanics/rules
 * @returns {Promise<Object>} Complete NPC with base64 image in image_url
 */
async function createNPC(prompt, gameContext = {}, gameRules = {}) {
    const entityType = 'npc';
    console.log(`\n=== Creating ${entityType} ===`);
    console.log(`Prompt: ${prompt}`);
    
    const debugData = {
        step0: null,
        step1: null,
        step2: null,
        step3: null
    };
    
    try {
        // Step 0: Synthesize gameContext into narrative (Flash Lite)
        console.log('Step 0: Synthesizing gameContext into narrative...');
        const contextResult = await synthesizeGameContext(gameContext, entityType);
        const contextSummary = contextResult.summary || contextResult;
        debugData.step0 = contextResult.debugInfo || null;
        console.log('✓ Context synthesized');
        
        // Step 1: Generate base NPC (Flash Lite)
        console.log('Step 1: Generating base NPC JSON...');
        const jsonResult = await generateNPCJSON(prompt, contextSummary, gameRules);
        const entity = jsonResult.entity;
        const jsonTime = jsonResult.responseTime;
        debugData.step1 = jsonResult.debugInfo;
        console.log('✓ Base NPC generated in', jsonTime, 'ms');
        console.log('NPC:', entity);
        
        // Step 2: Generate NPC attributes (Flash Lite)
        console.log('Step 2: Generating NPC attributes...');
        const attrResult = await generateNPCAttributes(
            entity.description, 
            entity.category || 'general',
            gameContext,
            gameRules
        );
        const own_attributes = attrResult.own_attributes;
        const newAttributes = attrResult.newAttributes;
        const attributesTime = attrResult.responseTime;
        debugData.step2 = attrResult.debugInfo;
        console.log('✓ NPC attributes generated in', attributesTime, 'ms');
        console.log('NPC Attributes:', own_attributes);
        if (Object.keys(newAttributes).length > 0) {
            console.log('🆕 New Attributes:', newAttributes);
        }
        
        // Step 3: Generate image from description (Flash Image)
        console.log('Step 3: Generating image from description...');
        const imageResult = await generateImageFromDescription(entity.description);
        const imageBase64 = imageResult.imageBase64;
        const imageTime = imageResult.responseTime;
        debugData.step3 = imageResult.debugInfo;
        console.log('✓ Image generated in', imageTime, 'ms');
        
        // Step 4: Combine all parts + add system fields
        console.log('Step 4: Combining all parts and adding system fields...');
        
        entity.own_attributes = own_attributes;
        entity.image_url = `data:image/png;base64,${imageBase64}`;
        entity.x = Math.floor(Math.random() * 2000) - 1000;
        entity.y = Math.floor(Math.random() * 2000) - 1000;
        entity.region = 'medieval_kingdom_001';
        entity.chatHistory = [];  // NPCs get chatHistory
        
        const totalTime = (parseFloat(jsonTime) + parseFloat(attributesTime) + parseFloat(imageTime)).toFixed(2);
        console.log(`✓ Complete NPC created in ${totalTime}ms total`);
        
        return {
            entity,
            newAttributes,
            timing: {
                baseEntity: jsonTime,
                attributes: attributesTime,
                image: imageTime,
                total: totalTime
            },
            debugData
        };
    } catch (error) {
        console.error('NPC creation failed:', error);
        throw error;
    }
}

/**
 * Create complete location with JSON + Attributes + Image
 * @param {string} prompt - User prompt like "create a mystical forest"
 * @param {Object} gameContext - Spatial/regional context
 * @param {Object} gameRules - Game mechanics/rules
 * @returns {Promise<Object>} Complete location with base64 image in image_url
 */
async function createLocation(prompt, gameContext = {}, gameRules = {}) {
    const entityType = 'location';
    console.log(`\n=== Creating ${entityType} ===`);
    console.log(`Prompt: ${prompt}`);
    
    const debugData = {
        step0: null,
        step1: null,
        step2: null,
        step3: null
    };
    
    try {
        // Step 0: Synthesize gameContext into narrative (Flash Lite)
        console.log('Step 0: Synthesizing gameContext into narrative...');
        const contextResult = await synthesizeGameContext(gameContext, entityType);
        const contextSummary = contextResult.summary || contextResult;
        debugData.step0 = contextResult.debugInfo || null;
        console.log('✓ Context synthesized');
        
        // Step 1: Generate base location (Flash Lite)
        console.log('Step 1: Generating base location JSON...');
        const jsonResult = await generateLocationJSON(prompt, contextSummary, gameRules);
        const entity = jsonResult.entity;
        const jsonTime = jsonResult.responseTime;
        debugData.step1 = jsonResult.debugInfo;
        console.log('✓ Base location generated in', jsonTime, 'ms');
        console.log('Location:', entity);
        
        // Step 2: Generate location attributes (Flash Lite)
        console.log('Step 2: Generating location attributes...');
        const attrResult = await generateLocationAttributes(
            entity.description, 
            entity.category || 'general',
            gameContext,
            gameRules
        );
        const own_attributes = attrResult.own_attributes;
        const newAttributes = attrResult.newAttributes;
        const attributesTime = attrResult.responseTime;
        debugData.step2 = attrResult.debugInfo;
        console.log('✓ Location attributes generated in', attributesTime, 'ms');
        console.log('Location Attributes:', own_attributes);
        if (Object.keys(newAttributes).length > 0) {
            console.log('🆕 New Attributes:', newAttributes);
        }
        
        // Step 3: Generate image from description (Flash Image)
        console.log('Step 3: Generating image from description...');
        const imageResult = await generateImageFromDescription(entity.description);
        const imageBase64 = imageResult.imageBase64;
        const imageTime = imageResult.responseTime;
        debugData.step3 = imageResult.debugInfo;
        console.log('✓ Image generated in', imageTime, 'ms');
        
        // Step 4: Combine all parts + add system fields
        console.log('Step 4: Combining all parts and adding system fields...');
        
        entity.own_attributes = own_attributes;
        entity.image_url = `data:image/png;base64,${imageBase64}`;
        entity.x = Math.floor(Math.random() * 2000) - 1000;
        entity.y = Math.floor(Math.random() * 2000) - 1000;
        entity.region = 'medieval_kingdom_001';
        
        const totalTime = (parseFloat(jsonTime) + parseFloat(attributesTime) + parseFloat(imageTime)).toFixed(2);
        console.log(`✓ Complete location created in ${totalTime}ms total`);
        
        return {
            entity,
            newAttributes,
            timing: {
                baseEntity: jsonTime,
                attributes: attributesTime,
                image: imageTime,
                total: totalTime
            },
            debugData
        };
    } catch (error) {
        console.error('Location creation failed:', error);
        throw error;
    }
}

/**
 * Test Item Generation
 */
async function testItemGeneration() {
    const prompt = document.getElementById('itemPrompt').value || 'Create a legendary fire sword';
    
    // Parse manual context inputs
    let gameContext = {};
    let gameRules = {};
    
    try {
        const contextInput = document.getElementById('itemGameContext')?.value;
        if (contextInput) gameContext = JSON.parse(contextInput);
    } catch (e) {
        console.warn('Invalid gameContext JSON, using empty object:', e);
    }
    
    try {
        const rulesInput = document.getElementById('itemGameRules')?.value;
        if (rulesInput) gameRules = JSON.parse(rulesInput);
    } catch (e) {
        console.warn('Invalid gameRules JSON, using empty object:', e);
    }
    
    showStructuredLoading('item');
    
    try {
        const result = await createItem(prompt, gameContext, gameRules);
        displayEntityResult(result, 'item');
    } catch (error) {
        displayEntityError(error.message, 'item');
    }
}

/**
 * Test NPC Generation
 */
async function testNPCGeneration() {
    const prompt = document.getElementById('npcPrompt').value || 'Create a wise old merchant NPC';
    
    // Parse manual context inputs
    let gameContext = {};
    let gameRules = {};
    
    try {
        const contextInput = document.getElementById('npcGameContext')?.value;
        if (contextInput) gameContext = JSON.parse(contextInput);
    } catch (e) {
        console.warn('Invalid gameContext JSON, using empty object:', e);
    }
    
    try {
        const rulesInput = document.getElementById('npcGameRules')?.value;
        if (rulesInput) gameRules = JSON.parse(rulesInput);
    } catch (e) {
        console.warn('Invalid gameRules JSON, using empty object:', e);
    }
    
    showStructuredLoading('npc');
    
    try {
        const result = await createNPC(prompt, gameContext, gameRules);
        displayEntityResult(result, 'npc');
    } catch (error) {
        displayEntityError(error.message, 'npc');
    }
}

/**
 * Test Location Generation
 */
async function testLocationGeneration() {
    const prompt = document.getElementById('locationPrompt').value || 'Create a mystical forest location';
    
    // Parse manual context inputs
    let gameContext = {};
    let gameRules = {};
    
    try {
        const contextInput = document.getElementById('locationGameContext')?.value;
        if (contextInput) gameContext = JSON.parse(contextInput);
    } catch (e) {
        console.warn('Invalid gameContext JSON, using empty object:', e);
    }
    
    try {
        const rulesInput = document.getElementById('locationGameRules')?.value;
        if (rulesInput) gameRules = JSON.parse(rulesInput);
    } catch (e) {
        console.warn('Invalid gameRules JSON, using empty object:', e);
    }
    
    showStructuredLoading('location');
    
    try {
        const result = await createLocation(prompt, gameContext, gameRules);
        displayEntityResult(result, 'location');
    } catch (error) {
        displayEntityError(error.message, 'location');
    }
}

/**
 * Display loading state
 */
function showStructuredLoading(entityType) {
    const resultDiv = document.getElementById(`${entityType}Result`);
    resultDiv.style.display = 'block';
    resultDiv.classList.remove('error');
    resultDiv.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Step 0: Synthesizing context...</p>
            <p>Step 1: Generating base ${entityType}...</p>
            <p>Step 2: Generating game attributes...</p>
            <p>Step 3: Creating image...</p>
            <p>Step 4: Combining everything...</p>
            <p><strong>Please wait 15-25 seconds...</strong></p>
        </div>
    `;
}

/**
 * Display entity result
 */
function displayEntityResult(result, entityType) {
    const { entity, timing, newAttributes, debugData } = result;
    const resultDiv = document.getElementById(`${entityType}Result`);
    
    // Validate required fields
    const validation = validateEntity(entity, entityType);
    
    // Check if new attributes were created
    const hasNewAttributes = newAttributes && Object.keys(newAttributes).length > 0;
    
    resultDiv.innerHTML = `
        <div class="entity-result">
            <div class="result-header">
                <span class="entity-badge ${entityType}-badge">${entityType.toUpperCase()}</span>
                <span class="rarity-badge ${entity.rarity}">${entity.rarity}</span>
                ${validation.isValid ? '<span class="valid-badge">✓ Valid</span>' : '<span class="invalid-badge">✗ Invalid</span>'}
                ${hasNewAttributes ? '<span class="new-attr-badge">🆕 New Attributes</span>' : ''}
            </div>
            
            <h4>${entity.name}</h4>
            
            <div class="timing-info">
                <span>Base Entity: ${timing.baseEntity}ms</span>
                <span>Own Attributes: ${timing.attributes}ms</span>
                <span>Image: ${timing.image}ms</span>
                <span><strong>Total: ${timing.total}ms</strong></span>
            </div>
            
            ${!validation.isValid ? `<div class="validation-errors">Missing: ${validation.missing.join(', ')}</div>` : ''}
            
            ${hasNewAttributes ? `
                <div class="new-attributes-section">
                    <h5>🆕 New Attributes Created</h5>
                    <p>These attributes were not in the library and can be added:</p>
                    <pre><code>${JSON.stringify(newAttributes, null, 2)}</code></pre>
                </div>
            ` : ''}
            
            <div class="entity-display">
                <div class="json-panel">
                    <h5>Generated JSON</h5>
                    <pre><code>${JSON.stringify(entity, null, 2)}</code></pre>
                    <button onclick="downloadJSON('${entityType}', ${JSON.stringify(entity).replace(/"/g, '&quot;')})">Download JSON</button>
                </div>
                
                <div class="image-panel">
                    <h5>Generated Image</h5>
                    <img src="${entity.image_url}" alt="${entity.name}">
                    <p class="description">${entity.description}</p>
                    <button onclick="downloadImage('${entity.image_url}', '${entity.id}')">Download Image</button>
                </div>
            </div>
            
            <!-- Debug Panel -->
            ${debugData ? `
            <div class="debug-section">
                <h4>🔍 Debug: LLM Prompts & Responses</h4>
                
                <details open>
                    <summary>Step 0: Context Synthesis (${debugData.step0?.model || 'N/A'})</summary>
                    <div class="debug-step">
                        <strong>Model:</strong> ${debugData.step0?.model || 'N/A'}<br>
                        <strong>Input (gameContext):</strong>
                        <pre>${debugData.step0?.input || 'No context'}</pre>
                        <strong>Prompt:</strong>
                        <pre>${debugData.step0?.prompt || 'N/A'}</pre>
                        <strong>Output (Narrative Summary):</strong>
                        <pre>${debugData.step0?.output || 'No synthesis'}</pre>
                    </div>
                </details>
                
                <details open>
                    <summary>Step 1: Base Entity JSON (${debugData.step1?.model || 'N/A'})</summary>
                    <div class="debug-step">
                        <strong>Model:</strong> ${debugData.step1?.model || 'N/A'}<br>
                        <strong>Schema:</strong> ${debugData.step1?.schema || 'N/A'}<br>
                        <strong>Prompt Sent:</strong>
                        <pre>${debugData.step1?.prompt || 'N/A'}</pre>
                        <strong>JSON Received:</strong>
                        <pre>${debugData.step1?.response || 'N/A'}</pre>
                    </div>
                </details>
                
                <details open>
                    <summary>Step 2: Attributes (${debugData.step2?.model || 'N/A'})</summary>
                    <div class="debug-step">
                        <strong>Model:</strong> ${debugData.step2?.model || 'N/A'}<br>
                        <strong>Available Attributes:</strong> ${debugData.step2?.availableAttributes?.join(', ') || 'None'}<br>
                        <strong>New Attributes Detected:</strong> ${debugData.step2?.newAttributesDetected?.join(', ') || 'None'}<br>
                        <strong>Prompt Sent:</strong>
                        <pre>${debugData.step2?.prompt || 'N/A'}</pre>
                        <strong>Attributes Received:</strong>
                        <pre>${debugData.step2?.response || 'N/A'}</pre>
                    </div>
                </details>
                
                <details open>
                    <summary>Step 3: Image Generation (${debugData.step3?.model || 'N/A'})</summary>
                    <div class="debug-step">
                        <strong>Model:</strong> ${debugData.step3?.model || 'N/A'}<br>
                        <strong>Prompt Sent:</strong>
                        <pre>${debugData.step3?.prompt || 'N/A'}</pre>
                        <strong>Result:</strong>
                        <pre>${debugData.step3?.response || 'N/A'}
Size: ${debugData.step3?.imageSize || 'N/A'}</pre>
                    </div>
                </details>
            </div>
            ` : ''}
        </div>
    `;
}

/**
 * Display error
 */
function displayEntityError(message, entityType) {
    const resultDiv = document.getElementById(`${entityType}Result`);
    resultDiv.classList.add('error');
    resultDiv.innerHTML = `
        <div class="error-message">
            <h4>❌ Generation Failed</h4>
            <p>${message}</p>
        </div>
    `;
}

/**
 * Validate entity has all required fields
 * Base entity (Flash Lite #1): id, name, rarity, description, category
 * Own Attributes (Flash Lite #2): own_attributes object
 * Image (Flash Image): image_url
 * System-added: x, y, region, chatHistory (for NPCs)
 */
function validateEntity(entity, entityType) {
    // Base entity fields
    const baseFields = ['id', 'name', 'rarity', 'description'];
    
    // Own attributes field (from attributes generator)
    const attributeFields = ['own_attributes'];
    
    // System-added required fields
    const systemFields = ['image_url', 'x', 'y', 'region'];
    if (entityType === 'npc') {
        systemFields.push('chatHistory');
    }
    
    const allRequiredFields = [...baseFields, ...attributeFields, ...systemFields];
    const missing = allRequiredFields.filter(field => !entity.hasOwnProperty(field) || entity[field] === null || entity[field] === undefined);
    
    return {
        isValid: missing.length === 0,
        missing
    };
}

/**
 * Download JSON file
 */
function downloadJSON(entityType, entityData) {
    // Parse back from escaped JSON
    const entity = typeof entityData === 'string' ? JSON.parse(entityData.replace(/&quot;/g, '"')) : entityData;
    
    const jsonStr = JSON.stringify(entity, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${entity.id || entityType}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Download image file
 */
function downloadImage(dataUrl, filename) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${filename}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

