# Lost World

**AI-Powered Historical RPG Text Adventure**

Lost World is an immersive text-based RPG where you create a historical character and explore an AI-generated world filled with unique items, NPCs, locations, and dynamic events. Every playthrough is different, as Google's Gemini AI generates a custom game world tailored to your character.

## ✨ Features

- **AI-Generated Game World**: Unique items, NPCs, locations, and regions created by Gemini AI
- **Historical Character Creation**: Play as any historical figure with custom character prompts
- **Turn-Based Exploration**: Explore a dynamic world with turn-based mechanics
- **Dynamic Inventory System**: Collect items, manage equipment, and interact with the world
- **Real-Time Game State**: Spatial indexing for fast location queries and entity management
- **Save/Load Functionality**: Save your progress and continue your adventure anytime
- **Development Dashboard**: Monitor game state, entities, and AI operations in real-time

## 🛠️ Tech Stack

- **React 19** + TypeScript
- **Vite** (build tool & dev server)
- **Tailwind CSS 4** (styling)
- **Google Gemini AI API** (world generation & NPC dialogue)

## 📋 Prerequisites

- **Node.js 18+** and npm
- **Google Gemini API Key** (free tier available)
  - Get your API key at [Google AI Studio](https://aistudio.google.com/app/apikey)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/SjaakieChen/LostWorld-v2.git
cd LostWorld-v2
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure API Key

**PowerShell:**
```powershell
Copy-Item .env.example .env
```

**Bash/Unix:**
```bash
cp .env.example .env
```

Then edit `.env` and add your Gemini API key:
```
VITE_GEMINI_API_KEY=your_api_key_here
```

## 🎮 Running the Game

### Development Mode
```bash
npm run dev
```
Open your browser to `http://localhost:5173`

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## 🎯 How It Works

### Character Creation
1. Launch the game and enter your character details
2. Provide a character prompt (e.g., "Julius Caesar exploring a mysterious new land")
3. The AI generates a unique game world tailored to your character

### Game Generation
The orchestrator uses Gemini AI to create:
- **Custom Regions & Locations**: Diverse environments to explore
- **NPCs with Personalities**: Characters with unique dialogue and behaviors
- **Items with Attributes**: Weapons, armor, consumables, and quest items
- **Game Rules & Mechanics**: Dynamic game systems based on your character

### Gameplay
- **Explore Locations**: Navigate via the map UI
- **Interact with NPCs**: Engage in conversations and quests
- **Manage Inventory**: Collect items, equip gear, and use consumables
- **Progress Through Turns**: Take actions and watch the world evolve
- **Save Your Progress**: Save at any time and load your games later

## 🏗️ Architecture

Lost World uses a three-tier React Context architecture:

```
GameStateContext → EntityStorageContext → PlayerUIContext
```

- **GameStateContext**: Manages game lifecycle and initial generation
- **EntityStorageContext**: Complete entity registry with spatial indexing
- **PlayerUIContext**: Player's current view and interactions

**Key Features:**
- Spatial indexing for O(1) location queries
- ID-based entity references for consistency
- Centralized entity storage with dual indexing (spatial + registry)

For detailed technical documentation, see [`ARCHITECTURE.md`](ARCHITECTURE.md).

## 💾 Game Saves

- Saves are stored in the `GameSaves/` directory
- File format: `.lwg` (JSON-based save format)
- Includes full game state, entities, player data, and timeline

## 🔧 Development Dashboard

In development mode, access the dashboard at `/dashboard.html` to:
- Monitor entity states and history
- View timeline events and tags
- Inspect LLM operations and responses
- Debug game state and spatial indexing

## 📁 Project Structure

```
src/
├── components/           # React UI components
│   ├── character/       # Character UI (equipment, stats, status)
│   ├── game/           # Core game display and interaction
│   └── inventory/      # Inventory management
├── context/            # React Context providers (state management)
├── services/           # Business logic & AI services
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## 📚 Documentation

- [`ARCHITECTURE.md`](ARCHITECTURE.md) - Detailed architecture overview
- [`docs/STATE-MANAGEMENT.md`](docs/STATE-MANAGEMENT.md) - State management patterns
- [`docs/ENTITY-STORAGE.md`](docs/ENTITY-STORAGE.md) - Entity storage system
- [`docs/IMPLEMENTING-FEATURES.md`](docs/IMPLEMENTING-FEATURES.md) - Feature development guide

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📄 License

This project is open source and available under the MIT License.

## 🎮 Happy Adventuring!

Create your character, explore the AI-generated world, and embark on an unforgettable journey through history!
