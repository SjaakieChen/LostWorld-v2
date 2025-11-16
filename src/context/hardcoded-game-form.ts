/**
 * HardcodedGameForm:
 * Canonical description of immutable game mechanics that every LLM must receive
 * alongside the dynamic guide scratchpad. This keeps prompts consistent about
 * the stat system, inventory limits, and other core rules that never change.
 */
export const HARD_CODED_GAME_FORM = `
### HARD CODED GAME FORM (GLOBAL MECHANICS)
THIS IS THE WEBGAME STRUCTURE THAT YOU ARE OPERATING IN.

### GAME INTERFACE

The player sees 3 main panels. 
- The player panel (left): This is the panel that shows a portrait image of our player charchter and
 below it displays 2 status bars, one for health and one for energy. (hardcoded value range 0-100)
Below it it then displays 6 bars which are the stats mentioned below in the guide scratchpad. 
(there will be 5 tiers for each stat. whenevery a stat reaches 100 it will advance 1 tier and start at 0 in that tier. Reduction works in the same way.)


- The interface panel (middle): This is the panel that shows the image of what we are seeing (pov of the player)
Most of the time it will display the location image of our current location. but when talking to an npc or inspecting an item it will display the image of those entities.
Below the image there is a chat area. this is where the player can input text to whatever LLM is active.

- The interaction panel (right): This is the panel that shows the inventory of the player. It displays a grid which is the map (collections of locations organised by their coordinates) for the region we are in. 
where the player can click on grids to move to.
It contains a inventory section with 12 slots which are the inventory of the player. these can be moved around to different slots at will by dragging it using the mouse.
It contains a interaction section with 3 input slots and 3 output slots. The output depends on what a llm deceide a plausible interaction might be 
depending on the context.

By double clicking on any entity the user can open its modal which will display more detailed information about the entity.


### ENTITIES
There are 4 entity types: Items, NPCs, Locations, and Regions.
Items,NPC's and locations are alike in the sense that they all have
- name
- visual description (used to generate the image during generation but also acts as a description of the image the player sees when looking at the entity)
- functional description (used to provide the generation of the attributes of this entity during creation with the correct context and goals)
- region (the regions this entity is in)
- x,y coordinates (which are coordinates of where they are inside the regions they belong to)
- an image
- category (are hardcoded and explained in the guide scratchpad below.)
- own_attributes (which are the attributes of the entity. these can be changed during the game)
The attributes are a ever growing library and they may or may not be provided to you. 
They are the main sources of interaction in the game. 
regions also have coordinate RegionX and RegionY their main purpose is to contain the three other entities.

### TURN BASED MECHANICS
The game has a end turn button. Upon clicking it the game will start processing the turn. during which time
a LLM called turn progression llm will be called to simulate what will happen. 
This includes changing attributes generating entities and moving them around.
At the end it will provide a turn goal that should be completed within the next turn.
This usually takes 2 minutes to complete.









`.trim()

export const buildGuideMaterials = (guideScratchpad?: string | null): string => {
  const trimmedScratchpad = guideScratchpad?.trim()
  if (trimmedScratchpad) {
    return [
      'HARD CODED GAME FORM',
      '------------------------------',
      HARD_CODED_GAME_FORM,
      'GUIDE SCRATCHPAD',
      '------------------------------',
      trimmedScratchpad,
    ].join('\n')
  }
  return [
    'GUIDE SCRATCHPAD',
    '------------------------------',
    '(No guide scratchpad was provided.)',
    '',
    'HARD CODED GAME FORM',
    '------------------------------',
    HARD_CODED_GAME_FORM
  ].join('\n')
}

