# Highway Racer

## Overview

Highway Racer is a 2D browser-based car chase game built with vanilla JavaScript and HTML5 Canvas. Players control a car using WASD keys to avoid obstacles, collect power-ups (fuel and health), and survive as long as possible. The game features a mobile-optimized 9:16 portrait aspect ratio, multiple enemy vehicle types, and a scoring system based on distance traveled.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Pure vanilla JavaScript** - No frameworks or build tools; single script.js file handles all game logic
- **HTML5 Canvas** - Core rendering engine for all game graphics and animations
- **Tailwind CSS (CDN)** - Used for UI overlay styling (start screen, game over screen)
- **Custom CSS** - Minimal styles.css for animations like screen shake effects

### Game Engine Design
- **Class-based structure** - Uses ES6 classes for game entities (InputHandler visible in code, likely Player, Enemy, Drop classes)
- **Game loop pattern** - Standard requestAnimationFrame loop for rendering and updates
- **Sprite-based rendering** - Pre-loaded PNG images for all game entities (player, enemies, items, background)
- **Collision detection** - Rectangle-based collision between player and enemies/drops

### Asset Management
- **Static image loading** - All sprites loaded via hidden `<img>` elements in HTML, referenced by ID
- **Audio system** - Background music with graceful error handling for missing files
- **Responsive canvas** - Internal resolution of 720x1280 with CSS scaling to fit viewport

### Game State Management
- **Global variables** - Score, distance, and entity arrays (drops, explosions, enemies) managed at module scope
- **UI overlays** - Start and restart screens controlled via DOM manipulation (show/hide)
- **Entity spawning** - Multiple enemy types spawned from predefined array of vehicle types

### Input System
- **Keyboard controls** - WASD keys for 4-directional movement
- **Touch-friendly UI** - Buttons designed with mobile tap interactions in mind

## External Dependencies

### CDN Dependencies
- **Tailwind CSS** - Loaded via CDN (`https://cdn.tailwindcss.com`) for utility-first styling of UI elements

### Local Assets
- **Sprites** - PNG images in `/Public/` directory organized by category:
  - `/Public/Player/` - Player vehicle sprite
  - `/Public/Enemies/` - Various enemy vehicle sprites (Car, Taxi, Audi, Truck, Police, MiniVan, Ambulance, MiniTruck)
  - `/Public/Other/` - Collectibles and effects (GasCan, Health, Explosion)
  - `/Public/Background/` - Road/highway background
  - `/Public/Bezel/` - Screen frame decoration
- **Audio** - Background music in `/Public/Audio/backgrounMusic.mp3`

### No Backend Required
- Entirely client-side application
- No server, database, or API integrations
- No persistent storage (scores not saved between sessions)