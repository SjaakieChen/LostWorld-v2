import { createContext, useContext, useState, ReactNode } from 'react'
import type { Item, NPC, Location } from '../types'
import { STARTING_INVENTORY_ITEMS, WORLD_ITEMS, GAME_NPCS, GAME_LOCATIONS } from '../data'

type EntityType = 'item' | 'npc' | 'location'

interface CoordinateEntities {
  locations: Location[]
  npcs: NPC[]
  items: Item[]
}

interface GameMemoryState {
  entityMap: Record<string, CoordinateEntities>  // Spatial index
  allItems: Item[]       // Complete registry with own_attributes
  allLocations: Location[]  // Complete registry
  allNPCs: NPC[]        // Complete registry
}

interface GameMemoryContextType extends GameMemoryState {
  getEntitiesAt: (region: string, x: number, y: number) => CoordinateEntities
  addEntity: (entity: Item | NPC | Location, type: EntityType) => void
  removeEntity: (entityId: string, type: EntityType) => void
  updateEntity: (entity: Item | NPC | Location, type: EntityType) => void
  getAllItemById: (itemId: string) => Item | undefined
  getAllLocationById: (locationId: string) => Location | undefined
  getAllNPCById: (npcId: string) => NPC | undefined
}

export type { GameMemoryContextType }

const GameMemoryContext = createContext<GameMemoryContextType | undefined>(undefined)

export const useGameMemory = () => {
  const context = useContext(GameMemoryContext)
  if (!context) throw new Error('useGameMemory must be used within GameMemoryProvider')
  return context
}

export const GameMemoryProvider = ({ children }: { children: ReactNode }) => {
  const makeKey = (region: string, x: number, y: number) => `${region}:${x}:${y}`
  
  // Initialize from static data
  const initializeMemory = (): GameMemoryState => {
    const entityMap: Record<string, CoordinateEntities> = {}
    const allItems: Item[] = [...STARTING_INVENTORY_ITEMS, ...WORLD_ITEMS]
    const allLocations: Location[] = [...GAME_LOCATIONS]
    const allNPCs: NPC[] = [...GAME_NPCS]
    
    // Index locations
    GAME_LOCATIONS.forEach(location => {
      const key = makeKey(location.region, location.x, location.y)
      if (!entityMap[key]) entityMap[key] = { locations: [], npcs: [], items: [] }
      entityMap[key].locations.push(location)
    })
    
    // Index NPCs
    GAME_NPCS.forEach(npc => {
      const key = makeKey(npc.region, npc.x, npc.y)
      if (!entityMap[key]) entityMap[key] = { locations: [], npcs: [], items: [] }
      entityMap[key].npcs.push(npc)
    })
    
    // Index world items (not inventory items)
    WORLD_ITEMS.forEach(item => {
      const key = makeKey(item.region, item.x, item.y)
      if (!entityMap[key]) entityMap[key] = { locations: [], npcs: [], items: [] }
      entityMap[key].items.push(item)
    })
    
    return { entityMap, allItems, allLocations, allNPCs }
  }
  
  const [memory, setMemory] = useState<GameMemoryState>(initializeMemory)
  
  const getEntitiesAt = (region: string, x: number, y: number): CoordinateEntities => {
    const key = makeKey(region, x, y)
    return memory.entityMap[key] || { locations: [], npcs: [], items: [] }
  }
  
  const addEntity = (entity: Item | NPC | Location, type: EntityType) => {
    setMemory(prev => {
      const key = makeKey(entity.region, entity.x, entity.y)
      const newMap = { ...prev.entityMap }
      if (!newMap[key]) newMap[key] = { locations: [], npcs: [], items: [] }
      
      // Update complete registries
      const newAllItems = type === 'item' ? [...prev.allItems, entity as Item] : prev.allItems
      const newAllLocations = type === 'location' ? [...prev.allLocations, entity as Location] : prev.allLocations
      const newAllNPCs = type === 'npc' ? [...prev.allNPCs, entity as NPC] : prev.allNPCs
      
      // Update spatial index
      return {
        entityMap: {
          ...newMap,
          [key]: {
            ...newMap[key],
            [type === 'item' ? 'items' : type === 'npc' ? 'npcs' : 'locations']: [
              ...newMap[key][type === 'item' ? 'items' : type === 'npc' ? 'npcs' : 'locations'],
              entity
            ]
          }
        },
        allItems: newAllItems,
        allLocations: newAllLocations,
        allNPCs: newAllNPCs
      }
    })
  }
  
  const removeEntity = (entityId: string, type: EntityType) => {
    setMemory(prev => {
      const newMap = { ...prev.entityMap }
      const pluralType = type === 'item' ? 'items' : type === 'npc' ? 'npcs' : 'locations'
      
      // Find and remove from coordinate index
      Object.keys(newMap).forEach(key => {
        newMap[key] = {
          ...newMap[key],
          [pluralType]: newMap[key][pluralType].filter(e => e.id !== entityId)
        }
      })
      
      // Remove from complete registries
      const newAllItems = type === 'item' 
        ? prev.allItems.filter(item => item.id !== entityId)
        : prev.allItems
      const newAllLocations = type === 'location' 
        ? prev.allLocations.filter(loc => loc.id !== entityId)
        : prev.allLocations
      const newAllNPCs = type === 'npc' 
        ? prev.allNPCs.filter(npc => npc.id !== entityId)
        : prev.allNPCs
      
      return { 
        entityMap: newMap, 
        allItems: newAllItems,
        allLocations: newAllLocations,
        allNPCs: newAllNPCs
      }
    })
  }
  
  const updateEntity = (entity: Item | NPC | Location, type: EntityType) => {
    removeEntity(entity.id, type)
    addEntity(entity, type)
  }
  
  const getAllItemById = (itemId: string) => {
    return memory.allItems.find(item => item.id === itemId)
  }
  
  const getAllLocationById = (locationId: string) => {
    return memory.allLocations.find(location => location.id === locationId)
  }
  
  const getAllNPCById = (npcId: string) => {
    return memory.allNPCs.find(npc => npc.id === npcId)
  }
  
  return (
    <GameMemoryContext.Provider value={{
      ...memory,
      getEntitiesAt,
      addEntity,
      removeEntity,
      updateEntity,
      getAllItemById,
      getAllLocationById,
      getAllNPCById
    }}>
      {children}
    </GameMemoryContext.Provider>
  )
}
