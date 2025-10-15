// Entity Generation Testing UI
// TypeScript test interface for entity generation services

import { createItem } from './item-generation'
import type { GameRules, GameContext, GenerationResult } from './types'
import type { Item } from '../../types'

// Global API key storage
let API_KEY = ''

// Save API key to localStorage
function saveApiKey(): void {
  const keyInput = document.getElementById('apiKey') as HTMLInputElement
  API_KEY = keyInput.value.trim()
  if (API_KEY) {
    localStorage.setItem('GEMINI_API_KEY', API_KEY)
    // Set environment variable for the service
    import.meta.env.VITE_GEMINI_API_KEY = API_KEY
    alert('API Key saved successfully!')
    keyInput.type = 'password'
  } else {
    alert('Please enter a valid API key')
  }
}

// Load API key on page load
window.addEventListener('DOMContentLoaded', () => {
  const storedKey = localStorage.getItem('GEMINI_API_KEY')
  if (storedKey) {
    API_KEY = storedKey
    import.meta.env.VITE_GEMINI_API_KEY = storedKey
    const keyInput = document.getElementById('apiKey') as HTMLInputElement
    keyInput.value = storedKey
    keyInput.type = 'password'
    console.log('✅ API Key loaded from localStorage')
  }
})

/**
 * Test Item Generation
 */
async function testItemGeneration(): Promise<void> {
  const promptInput = document.getElementById('itemPrompt') as HTMLInputElement
  const prompt = promptInput.value || 'Create a legendary fire sword'

  // Parse manual context inputs
  let gameContext: GameContext = {}
  let gameRules: GameRules = {
    artStyle: 'historical illustration',
    genre: 'exploration',
    historicalPeriod: 'Medieval Europe 1200s',
    categories: {}
  }

  try {
    const contextInput = document.getElementById('itemGameContext') as HTMLTextAreaElement
    if (contextInput?.value) {
      gameContext = JSON.parse(contextInput.value)
    }
  } catch (e) {
    console.warn('Invalid gameContext JSON, using empty object:', e)
  }

  try {
    const rulesInput = document.getElementById('itemGameRules') as HTMLTextAreaElement
    if (rulesInput?.value) {
      gameRules = JSON.parse(rulesInput.value)
    }
  } catch (e) {
    console.warn('Invalid gameRules JSON, using default:', e)
  }

  // Show loading state
  showStructuredLoading('item')

  try {
    const result: GenerationResult<Item> = await createItem(prompt, gameContext, gameRules)
    displayEntityResult(result, 'item')
  } catch (error: any) {
    displayEntityError(error.message, 'item')
  }
}

/**
 * Display loading state
 */
function showStructuredLoading(entityType: string): void {
  const resultDiv = document.getElementById(`${entityType}Result`)
  if (!resultDiv) return

  resultDiv.style.display = 'block'
  resultDiv.classList.remove('error')
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
    `
}

/**
 * Display entity result
 */
function displayEntityResult(result: GenerationResult<Item>, entityType: string): void {
  const { entity, timing, newAttributes, debugData } = result
  const resultDiv = document.getElementById(`${entityType}Result`)
  if (!resultDiv) return

  // Validate required fields
  const validation = validateEntity(entity, entityType)

  // Check if new attributes were created
  const hasNewAttributes = newAttributes && Object.keys(newAttributes).length > 0

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
            
            ${
              hasNewAttributes
                ? `
                <div class="new-attributes-section">
                    <h5>🆕 New Attributes Created</h5>
                    <p>These attributes were not in the library:</p>
                    <pre><code>${JSON.stringify(newAttributes, null, 2)}</code></pre>
                </div>
            `
                : ''
            }
            
            <div class="entity-display">
                <div class="json-panel">
                    <h5>Generated JSON</h5>
                    <pre><code>${JSON.stringify(entity, null, 2)}</code></pre>
                    <button onclick="downloadJSON('${entityType}', ${JSON.stringify(JSON.stringify(entity))})">Download JSON</button>
                </div>
                
                <div class="image-panel">
                    <h5>Generated Image</h5>
                    <img src="${entity.image_url}" alt="${entity.name}">
                    <p class="description">${entity.description}</p>
                    <button onclick="downloadImage('${entity.image_url}', '${entity.id}')">Download Image</button>
                </div>
            </div>
            
            <!-- Debug Panel -->
            ${
              debugData
                ? `
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
            `
                : ''
            }
        </div>
    `
}

/**
 * Display error message
 */
function displayEntityError(message: string, entityType: string): void {
  const resultDiv = document.getElementById(`${entityType}Result`)
  if (!resultDiv) return

  resultDiv.classList.add('error')
  resultDiv.innerHTML = `
        <div class="error-message">
            <h4>❌ Generation Failed</h4>
            <p>${message}</p>
        </div>
    `
}

/**
 * Validate entity has all required fields
 */
function validateEntity(entity: any, entityType: string): { isValid: boolean; missing: string[] } {
  // Base entity fields
  const baseFields = ['id', 'name', 'rarity', 'description']

  // Own attributes field
  const attributeFields = ['own_attributes']

  // System-added required fields
  const systemFields = ['image_url', 'x', 'y', 'region']
  if (entityType === 'npc') {
    systemFields.push('chatHistory')
  }

  const allRequiredFields = [...baseFields, ...attributeFields, ...systemFields]
  const missing = allRequiredFields.filter(
    (field) => !entity.hasOwnProperty(field) || entity[field] === null || entity[field] === undefined
  )

  return {
    isValid: missing.length === 0,
    missing,
  }
}

/**
 * Download JSON file
 */
function downloadJSON(entityType: string, jsonString: string): void {
  const json = JSON.parse(jsonString)
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${entityType}_${json.id || 'entity'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Download image
 */
function downloadImage(dataUrl: string, filename: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `${filename}.png`
  a.click()
}

// Make functions available globally
;(window as any).testItemGeneration = testItemGeneration
;(window as any).saveApiKey = saveApiKey
;(window as any).downloadJSON = downloadJSON
;(window as any).downloadImage = downloadImage

