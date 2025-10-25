// Simple test to verify orchestrator functions work
import { generateGameConfiguration } from '../../src/services/game-orchestrator'

async function testOrchestrator() {
  console.log('🧪 Testing Game Configurator Orchestrator...')
  
  try {
    console.log('📞 Calling generateGameConfiguration...')
    const config = await generateGameConfiguration(
      'Marco Polo',
      'Play as Marco Polo, the famous Venetian merchant and explorer. Travel from Venice to China in the 13th century, following the Silk Road through Persia and Central Asia to reach Kublai Khan\'s court in Xanadu.'
    )
    
    console.log('✅ Configuration generated successfully!')
    console.log('📝 Scratchpad length:', config.scratchpad.length, 'characters')
    console.log('🎯 Historical Period:', config.gameRules.historicalPeriod)
    console.log('🎮 Genre:', config.gameRules.genre)
    console.log('🎨 Art Style:', config.gameRules.artStyle)
    console.log('📂 Categories:', Object.keys(config.gameRules.categories).join(', '))
    console.log('🌍 Regions:', config.entitiesToGenerate.regions.map(r => r.name).join(', '))
    console.log('📍 Locations:', config.entitiesToGenerate.locations.length)
    console.log('👥 NPCs:', config.entitiesToGenerate.npcs.length)
    console.log('🎒 Items:', config.entitiesToGenerate.items.length)
    
    console.log('\n🎉 Test completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testOrchestrator()
