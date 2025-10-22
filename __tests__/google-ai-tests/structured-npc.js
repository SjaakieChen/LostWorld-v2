// Google Gemini Structured Output - NPC Generation Module
// Depends on: structured-core.js (for constants and schemas)
// Provides complete end-to-end NPC generation pipeline

/**
 * Synthesize gameContext into narrative summary for NPCs using Flash Lite
 * @param {Object} gameContext - Raw spatial/regional data
 * @returns {Promise<Object>} Narrative context summary with debug info
 */
async function synthesizeNPCContext(gameContext = {}) {
    if (!API_KEY) {
        throw new Error('Please set your API key first');
    }
    
    // If no context provided, return empty string
    if (Object.keys(gameContext).length === 0) {
        return { summary: '', debugInfo: null };
    }

    const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_FLASH_LITE_MODEL}:generateContent?key=${API_KEY}`;
    
    const synthesisPrompt = `You are a game context analyzer for a history based game your task is to provide a paragraph of text (context) that makes the NPC generation fall in line with the consistency of the game.

Raw context:
${JSON.stringify(gameContext, null, 2)}

Entity type being generated: NPC CHARACTER

Create a brief narrative summary describing the context that will help guide NPC CHARACTER generation.
Your job is to provide all the information that is interesting or needed for the NPC generation to make sense within the context of the game.
The next LLM will use your summary to generate the NPC. Condense all information that is important or interesting for the NPC generation. And if there is a location or person or anything of interest nearby or far away. you should relay that information to the next LLM.

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
            console.warn('NPC context synthesis failed, using empty context');
            return { summary: '', debugInfo: null };
        }

        const data = await response.json();
        const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        console.log('📝 Synthesized NPC Context:', summary);
        
        return {
            summary: summary.trim(),
            debugInfo: {
                model: 'gemini-2.5-flash-lite',
                step: 'Step 0: NPC Context Synthesis',
                input: JSON.stringify(gameContext, null, 2),
                prompt: synthesisPrompt,
                output: summary.trim()
            }
        };
    } catch (error) {
        console.error('NPC context synthesis error:', error);
        return {
            summary: '',
            debugInfo: {
                model: 'gemini-2.5-flash-lite',
                step: 'Step 0: NPC Context Synthesis',
                input: JSON.stringify(gameContext, null, 2),
                prompt: synthesisPrompt,
                output: `Error: ${error.message}`
            }
        };
    }
}

/**
 * Generate structured JSON for NPCs using Flash Lite model
 * @param {string} prompt - User prompt like "create a wise old merchant"
 * @param {string} contextSummary - AI-synthesized narrative context
 * @param {Object} gameRules - Game mechanics/rules
 * @returns {Promise<Object>} Generated NPC JSON with debug info
 */
async function generateNPCJSON(prompt, contextSummary = '', gameRules = {}) {
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
    
    // NPC-specific prompt with AI-synthesized context
    const enhancedPrompt = `You are generating a historical NPC character for a history-based game.

${contextSummary ? `📍 CURRENT CONTEXT: ${contextSummary}` : ''}

${gameRules.artStyle ? `🎨 ART STYLE: ${gameRules.artStyle}` : ''}
${gameRules.genre ? `🎮 GENRE: ${gameRules.genre}` : ''}
${gameRules.historicalPeriod ? `🏛 HISTORICAL PERIOD: ${gameRules.historicalPeriod}` : ''}
${categoryList}

User request: ${prompt}

Create this NPC fitting in the current context.
And it has to fall into one of the following categories: ${availableCategories.length > 0 ? `Choose an appropriate category from the available categories.` : ''}

Rarity Guidelines:
- Common: Ordinary people of the period (peasants, common soldiers, everyday workers)
- Rare: Notable figures in their community (skilled craftsmen, minor nobles, respected scholars)
- Epic: Famous historical figures with regional or national significance
- Legendary: World-famous historical figures known across cultures and centuries
you should only create epic and legendary NPCs if the context implies it.

The description should include period-accurate clothing, physical appearance, age, profession indicators, and social status markers suitable for this NPC.
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
                step: 'Step 1: Base NPC JSON',
                prompt: enhancedPrompt,
                response: JSON.stringify(entity, null, 2),
                schema: 'NPC_SCHEMA'
            }
        };
    } catch (error) {
        throw new Error(`NPC JSON Generation Error: ${error.message}`);
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
async function generateNPCAttributes(baseNPCInfo, gameContext = {}, gameRules = {}) {
    if (!API_KEY) {
        throw new Error('Please set your API key first');
    }

    const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_FLASH_LITE_MODEL}:generateContent?key=${API_KEY}`;
    
    // Extract info from baseNPCInfo
    const { name, rarity, category, description, historicalPeriod } = baseNPCInfo;
    
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
    
    const promptText = `You are a historical game designer creating attributes for an NPC.

Character Name: ${name}
Rarity/Significance: ${rarity} (common, rare, epic, legendary)
Category: ${category}
Historical Setting: ${historicalPeriod}
Description: ${description}
${gameContext.region ? `Region: ${gameContext.region}` : ''}

Generate historically accurate and interesting attributes for this character in the ${historicalPeriod} setting.

Consider for historical accuracy:
- Period-specific social hierarchy and roles
- Authentic profession and skills for the era
- Cultural background and beliefs of the period
- Period-appropriate relationships and affiliations
- Historically plausible personality traits
- Real historical influences if legendary/famous figure
- How the character's rarity reflects historical significance (common peasant vs. famous historical figure)

${attributeList ? `📚 AVAILABLE ATTRIBUTES FOR "${category}":\n${attributeList}` : ''}

🎯 INSTRUCTIONS:
${attributeList ? '1. Review the available attributes above (note the → reference examples for calibration)\n2. Select the ones relevant for this NPC in the ' + historicalPeriod + ' setting\n3. Assign historically accurate values based on descriptions and reference examples\n4. For ANY NEW attributes you create, you MUST provide full metadata' : 'Generate appropriate historical game attributes for this NPC based on its category, description, and the ' + historicalPeriod + ' setting'}

Create attributes that are:
1. Historically accurate for the ${historicalPeriod} period
2. Culturally appropriate and authentic
3. Reflective of the character's historical significance (rarity = fame/importance in history)

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
    "tradingSkill": {
      "value": 60,
      "type": "integer",
      "description": "Skill level in trading and bartering",
      "reference": "10=poor trader, 30=adequate, 60=skilled trader, 90=master trader"
    },
    "hostile": {
      "value": false,
      "type": "boolean",
      "description": "Whether the NPC is hostile to the player",
      "reference": "true=hostile/will attack, false=friendly/neutral"
    },
    "faction": {
      "value": "merchants_guild",
      "type": "string",
      "description": "NPC's faction or guild affiliation",
      "reference": "merchants_guild=merchants guild, knights_order=knights order, guild_of_thieves=guild of thieves"
    }
  }
}

⚠️ DO NOT INCLUDE in attributes: id, name, rarity, description, or category (these are already set)
⚠️ CRITICAL: ALL attributes must have ALL FOUR fields (value, type, description, reference)!`;

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
        const responseData = JSON.parse(jsonText);
        
        // Handle response format: {attributes: {name: {value, type, description, reference}}}
        const attributesRaw = responseData.attributes || {};
        
        // All attributes now have full structure
        const processedAttributes = {};
        const newAttributes = {};
        const attributeNames = Object.keys(availableAttributes);
        
        for (const attrName of Object.keys(attributesRaw)) {
            const attrData = attributesRaw[attrName];
            
            // Validate that all required fields are present
            if (!attrData.value || !attrData.type || !attrData.description || !attrData.reference) {
                console.warn(`⚠️ Attribute "${attrName}" missing required fields! Got:`, attrData);
            }
            
            // Store the complete attribute structure
            processedAttributes[attrName] = {
                value: attrData.value,
                type: attrData.type,
                description: attrData.description,
                reference: attrData.reference
            };
            
            // Check if this is a new attribute not in library
            if (!attributeNames.includes(attrName)) {
                newAttributes[attrName] = {
                    value: attrData.value,
                    type: attrData.type,
                    description: attrData.description,
                    reference: attrData.reference,
                    category: category
                };
            }
        }
        
        // Log new attributes with their full metadata
        if (Object.keys(newAttributes).length > 0) {
            console.log(`🆕 NEW ATTRIBUTES CREATED for NPC category "${category}":`, newAttributes);
            console.log(`📊 Attribute Metadata:`, JSON.stringify(newAttributes, null, 2));
        }
        
        return {
            own_attributes: processedAttributes,
            newAttributes,
            responseTime: responseTime.toFixed(2),
            debugInfo: {
                model: 'gemini-2.5-flash-lite',
                step: 'Step 2: NPC Attributes',
                prompt: promptText,
                response: JSON.stringify(processedAttributes, null, 2),
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
                step: 'Step 2: NPC Attributes',
                prompt: promptText,
                response: `Error: ${error.message}`
            }
        };
    }
}

/**
 * Generate NPC image from description using Image model
 * Optimized for character portraits
 * @param {string} description - Description text from NPC entity
 * @param {string} artStyle - Art style from game rules
 * @returns {Promise<Object>} Base64 image data with debug info
 */
async function generateNPCImage(baseNPCInfo, artStyle = 'historical illustration') {
    if (!API_KEY) {
        throw new Error('Please set your API key first');
    }

    const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_IMAGE_MODEL}:generateContent?key=${API_KEY}`;
    
    // NPC-specific image prompt optimized for character portraits
    const imagePrompt = `Generate a character portrait in ${artStyle} style.

Character Name: ${baseNPCInfo.name}
Rarity/Significance: ${baseNPCInfo.rarity}
Category: ${baseNPCInfo.category}
Historical Setting: ${baseNPCInfo.historicalPeriod}
Description: ${baseNPCInfo.description}

Requirements:
- Period-accurate ${baseNPCInfo.historicalPeriod} clothing and appearance
- Rarity level should influence visual detail and importance (${baseNPCInfo.rarity})
- Portrait or bust shot focusing on the character's face and upper body
- the character should be in the center of the image
- Clear facial features and expression showing personality
- Appropriate clothing and accessories as described
- Suitable background that doesn't distract from the character
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
        console.log('NPC Image Generation Response:', data);
        
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
                step: 'Step 3: NPC Image Generation',
                prompt: imagePrompt,
                response: 'Character portrait generated successfully (base64 data)',
                imageSize: imageBase64.length + ' characters'
            }
        };
    } catch (error) {
        throw new Error(`NPC Image Generation Error: ${error.message}`);
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
        // Step 0: Synthesize gameContext into narrative for NPCs (Flash Lite)
        console.log('Step 0: Synthesizing NPC-specific context...');
        const contextResult = await synthesizeNPCContext(gameContext);
        const contextSummary = contextResult.summary || '';
        debugData.step0 = contextResult.debugInfo || null;
        console.log('✓ NPC context synthesized');
        
        // Step 1: Generate base NPC (Flash Lite)
        console.log('Step 1: Generating base NPC JSON...');
        const jsonResult = await generateNPCJSON(prompt, contextSummary, gameRules);
        const entity = jsonResult.entity;
        const jsonTime = jsonResult.responseTime;
        debugData.step1 = jsonResult.debugInfo;
        console.log('✓ Base NPC generated in', jsonTime, 'ms');
        
        // Override ID with auto-generated sequential ID
        entity.id = getNextEntityId('npc', entity.category, entity.name);
        console.log('NPC:', entity);
        
        // Create baseNPCInfo bundle
        const baseNPCInfo = {
            name: entity.name,
            rarity: entity.rarity,
            category: entity.category,
            description: entity.description,
            historicalPeriod: gameRules.historicalPeriod || 'Medieval Europe'
        };
        
        // Step 2: Generate NPC attributes (Flash Lite)
        console.log('Step 2: Generating NPC attributes...');
        const attrResult = await generateNPCAttributes(
            baseNPCInfo,
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
        
        // Step 3: Generate NPC image (Flash Image) - NPC-specific portrait
        console.log('Step 3: Generating character portrait...');
        const imageResult = await generateNPCImage(
            baseNPCInfo,
            gameRules.artStyle || 'historical illustration'
        );
        const imageBase64 = imageResult.imageBase64;
        const imageTime = imageResult.responseTime;
        debugData.step3 = imageResult.debugInfo;
        console.log('✓ NPC portrait generated in', imageTime, 'ms');
        
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

