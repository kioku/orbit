# Orbit Game Improvement Plan

This document outlines areas for improvement in the Orbit Game codebase.

- [ ] **Refactor `OrbitGame` Class:** Break down the massive `OrbitGame` class into smaller, more focused modules (e.g., `GameLogic`, `Renderer`, `InputManager`, `UIManager`, `StateManager`).
- [ ] **Decouple Entities:** Modify entity `update` methods to receive only necessary data (e.g., `timeDelta`, specific game state slices) instead of the entire `OrbitGame` instance. Use events or callbacks for actions like shooting or spawning particles.
- [ ] **Separate UI Logic:** Move DOM manipulation (button creation, menu handling, class toggling) out of `OrbitGame` into a dedicated UI module.
- [ ] **Improve State Management:** Implement a more robust state machine pattern (potentially using a library or a dedicated state class) to handle transitions between `WELCOME`, `PLAYING`, `PAUSED`, `LOSER`, `WINNER` and manage `paused`/`isMenuOpen` interactions more cleanly.
- [ ] **Reduce Magic Numbers/Strings:** Replace hardcoded values (colors, font strings, specific offsets) with named constants or configuration objects.
- [ ] **Refactor Rendering:** Consider a more structured rendering pipeline, potentially using layers or a scene graph approach, especially if complexity increases. Optimize canvas operations where needed.
- [ ] **Refine Input Handling:** Abstract input handling into a dedicated module that translates raw inputs (key presses, mouse clicks) into game actions or events.
- [ ] **Enhance Audio Management:** Integrate a proper audio library (like Howler.js) for better sound control, loading, playback, and effects.
- [ ] **Optimize Object Pooling:** Review pooling usage and ensure objects are consistently returned to the pool. Consider pooling for other frequently created/destroyed objects if necessary.
- [ ] **Improve Collision Detection:** If performance becomes an issue with many objects, consider spatial partitioning (e.g., Quadtrees) for collision checks.
- [ ] **Add Unit/Integration Tests:** Introduce a testing framework (like Jest or Vitest) to write tests for core game logic, utilities, and potentially UI components.
