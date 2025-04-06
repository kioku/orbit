# Orbit Game

[![Vercel Deployment](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fclaudiuivan%2Forbit-game)

A mesmerizing web-based orbital navigation game. Control your spacecraft's orbit around a central star, collect targets, avoid hazards, and survive as long as possible or reach the target score!

Play it live: [orbit.claudiu-ivan.com](https://orbit.claudiu-ivan.com/)

This project was developed primarily using AI code generation tools as an exploration of ["vibe coding"](https://www.claudiu-ivan.com/writing/vibe-coding). It served as an entry for the [2025 Vibe Jam](https://jam.pieter.com).

## How to Play

- **Objective:**
  - **Survival Mode:** Survive for the target duration.
  - **Score Mode:** Reach the target score by collecting enemies.
- **Controls:**
  - **Expand Orbit:** Hold `[MOUSE CLICK]`, `[SPACE BAR]`, or `[TOUCH]` the screen.
  - **Contract Orbit:** Release the input.
- **Gameplay:**
  - Collect the blue enemy targets to score points.
  - Avoid colliding with the central star.
  - Avoid drifting too far out into the void (stay within the outer orbit line).
  - Avoid projectiles fired by Shooter enemies (in Survival mode).
  - Collect power-ups for temporary advantages.

## Game Modes

- **Survival:** Survive for a set amount of time (`60` seconds by default). Shooter enemies appear in this mode.
- **Score:** Reach a target score (`300` points by default) as quickly as possible. No shooter enemies.

You can switch between modes using the 'M' key or the toggle button in the Settings menu when the game is not active.

## Features

- Two distinct game modes: Survival and Score Attack.
- Dynamic difficulty scaling.
- Multiple enemy types (Normal, Fast, Sun, Shooter).
- Various power-ups (Shield, Score Multiplier, Slow Time, Magnet, Anti-Gravity, Random).
- Keyboard and Touch/Mouse controls.
- Parallax star background.
- Particle effects for thrust and explosions.
- Screen shake effects.
- Sound effects and background music (toggleable).
- Persistent high scores per game mode.
- In-game settings menu (Debug mode, toggle orbit lines, background, sound).
- Game Over dialog with results and social sharing option (Web Share API / Clipboard).
- Basic analytics integration (PostHog).

## Configuration

The game uses Vite for building and development. Environment variables are used for analytics:

- `VITE_POSTHOG_KEY`: Your PostHog Project API Key.
- `VITE_POSTHOG_API_HOST`: Your PostHog Host (e.g., `https://app.posthog.com`).

Analytics are only enabled in production builds (`npm run build`) if `VITE_POSTHOG_KEY` is set. Create a `.env` file in the root directory for local development overrides if needed.

**Note on Hardcoded Values:** Some metadata is currently hardcoded. The background music URL (`src/orbit.ts` -> `AudioManager`), is also hardcoded. If you fork or modify this project, search for these values and update them accordingly.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

This project is configured for easy deployment to Vercel:

1. Fork this repository
2. Connect to your Vercel account
3. Deploy!

When pushing to your repository, Vercel will automatically build and deploy the application.

## Credits

- **Development & Design:** Claudiu Ivan and AI collaborators (Gemini, Claude, O1). Read more about the process [here](https://www.claudiu-ivan.com/writing/vibe-coding).
- **Music:** "Sport Racing Car | DRIVE" by Alex-Productions (CC BY 3.0) via Chosic.com.
- **Inspiration:** Classic arcade and orbital mechanics games.
- **Event:** [2025 Vibe Jam](https://jam.pieter.com) entry.

See the in-game Credits section for more details and links.

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
