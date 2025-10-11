import CharacterEquipment from './components/character/CharacterEquipment'
import StatsPanel from './components/character/StatsPanel'
import StatusBars from './components/character/StatusBars'
import GameDisplay from './components/game/GameDisplay'
import DescriptionBox from './components/game/DescriptionBox'
import ChatInput from './components/game/ChatInput'
import Interactables from './components/inventory/Interactables'
import Inventory from './components/inventory/Inventory'
import InteractionPanel from './components/inventory/InteractionPanel'
import { GameProvider } from './context/GameContext'

function App() {
  return (
    <GameProvider>
      <div className="min-h-screen bg-gray-800 text-gray-100 p-4">
        <div className="grid grid-cols-3 gap-4 h-screen max-h-screen">
          {/* Left Column */}
          <div className="flex flex-col gap-4 overflow-y-auto">
            <CharacterEquipment />
            <StatsPanel />
            <StatusBars />
          </div>

          {/* Middle Column */}
          <div className="flex flex-col gap-4">
            <GameDisplay />
            <DescriptionBox />
            <ChatInput />
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-4 overflow-y-auto">
            <Interactables />
            <Inventory />
            <InteractionPanel />
          </div>
        </div>
      </div>
    </GameProvider>
  )
}

export default App

