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
        id: { type: "string", description: "Semantic ID like 'sword_fire_001' or 'potion_health_001'" },
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
        id: { type: "string", description: "Semantic ID like 'npc_merchant_001' or 'npc_guard_castle_001'" },
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
        id: { type: "string", description: "Semantic ID like 'loc_tavern_001' or 'loc_forest_mystic_001'" },
        name: { type: "string", description: "Display name of the location" },
        rarity: { type: "string", enum: ["common", "rare", "epic", "legendary"] },
        description: { type: "string", description: "Detailed visual description for image generation" },
        category: { type: "string", description: "Category like 'town', 'dungeon', 'building', 'wilderness'" }
    },
    required: ["id", "name", "rarity", "description"]
};

/**
 * Get schema for entity type
 */
function getSchemaForEntityType(entityType) {
    const schemas = {
        'item': ITEM_SCHEMA,
        'npc': NPC_SCHEMA,
        'location': LOCATION_SCHEMA
    };
    return schemas[entityType.toLowerCase()];
}

/**
 * Generate structured JSON using Flash Lite model
 * @param {string} prompt - User prompt like "create a legendary fire sword"
 * @param {string} entityType - Type: 'item', 'npc', or 'location'
 * @returns {Promise<Object>} Generated entity JSON
 */
async function generateStructuredJSON(prompt, entityType) {
    if (!API_KEY) {
        throw new Error('Please set your API key first');
    }

    const schema = getSchemaForEntityType(entityType);
    const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_FLASH_LITE_MODEL}:generateContent?key=${API_KEY}`;
    
    // Enhanced prompt with context (schema handles structure)
    const enhancedPrompt = `You are generating a ${entityType} for a fantasy RPG game called "Lost World".

User request: ${prompt}

Create this ${entityType} with a semantic ID, appropriate name and rarity level, an appropriate category, and a detailed visual description that will be used to generate an image.

Return ONLY valid JSON matching the schema.`;

    const requestBody = {
        contents: [{
            parts: [{
                text: enhancedPrompt
            }]
        }],
        generationConfig: {
            response_mime_type: "application/json",
            response_schema: schema
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
        console.log('Structured JSON Response:', data);
        
        // Extract JSON from response
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const entity = JSON.parse(jsonText);
        
        return {
            entity,
            responseTime: responseTime.toFixed(2)
        };
    } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        throw new Error(`JSON Generation Error: ${error.message}`);
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
    
    const requestBody = {
        contents: [{
            parts: [{
                text: `Generate a high-quality image for: ${description}`
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
            responseTime: responseTime.toFixed(2)
        };
    } catch (error) {
        throw new Error(`Image Generation Error: ${error.message}`);
    }
}

/**
 * Generate contextual own_properties based on entity description
 * @param {string} description - Entity description
 * @param {string} entityType - Type: 'item', 'npc', or 'location'
 * @param {string} category - Entity category
 * @returns {Promise<Object>} Own properties object with timing
 */
async function generateOwnProperties(description, entityType, category) {
    if (!API_KEY) {
        throw new Error('Please set your API key first');
    }

    const endpoint = `${STRUCTURED_API_BASE_URL}/${STRUCTURED_FLASH_LITE_MODEL}:generateContent?key=${API_KEY}`;
    
    // Contextual prompt based on entity type and description
    const propertyPrompts = {
        'item': `Based on this item description: "${description}"

Category: ${category}

Generate a JSON object with game attributes for this item. Include:
- For weapons: damage (number), attackSpeed (string: fast/normal/slow), element (if applicable)
- For armor: defense (number), weight (number: 1-20)
- For consumables: effect (string), duration (number in seconds)
- For all items: value (number in gold), weight (number), durability (number: 0-100)

Return ONLY a JSON object with these properties.`,
        
        'npc': `Based on this NPC description: "${description}"

Category: ${category}

Generate a JSON object with game attributes for this NPC. Include:
- hostile (boolean): Is this NPC aggressive?
- faction (string): What group/faction do they belong to?
- greeting (string): What they say when first meeting the player
- services (array of strings): What services do they offer? (e.g., ["shop", "quests", "inn"])
- level (number: 1-50): Their power level

Return ONLY a JSON object with these properties.`,
        
        'location': `Based on this location description: "${description}"

Category: ${category}

Generate a JSON object with game attributes for this location. Include:
- biome (string): The environmental type (forest, desert, urban, etc.)
- safe (boolean): Is it safe for the player?
- canRest (boolean): Can the player rest here?
- hasShop (boolean): Are there merchants?
- encounters (array of strings): What creatures/NPCs might be found here
- accessLevel (number: 1-10): What level should player be to access?

Return ONLY a JSON object with these properties.`
    };

    const requestBody = {
        contents: [{
            parts: [{
                text: propertyPrompts[entityType]
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
        console.log('Own Properties Response:', data);
        
        // Extract JSON from response
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const own_properties = JSON.parse(jsonText);
        
        return {
            own_properties,
            responseTime: responseTime.toFixed(2)
        };
    } catch (error) {
        console.error('Own properties generation error:', error);
        // Return empty own_properties on error
        return {
            own_properties: {},
            responseTime: '0'
        };
    }
}

/**
 * Main function: Create complete entity with JSON + Properties + Image
 * @param {string} prompt - User prompt like "create a sword"
 * @param {string} entityType - Type: 'item', 'npc', or 'location'
 * @returns {Promise<Object>} Complete entity with base64 image in image_url
 */
async function createEntity(prompt, entityType) {
    console.log(`\n=== Creating ${entityType} ===`);
    console.log(`Prompt: ${prompt}`);
    
    try {
        // Step 1: Generate base entity (Flash Lite)
        console.log('Step 1: Generating base entity JSON...');
        const { entity, responseTime: jsonTime } = await generateStructuredJSON(prompt, entityType);
        console.log('✓ Base entity generated in', jsonTime, 'ms');
        console.log('Entity:', entity);
        
        // Step 2: Generate own_properties based on description (Flash Lite)
        console.log('Step 2: Generating contextual own_properties...');
        const { own_properties, responseTime: propertiesTime } = await generateOwnProperties(
            entity.description, 
            entityType, 
            entity.category || 'general'
        );
        console.log('✓ Own properties generated in', propertiesTime, 'ms');
        console.log('Own Properties:', own_properties);
        
        // Step 3: Generate image from description (Flash Image)
        console.log('Step 3: Generating image from description...');
        const { imageBase64, responseTime: imageTime } = await generateImageFromDescription(entity.description);
        console.log('✓ Image generated in', imageTime, 'ms');
        
        // Step 4: Combine all parts + add system fields
        console.log('Step 4: Combining all parts and adding system fields...');
        
        // Add own_properties from Step 2
        entity.own_properties = own_properties;
        
        // Add image URL from Step 3
        entity.image_url = `data:image/png;base64,${imageBase64}`;
        
        // Add spatial coordinates (in production, these would be context-determined)
        entity.x = Math.floor(Math.random() * 2000) - 1000;  // -1000 to 1000
        entity.y = Math.floor(Math.random() * 2000) - 1000;  // -1000 to 1000
        entity.region = 'medieval_kingdom_001';  // Default region for testing
        
        // Add chatHistory for NPCs (runtime field, starts empty)
        if (entityType === 'npc') {
            entity.chatHistory = [];
        }
        
        const totalTime = (parseFloat(jsonTime) + parseFloat(propertiesTime) + parseFloat(imageTime)).toFixed(2);
        console.log(`✓ Complete entity created in ${totalTime}ms total`);
        
        return {
            entity,
            timing: {
                baseEntity: jsonTime,
                properties: propertiesTime,
                image: imageTime,
                total: totalTime
            }
        };
    } catch (error) {
        console.error('Entity creation failed:', error);
        throw error;
    }
}

/**
 * Test Item Generation
 */
async function testItemGeneration() {
    const prompt = document.getElementById('itemPrompt').value || 'Create a legendary fire sword';
    
    showStructuredLoading('item');
    
    try {
        const result = await createEntity(prompt, 'item');
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
    
    showStructuredLoading('npc');
    
    try {
        const result = await createEntity(prompt, 'npc');
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
    
    showStructuredLoading('location');
    
    try {
        const result = await createEntity(prompt, 'location');
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
            <p>Step 1: Generating base ${entityType}...</p>
            <p>Step 2: Generating game attributes...</p>
            <p>Step 3: Creating image...</p>
            <p>Step 4: Combining everything...</p>
            <p><strong>Please wait 10-20 seconds...</strong></p>
        </div>
    `;
}

/**
 * Display entity result
 */
function displayEntityResult(result, entityType) {
    const { entity, timing } = result;
    const resultDiv = document.getElementById(`${entityType}Result`);
    
    // Validate required fields
    const validation = validateEntity(entity, entityType);
    
    resultDiv.innerHTML = `
        <div class="entity-result">
            <div class="result-header">
                <span class="entity-badge ${entityType}-badge">${entityType.toUpperCase()}</span>
                <span class="rarity-badge ${entity.rarity}">${entity.rarity}</span>
                ${validation.isValid ? '<span class="valid-badge">✓ Valid</span>' : '<span class="invalid-badge">✗ Invalid</span>'}
            </div>
            
            <h4>${entity.name}</h4>
            
            <div class="timing-info">
                <span>Base Entity: ${timing.baseEntity}ms</span>
                <span>Own Properties: ${timing.properties}ms</span>
                <span>Image: ${timing.image}ms</span>
                <span><strong>Total: ${timing.total}ms</strong></span>
            </div>
            
            ${!validation.isValid ? `<div class="validation-errors">Missing: ${validation.missing.join(', ')}</div>` : ''}
            
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
 * Own Properties (Flash Lite #2): own_properties object
 * Image (Flash Image): image_url
 * System-added: x, y, region, chatHistory (for NPCs)
 */
function validateEntity(entity, entityType) {
    // Base entity fields
    const baseFields = ['id', 'name', 'rarity', 'description'];
    
    // Own properties field (from properties generator)
    const propertyFields = ['own_properties'];
    
    // System-added required fields
    const systemFields = ['image_url', 'x', 'y', 'region'];
    if (entityType === 'npc') {
        systemFields.push('chatHistory');
    }
    
    const allRequiredFields = [...baseFields, ...propertyFields, ...systemFields];
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

