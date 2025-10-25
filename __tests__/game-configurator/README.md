# Game Configurator Dashboard

A testing interface for the Game Configurator Orchestrator LLM system that generates complete game configurations from user prompts.

## Overview

The Game Configurator uses **Gemini 2.5 Pro** to analyze user input and generate:
- A text-based scratchpad describing the game narrative and mechanics
- Dynamic game rules with genre-appropriate categories and attributes
- A list of essential entities to generate (regions, locations, NPCs, items)
- Complete seed data files for the game

## Features

### 🎮 Game Configuration Generation
- **Character-based**: Input a character name and description
- **Free-form input**: Describe any type of game or historical scenario
- **AI orchestration**: Uses Gemini 2.5 Pro to plan the entire game structure

### 📝 Scratchpad System
- **Plain text format**: Human-readable game design notes
- **Narrative planning**: Game goals, plot points, and key entities
- **Mechanics documentation**: Core interactions and gameplay elements
- **Genre definition**: Art style and historical period notes

### 🎯 Dynamic Category Generation
- **Genre-appropriate**: Categories generated based on the game type
- **Historical accuracy**: Attributes that match the time period
- **Flexible system**: No hardcoded categories - adapts to any scenario

### ✨ Entity Generation
- **Essential entities only**: Focuses on narrative-critical elements
- **Historical figures**: Real people relevant to the story
- **Key locations**: Starting point, destination, and important waypoints
- **Quest items**: Items needed for progression

## Usage

### 1. Open the Dashboard
```bash
cd __tests__/game-configurator
python -m http.server 8080
```
Then open `http://localhost:8080` in your browser.

### 2. Configure Your Game
1. Enter a **Character Name** (e.g., "Marco Polo")
2. Write a **Game Description** describing the character, setting, and gameplay
3. Click **Generate Game Configuration**

### 3. Review Results
- **Scratchpad**: Read the AI's game design notes
- **Game Rules**: See the generated categories and attributes
- **Entities**: Review what will be generated
- **Generated Entities**: See the actual created entities

### 4. Download Files
- **Config JSON**: Complete configuration data
- **Scratchpad**: Text file with game design notes
- **Seed Files**: TypeScript files ready for the game

## Example Inputs

### Marco Polo Exploration
```
Character: Marco Polo
Description: Play as Marco Polo, the famous Venetian merchant and explorer. Travel from Venice to China in the 13th century, following the Silk Road through Persia and Central Asia to reach Kublai Khan's court in Xanadu. Experience historical exploration, trading, diplomacy, and cultural exchange in this immersive historical RPG.
```

### Medieval Knight Quest
```
Character: Sir Lancelot
Description: Play as Sir Lancelot on a quest to find the Holy Grail. Travel through medieval England, encounter mythical creatures, and prove your worth as a knight of the Round Table. Focus on combat, chivalry, and Arthurian legend.
```

### Space Explorer Adventure
```
Character: Captain Kirk
Description: Play as Captain Kirk exploring strange new worlds and seeking out new life and new civilizations. Command a starship, make first contact with alien species, and boldly go where no one has gone before.
```

## Technical Details

### Architecture
- **Orchestrator**: `src/services/game-orchestrator/configurator.ts`
- **Types**: `src/services/game-orchestrator/types.ts`
- **Seed Generation**: `src/services/game-orchestrator/seed-generator.ts`
- **Player Creation**: `src/services/game-orchestrator/player-creation.ts` (placeholder)

### API Integration
- Uses **Gemini 2.5 Pro** for planning and analysis
- Calls existing entity generation functions (`createNpc`, `createItem`, `createLocation`)
- Generates TypeScript seed files compatible with the main game

### File Structure
```
__tests__/game-configurator/
├── dashboard.html          # Main UI
├── dashboard.ts           # UI logic
├── styles.css            # Styling
├── test-orchestrator.ts  # Test script
└── README.md             # This file
```

## Future Enhancements

### Turn-Based Updates
The system is designed to support future turn-based updates where the orchestrator can:
- Update the scratchpad based on player actions
- Generate new entities as the story progresses
- Modify existing entities based on game state
- Create dynamic story branches

### Player Creation
Currently a placeholder, future implementation will:
- Generate player stats based on character background
- Create starting inventory appropriate for the character
- Set starting location and initial conditions
- Generate character background and motivations

## Testing

Run the test script to verify the orchestrator works:
```bash
npx tsx __tests__/game-configurator/test-orchestrator.ts
```

This will test the complete flow with a Marco Polo example and display the generated configuration and entities.
