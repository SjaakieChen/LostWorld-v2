import CharacterEquipment from './components/character/CharacterEquipment'
import StatsPanel from './components/character/StatsPanel'
import StatusBars from './components/character/StatusBars'
import MapUI from './components/character/MapUI'
import GameDisplay from './components/game/GameDisplay'
import DescriptionBox from './components/game/DescriptionBox'
import ChatInput from './components/game/ChatInput'
import Interactables from './components/inventory/Interactables'
import Inventory from './components/inventory/Inventory'
import InteractionPanel from './components/inventory/InteractionPanel'
import CharacterCreationScreen from './components/character-creation/CharacterCreationScreen'
import { GameStateProvider, useGameState } from './context/GameStateContext'
import { PlayerUIProvider } from './context/PlayerUIContext'
import { EntityStorageProvider } from './context/EntityMemoryStorage'

function GameUI() {
  const { gameState, generatedData } = useGameState()

  // Show character creation screen when not playing
  if (gameState !== 'playing') {
    return <CharacterCreationScreen />
  }

  // Show game UI with generated data
  return (
    <EntityStorageProvider 
      initialData={generatedData.entities ? {
        regions: generatedData.entities.regions || [],
        locations: generatedData.entities.locations || [],
        npcs: generatedData.entities.npcs || [],
        items: generatedData.entities.items || []
      } : undefined}
    >
      <PlayerUIProvider initialPlayer={generatedData.player || undefined}>
        <div className="h-screen bg-gray-800 text-gray-100 p-4 overflow-hidden">
          <div className="grid grid-cols-3 gap-4 h-full">
            {/* Left Column */}
            <div className="flex flex-col gap-4 overflow-y-auto">
              <CharacterEquipment />
              <StatusBars />
              <StatsPanel />
            </div>

            {/* Middle Column */}
            <div className="flex flex-col gap-4 overflow-hidden h-full">
              <GameDisplay />
              <DescriptionBox />
              <ChatInput />
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-4 overflow-y-auto">
              <MapUI />
              <Interactables />
              <Inventory />
              <InteractionPanel />
            </div>
          </div>
        </div>
      </PlayerUIProvider>
    </EntityStorageProvider>
  )
}

function App() {
  return (
    <GameStateProvider>
      <GameUI />
    </GameStateProvider>
  )
}

export default App

