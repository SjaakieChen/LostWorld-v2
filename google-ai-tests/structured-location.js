// Google Gemini Structured Output - Location Generation Module
// Depends on: structured-core.js (for constants and schemas)
// Provides complete end-to-end location generation pipeline

/**
 * Synthesize gameContext into narrative summary for LOCATIONS using Flash Lite
 * @param {Object} gameContext - Raw spatial/regional data
 * @returns {Promise<Object>} Narrative context summary with debug info
 */
async function synthesizeLocationContext(gameContext = {}) {
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

Entity type being generated: LOCATION

Create a brief narrative summary (2-3 sentences) describing this regional context that will help guide LOCATION generation. Focus on:
- The geography and biome characteristics of the region
- The types of locations that would exist in this area
- The overall atmosphere and environmental features
- How nearby locations influence the character of new locations
- Any regional lore or history that affects location design

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
            console.warn('Location context synthesis failed, using empty context');
            return { summary: '', debugInfo: null };
        }

        const data = await response.json();
        const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        console.log('📝 Synthesized Location Context:', summary);
        
        return {
            summary: summary.trim(),
            debugInfo: {
                model: 'gemini-2.5-flash-lite',
                step: 'Step 0: Location Context Synthesis',
                input: JSON.stringify(gameContext, null, 2),
                prompt: synthesisPrompt,
                output: summary.trim()
            }
        };
    } catch (error) {
        console.error('Location context synthesis error:', error);
        return {
            summary: '',
            debugInfo: {
                model: 'gemini-2.5-flash-lite',
                step: 'Step 0: Location Context Synthesis',
                input: JSON.stringify(gameContext, null, 2),
                prompt: synthesisPrompt,
                output: `Error: ${error.message}`
            }
        };
    }
}

/**
 * Generate structured JSON for locations using Flash Lite model
 * @param {string} prompt - User prompt like "create a mystical forest"
 * @param {string} contextSummary - AI-synthesized narrative context
 * @param {Object} gameRules - Game mechanics/rules
 * @returns {Promise<Object>} Generated location JSON with debug info
 */
async function generateLocationJSON(prompt, contextSummary = '', gameRules = {}) {
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
    
    // Location-specific prompt with AI-synthesized context
    const enhancedPrompt = `You are generating a historical location for a history-based game.

${contextSummary ? `📍 HISTORICAL CONTEXT: ${contextSummary}` : ''}

${gameRules.artStyle ? `🎨 ART STYLE: ${gameRules.artStyle}` : ''}
${gameRules.genre ? `🎮 GENRE: ${gameRules.genre}` : ''}
${categoryList}

User request: ${prompt}

Create this location fitting the historical period. ${availableCategories.length > 0 ? `Choose an appropriate category from the available categories.` : ''}

Rarity Guidelines:
- Common: Typical places of the period (villages, common roads, ordinary buildings)
- Rare: Important locations with regional significance (castles, cathedrals, major trade routes)
- Epic: Famous historical locations with national importance
- Legendary: World-famous historical landmarks known across cultures and centuries

Visual description should include period-specific architectural style, building materials, time period indicators, weathering, and cultural context suitable for ${gameRules.artStyle || 'historical illustration'}.

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
                step: 'Step 1: Base Location JSON',
                prompt: enhancedPrompt,
                response: JSON.stringify(entity, null, 2),
                schema: 'LOCATION_SCHEMA'
            }
        };
    } catch (error) {
        throw new Error(`Location JSON Generation Error: ${error.message}`);
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
async function generateLocationAttributes(baseLocationInfo, gameContext = {}, gameRules = {}) {
    if (!API_KEY) {
        throw new Error('Please set your API key first');
    }

    const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_FLASH_LITE_MODEL}:generateContent?key=${API_KEY}`;
    
    // Extract info from baseLocationInfo
    const { name, rarity, category, description, historicalPeriod } = baseLocationInfo;
    
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
    
    const promptText = `You are a historical game designer creating attributes for a location.

Location Name: ${name}
Rarity/Significance: ${rarity}
Category: ${category}
Historical Setting: ${historicalPeriod}
Description: ${description}
${gameContext.region ? `Region: ${gameContext.region}` : ''}
${gameContext.biome ? `Biome: ${gameContext.biome}` : ''}

Generate historically accurate and interesting attributes for this location in the ${historicalPeriod} setting.

Consider for historical accuracy:
- Period-specific architectural style and construction
- Authentic building materials and methods
- Cultural and political significance of the era
- Historical events that occurred here
- Period-appropriate inhabitants and activities
- Geographical and strategic importance
- How the location's rarity reflects historical significance (common village vs. famous historical landmark)

${attributeList ? `📚 AVAILABLE ATTRIBUTES FOR "${category}":\n${attributeList}` : ''}

🎯 INSTRUCTIONS:
${attributeList ? '1. Review the available attributes above (note the → reference examples for calibration)\n2. Select the ones relevant for this location in the ' + historicalPeriod + ' setting\n3. Assign historically accurate values based on descriptions and reference examples\n4. For ANY NEW attributes you create, you MUST provide full metadata' : 'Generate appropriate historical game attributes for this location based on its category, description, and the ' + historicalPeriod + ' setting'}

Create attributes that are:
1. Historically accurate for the ${historicalPeriod} period
2. Architecturally and geographically plausible
3. Reflective of the location's historical significance (rarity = fame/importance in history)

📋 OUTPUT FORMAT:
Return a JSON object with TWO fields:

1. "attributes": Simple key-value pairs with attribute values
   Example: {"population": 500, "hasMarket": true, "fortified": false}

2. "attributeMetadata": Metadata for NEW attributes ONLY (skip existing ones from the library above)
   For each new attribute, provide:
   - type: "integer", "number", "string", "boolean", "enum", or "array"
   - description: Brief explanation of what this attribute represents
   - values: ["option1", "option2"] for enums (REQUIRED if type is enum)
   - reference: Concrete examples showing what different values mean
   
   Example: {
     "ageInYears": {
       "type": "integer",
       "description": "Age of the location since construction",
       "reference": "10=newly built, 50=established, 200=ancient, 500=historic ruins"
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
        console.log('Location Attributes Response:', data);
        
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
            console.log(`🆕 NEW ATTRIBUTES CREATED for location category "${category}":`, newAttributes);
            console.log(`📊 Attribute Metadata:`, JSON.stringify(newAttributes, null, 2));
        }
        
        return {
            own_attributes: attributes,
            newAttributes,
            responseTime: responseTime.toFixed(2),
            debugInfo: {
                model: 'gemini-2.5-flash-lite',
                step: 'Step 2: Location Attributes',
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
                step: 'Step 2: Location Attributes',
                prompt: promptText,
                response: `Error: ${error.message}`
            }
        };
    }
}

/**
 * Generate LOCATION image from description using Image model
 * Optimized for landscape/environment scenes
 * @param {string} description - Description text from location entity
 * @param {string} artStyle - Art style from game rules
 * @returns {Promise<Object>} Base64 image data with debug info
 */
async function generateLocationImage(baseLocationInfo, artStyle = 'historical illustration') {
    if (!API_KEY) {
        throw new Error('Please set your API key first');
    }

    const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_IMAGE_MODEL}:generateContent?key=${API_KEY}`;
    
    // Location-specific image prompt optimized for landscapes/environments
    const imagePrompt = `Generate an environment landscape scene in ${artStyle} style.

Location Name: ${baseLocationInfo.name}
Rarity/Significance: ${baseLocationInfo.rarity}
Category: ${baseLocationInfo.category}
Historical Setting: ${baseLocationInfo.historicalPeriod}
Description: ${baseLocationInfo.description}

Requirements:
- Period-accurate ${baseLocationInfo.historicalPeriod} architecture and setting
- Rarity level should influence visual grandeur and detail (${baseLocationInfo.rarity})
- Wide landscape or environment view showing the location
- Clear sense of place and atmosphere
- Include key environmental features mentioned in description
- Appropriate lighting and weather to convey mood
- Suitable for use as a game location background or scene
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
        console.log('Location Image Generation Response:', data);
        
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
                step: 'Step 3: Location Image Generation',
                prompt: imagePrompt,
                response: 'Environment landscape generated successfully (base64 data)',
                imageSize: imageBase64.length + ' characters'
            }
        };
    } catch (error) {
        throw new Error(`Location Image Generation Error: ${error.message}`);
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
        // Step 0: Synthesize gameContext into narrative for LOCATIONS (Flash Lite)
        console.log('Step 0: Synthesizing location-specific context...');
        const contextResult = await synthesizeLocationContext(gameContext);
        const contextSummary = contextResult.summary || '';
        debugData.step0 = contextResult.debugInfo || null;
        console.log('✓ Location context synthesized');
        
        // Step 1: Generate base location (Flash Lite)
        console.log('Step 1: Generating base location JSON...');
        const jsonResult = await generateLocationJSON(prompt, contextSummary, gameRules);
        const entity = jsonResult.entity;
        const jsonTime = jsonResult.responseTime;
        debugData.step1 = jsonResult.debugInfo;
        console.log('✓ Base location generated in', jsonTime, 'ms');
        
        // Override ID with auto-generated sequential ID
        entity.id = getNextEntityId('location', entity.category, entity.name);
        console.log('Location:', entity);
        
        // Create baseLocationInfo bundle
        const baseLocationInfo = {
            name: entity.name,
            rarity: entity.rarity,
            category: entity.category,
            description: entity.description,
            historicalPeriod: gameRules.historicalPeriod || 'Medieval Europe'
        };
        
        // Step 2: Generate location attributes (Flash Lite)
        console.log('Step 2: Generating location attributes...');
        const attrResult = await generateLocationAttributes(
            baseLocationInfo,
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
        
        // Step 3: Generate location image (Flash Image) - location-specific landscape
        console.log('Step 3: Generating environment landscape...');
        const imageResult = await generateLocationImage(
            baseLocationInfo,
            gameRules.artStyle || 'historical illustration'
        );
        const imageBase64 = imageResult.imageBase64;
        const imageTime = imageResult.responseTime;
        debugData.step3 = imageResult.debugInfo;
        console.log('✓ Location image generated in', imageTime, 'ms');
        
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

