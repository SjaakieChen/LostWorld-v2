// Google Gemini Structured Output - UI and Testing Module
// Depends on: structured-core.js, structured-item.js, structured-npc.js, structured-location.js
// Provides UI interactions and result display functionality

/**
 * Test Item Generation
 * Wrapper for UI to call item generation pipeline
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
        
        // Auto-merge new attributes into library
        if (result.newAttributes && Object.keys(result.newAttributes).length > 0) {
            const count = mergeNewAttributesIntoLibrary('item', result.newAttributes);
            if (count > 0) {
                console.log(`✨ ${count} new attribute(s) added to item library and saved!`);
            }
        }
        
        displayEntityResult(result, 'item');
    } catch (error) {
        displayEntityError(error.message, 'item');
    }
}

/**
 * Test NPC Generation
 * Wrapper for UI to call NPC generation pipeline
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
        
        // Auto-merge new attributes into library
        if (result.newAttributes && Object.keys(result.newAttributes).length > 0) {
            const count = mergeNewAttributesIntoLibrary('npc', result.newAttributes);
            if (count > 0) {
                console.log(`✨ ${count} new attribute(s) added to NPC library and saved!`);
            }
        }
        
        displayEntityResult(result, 'npc');
    } catch (error) {
        displayEntityError(error.message, 'npc');
    }
}

/**
 * Test Location Generation
 * Wrapper for UI to call location generation pipeline
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
        
        // Auto-merge new attributes into library
        if (result.newAttributes && Object.keys(result.newAttributes).length > 0) {
            const count = mergeNewAttributesIntoLibrary('location', result.newAttributes);
            if (count > 0) {
                console.log(`✨ ${count} new attribute(s) added to location library and saved!`);
            }
        }
        
        displayEntityResult(result, 'location');
    } catch (error) {
        displayEntityError(error.message, 'location');
    }
}

/**
 * Display loading state
 * @param {string} entityType - Type of entity being generated
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
 * @param {Object} result - Generation result object
 * @param {string} entityType - Type of entity
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
 * @param {string} message - Error message
 * @param {string} entityType - Type of entity
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
 * @param {Object} entity - Entity to validate
 * @param {string} entityType - Type of entity
 * @returns {Object} Validation result
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
 * @param {string} entityType - Type of entity
 * @param {Object|string} entityData - Entity data object or JSON string
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
 * @param {string} dataUrl - Base64 data URL
 * @param {string} filename - Filename prefix
 */
function downloadImage(dataUrl, filename) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${filename}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
