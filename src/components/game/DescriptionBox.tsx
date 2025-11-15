import { usePlayerUI } from '../../context/PlayerUIContext'

const DescriptionBox = () => {
  const { currentLocation, activeNPC, inspectedItem } = usePlayerUI()

  // Show NPC visual description when talking, otherwise show location visual description
  const description = inspectedItem
    ? inspectedItem.visualDescription
    : activeNPC
      ? activeNPC.visualDescription
      : currentLocation.visualDescription

  return (
    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600 h-32 overflow-y-auto">
      <p className="text-gray-300 leading-relaxed">
        {description}
      </p>
    </div>
  )
}

export default DescriptionBox

