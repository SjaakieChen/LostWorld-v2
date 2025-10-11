import type { Rarity } from '../types'

// Rarity color mappings - Tailwind CSS classes for each rarity level
export const RARITY_COLORS: Record<Rarity, string> = {
  common: 'bg-blue-400',
  rare: 'bg-green-500',
  epic: 'bg-purple-500',
  legendary: 'bg-amber-500',
}

// Game configuration constants
export const INVENTORY_SIZE = 12
export const INTERACTION_INPUT_SIZE = 3
export const INTERACTION_OUTPUT_SIZE = 3

// Equipment slot names
export const EQUIPMENT_SLOT_NAMES = ['head', 'chest', 'legs', 'feet', 'leftHand', 'rightHand'] as const

