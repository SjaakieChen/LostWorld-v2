// Game Configurator Dashboard Logic
// This file handles the UI interactions and calls the real orchestrator service

import { 
  generateGameConfiguration, 
  generateGameEntities,
  generateSeedFiles,
  type GameConfiguration,
  type GeneratedEntities,
  type SeedFiles
} from '../../src/services/game-orchestrator'

class GameConfiguratorDashboard {
  private config: GameConfiguration | null = null
  private entities: GeneratedEntities | null = null
  private seedFiles: SeedFiles | null = null

  constructor() {
    this.initializeEventListeners()
  }

  private initializeEventListeners() {
    const generateBtn = document.getElementById('generateBtn')
    const downloadConfigBtn = document.getElementById('downloadConfig')
    const downloadScratchpadBtn = document.getElementById('downloadScratchpad')
    const downloadSeedsBtn = document.getElementById('downloadSeeds')

    generateBtn?.addEventListener('click', () => this.generateConfiguration())
    downloadConfigBtn?.addEventListener('click', () => this.downloadConfig())
    downloadScratchpadBtn?.addEventListener('click', () => this.downloadScratchpad())
    downloadSeedsBtn?.addEventListener('click', () => this.downloadSeeds())
  }

  private async generateConfiguration() {
    const characterName = (document.getElementById('characterName') as HTMLInputElement)?.value
    const gameDescription = (document.getElementById('gameDescription') as HTMLTextAreaElement)?.value
    const artStyle = (document.getElementById('artStyle') as HTMLInputElement)?.value

    if (!characterName || !gameDescription || !artStyle) {
      this.showError('Please fill in character name, game description, and art style')
      return
    }

    this.showLoading()
    this.hideError()
    this.hideResults()

    try {
      // STEP 1: Generate configuration
      this.updateStatus('🎮 Generating game configuration with Gemini 2.5 Pro...')
      console.log('Calling generateGameConfiguration...')
      
      this.config = await generateGameConfiguration(characterName, gameDescription, artStyle)
      
      console.log('✓ Configuration generated:', this.config)
      this.displayConfiguration(this.config)
      
      // STEP 2: Generate entities
      this.updateStatus('✨ Generating entities (this may take 5-10 minutes)...')
      console.log('Calling generateGameEntities...')
      
      this.entities = await generateGameEntities(this.config)
      
      console.log('✓ Entities generated:', this.entities)
      this.displayGeneratedEntities(this.entities)
      this.displayVisualEntities(this.entities)
      
      // STEP 3: Generate seed files
      this.updateStatus('💾 Generating seed files...')
      this.seedFiles = generateSeedFiles(this.entities, this.config)
      
      this.hideLoading()
      this.showResults()
      this.updateStatus('✅ Generation complete!')
      
    } catch (error: any) {
      console.error('❌ Generation failed:', error)
      this.showError(`Generation failed: ${error.message}\n\nCheck console for details.`)
      this.hideLoading()
    }
  }

  private displayConfiguration(config: GameConfiguration) {
    // Display scratchpad (500-800 words)
    const scratchpadElement = document.getElementById('scratchpad')
    if (scratchpadElement) {
      scratchpadElement.textContent = config.scratchpad
    }

    // Display game rules
    const gameRulesElement = document.getElementById('gameRules')
    if (gameRulesElement) {
      const rulesText = `Historical Period: ${config.gameRules.historicalPeriod}
Genre: ${config.gameRules.genre}
Art Style: ${config.gameRules.artStyle}

ITEM CATEGORIES (${config.gameRules.itemCategories.length}):
${config.gameRules.itemCategories.map(cat => {
  return `  - ${cat.name} (${cat.attributes.length} attributes)`
}).join('\n')}

NPC CATEGORIES (${config.gameRules.npcCategories.length}):
${config.gameRules.npcCategories.map(cat => {
  return `  - ${cat.name} (${cat.attributes.length} attributes)`
}).join('\n')}

LOCATION CATEGORIES (${config.gameRules.locationCategories.length}):
${config.gameRules.locationCategories.map(cat => {
  return `  - ${cat.name} (${cat.attributes.length} attributes)`
}).join('\n')}

Detailed Attributes:
${JSON.stringify({
  itemCategories: config.gameRules.itemCategories,
  npcCategories: config.gameRules.npcCategories,
  locationCategories: config.gameRules.locationCategories
}, null, 2)}`
      
      gameRulesElement.textContent = rulesText
    }

    // Display entities to generate
    const entitiesElement = document.getElementById('entitiesToGenerate')
    if (entitiesElement) {
      const { regions, locations, npcs, items } = config.entitiesToGenerate
      const entitiesText = `REGIONS (${regions.length}):
${regions.map(r => `  - ${r.name} (${r.theme}, ${r.biome})`).join('\n')}

LOCATIONS (${locations.length}):
${locations.map(l => `  - ${l.prompt.substring(0, 60)}...
    Region: ${l.region}, Significance: ${l.significance}`).join('\n')}

NPCS (${npcs.length}):
${npcs.map(n => `  - ${n.prompt.substring(0, 60)}...
    Region: ${n.region}, Position: (${n.x}, ${n.y}), Role: ${n.significance}`).join('\n')}

ITEMS (${items.length}):
${items.map(i => `  - ${i.prompt.substring(0, 60)}...
    Region: ${i.region}, Position: (${i.x}, ${i.y}), Purpose: ${i.significance}`).join('\n')}`
      
      entitiesElement.textContent = entitiesText
    }
  }

  private displayGeneratedEntities(entities: GeneratedEntities) {
    const generatedElement = document.getElementById('generatedEntities')
    if (generatedElement) {
      const entitiesText = `GENERATED ENTITIES:
${'='.repeat(50)}

REGIONS (${entities.regions.length}):
${entities.regions.map(r => `  ✓ ${r.name}
    ID: ${r.id}
    Position: (${r.regionX}, ${r.regionY})
    Theme: ${r.properties.theme}
    Biome: ${r.properties.biome}`).join('\n\n')}

LOCATIONS (${entities.locations.length}):
${entities.locations.map(l => `  ✓ ${l.name}
    ID: ${l.id}
    Category: ${l.category}
    Rarity: ${l.rarity}
    Region: ${l.region}
    Position: (${l.x}, ${l.y})
    Attributes: ${Object.keys(l.own_attributes).join(', ')}`).join('\n\n')}

NPCS (${entities.npcs.length}):
${entities.npcs.map(n => `  ✓ ${n.name}
    ID: ${n.id}
    Category: ${n.category}
    Rarity: ${n.rarity}
    Region: ${n.region}
    Position: (${n.x}, ${n.y})
    Attributes: ${Object.keys(n.own_attributes).join(', ')}`).join('\n\n')}

ITEMS (${entities.items.length}):
${entities.items.map(i => `  ✓ ${i.name}
    ID: ${i.id}
    Category: ${i.category}
    Rarity: ${i.rarity}
    Region: ${i.region}
    Position: (${i.x}, ${i.y})
    Attributes: ${Object.keys(i.own_attributes).join(', ')}`).join('\n\n')}

${'='.repeat(50)}
All entities generated with:
  • Unique IDs
  • Dynamic categories from GameRules
  • Appropriate attributes with references
  • Historical accuracy
  • Generated images (base64 encoded)`
      
      generatedElement.textContent = entitiesText
    }
  }

  private displayVisualEntities(entities: GeneratedEntities) {
    const visualSection = document.getElementById('visualEntitiesSection')
    if (visualSection) {
      visualSection.style.display = 'block'
    }

    // Display locations
    this.renderEntityCards(entities.locations, 'locationsGrid')
    
    // Display NPCs
    this.renderEntityCards(entities.npcs, 'npcsGrid')
    
    // Display items
    this.renderEntityCards(entities.items, 'itemsGrid')
  }

  private renderEntityCards(entities: any[], containerId: string) {
    const container = document.getElementById(containerId)
    if (!container) return

    container.innerHTML = entities.map(entity => `
      <div class="entity-card">
        <div class="entity-card-header">
          <h5>${entity.name}</h5>
          <span class="entity-rarity ${entity.rarity}">${entity.rarity}</span>
        </div>
        
        <img src="${entity.image_url}" alt="${entity.name}" class="entity-image">
        
        <p class="entity-description">${entity.description}</p>
        
        <p class="entity-location">
          📍 ${entity.region} (${entity.x}, ${entity.y})
        </p>
        
        <div class="entity-attributes">
          <h6>Attributes:</h6>
          <div class="attribute-list">
            ${Object.entries(entity.own_attributes || {}).map(([key, value]) => 
              `<span class="attribute-badge">${key}: ${value}</span>`
            ).join('')}
          </div>
        </div>
      </div>
    `).join('')
  }

  private downloadConfig() {
    if (!this.config) {
      this.showError('No configuration available. Generate a configuration first.')
      return
    }
    
    const blob = new Blob([JSON.stringify(this.config, null, 2)], { 
      type: 'application/json' 
    })
    this.downloadBlob(blob, 'game-config.json')
  }

  private downloadScratchpad() {
    if (!this.config) {
      this.showError('No scratchpad available. Generate a configuration first.')
      return
    }
    
    const blob = new Blob([this.config.scratchpad], { 
      type: 'text/plain' 
    })
    this.downloadBlob(blob, 'scratchpad.txt')
  }

  private downloadSeeds() {
    if (!this.seedFiles) {
      this.showError('No seed files available. Generate entities first.')
      return
    }

    // Download each seed file separately
    Object.entries(this.seedFiles).forEach(([filename, content]) => {
      const mimeType = filename.endsWith('.json') 
        ? 'application/json' 
        : 'text/typescript'
      const blob = new Blob([content], { type: mimeType })
      this.downloadBlob(blob, filename)
    })
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  private updateStatus(message: string) {
    const statusElement = document.getElementById('statusMessage')
    if (statusElement) {
      statusElement.textContent = message
    }
    console.log(message)
  }

  private showLoading() {
    const loadingState = document.getElementById('loadingState')
    if (loadingState) {
      loadingState.classList.remove('hidden')
    }
  }

  private hideLoading() {
    const loadingState = document.getElementById('loadingState')
    if (loadingState) {
      loadingState.classList.add('hidden')
    }
  }

  private showResults() {
    const resultsSection = document.getElementById('results')
    if (resultsSection) {
      resultsSection.classList.remove('hidden')
    }
  }

  private hideResults() {
    const resultsSection = document.getElementById('results')
    if (resultsSection) {
      resultsSection.classList.add('hidden')
    }
  }

  private showError(message: string) {
    const errorElement = document.getElementById('error')
    if (errorElement) {
      errorElement.textContent = message
      errorElement.classList.remove('hidden')
    }
  }

  private hideError() {
    const errorElement = document.getElementById('error')
    if (errorElement) {
      errorElement.classList.add('hidden')
    }
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new GameConfiguratorDashboard()
})