// Test script for the Game Configurator Orchestrator
// This demonstrates how to use the orchestrator service

import { generateGameConfiguration, generateGameEntities, generateSeedFiles } from '../../src/services/game-orchestrator'

async function testMarcoPoloExample() {
  console.log('🎮 Testing Game Configurator with Marco Polo example...\n')

  try {
    // Step 1: Generate game configuration
    console.log('Step 1: Generating game configuration...')
    const config = await generateGameConfiguration(
      'Marco Polo',
      'Play as Marco Polo, the famous Venetian merchant and explorer. Travel from Venice to China in the 13th century, following the Silk Road through Persia and Central Asia to reach Kublai Khan\'s court in Xanadu. Experience historical exploration, trading, diplomacy, and cultural exchange in this immersive historical RPG.'
    )

    console.log('✓ Configuration generated successfully!')
    console.log('Scratchpad preview:', config.scratchpad.substring(0, 200) + '...')
    console.log('Historical Period:', config.gameRules.historicalPeriod)
    console.log('Genre:', config.gameRules.genre)
    console.log('Categories:', Object.keys(config.gameRules.categories).join(', '))
    console.log('')

    // Step 2: Generate entities
    console.log('Step 2: Generating game entities...')
    const entities = await generateGameEntities(config)

    console.log('✓ Entities generated successfully!')
    console.log(`- Regions: ${entities.regions.length}`)
    console.log(`- Locations: ${entities.locations.length}`)
    console.log(`- NPCs: ${entities.npcs.length}`)
    console.log(`- Items: ${entities.items.length}`)
    console.log('')

    // Step 3: Generate seed files
    console.log('Step 3: Generating seed files...')
    const seedFiles = generateSeedFiles(entities, config)

    console.log('✓ Seed files generated successfully!')
    console.log('Available files:', Object.keys(seedFiles))
    console.log('')

    // Display some sample data
    console.log('Sample Generated Data:')
    console.log('=====================')
    
    if (entities.regions.length > 0) {
      console.log('First Region:', entities.regions[0].name)
    }
    
    if (entities.locations.length > 0) {
      console.log('First Location:', entities.locations[0].name)
    }
    
    if (entities.npcs.length > 0) {
      console.log('First NPC:', entities.npcs[0].name)
    }
    
    if (entities.items.length > 0) {
      console.log('First Item:', entities.items[0].name)
    }

    console.log('\n🎉 Test completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testMarcoPoloExample()
