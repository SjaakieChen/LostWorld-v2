import { useGame } from '../../context/GameContext'

const DescriptionBox = () => {
  const { currentLocation, activeNPC } = useGame()

  // Show NPC description when talking, otherwise show location description
  const description = activeNPC ? activeNPC.description : currentLocation.description

  return (
    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600 h-32 overflow-y-auto">
      <p className="text-gray-300 leading-relaxed">
        {description}
      </p>
    </div>
  )
}

export default DescriptionBox

