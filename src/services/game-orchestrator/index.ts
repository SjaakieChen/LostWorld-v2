// Game Orchestrator Service
// Main exports for the game configuration system

export { generateGameConfiguration, generateGameEntities } from './configurator'
export { createPlayer } from './player-creation'
export { generateSeedFiles, generateGameSummary } from './seed-generator'

// Types
export type {
  GameConfiguration,
  GeneratedEntities,
  RegionSpec,
  LocationSpec,
  NpcSpec,
  ItemSpec,
  PlayerCharacter,
  SeedFiles
} from './types'

export { GAME_CONFIGURATION_SCHEMA } from './types'
