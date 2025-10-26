import { createContext, useContext, useState, ReactNode } from 'react'
import type { Item, NPC, Location, Region } from '../types'
import { STARTING_INVENTORY_ITEMS, WORLD_ITEMS, GAME_NPCS, GAME_LOCATIONS, GAME_REGIONS } from '../data'

type EntityType = 'item' | 'npc' | 'location'

interface CoordinateEntities {
  locations: Location[]
  npcs: NPC[]
  items: Item[]
}

interface EntityStorageState {
  entityMap: Record<string, CoordinateEntities>  // Spatial index
  allItems: Item[]       // Complete registry with own_attributes
  allLocations: Location[]  // Complete registry
  allNPCs: NPC[]        // Complete registry
  allRegions: Region[]     // Complete region registry
}

interface EntityStorageContextType extends EntityStorageState {
  getEntitiesAt: (region: string, x: number, y: number) => CoordinateEntities
  addEntity: (entity: Item | NPC | Location, type: EntityType) => void
  removeEntity: (entityId: string, type: EntityType) => void
  updateEntity: (entity: Item | NPC | Location, type: EntityType) => void
  getAllItemById: (itemId: string) => Item | undefined
  getAllLocationById: (locationId: string) => Location | undefined
  getAllNPCById: (npcId: string) => NPC | undefined
  getAllRegionById: (regionId: string) => Region | undefined
  getRegionByCoordinates: (regionX: number, regionY: number) => Region | undefined
  addRegion: (region: Region) => void
  updateRegion: (region: Region) => void
}

export type { EntityStorageContextType }

const EntityStorageContext = createContext<EntityStorageContextType | undefined>(undefined)

export const useEntityStorage = () => {
  const context = useContext(EntityStorageContext)
  if (!context) throw new Error('useEntityStorage must be used within EntityStorageProvider')
  return context
}

interface EntityStorageProviderProps {
  children: ReactNode
  initialData?: {
    regions: Region[]
    locations: Location[]
    npcs: NPC[]
    items: Item[]
  }
}

export const EntityStorageProvider = ({ children, initialData }: EntityStorageProviderProps) => {
  const makeKey = (region: string, x: number, y: number) => `${region}:${x}:${y}`
  
  // Initialize from static data or provided initial data
  const initializeStorage = (): EntityStorageState => {
    const entityMap: Record<string, CoordinateEntities> = {}
    
    // Use initialData if provided, otherwise use seed files
    const allItems: Item[] = initialData 
      ? initialData.items 
      : [...STARTING_INVENTORY_ITEMS, ...WORLD_ITEMS]
    const allLocations: Location[] = initialData 
      ? initialData.locations 
      : [...GAME_LOCATIONS]
    const allNPCs: NPC[] = initialData 
      ? initialData.npcs 
      : [...GAME_NPCS]
    const allRegions: Region[] = initialData 
      ? initialData.regions 
      : [...GAME_REGIONS]
    
    // Index locations
    allLocations.forEach(location => {
      const key = makeKey(location.region, location.x, location.y)
      if (!entityMap[key]) entityMap[key] = { locations: [], npcs: [], items: [] }
      entityMap[key].locations.push(location)
    })
    
    // Index NPCs
    allNPCs.forEach(npc => {
      const key = makeKey(npc.region, npc.x, npc.y)
      if (!entityMap[key]) entityMap[key] = { locations: [], npcs: [], items: [] }
      entityMap[key].npcs.push(npc)
    })
    
    // Index items (use allItems, but skip any that are in inventory when using initial data)
    const itemsToIndex = initialData 
      ? allItems  // When using initial data, all items are world items
      : WORLD_ITEMS  // Otherwise use only world items
      
    itemsToIndex.forEach(item => {
      const key = makeKey(item.region, item.x, item.y)
      if (!entityMap[key]) entityMap[key] = { locations: [], npcs: [], items: [] }
      entityMap[key].items.push(item)
    })
    
    return { entityMap, allItems, allLocations, allNPCs, allRegions }
  }
  
  const [storage, setStorage] = useState<EntityStorageState>(initializeStorage)
  
  const getEntitiesAt = (region: string, x: number, y: number): CoordinateEntities => {
    const key = makeKey(region, x, y)
    return storage.entityMap[key] || { locations: [], npcs: [], items: [] }
  }
  
  const addEntity = (entity: Item | NPC | Location, type: EntityType) => {
    setStorage(prev => {
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
        allNPCs: newAllNPCs,
        allRegions: prev.allRegions
      }
    })
  }
  
  const removeEntity = (entityId: string, type: EntityType) => {
    setStorage(prev => {
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
        allNPCs: newAllNPCs,
        allRegions: prev.allRegions
      }
    })
  }
  
  const updateEntity = (entity: Item | NPC | Location, type: EntityType) => {
    removeEntity(entity.id, type)
    addEntity(entity, type)
  }
  
  const getAllItemById = (itemId: string) => {
    return storage.allItems.find(item => item.id === itemId)
  }
  
  const getAllLocationById = (locationId: string) => {
    return storage.allLocations.find(location => location.id === locationId)
  }
  
  const getAllNPCById = (npcId: string) => {
    return storage.allNPCs.find(npc => npc.id === npcId)
  }
  
  const getAllRegionById = (regionId: string) => {
    return storage.allRegions.find(region => region.id === regionId)
  }
  
  const getRegionByCoordinates = (regionX: number, regionY: number) => {
    return storage.allRegions.find(
      region => region.regionX === regionX && region.regionY === regionY
    )
  }
  
  const addRegion = (region: Region) => {
    setStorage(prev => ({
      ...prev,
      allRegions: [...prev.allRegions, region]
    }))
  }
  
  const updateRegion = (region: Region) => {
    setStorage(prev => ({
      ...prev,
      allRegions: prev.allRegions.map(r => 
        r.id === region.id ? region : r
      )
    }))
  }
  
  return (
    <EntityStorageContext.Provider value={{
      ...storage,
      getEntitiesAt,
      addEntity,
      removeEntity,
      updateEntity,
      getAllItemById,
      getAllLocationById,
      getAllNPCById,
      getAllRegionById,
      getRegionByCoordinates,
      addRegion,
      updateRegion
    }}>
      {children}
    </EntityStorageContext.Provider>
  )
}

