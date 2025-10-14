// Google Gemini Structured Output - Item Generation Module
// Depends on: structured-core.js (for constants and schemas)
// Provides complete end-to-end item generation pipeline

/**
 * Synthesize gameContext into narrative summary for ITEMS using Flash Lite
 * @param {Object} gameContext - Raw spatial/regional data
 * @returns {Promise<Object>} Narrative context summary with debug info
 */
async function synthesizeItemContext(gameContext = {}) {
    if (!API_KEY) {
        throw new Error('Please set your API key first');
    }
    
    // If no context provided, return empty string
    if (Object.keys(gameContext).length === 0) {
        return { summary: '', debugInfo: null };
    }

    const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_FLASH_LITE_MODEL}:generateContent?key=${API_KEY}`;
    
    const synthesisPrompt = `You are a game context analyzer for Lost World RPG.

Raw spatial/regional data:
${JSON.stringify(gameContext, null, 2)}

Entity type being generated: ITEM

Create a brief narrative summary (2-3 sentences) describing this location/region context that will help guide ITEM generation. Focus on:
- What types of items would be found here
- The quality/rarity of items in this area
- The atmosphere and setting that influences item design
- Any regional characteristics that affect item properties

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
            console.warn('Item context synthesis failed, using empty context');
            return { summary: '', debugInfo: null };
        }

        const data = await response.json();
        const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        console.log('📝 Synthesized Item Context:', summary);
        
        return {
            summary: summary.trim(),
            debugInfo: {
                model: 'gemini-2.5-flash-lite',
                step: 'Step 0: Item Context Synthesis',
                input: JSON.stringify(gameContext, null, 2),
                prompt: synthesisPrompt,
                output: summary.trim()
            }
        };
    } catch (error) {
        console.error('Item context synthesis error:', error);
        return {
            summary: '',
            debugInfo: {
                model: 'gemini-2.5-flash-lite',
                step: 'Step 0: Item Context Synthesis',
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
 * @param {string} contextSummary - AI-synthesized narrative context
 * @param {Object} gameRules - Game mechanics/rules
 * @returns {Promise<Object>} Generated item JSON with debug info
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
    const enhancedPrompt = `You are generating a historical item for a history-based game.

${contextSummary ? `📍 HISTORICAL CONTEXT: ${contextSummary}` : ''}

${gameRules.artStyle ? `🎨 ART STYLE: ${gameRules.artStyle}` : ''}
${gameRules.genre ? `🎮 GENRE: ${gameRules.genre}` : ''}
${categoryList}

User request: ${prompt}

Create this item fitting the historical period. ${availableCategories.length > 0 ? `Choose an appropriate category from the available categories.` : ''}

Rarity Guidelines:
- Common: Everyday items used by ordinary people
- Rare: Well-crafted items from master artisans or notable figures
- Epic: Famous historical items with documented provenance
- Legendary: World-famous artifacts known across cultures and centuries

Visual description should be period-accurate with authentic materials, construction methods, and historical wear patterns suitable for ${gameRules.artStyle || 'historical illustration'}.

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
                step: 'Step 1: Base Item JSON',
                prompt: enhancedPrompt,
                response: JSON.stringify(entity, null, 2),
                schema: 'ITEM_SCHEMA'
            }
        };
    } catch (error) {
        throw new Error(`Item JSON Generation Error: ${error.message}`);
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
async function generateItemAttributes(baseItemInfo, gameContext = {}, gameRules = {}) {
    if (!API_KEY) {
        throw new Error('Please set your API key first');
    }

    const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_FLASH_LITE_MODEL}:generateContent?key=${API_KEY}`;
    
    // Extract info from baseItemInfo
    const { name, rarity, category, description, historicalPeriod } = baseItemInfo;
    
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
    
    const promptText = `You are a historical game designer creating attributes for an item.

Item Name: ${name}
Rarity/Significance: ${rarity}
Category: ${category}
Historical Setting: ${historicalPeriod}
Description: ${description}
${gameContext.region ? `Region: ${gameContext.region}` : ''}

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
${attributeList ? '1. Review the available attributes above (note the → reference examples for calibration)\n2. Select the ones relevant for this item in the ' + historicalPeriod + ' setting\n3. Assign historically accurate values based on descriptions and reference examples\n4. For ANY NEW attributes you create, you MUST provide full metadata' : 'Generate appropriate historical game attributes for this item based on its category, description, and the ' + historicalPeriod + ' setting'}

Create attributes that are:
1. Historically accurate for the ${historicalPeriod} period
2. Interesting and meaningful for gameplay
3. Reflective of the item's historical significance (rarity = fame/importance in history)

📋 OUTPUT FORMAT:
Return a JSON object with TWO fields:

1. "attributes": Simple key-value pairs with attribute values
   Example: {"damage": 45, "weight": 8, "material": "steel"}

2. "attributeMetadata": Metadata for NEW attributes ONLY (skip existing ones from the library above)
   For each new attribute, provide:
   - type: "integer", "number", "string", "boolean", "enum", or "array"
   - description: Brief explanation of what this attribute represents
   - values: ["option1", "option2"] for enums (REQUIRED if type is enum)
   - reference: Concrete examples showing what different values mean
   
   Example: {
     "weight": {
       "type": "integer",
       "description": "Weight of the item in pounds",
       "reference": "5=dagger, 15=sword, 30=greatsword, 45=heavy armor"
     }
   }

⚠️ DO NOT INCLUDE in attributes: id, name, rarity, description, or category (these are already set)
⚠️ CRITICAL: If you create a new attribute, you MUST provide its metadata in the "attributeMetadata" field!`;

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
        const responseData = JSON.parse(jsonText);
        
        // Handle two possible response formats:
        // 1. New format: {attributes: {...}, attributeMetadata: {...}}
        // 2. Old format: {key: value, ...}
        const attributes = responseData.attributes || responseData;
        const providedMetadata = responseData.attributeMetadata || {};
        
        // Detect new attributes not in library
        const newAttributes = {};
        const attributeNames = Object.keys(availableAttributes);
        
        for (const attrName of Object.keys(attributes)) {
            if (!attributeNames.includes(attrName)) {
                // Check if metadata was provided
                if (providedMetadata[attrName]) {
                    // Use provided metadata
                    newAttributes[attrName] = {
                        value: attributes[attrName],
                        ...providedMetadata[attrName],  // Include type, description, values, reference
                        category: category
                    };
                } else {
                    // Fallback: minimal metadata
                    console.warn(`⚠️ New attribute "${attrName}" created without metadata!`);
                    newAttributes[attrName] = {
                        value: attributes[attrName],
                        type: typeof attributes[attrName],
                        description: `Auto-detected ${attrName} (no description provided)`,
                        category: category
                    };
                }
            }
        }
        
        // Log new attributes with their full metadata
        if (Object.keys(newAttributes).length > 0) {
            console.log(`🆕 NEW ATTRIBUTES CREATED for category "${category}":`, newAttributes);
            console.log(`📊 Attribute Metadata:`, JSON.stringify(newAttributes, null, 2));
        }
        
        return {
            own_attributes: attributes,
            newAttributes,
            responseTime: responseTime.toFixed(2),
            debugInfo: {
                model: 'gemini-2.5-flash-lite',
                step: 'Step 2: Item Attributes',
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
                step: 'Step 2: Item Attributes',
                prompt: promptText,
                response: `Error: ${error.message}`
            }
        };
    }
}

/**
 * Generate ITEM image from description using Image model
 * Optimized for game item sprites/icons
 * @param {string} description - Description text from item entity
 * @param {string} artStyle - Art style from game rules
 * @returns {Promise<Object>} Base64 image data with debug info
 */
async function generateItemImage(baseItemInfo, artStyle = 'historical illustration') {
    if (!API_KEY) {
        throw new Error('Please set your API key first');
    }

    const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_IMAGE_MODEL}:generateContent?key=${API_KEY}`;
    
    // Item-specific image prompt optimized for sprites/icons
    const imagePrompt = `Generate a game item sprite/icon in ${artStyle} style.

Item Name: ${baseItemInfo.name}
Rarity/Significance: ${baseItemInfo.rarity}
Category: ${baseItemInfo.category}
Historical Setting: ${baseItemInfo.historicalPeriod}
Description: ${baseItemInfo.description}

Requirements:
- Period-accurate ${baseItemInfo.historicalPeriod} style
- Rarity level should influence visual quality (${baseItemInfo.rarity})
- Clear, iconic representation suitable for inventory display
- Clean background or transparent-style background
- Focus on the item itself with good detail
- Suitable for use as a game sprite or icon
- ${artStyle} art style`;
    
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
        console.log('Item Image Generation Response:', data);
        
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
                step: 'Step 3: Item Image Generation',
                prompt: imagePrompt,
                response: 'Item sprite/icon generated successfully (base64 data)',
                imageSize: imageBase64.length + ' characters'
            }
        };
    } catch (error) {
        throw new Error(`Item Image Generation Error: ${error.message}`);
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
        // Step 0: Synthesize gameContext into narrative for ITEMS (Flash Lite)
        console.log('Step 0: Synthesizing item-specific context...');
        const contextResult = await synthesizeItemContext(gameContext);
        const contextSummary = contextResult.summary || '';
        debugData.step0 = contextResult.debugInfo || null;
        console.log('✓ Item context synthesized');
        
        // Step 1: Generate base item (Flash Lite)
        console.log('Step 1: Generating base item JSON...');
        const jsonResult = await generateItemJSON(prompt, contextSummary, gameRules);
        const entity = jsonResult.entity;
        const jsonTime = jsonResult.responseTime;
        debugData.step1 = jsonResult.debugInfo;
        console.log('✓ Base item generated in', jsonTime, 'ms');
        
        // Override ID with auto-generated sequential ID
        entity.id = getNextEntityId('item', entity.category, entity.name);
        console.log('Item:', entity);
        
        // Create baseItemInfo bundle
        const baseItemInfo = {
            name: entity.name,
            rarity: entity.rarity,
            category: entity.category,
            description: entity.description,
            historicalPeriod: gameRules.historicalPeriod || 'Medieval Europe'
        };
        
        // Step 2: Generate item attributes (Flash Lite)
        console.log('Step 2: Generating item attributes...');
        const attrResult = await generateItemAttributes(
            baseItemInfo,
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
        
        // Step 3: Generate item image (Flash Image) - item-specific
        console.log('Step 3: Generating item sprite/icon...');
        const imageResult = await generateItemImage(
            baseItemInfo,
            gameRules.artStyle || 'historical illustration'
        );
        const imageBase64 = imageResult.imageBase64;
        const imageTime = imageResult.responseTime;
        debugData.step3 = imageResult.debugInfo;
        console.log('✓ Item image generated in', imageTime, 'ms');
        
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

