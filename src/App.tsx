import CharacterEquipment from './components/character/CharacterEquipment'
import StatsPanel from './components/character/StatsPanel'
import StatusBars from './components/character/StatusBars'
import MapUI from './components/character/MapUI'
import GameDisplay from './components/game/GameDisplay'
import ChatInput from './components/game/ChatInput'
import Interactables from './components/inventory/Interactables'
import Inventory from './components/inventory/Inventory'
import InteractionPanel from './components/inventory/InteractionPanel'
import CharacterCreationScreen from './components/character-creation/CharacterCreationScreen'
import SaveGameButton from './components/save-game/SaveGameButton'
import TurnButton from './components/game/TurnButton'
import { GameStateProvider, useGameState } from './context/GameStateContext'
import { PlayerUIProvider } from './context/PlayerUIContext'
import { EntityStorageProvider } from './context/EntityMemoryStorage'

function GameUI() {
  const { gameState, generatedData, loadedSaveData } = useGameState()

  // Show character creation screen when not playing
  if (gameState !== 'playing') {
    return <CharacterCreationScreen />
  }

  // Determine if we're loading a save or using generated data
  const isLoadedSave = !!loadedSaveData.entities
  const loadedEntities = loadedSaveData.entities ?? undefined
  const entityData = isLoadedSave ? loadedEntities : (generatedData.entities ? {
    regions: generatedData.entities.regions || [],
    locations: generatedData.entities.locations || [],
    npcs: generatedData.entities.npcs || [],
    items: generatedData.entities.items || []
  } : undefined)

  // Show game UI with generated or loaded data
  return (
    <EntityStorageProvider 
      initialData={entityData}
    >
      <PlayerUIProvider 
        initialPlayer={isLoadedSave ? undefined : (generatedData.player || undefined)}
        savedPlayerState={isLoadedSave ? loadedSaveData.playerState || undefined : undefined}
      >
        <div className="h-screen bg-gray-800 text-gray-100 p-4 overflow-hidden">
          <div className="absolute top-4 right-4 z-10">
            <SaveGameButton />
          </div>
          <TurnButton />
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

