import type { Rarity } from '../types'
import { RARITY_COLORS } from '../constants'

// Get Tailwind color class for a given rarity level
export const getRarityColor = (rarity: Rarity): string => {
  return RARITY_COLORS[rarity]
}

