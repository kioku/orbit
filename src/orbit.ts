import posthog from "posthog-js";
import "./main.css";
import { Howl, Howler } from "howler";

// =============================================================================
// Analytics Wrapper
// =============================================================================

class Analytics {
  private isInitialized: boolean = false;

  constructor() {
    // Conditionally initialize PostHog only in production
    // Ensure VITE_POSTHOG_KEY and VITE_POSTHOG_API_HOST are set in your build environment
    if (import.meta.env.PROD && import.meta.env.VITE_POSTHOG_KEY) {
      try {
        posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
          api_host:
            import.meta.env.VITE_POSTHOG_API_HOST || "https://app.posthog.com",
          person_profiles: "always",
          // Enable debug mode in development if needed, but tracking is disabled anyway
          // loaded: (ph) => { if (!import.meta.env.PROD) ph.debug(); }
        });
        this.isInitialized = true;
        console.log("PostHog initialized.");
      } catch (e) {
        console.error("Failed to initialize PostHog:", e);
      }
    } else {
      console.log(
        "PostHog tracking disabled (not in PROD or VITE_POSTHOG_KEY missing)."
      );
    }
  }

  track(eventName: string, properties?: Record<string, any>): void {
    if (this.isInitialized) {
      posthog.capture(eventName, properties);
      // console.log(`Tracked event: ${eventName}`, properties); // Optional: Log tracked events
    }
  }
}

// =============================================================================
// Interfaces & Enums
// =============================================================================

interface Sprites {
  playerSprite: HTMLCanvasElement | null;
  enemySun: HTMLCanvasElement | null;
  enemy: HTMLCanvasElement | null;
  shooterSprite: HTMLCanvasElement | null; // Sprite for shooter enemy
  // Potential future: Enemy variants, powerup sprites
}

interface Mouse {
  down: boolean;
}

interface World {
  width: number;
  height: number;
}

// Improvement: Use Enum for Game State
enum GameState {
  WELCOME = "state-welcome",
  PLAYING = "state-playing",
  PAUSED = "state-paused",
  LOSER = "state-loser",
  WINNER = "state-winner",
}

// Improvement: Use Enum for Enemy Types (more extensible)
enum EnemyType {
  NORMAL = 1,
  SUN = 2,
  FAST = 3, // Basic example for variety
  SHOOTER = 4, // Fires projectiles
  // Add more types here: HOMING, etc.
}

// Improvement: Use Enum for PowerUp Types
enum PowerUpType {
  SHIELD = 1,
  SCORE_MULTIPLIER = 2,
  SLOW_TIME = 3,
  MAGNET = 4,
  GRAVITY_REVERSE = 5,
  RANDOM = 6, // Add RANDOM type
}

// =============================================================================
// Helper Classes (Audio, Pooling - basic stubs)
// =============================================================================

// Basic Audio Manager Stub (Replace with actual implementation using Howler.js, Web Audio API, etc.)
class AudioManager {
  private sounds: { [key: string]: Howl | null } = {}; // Use Howl type
  private isMuted: boolean = false; // Global mute state
  private musicPlaying: boolean = false; // Track music state

  // The url of the background music.
  // Thanks uploadthing.com
  // Sport Racing Car | DRIVE by Alex-Productions | https://onsound.eu/
  // Music promoted by https://www.chosic.com/free-music/all/
  // Creative Commons CC BY 3.0
  // https://creativecommons.org/licenses/by/3.0/
  private readonly MUSIC_URL =
    "https://g9e7a37vde.ufs.sh/f/8rP3LNAdeIqo14aH6pALc4aglCP3FIW9BAmt7QdJ8OiHr5Mx";

  load() {
    console.log("AudioManager: Load sounds here...");
    // Example: this.sounds['collect'] = new Howl({ src: ['sounds/collect.wav'] });
    this.sounds["collect"] = null;
    this.sounds["thrust"] = null;
    this.sounds["shield_break"] = null;
    this.sounds["powerup"] = null;
    this.sounds["explode"] = null; // TODO: Load actual sound effects
    this.sounds["game_over"] = null;
    this.sounds["victory"] = null;

    // Load background music
    this.sounds["music"] = new Howl({
      src: [this.MUSIC_URL], // <<< Replace with your music URL
      loop: true,
      volume: 0.4, // Adjust default volume as needed
      html5: true, // Use HTML5 Audio to potentially save resources for long tracks
      format: "mp3",
      onload: () => {
        console.log("AudioManager: Music loaded.");
      },
      onloaderror: (_, err) => {
        console.error("AudioManager: Error loading music.", err);
      },
      onplayerror: (_, err) => {
        console.error("AudioManager: Error playing music.", err);
        this.musicPlaying = false; // Reset flag on play error
      },
    });
  }

  // Method to toggle mute state
  mute(muted: boolean): void {
    this.isMuted = muted;
    Howler.mute(muted); // Use Howler's global mute
    console.log(`AudioManager: Sounds ${muted ? "muted" : "unmuted"}`);
    // Howler handles stopping sounds on mute if configured, but explicit stopMusic might still be desired
    // Depending on whether you want music to resume automatically on unmute.
    // Let's keep the explicit stop/start logic for now.
    if (muted) {
      if (this.musicPlaying) this.stopMusic(); // Stop music only if it was playing
    } else {
      // Optionally restart music if it was playing before mute?
      // Let's let the game logic handle restarting music via playMusic() when needed.
      // Optionally restart music if it was playing before mute? Depends on desired behavior.
    }
  }

  playSound(key: string, volume: number = 1.0) {
    // Note: Global mute (Howler.mute) already prevents playback.
    // Keeping the isMuted check might be redundant but harmless.
    if (this.isMuted) return;

    const sound = this.sounds[key];
    if (sound) {
      // console.log(`AudioManager: Playing sound "${key}", volume ${volume}`);
      sound.volume(volume);
      sound.play();
    } // No warning for missing sounds needed for now
  }

  playMusic() {
    // Global mute check is handled by Howler, but explicit check prevents unnecessary calls
    if (this.isMuted || this.musicPlaying) return;

    const music = this.sounds["music"];
    if (music) {
      console.log("AudioManager: Playing music.");
      music.play();
      this.musicPlaying = true; // Set flag
      music.once("play", () => {
        // Confirm playback started
        console.log("AudioManager: Music playback confirmed.");
        this.musicPlaying = true;
      });
      // Howler handles looping via the 'loop: true' setting during load.
    } else {
      console.warn("AudioManager: Music not loaded or ready.");
    }
  }

  stopMusic() {
    const music = this.sounds["music"];
    if (music && this.musicPlaying) {
      console.log("AudioManager: Stopping music.");
      music.stop(); // Stop playback
      this.musicPlaying = false; // Reset flag
    }
  }
}

// Basic Object Pool for Particles (Improvement: Pooling)
class ObjectPool<T extends Poolable> {
  private pool: T[] = [];
  private factory: () => T;

  constructor(factory: () => T, initialSize: number = 0) {
    this.factory = factory;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  get(): T {
    if (this.pool.length > 0) {
      const obj = this.pool.pop()!;
      obj.reset(); // Ensure object is reset before use
      return obj;
    }
    // console.log("Pool creating new object"); // Log if pool is empty
    return this.factory(); // Create new if pool empty
  }

  release(obj: T) {
    this.pool.push(obj);
  }

  getPoolSize(): number {
    return this.pool.length;
  }
}

// Interface for poolable objects
interface Poolable {
  reset(): void;
  alive: boolean; // Poolable objects need an alive flag
}

// =============================================================================
// Main Game Class
// =============================================================================

class OrbitGame {
  // --- Constants ---
  private readonly FRAMERATE: number = 60;
  private readonly DEFAULT_WIDTH: number = 600;
  private readonly DEFAULT_HEIGHT: number = 600;
  private readonly ENEMY_SIZE: number = 10;
  private readonly SUN_SIZE_MULTIPLIER: number = 2;
  // Enemy Types moved to Enum
  // Game States moved to Enum
  private readonly PLAYER_START_RADIUS: number = 150;
  private readonly PLAYER_COLLISION_RADIUS: number = 12;
  private readonly PLAYER_SPRITE_SCALE: number = 1.0; // Ship size (Fix 1)
  private readonly PLAYER_BASE_ACCELERATION = 0.03;
  private readonly PLAYER_BASE_GRAVITY = 0.025;
  private readonly PLAYER_MAX_INTERACTION_DELTA = 1.5;
  private readonly PLAYER_MIN_INTERACTION_DELTA = -0.8;
  private readonly PLAYER_ROTATION_SPEED_FACTOR = 5.5;
  // Change PLAYER_MIN_ORBIT_RADIUS
  private readonly PLAYER_MIN_ORBIT_RADIUS = 35; // Reduced from 50
  private readonly POWERUP_SPAWN_INTERVAL_MS: number = 5000;
  private readonly POWERUP_DURATION_MS: number = 12000; // Powerups last slightly longer
  private readonly POWERUP_MAGNET_RANGE: number = 150;
  private readonly POWERUP_MAGNET_STRENGTH: number = 2;
  // Increase SUN_DANGER_RADIUS_FACTOR slightly
  private readonly SUN_DANGER_RADIUS_FACTOR: number = 0.04; // Increased from 0.03
  // Enemy Spawning (Improvement)
  private readonly MAX_ENEMIES: number = 15;
  private readonly ENEMY_SPAWN_INTERVAL_MS_BASE: number = 1200; // Slightly slower start
  private readonly ENEMY_SPAWN_INTERVAL_MS_MIN: number = 250;
  private readonly ENEMY_SPAWN_INTERVAL_REDUCTION_PER_SEC: number = 5;
  private readonly ENEMY_FAST_CHANCE: number = 0.15; // Chance for a 'FAST' enemy variant (basic variety)
  private readonly ENEMY_SPEED_FACTOR_INCREASE_PER_SEC: number = 0.005; // Basic speed scaling
  private readonly ENEMY_MIN_SPAWN_RADIUS_OFFSET: number = 10;
  private readonly ENEMY_MAX_SPAWN_RADIUS_OFFSET: number = 10;
  private readonly ENEMY_MIN_DISTANCE_FROM_PLAYER: number = 100;
  private readonly ENEMY_SHOOTER_CHANCE: number = 0.18; // Less frequent shooters initially
  // Change SHOOTER_COOLDOWN_MS
  public readonly SHOOTER_COOLDOWN_MS: number = 2500; // Slower firing rate (was 1800)
  // Projectiles
  private readonly PROJECTILE_POOL_INITIAL_SIZE: number = 50;
  private readonly PROJECTILE_SPEED: number = 3.5;
  private readonly PROJECTILE_SIZE: number = 4;
  // Change PROJECTILE_LIFETIME_MS
  private readonly PROJECTILE_LIFETIME_MS: number = 2200; // Shorter lifetime (was 3000)
  private readonly PROJECTILE_COLLISION_RADIUS: number = 5;
  // Particles (Pooling)
  private readonly THRUST_PARTICLE_POOL_INITIAL_SIZE: number = 100;
  private readonly THRUST_PARTICLE_COUNT_MIN = 1;
  private readonly THRUST_PARTICLE_COUNT_MAX = 3;
  private readonly THRUST_PARTICLE_SPREAD = 0.5;
  private readonly THRUST_PARTICLE_OFFSET_MIN = 15;
  private readonly THRUST_PARTICLE_OFFSET_MAX = 25;
  // High Score Key Base (Improvement) - Mode will be appended
  private readonly HIGH_SCORE_KEY_BASE = "orbitHighScore";
  // Projectiles
  private projectiles: Projectile[] = [];
  private projectilePool!: ObjectPool<Projectile>; // Initialize in constructor
  // Screen Shake (Improvement)
  private readonly SHAKE_DURATION_MS = 150;
  private readonly SHAKE_INTENSITY = 3;

  // --- Properties ---
  private sprites: Sprites = {
    playerSprite: null,
    enemySun: null,
    enemy: null,
    shooterSprite: null,
  };
  private mouse: Mouse = { down: false };
  private keyboardThrust: boolean = false; // For keyboard control
  private canvas!: HTMLCanvasElement;
  private context!: CanvasRenderingContext2D;
  private container!: HTMLElement;
  private startButton!: HTMLButtonElement;
  private settingsButton!: HTMLButtonElement;
  private settingsMenu!: HTMLElement; // Reference to the menu container
  private closeMenuButton!: HTMLButtonElement; // Reference to close button
  private debugToggleButton!: HTMLButtonElement; // Reference to debug toggle
  private orbitToggleButton!: HTMLButtonElement; // Ref for orbit toggle
  private backgroundToggleButton!: HTMLButtonElement; // Ref for background toggle
  private soundToggleButton!: HTMLButtonElement; // Ref for sound toggle
  private modeToggleButton!: HTMLButtonElement; // Ref for mode toggle
  private creditsButton!: HTMLButtonElement; // Ref for credits button in settings
  private creditsSection!: HTMLElement; // Ref for credits section container
  private closeCreditsButton!: HTMLButtonElement; // Ref for close button in credits
  private gameOverDialog!: HTMLElement; // Ref for game over dialog
  private gameOverTitle!: HTMLElement; // Ref for game over title
  private gameOverMessage!: HTMLElement; // Ref for game over message
  private gameOverResultInfoElement!: HTMLElement; // Ref for the result info display
  private playAgainButton!: HTMLButtonElement; // Ref for play again button in dialog
  private shareResultButton!: HTMLButtonElement; // Ref for the new share button
  private audioManager: AudioManager; // Audio Manager instance

  // --- Settings State ---
  private showOrbitGraphic: boolean = true;
  private showBackground: boolean = true;
  private soundEnabled: boolean = false;
  // Debugging state is already present: private debugging: boolean = false;

  private isMenuOpen: boolean = false; // Track settings menu state
  private isCreditsOpen: boolean = false; // Track credits section state
  private playing: boolean = false;
  private paused: boolean = false; // Pause state flag
  private duration: number = 0;
  private frameCount: number = 0;
  private timeLastFrame: number = 0;
  private timeLastSecond: number = 0;
  private timeGameStart: number = 0;
  private timeDelta: number = 0;
  private timeFactor: number = 1;
  private fps: number = 0;
  private fpsMin: number = 1000;
  private fpsMax: number = 0;
  private framesThisSecond: number = 0;

  private enemies: Enemy[] = [];
  public player!: Player; // CHANGE private to public
  private sunEnemy: Enemy | null = null;
  private playerDistToSunSq: number = 0;

  public world: World = {
    width: this.DEFAULT_WIDTH,
    height: this.DEFAULT_HEIGHT,
  };
  private notifications: Notification[] = [];
  private thrustParticles: ThrustParticle[] = []; // Active particles
  private particlePool: ObjectPool<ThrustParticle>; // Particle pool (Improvement: Pooling)
  private explosionParticles: ExplosionParticle[] = []; // Active explosion particles
  private explosionParticlePool: ObjectPool<ExplosionParticle>; // Pool for explosions
  private readonly EXPLOSION_PARTICLE_POOL_INITIAL_SIZE: number = 150;
  private readonly EXPLOSION_PARTICLE_COUNT_MIN = 8;
  private readonly EXPLOSION_PARTICLE_COUNT_MAX = 15;
  private readonly EXPLOSION_PARTICLE_SPEED_MIN = 1.5;
  private readonly EXPLOSION_PARTICLE_SPEED_MAX = 4.0;
  private readonly EXPLOSION_PARTICLE_SIZE_MIN = 2;
  private readonly EXPLOSION_PARTICLE_SIZE_MAX = 5;
  private readonly EXPLOSION_PARTICLE_DECAY_MIN = 0.03;
  private readonly EXPLOSION_PARTICLE_DECAY_MAX = 0.06;
  private backgroundStars: {
    x: number;
    y: number;
    speed: number;
    size: number;
  }[] = []; // For parallax background

  private debugging: boolean = false;
  private gameState: GameState = GameState.WELCOME; // Use Enum
  private gameTimer: number = 60; // Configurable game param
  private gameMode: string = "survival";
  private victoryScore: number = 300; // Configurable game param
  private powerUps: PowerUp[] = [];
  private powerUpTypes = PowerUpType; // Use Enum
  private activePowerUps: Map<PowerUpType, number> = new Map(); // type -> endTime
  private lastPowerUpSpawn: number = 0;

  private timeLastEnemySpawn: number = 0;
  private currentEnemySpawnInterval: number = this.ENEMY_SPAWN_INTERVAL_MS_BASE;
  private currentEnemySpeedFactor: number = 1.0; // For difficulty scaling

  private highScore: number = 0; // High score state (for the current mode)

  // Logical game area (center square) - Made public for Enemy access
  public logicalWidth: number = this.DEFAULT_WIDTH;
  public logicalHeight: number = this.DEFAULT_HEIGHT;
  public logicalCenterX: number = this.DEFAULT_WIDTH / 2;
  public logicalCenterY: number = this.DEFAULT_HEIGHT / 2;

  // Screen Shake state
  private shakeEndTime: number = 0;
  private currentShakeIntensity: number = 0;

  // Analytics instance
  private analytics: Analytics;

  // Device type check
  private isLikelyMobile: boolean = false;

  // Use getter for dynamic calculation based on world size
  private get sunBaseRadius(): number {
    return this.ENEMY_SIZE * this.SUN_SIZE_MULTIPLIER;
  }
  private get sunDangerRadius(): number {
    // Base danger radius on the logical gameplay area size
    const logicalMinDimension = Math.min(this.logicalWidth, this.logicalHeight);
    return (
      this.sunBaseRadius + logicalMinDimension * this.SUN_DANGER_RADIUS_FACTOR
    );
  }
  private get maxPlayerRadius(): number {
    // Base max radius on the logical gameplay area size
    return this.logicalWidth / 2 - 20; // Assuming logicalWidth = logicalHeight
  }
  private get isInputDown(): boolean {
    return this.mouse.down || this.keyboardThrust;
  } // Combined input check

  constructor() {
    this.timeLastFrame = Date.now();
    this.timeLastSecond = Date.now();
    this.lastPowerUpSpawn = Date.now();
    this.timeLastEnemySpawn = Date.now();

    // Initialize Particle Pool (Improvement: Pooling)
    this.particlePool = new ObjectPool<ThrustParticle>(
      () => new ThrustParticle(0, 0, 0, 1, 1, 1, 0.01), // Factory function
      this.THRUST_PARTICLE_POOL_INITIAL_SIZE
    );

    // Initialize Explosion Particle Pool
    this.explosionParticlePool = new ObjectPool<ExplosionParticle>(
      () => new ExplosionParticle(), // Factory function
      this.EXPLOSION_PARTICLE_POOL_INITIAL_SIZE
    );

    // Initialize Projectile Pool
    this.projectilePool = new ObjectPool<Projectile>(
      () => new Projectile(), // Factory function
      this.PROJECTILE_POOL_INITIAL_SIZE
    );

    // Initialize Audio Manager
    this.audioManager = new AudioManager();
    this.audioManager.load(); // Trigger loading (async usually)

    // Initialize Analytics
    this.analytics = new Analytics();

    // Check for mobile device (basic touch detection)
    this.isLikelyMobile = navigator.maxTouchPoints > 0;
    console.log(`Is likely mobile device: ${this.isLikelyMobile}`);

    this.initialize();
  }

  // Helper to get the mode-specific high score key
  private getHighScoreKey(): string {
    return `${this.HIGH_SCORE_KEY_BASE}_${this.gameMode}`;
  }

  private initialize(): void {
    this.container = document.getElementById("game") as HTMLElement;
    this.canvas = document.querySelector("#world") as HTMLCanvasElement;

    if (!(this.container && this.canvas && this.canvas.getContext)) {
      alert("Initialization failed: Cannot find required elements.");
      return;
    }
    this.context = this.canvas.getContext("2d") as CanvasRenderingContext2D;

    // Load High Score for the default mode (Improvement)
    this.loadHighScore();

    // --- Button Creation ---
    this.startButton = document.createElement("button");
    this.startButton.id = "start-button";
    this.startButton.classList.add("start-button");
    this.container.appendChild(this.startButton);
    this.startButton.addEventListener(
      "click",
      this.onStartButtonClick.bind(this)
    );
    this.startButton.addEventListener(
      "touchend",
      (e) => {
        e.preventDefault();
        this.onStartButtonClick(e);
      },
      { passive: false }
    );

    this.settingsButton = document.createElement("button");
    this.settingsButton.id = "settings-button";
    this.settingsButton.classList.add("settings-button");
    this.container.appendChild(this.settingsButton);
    this.settingsButton.addEventListener(
      "click",
      this.onSettingsButtonClick.bind(this) // Keep this for opening
    );
    this.settingsButton.addEventListener(
      "touchstart",
      this.onSettingsButtonClick.bind(this), // Keep this for opening
      { passive: false }
    );

    // --- Menu Elements & Listeners ---
    this.settingsMenu = document.getElementById("settings-menu") as HTMLElement;
    this.closeMenuButton = document.getElementById(
      "close-menu-button"
    ) as HTMLButtonElement;
    this.debugToggleButton = document.getElementById(
      "debug-toggle"
    ) as HTMLButtonElement;
    this.orbitToggleButton = document.getElementById(
      "orbit-toggle"
    ) as HTMLButtonElement;
    this.backgroundToggleButton = document.getElementById(
      "background-toggle"
    ) as HTMLButtonElement;
    this.soundToggleButton = document.getElementById(
      "sound-toggle"
    ) as HTMLButtonElement;
    this.modeToggleButton = document.getElementById(
      "mode-toggle"
    ) as HTMLButtonElement; // Add this

    if (
      !this.settingsMenu ||
      !this.closeMenuButton ||
      !this.debugToggleButton ||
      !this.orbitToggleButton ||
      !this.backgroundToggleButton ||
      !this.soundToggleButton ||
      !this.modeToggleButton
    ) {
      // Add modeToggleButton here
      console.error("Failed to find all settings menu elements!");
      // Handle error appropriately, maybe disable settings button?
    } else {
      // Close Button
      this.closeMenuButton.addEventListener("click", (e: Event) => {
        e.preventDefault();
        this.closeSettingsMenu(); // Correct function for closing settings
      });
      this.closeMenuButton.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          this.closeSettingsMenu();
        },
        { passive: false }
      );

      // Toggle Buttons
      this.debugToggleButton.addEventListener(
        "click",
        this.toggleDebugMode.bind(this)
      );
      this.debugToggleButton.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          this.toggleDebugMode();
        },
        { passive: false }
      );

      this.orbitToggleButton.addEventListener(
        "click",
        this.toggleShowOrbit.bind(this)
      );
      this.orbitToggleButton.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          this.toggleShowOrbit();
        },
        { passive: false }
      );

      this.backgroundToggleButton.addEventListener(
        "click",
        this.toggleShowBackground.bind(this)
      );
      this.backgroundToggleButton.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          this.toggleShowBackground();
        },
        { passive: false }
      );

      this.soundToggleButton.addEventListener(
        "click",
        this.toggleSoundEnabled.bind(this)
      );
      this.soundToggleButton.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          this.toggleSoundEnabled();
        },
        { passive: false }
      );

      this.modeToggleButton.addEventListener(
        "click",
        this.toggleGameModeSetting.bind(this)
      ); // Add listener
      this.modeToggleButton.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          this.toggleGameModeSetting();
        },
        { passive: false }
      );

      // Initialize visual states
      this.updateDebugToggleVisual();
      this.updateOrbitToggleVisual();
      this.updateBackgroundToggleVisual();
      this.updateSoundToggleVisual();
      this.updateModeToggleVisual(); // Initialize mode button state

      // --- Credits Button Listener ---
      this.creditsButton = document.getElementById(
        "credits-button"
      ) as HTMLButtonElement;
      this.creditsSection = document.getElementById(
        "credits-section"
      ) as HTMLElement;
      this.closeCreditsButton = document.getElementById(
        "close-credits-button"
      ) as HTMLButtonElement;

      if (
        this.creditsButton &&
        this.creditsSection &&
        this.closeCreditsButton
      ) {
        this.creditsButton.addEventListener(
          "click",
          this.openCredits.bind(this)
        );
        this.creditsButton.addEventListener(
          "touchstart",
          (e) => {
            e.preventDefault();
            this.openCredits();
          },
          { passive: false }
        );

        this.closeCreditsButton.addEventListener("click", (e: Event) => {
          e.preventDefault();
          this.closeCredits(true);
        });
        this.closeCreditsButton.addEventListener(
          "touchstart",
          (e) => {
            e.preventDefault();
            this.closeCredits();
          },
          { passive: false }
        );
      } else {
        console.error("Failed to find credits elements!");
      }
    }

    // --- Game Over Dialog Elements & Listener ---
    this.gameOverDialog = document.getElementById(
      "game-over-dialog"
    ) as HTMLElement;
    this.gameOverTitle = document.getElementById(
      "game-over-title"
    ) as HTMLElement;
    this.gameOverMessage = document.getElementById(
      "game-over-message"
    ) as HTMLElement;
    this.gameOverResultInfoElement = document.getElementById(
      "game-over-result-info"
    ) as HTMLElement; // Get the new element
    this.playAgainButton = document.getElementById(
      "play-again-button"
    ) as HTMLButtonElement;
    this.shareResultButton = document.getElementById(
      "share-result-button"
    ) as HTMLButtonElement; // Get the share button

    if (
      !this.gameOverDialog ||
      !this.gameOverTitle ||
      !this.gameOverMessage ||
      !this.gameOverResultInfoElement || // Check the new element
      !this.playAgainButton ||
      !this.shareResultButton // Check the share button
    ) {
      console.error("Failed to find all game over dialog elements!");
    } else {
      // Play Again Button Listeners
      this.playAgainButton.addEventListener(
        "click",
        this.onPlayAgainButtonClick.bind(this)
      );
      this.playAgainButton.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          this.onPlayAgainButtonClick(e);
        },
        { passive: false }
      );

      // Share Button Listeners
      this.shareResultButton.addEventListener(
        "click",
        this.onShareResultButtonClick.bind(this)
      );
      this.shareResultButton.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          this.onShareResultButtonClick(e);
        },
        { passive: false }
      );
    }

    // --- Other Event Listeners ---
    document.addEventListener(
      "keydown",
      this.onKeyDownHandler.bind(this),
      false
    );
    document.addEventListener("keyup", this.onKeyUpHandler.bind(this), false); // Need keyup for keyboard thrust
    document.addEventListener(
      "mousedown",
      this.onMouseDownHandler.bind(this),
      false
    );
    document.addEventListener(
      "mousemove",
      this.onMouseMoveHandler.bind(this),
      false
    );
    document.addEventListener(
      "mouseup",
      this.onMouseUpHandler.bind(this),
      false
    );
    document.addEventListener(
      "touchstart",
      this.onTouchStartHandler.bind(this),
      { passive: false }
    );
    document.addEventListener("touchmove", this.onTouchMoveHandler.bind(this), {
      passive: false,
    });
    document.addEventListener("touchend", this.onTouchEndHandler.bind(this), {
      passive: false,
    });
    window.addEventListener(
      "resize",
      this.onWindowResizeHandler.bind(this),
      false
    );
    // Handle Pause on window blur (Improvement)
    window.addEventListener("blur", () => {
      if (this.playing && !this.paused) this.togglePause();
    });

    // --- Initial Setup ---
    this.onWindowResizeHandler();
    this.createSprites();
    this.setGameState(GameState.WELCOME); // Use Enum

    // Init Background Stars (Improvement)
    this.createBackgroundStars(100);

    this.reset();
    this.update();
  }

  private setGameState(newState: GameState): void {
    // Optional: Add logic here for state transitions (e.g., stop music on welcome)
    if (newState === GameState.PLAYING && this.gameState !== GameState.PAUSED) {
      // Reset timers only when starting fresh, not unpausing
      this.timeGameStart = Date.now() - this.duration * 1000; // Adjust start time based on current duration
      this.timeLastFrame = Date.now(); // Prevent large delta jump after pause/welcome
    }

    // Close menus/dialogs if transitioning to playing state
    if (newState === GameState.PLAYING) {
      if (this.isMenuOpen) this.closeSettingsMenu(false);
      if (this.isCreditsOpen) this.closeCredits(false);
      this.gameOverDialog?.classList.add("hidden"); // Hide game over dialog
    }
    // Hide game over dialog if moving away from end states
    else if (newState !== GameState.LOSER && newState !== GameState.WINNER) {
      this.gameOverDialog?.classList.add("hidden");
    }

    this.gameState = newState;
    document.body.className = newState.toString(); // Use enum value for class name
  }

  // Opens the settings menu and pauses the game
  private openSettingsMenu(): void {
    if (this.isMenuOpen || this.isCreditsOpen) return; // Don't open if already open or credits are open

    this.isMenuOpen = true;
    this.settingsMenu.classList.remove("hidden");
    this.startButton.style.display = "none"; // Hide start button if visible

    // Pause the game only if it's currently playing
    if (this.gameState === GameState.PLAYING) {
      this.paused = true; // Set paused flag
      this.setGameState(GameState.PAUSED); // Update game state
    }
    // No need to explicitly call togglePause here, handled by state change
    // No need to explicitly call togglePause here, handled by state change
  }

  // Closes the settings menu and potentially unpauses the game
  private closeSettingsMenu(unpauseGame: boolean = true): void {
    if (!this.isMenuOpen) return; // Already closed

    this.isMenuOpen = false;
    this.settingsMenu.classList.add("hidden");
    // Only show start button if game isn't playing/paused
    if (
      this.gameState === GameState.WELCOME ||
      this.gameState === GameState.LOSER ||
      this.gameState === GameState.WINNER
    ) {
      this.startButton.style.display = ""; // Allow CSS to control visibility again
    }

    // Unpause the game only if it was paused *because* of the menu AND unpauseGame is true
    if (unpauseGame && this.paused && this.gameState === GameState.PAUSED) {
      // Check if the game *should* be playing (i.e., wasn't paused by 'P' before menu)
      // This logic might need refinement depending on exact pause interactions desired.
      // For now, assume closing menu always attempts to resume if game was playing before.
      this.paused = false; // Clear paused flag
      this.setGameState(GameState.PLAYING); // Set back to playing
      this.timeLastFrame = Date.now(); // Adjust time
    }
  }

  // --- New Credits Section Handling ---

  private openCredits(): void {
    if (this.isCreditsOpen) return; // Already open

    // Close settings menu first without unpausing
    if (this.isMenuOpen) {
      this.closeSettingsMenu(false);
    }

    this.isCreditsOpen = true;
    this.creditsSection.classList.remove("hidden");

    // Ensure game remains paused if it was paused
    if (
      this.gameState === GameState.PLAYING ||
      this.gameState === GameState.PAUSED
    ) {
      if (!this.paused) {
        // Pause if it wasn't already paused
        this.paused = true;
        this.setGameState(GameState.PAUSED);
      }
    }
  }

  private closeCredits(showSettings: boolean = true): void {
    if (!this.isCreditsOpen) return; // Already closed

    this.isCreditsOpen = false;
    this.creditsSection.classList.add("hidden");

    // Optionally reopen the settings menu
    if (showSettings) {
      this.openSettingsMenu();
    } else {
      // If not showing settings, potentially unpause (similar logic to closeSettingsMenu)
      if (this.paused && this.gameState === GameState.PAUSED) {
        this.paused = false;
        this.setGameState(GameState.PLAYING);
        this.timeLastFrame = Date.now();
      }
    }
  }

  // Add this new method after closeCredits
  private toggleSettingsMenu(): void {
    if (this.isCreditsOpen) {
      this.closeCredits(true); // Close credits and show settings
    } else if (this.isMenuOpen) {
      this.closeSettingsMenu(); // Close settings (potentially unpauses)
    } else {
      this.openSettingsMenu(); // Open settings (pauses if playing)
    }
  }

  // Add this new method after closeSettingsMenu
  public togglePause(): void {
    if (!this.playing) return; // Can't pause if not playing

    this.paused = !this.paused; // Toggle pause state
    this.setGameState(this.paused ? GameState.PAUSED : GameState.PLAYING); // Update game state
    this.timeLastFrame = Date.now(); // Adjust time to prevent jump
  }

  // Handles clicking the main settings button (cog icon)
  private onSettingsButtonClick(e: Event): void {
    e.preventDefault();
    e.stopPropagation();
    // This button now *only* opens the menu
    this.openSettingsMenu();
  }

  // Toggles the debug state (called by the button inside the menu)
  private toggleDebugMode(): void {
    this.debugging = !this.debugging;
    this.updateDebugToggleVisual(); // Update button appearance
    console.log(`Debug mode: ${this.debugging ? "ON" : "OFF"}`);
    this.analytics.track("settings_changed", {
      setting_name: "debug",
      new_value: this.debugging,
    });
  }

  // Updates the visual state of the debug toggle button
  private updateDebugToggleVisual(): void {
    if (this.debugToggleButton) {
      this.debugToggleButton.setAttribute(
        "aria-pressed",
        this.debugging.toString()
      );
    }
    // Also update the main settings button visual cue (pulsing color)
    this.settingsButton.classList.toggle(
      "settings-button--debugging",
      this.debugging
    );
  }

  // --- New Toggle Handlers ---

  private toggleShowOrbit(): void {
    this.showOrbitGraphic = !this.showOrbitGraphic;
    this.updateOrbitToggleVisual();
    console.log(`Show Orbit Graphic: ${this.showOrbitGraphic}`);
    this.analytics.track("settings_changed", {
      setting_name: "orbit",
      new_value: this.showOrbitGraphic,
    });
  }

  private updateOrbitToggleVisual(): void {
    if (this.orbitToggleButton) {
      this.orbitToggleButton.setAttribute(
        "aria-pressed",
        this.showOrbitGraphic.toString()
      );
    }
  }

  private toggleShowBackground(): void {
    this.showBackground = !this.showBackground;
    this.updateBackgroundToggleVisual();
    console.log(`Show Background: ${this.showBackground}`);
    this.analytics.track("settings_changed", {
      setting_name: "background",
      new_value: this.showBackground,
    });
  }

  private updateBackgroundToggleVisual(): void {
    if (this.backgroundToggleButton) {
      this.backgroundToggleButton.setAttribute(
        "aria-pressed",
        this.showBackground.toString()
      );
    }
  }

  private toggleSoundEnabled(): void {
    this.soundEnabled = !this.soundEnabled;
    this.updateSoundToggleVisual();
    this.audioManager.mute(!this.soundEnabled); // Mute if sound is NOT enabled
    if (this.soundEnabled) {
      this.audioManager.playMusic();
    } else {
      this.audioManager.stopMusic();
    }
    console.log(`Sound Enabled: ${this.soundEnabled}`);
    this.analytics.track("settings_changed", {
      setting_name: "sound",
      new_value: this.soundEnabled,
    });
  }

  private updateSoundToggleVisual(): void {
    if (this.soundToggleButton) {
      this.soundToggleButton.setAttribute(
        "aria-pressed",
        this.soundEnabled.toString()
      );
    }
  }

  // Add this method after updateSoundToggleVisual
  private toggleGameModeSetting(): void {
    // Only allow changing mode if the game is not actively playing
    if (this.playing || this.paused) {
      console.log("Cannot change game mode while playing or paused.");
      // Optionally provide visual feedback (e.g., shake the button briefly)
      return;
    }

    this.gameMode = this.gameMode === "survival" ? "score" : "survival";
    this.updateModeToggleVisual(); // Update button text
    this.notifyGameMode(); // Show notification
    console.log(`Game mode changed to: ${this.gameMode}`);
    this.analytics.track("mode_changed", { new_mode: this.gameMode });
    this.loadHighScore(); // Load the high score for the newly selected mode
  }

  // Add this method after toggleGameModeSetting
  private updateModeToggleVisual(): void {
    if (!this.modeToggleButton) return;

    const isGameActive = this.playing || this.paused;
    this.modeToggleButton.disabled = isGameActive; // Disable if playing or paused

    // Update text based on current mode
    const modeText = this.gameMode === "survival" ? "Survival" : "Score";
    this.modeToggleButton.textContent = `${modeText}`;

    // Optional: Add/remove a class for styling disabled state if needed
    this.modeToggleButton.classList.toggle("disabled", isGameActive);
  }

  // --- Input Handlers ---

  private onKeyDownHandler(e: KeyboardEvent): void {
    // Restart game
    if (
      (e.key === "r" || e.key === "R") &&
      (this.gameState === GameState.WINNER ||
        this.gameState === GameState.LOSER) &&
      !this.isMenuOpen && // Only restart if menus aren't open
      !this.isCreditsOpen
    ) {
      // Simulate clicking the *new* play again button
      this.onPlayAgainButtonClick(new MouseEvent("click"));
    }
    // Toggle game mode (only when not playing)
    else if ((e.key === "m" || e.key === "M") && !this.playing) {
      this.gameMode = this.gameMode === "survival" ? "score" : "survival";
      this.notifyGameMode();
      this.loadHighScore(); // Load the high score for the new mode
      this.analytics.track("mode_changed", { new_mode: this.gameMode });
    }
    // Toggle debugging
    else if ((e.key === "d" || e.key === "D") && !this.isMenuOpen) {
      // Only toggle if menu isn't open
      this.toggleDebugMode();
    }
    // Toggle Settings Menu / Pause
    else if (e.key === "p" || e.key === "P") {
      // Allow toggling menu/pause if playing or already paused
      if (
        this.gameState === GameState.PLAYING ||
        this.gameState === GameState.PAUSED
      ) {
        this.toggleSettingsMenu();
      }
    }
    // Close Menu/Credits with Escape key
    else if (e.key === "Escape") {
      if (this.isCreditsOpen) {
        this.closeCredits(true); // Close credits, show settings
      } else if (this.isMenuOpen) {
        this.closeSettingsMenu(); // Close settings, potentially unpause
      }
    }
    // Keyboard Thrust (Improvement) - Only works if neither menu is open
    else if (e.key === " " && !this.isMenuOpen && !this.isCreditsOpen) {
      // Check !isMenuOpen and !isCreditsOpen
      // Spacebar
      if (!this.keyboardThrust) {
        // Prevent repeated triggers while holding
        this.keyboardThrust = true;
        // Optional: Trigger sound immediately on press
        // Check playing and !paused (implicitly covers !isMenuOpen check again, but safe)
        if (this.playing && !this.paused)
          this.audioManager.playSound("thrust", 0.5);
      }
    }
    // Start Game with 'I' - Only if not already playing/paused and menus closed
    else if (
      (e.key === "i" || e.key === "I") &&
      !this.playing &&
      !this.paused &&
      !this.isMenuOpen &&
      !this.isCreditsOpen
    ) {
      // Simulate start button click if in a state where starting is possible
      if (
        this.gameState === GameState.WELCOME ||
        this.gameState === GameState.LOSER ||
        this.gameState === GameState.WINNER
      )
        this.onStartButtonClick(new MouseEvent("click"));
    }
  }

  // Need KeyUp for Keyboard Thrust (Improvement)
  private onKeyUpHandler(e: KeyboardEvent): void {
    if (e.key === " ") {
      // Spacebar
      this.keyboardThrust = false;
    }
  }

  private notifyGameMode(): void {
    const text =
      this.gameMode === "survival"
        ? `SURVIVAL MODE: ${this.gameTimer}s`
        : `SCORE MODE: ${this.victoryScore} PTS`;
    const color =
      this.gameMode === "survival" ? [50, 200, 255] : [255, 200, 50];
    // Notify near the logical center, slightly above
    this.notify(
      text,
      this.logicalCenterX,
      this.logicalCenterY - this.logicalHeight * 0.1, // Position relative to logical center/height
      1.5,
      color
    );
  }

  private createSprites(): void {
    // Enemy Sprite
    let cvsEnemy = document.createElement("canvas");
    cvsEnemy.width = 48;
    cvsEnemy.height = 48;
    let ctxEnemy = cvsEnemy.getContext("2d")!;
    ctxEnemy.arc(24, 24, this.ENEMY_SIZE, 0, Math.PI * 2);
    ctxEnemy.fillStyle = "rgba(0, 200, 220, 0.9)";
    ctxEnemy.shadowColor = "rgba(0, 240, 255, 0.9)";
    ctxEnemy.shadowBlur = 15;
    ctxEnemy.fill();
    this.sprites.enemy = cvsEnemy;

    // Player Sprite (Fix 1: Appearance)
    let cvsPlayer = document.createElement("canvas");
    cvsPlayer.width = 64;
    cvsPlayer.height = 64;
    let ctxPlayer = cvsPlayer.getContext("2d")!;
    ctxPlayer.translate(32, 32);
    ctxPlayer.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctxPlayer.shadowColor = "rgba(200, 220, 255, 0.8)";
    ctxPlayer.shadowBlur = 15;
    ctxPlayer.lineWidth = 2;
    ctxPlayer.lineJoin = "round";
    const shipLength = 20 * this.PLAYER_SPRITE_SCALE;
    const shipWidth = 15 * this.PLAYER_SPRITE_SCALE;
    ctxPlayer.beginPath();
    ctxPlayer.moveTo(shipLength * 0.6, 0);
    ctxPlayer.lineTo(-shipLength * 0.4, shipWidth * 0.5);
    ctxPlayer.lineTo(-shipLength * 0.3, 0);
    ctxPlayer.lineTo(-shipLength * 0.4, -shipWidth * 0.5);
    ctxPlayer.closePath();
    ctxPlayer.fill();
    ctxPlayer.setTransform(1, 0, 0, 1, 0, 0);
    this.sprites.playerSprite = cvsPlayer;

    // Sun Enemy Sprite
    let cvsSun = document.createElement("canvas");
    // Increase canvas size to accommodate the glow/shadow
    cvsSun.width = 96; // Increased from 64
    cvsSun.height = 96; // Increased from 64
    let ctxSun = cvsSun.getContext("2d")!;
    // Translate to the center of the larger canvas
    ctxSun.translate(48, 48); // Center point of 96x96
    // Draw the arc centered in the larger canvas
    ctxSun.arc(0, 0, this.sunBaseRadius, 0, Math.PI * 2); // Draw at (0,0) after translate
    ctxSun.fillStyle = "rgba(250, 50, 50, 1)";
    ctxSun.shadowColor = "rgba(250, 20, 20, 0.9)";
    // Increase shadow blur slightly if needed, ensure it fits within 96x96
    ctxSun.shadowBlur = 25; // Increased from 20
    ctxSun.fill();
    // Reset transform before assigning to sprite
    ctxSun.setTransform(1, 0, 0, 1, 0, 0);
    this.sprites.enemySun = cvsSun;

    // Shooter Enemy Sprite (Example: Diamond shape)
    let cvsShooter = document.createElement("canvas");
    cvsShooter.width = 48;
    cvsShooter.height = 48;
    let ctxShooter = cvsShooter.getContext("2d")!;
    ctxShooter.translate(24, 24);
    ctxShooter.fillStyle = "rgba(255, 100, 0, 0.9)"; // Orange color
    ctxShooter.shadowColor = "rgba(255, 150, 50, 0.9)";
    ctxShooter.shadowBlur = 15;
    ctxShooter.lineWidth = 1.5;
    ctxShooter.lineJoin = "miter";
    const shooterSize = this.ENEMY_SIZE * 1.2; // Slightly larger
    ctxShooter.beginPath();
    ctxShooter.moveTo(0, -shooterSize); // Top point
    ctxShooter.lineTo(shooterSize * 0.8, 0); // Right point
    ctxShooter.lineTo(0, shooterSize * 0.6); // Bottom point (blunter)
    ctxShooter.lineTo(-shooterSize * 0.8, 0); // Left point
    ctxShooter.closePath();
    ctxShooter.fill();
    ctxShooter.setTransform(1, 0, 0, 1, 0, 0);
    this.sprites.shooterSprite = cvsShooter;
  }

  private onStartButtonClick(e: Event): void {
    e.preventDefault();
    if (
      this.gameState === GameState.LOSER ||
      this.gameState === GameState.WINNER
    ) {
      this.reset(); // Full reset if coming from game over
    } else if (this.gameState === GameState.PAUSED) {
      this.togglePause(); // Unpause if paused
      return; // Don't reset stats if unpausing
    } else if (this.playing) {
      return; // Already playing, do nothing
    }

    // If starting from Welcome state
    this.resetGameStats(); // Reset scores/timers for a fresh round
    this.player.alive = true;
    this.updateModeToggleVisual(); // Disable mode toggle
    this.playing = true; // Set playing flag
    // Set state calls playMusic and adjusts timers
    this.setGameState(GameState.PLAYING);
    this.notifyGameMode();
    this.analytics.track("game_start", { game_mode: this.gameMode });
  }

  // Resets everything for a completely new game session
  private reset(): void {
    this.enemies = [];
    this.thrustParticles = []; // Clear active particles
    // Return active particles to pool (Improvement: Pooling)
    // Note: This assumes particles are correctly returned on death in update loop
    // If not, loop here: this.thrustParticles.forEach(p => this.particlePool.release(p));
    this.notifications = [];
    this.powerUps = [];
    this.activePowerUps.clear();
    this.projectiles.forEach((p) => this.projectilePool.release(p));
    this.projectiles = [];

    // Initial player position based on logical center
    this.player = new Player(
      this.logicalCenterX + this.PLAYER_START_RADIUS,
      this.logicalCenterY,
      this.PLAYER_START_RADIUS,
      this.PLAYER_COLLISION_RADIUS
    );
    this.player.angle = 0;

    this.sunEnemy = new Enemy(EnemyType.SUN); // Pass type
    // Position sun at the logical center
    this.sunEnemy.x = this.logicalCenterX;
    this.sunEnemy.y = this.logicalCenterY;
    this.sunEnemy.collisionRadius = this.sunBaseRadius;
    this.sunEnemy.scale = 1;
    this.sunEnemy.alpha = 1;
    this.sunEnemy.scaleTarget = 1;
    this.sunEnemy.alphaTarget = 1;
    this.sunEnemy.alive = true;
    this.enemies.push(this.sunEnemy);

    this.resetGameStats(); // Reset scores, timers, spawn rate etc.

    this.setGameState(GameState.WELCOME);
    this.updateModeToggleVisual(); // Ensure mode toggle is enabled
    this.loadHighScore(); // Load high score for the current mode after reset
    this.startButton.textContent = "INITIALIZE";
    this.gameOverDialog?.classList.add("hidden"); // Ensure dialog is hidden on full reset
  }

  // Resets only the elements needed for restarting a round
  private resetGameStats(): void {
    this.playing = false; // Not playing yet
    this.paused = false; // Not paused
    this.duration = 0;
    if (this.player) {
      this.player.score = 0;
      this.player.alive = false;
      this.player.shielded = false;
      this.player.scoreMultiplier = 1;
      this.player.magnetActive = false;
      this.player.gravityReversed = false;
      this.player.slowTimeActive = false;
      this.player.interactionDelta = -0.1;
      this.player.radius = this.PLAYER_START_RADIUS;
    }
    this.powerUps = [];
    this.activePowerUps.clear();
    this.lastPowerUpSpawn = Date.now();
    this.timeLastEnemySpawn = Date.now();
    this.currentEnemySpawnInterval = this.ENEMY_SPAWN_INTERVAL_MS_BASE;
    this.currentEnemySpeedFactor = 1.0; // Reset speed factor
    this.timeFactor = 1;
    this.shakeEndTime = 0; // Reset shake
    this.notifications = this.notifications.filter(() => false); // Clear transient notifications
    // Clear active non-sun enemies
    this.enemies = this.enemies.filter((e) => e.type === EnemyType.SUN);
    // Return particles to pool (ensure this happens on death too)
    this.thrustParticles.forEach((p) => {
      if (p.alive) this.particlePool.release(p);
    });
    this.thrustParticles = [];
    this.projectiles.forEach((p) => {
      if (p.alive) this.projectilePool.release(p);
    });
    this.projectiles = [];
    this.gameOverDialog?.classList.add("hidden"); // Ensure dialog is hidden on stat reset
  }

  private notify(
    text: string,
    x: number,
    y: number,
    scale: number,
    rgb: number[]
  ): void {
    this.notifications.push(new Notification(text, x, y, scale, rgb));
  }

  // --- High Score Handling (Improvement) ---
  private loadHighScore(): void {
    const key = this.getHighScoreKey(); // Get mode-specific key
    try {
      const storedScore = localStorage.getItem(key);
      this.highScore = storedScore ? parseInt(storedScore, 10) : 0;
      console.log(`Loaded high score for ${this.gameMode}:`, this.highScore);
    } catch (e) {
      console.error(
        `Failed to load high score for ${this.gameMode} from localStorage:`,
        e
      );
      this.highScore = 0;
    }
  }

  private saveHighScore(): void {
    const key = this.getHighScoreKey(); // Get mode-specific key
    if (this.player.score > this.highScore) {
      this.highScore = this.player.score;
      try {
        localStorage.setItem(key, this.highScore.toString());
        console.log(
          `Saved new high score for ${this.gameMode}:`,
          this.highScore
        );
        // Track high score achievement, include mode
        this.analytics.track("high_score_achieved", {
          game_mode: this.gameMode,
          high_score: this.highScore,
        });
      } catch (e) {
        console.error(
          `Failed to save high score for ${this.gameMode} to localStorage:`,
          e
        );
      }
    }
  }

  private createBackgroundStars(count: number): void {
    this.backgroundStars = [];

    // // Simpler approach - place stars directly in random positions
    for (let i = 0; i < count; i++) {
      // Generate stars across the full canvas width/height
      this.backgroundStars.push({
        x: Math.random() * this.world.width, // Use full world width
        y: Math.random() * this.world.height, // Use full world height
        speed: 0.1 + Math.random() * 0.4,
        size: Math.random() < 0.3 ? 2 : 1,
      });
    }
  }

  private updateBackgroundStars(): void {
    // Basic horizontal scroll based on time/player angle?
    const scrollSpeed = 0.1 * this.timeFactor;
    // Update stars across the full canvas width
    this.backgroundStars.forEach((star) => {
      star.x -= star.speed * scrollSpeed;
      if (star.x < 0) star.x += this.world.width; // Wrap around full width
      // Optional: Add vertical movement or link to player orbit direction
    });
  }

  private renderBackground(): void {
    if (!this.showBackground) return; // Skip rendering if disabled

    this.context.save();
    this.context.shadowBlur = 1; // Add subtle blur
    this.context.shadowColor = "rgba(255, 255, 255, 0.5)";
    // Change: Use fully opaque white as the base color
    this.context.fillStyle = "rgba(255, 255, 255, 1)";
    this.backgroundStars.forEach((star) => {
      const alpha = star.speed * 1.5; // Alpha based on speed (keep this calculation)
      const size = star.size; // Use star's size
      // Change: Increase the maximum alpha slightly
      this.context.globalAlpha = Math.min(0.8, alpha); // Increased cap from 0.7 to 0.8
      this.context.fillRect(Math.round(star.x), Math.round(star.y), size, size);
    });
    this.context.restore();
  }

  // --- Input Handlers ---
  private onMouseDownHandler(event: MouseEvent): void {
    // Prevent activating thrust if clicking inside the menu/credits or on any button
    const targetElement = event.target as HTMLElement;
    if (
      !targetElement.closest("button") &&
      !targetElement.closest(".settings-menu") &&
      !targetElement.closest(".credits-section") // Also check credits section
    ) {
      this.mouse.down = true;
    }
  }
  // Removed duplicate/incorrect onMouseMoveHandler
  private onMouseMoveHandler(event: MouseEvent): void {
    // Keep the simple preventDefault version
    event.preventDefault();
  }
  private onMouseUpHandler(event: MouseEvent): void {
    event.preventDefault();
    this.mouse.down = false;
  }
  private onTouchStartHandler(event: TouchEvent): void {
    // Prevent activating thrust if touching inside the menu or on any button
    const targetElement = event.target as HTMLElement;
    // Check if the target or any parent is the link
    if (targetElement.closest("a")) {
      return; // Do nothing, allow default link behavior
    }
    if (
      !targetElement.closest("button") &&
      !targetElement.closest(".settings-menu") &&
      !targetElement.closest(".credits-section")
    ) {
      event.preventDefault();
      this.mouse.down = true;
    }
  }
  private onTouchMoveHandler(event: TouchEvent): void {
    if (this.playing) event.preventDefault();
    if (event.touches.length > 0) this.mouse.down = true;
  }
  private onTouchEndHandler(event: TouchEvent): void {
    const targetElement = event.target as HTMLElement;
    // Allow link taps
    if (targetElement.closest("a")) {
      return;
    }
    if (event.touches.length === 0) {
      if (
        event.target === this.canvas ||
        this.container.contains(event.target as Node)
      )
        event.preventDefault();
      this.mouse.down = false;
    }
  }

  // --- Update Logic ---

  private updatePlayer(): void {
    // Use logical center for player orbit calculations
    const centerX: number = this.logicalCenterX;
    const centerY: number = this.logicalCenterY;

    const dx_sun = this.player.x - centerX; // Distance from logical center
    const dy_sun = this.player.y - centerY; // Distance from logical center
    this.playerDistToSunSq = dx_sun * dx_sun + dy_sun * dy_sun; // Update pre-calc (Improvement 1) - Now relative to logical center

    this.player.slowTimeActive = this.activePowerUps.has(PowerUpType.SLOW_TIME); // Update based on map

    const timeScale = this.player.slowTimeActive ? 0.5 : 1;
    const effectiveTimeFactor = this.timeFactor * timeScale;
    const gravityMult = this.player.gravityReversed ? -1 : 1;
    const pushAcceleration =
      this.PLAYER_BASE_ACCELERATION * effectiveTimeFactor;
    const gravityStrength = this.PLAYER_BASE_GRAVITY * effectiveTimeFactor;

    // Use combined input check (Improvement: Keyboard Input)
    if (this.isInputDown) {
      this.player.interactionDelta = Math.min(
        this.PLAYER_MAX_INTERACTION_DELTA,
        this.player.interactionDelta + pushAcceleration * gravityMult
      );
      if (this.frameCount % 3 === 0) this.createThrustParticle();
      // Play thrust sound (throttled)
      if (this.frameCount % 6 === 0) this.audioManager.playSound("thrust", 0.3);
    } else {
      this.player.interactionDelta = Math.max(
        this.PLAYER_MIN_INTERACTION_DELTA,
        this.player.interactionDelta - gravityStrength * gravityMult
      );
    }

    this.player.radius = Math.max(
      this.PLAYER_MIN_ORBIT_RADIUS,
      Math.min(
        this.maxPlayerRadius,
        this.player.radius + this.player.interactionDelta * effectiveTimeFactor
      )
    );
    const rotationVel: number =
      this.PLAYER_ROTATION_SPEED_FACTOR / Math.max(1, this.player.radius);
    this.player.angle += rotationVel * effectiveTimeFactor;

    this.player.x = centerX + Math.cos(this.player.angle) * this.player.radius;
    this.player.y = centerY + Math.sin(this.player.angle) * this.player.radius;

    const dx =
      -Math.sin(this.player.angle) * rotationVel * this.player.radius +
      Math.cos(this.player.angle) * this.player.interactionDelta;
    const dy =
      Math.cos(this.player.angle) * rotationVel * this.player.radius +
      Math.sin(this.player.angle) * this.player.interactionDelta;
    this.player.spriteAngle = Math.atan2(dy, dx);
  }

  private renderOrbit(): void {
    if (!this.showOrbitGraphic) return; // Skip rendering if disabled

    // Use logical center for orbit rendering
    // Re-added centerX, centerY declarations as they are used here
    const centerX: number = this.logicalCenterX;
    const centerY: number = this.logicalCenterY;

    this.context.save();
    this.context.lineWidth = 1; // Thinner lines for orbit paths

    // Current orbit path
    this.context.beginPath();
    this.context.strokeStyle = "rgba(255, 255, 255, 0.15)"; // Slightly less visible
    this.context.setLineDash([4, 4]);
    this.context.arc(centerX, centerY, this.player.radius, 0, Math.PI * 2);
    this.context.stroke();

    // Max safe orbit
    this.context.beginPath();
    this.context.strokeStyle = "rgba(255, 255, 255, 0.1)"; // Even less visible
    this.context.setLineDash([2, 6]);
    this.context.arc(centerX, centerY, this.maxPlayerRadius, 0, Math.PI * 2);
    this.context.stroke();

    // Danger zone near sun
    this.context.beginPath();
    this.context.fillStyle = "rgba(255, 100, 100, 0.05)"; // Use a fill for the danger zone area
    this.context.arc(centerX, centerY, this.sunDangerRadius, 0, Math.PI * 2);
    this.context.fill();
    this.context.strokeStyle = "rgba(255, 100, 100, 0.25)"; // Keep a faint border
    this.context.setLineDash([]);
    this.context.stroke();

    this.context.restore();
  }

  private updateEnemies(): void {
    const now = Date.now();

    // --- Timer-based Spawning (Improvement 2) ---
    let activeEnemies = this.enemies.length - 1; // Count non-sun enemies

    this.currentEnemySpawnInterval = Math.max(
      this.ENEMY_SPAWN_INTERVAL_MS_MIN,
      this.ENEMY_SPAWN_INTERVAL_MS_BASE -
        this.duration * this.ENEMY_SPAWN_INTERVAL_REDUCTION_PER_SEC
    );
    // Basic speed scaling (Improvement)
    this.currentEnemySpeedFactor =
      1.0 + this.duration * this.ENEMY_SPEED_FACTOR_INCREASE_PER_SEC;

    if (
      activeEnemies < this.MAX_ENEMIES &&
      now - this.timeLastEnemySpawn > this.currentEnemySpawnInterval
    ) {
      const minSpawnRadius =
        this.PLAYER_MIN_ORBIT_RADIUS + this.ENEMY_MIN_SPAWN_RADIUS_OFFSET;
      const maxSpawnRadius =
        this.maxPlayerRadius - this.ENEMY_MAX_SPAWN_RADIUS_OFFSET;

      if (maxSpawnRadius > minSpawnRadius) {
        // Determine enemy type
        let type: EnemyType;
        const rand = Math.random();
        if (rand < this.ENEMY_FAST_CHANCE) {
          type = EnemyType.FAST;
          // Only allow shooters if not in score mode
        } else if (
          this.gameMode !== "score" &&
          rand < this.ENEMY_FAST_CHANCE + this.ENEMY_SHOOTER_CHANCE
        ) {
          type = EnemyType.SHOOTER;
        } else {
          type = EnemyType.NORMAL;
        }

        let enemy = new Enemy(type); // Pass type

        let validPosition = false;
        let attempts = 0;
        const maxAttempts = 10;
        while (!validPosition && attempts < maxAttempts) {
          const spawnRadius =
            minSpawnRadius + Math.random() * (maxSpawnRadius - minSpawnRadius);
          const spawnAngle = Math.random() * Math.PI * 2;
          // Spawn relative to logical center
          enemy.x = this.logicalCenterX + Math.cos(spawnAngle) * spawnRadius;
          enemy.y = this.logicalCenterY + Math.sin(spawnAngle) * spawnRadius;
          const dx_player = enemy.x - this.player.x;
          const dy_player = enemy.y - this.player.y;
          const distSqPlayer = dx_player * dx_player + dy_player * dy_player;
          const minDistPlayerSq =
            this.ENEMY_MIN_DISTANCE_FROM_PLAYER *
            this.ENEMY_MIN_DISTANCE_FROM_PLAYER;

          let overlapsExistingEnemy = false;
          // Check distance from other enemies
          for (const existingEnemy of this.enemies) {
            if (existingEnemy.type === EnemyType.SUN) continue; // Skip sun

            const dx_enemy = enemy.x - existingEnemy.x;
            const dy_enemy = enemy.y - existingEnemy.y;
            const distSqEnemy = dx_enemy * dx_enemy + dy_enemy * dy_enemy;
            // Use a slightly larger buffer than just collision radius to prevent visual overlap
            // Assuming new enemy collision radius is ENEMY_SIZE for this check
            const requiredDist =
              (this.ENEMY_SIZE + existingEnemy.collisionRadius) * 1.2; // Add 20% buffer
            const requiredDistSq = requiredDist * requiredDist;

            if (distSqEnemy < requiredDistSq) {
              overlapsExistingEnemy = true;
              break; // Found an overlap, no need to check further
            }
          }

          // Position is valid if far enough from player AND doesn't overlap existing enemies
          if (distSqPlayer > minDistPlayerSq && !overlapsExistingEnemy) {
            validPosition = true;
          }
          attempts++;
        }

        if (validPosition) {
          enemy.collisionRadius = this.ENEMY_SIZE;
          // Apply speed factor based on type/difficulty
          enemy.speedMultiplier =
            (type === EnemyType.FAST ? 1.5 : 1.0) *
            this.currentEnemySpeedFactor;
          this.enemies.push(enemy);
          this.timeLastEnemySpawn = now;
        }
      }
    }

    // --- Update Existing Enemies using Entity Update (Improvement: Code Structure) ---
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // Call entity's own update method, passing game context for actions like shooting
      enemy.update(this.timeFactor, this); // Pass 'this' here

      if (!enemy.alive) {
        // Check if entity marked itself as dead (e.g., death animation finished)
        this.enemies.splice(i, 1);
        continue;
      }

      if (enemy.type === EnemyType.SUN) continue; // Skip sun for collision/magnet

      // Apply magnet effect (using direct player state)
      if (this.player.magnetActive) {
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        const distSq = dx * dx + dy * dy;
        if (
          distSq < this.POWERUP_MAGNET_RANGE * this.POWERUP_MAGNET_RANGE &&
          distSq > 1
        ) {
          const dist = Math.sqrt(distSq);
          enemy.x +=
            (dx / dist) * this.POWERUP_MAGNET_STRENGTH * this.timeFactor;
          enemy.y +=
            (dy / dist) * this.POWERUP_MAGNET_STRENGTH * this.timeFactor;
        }
      }

      // Check collision with player
      if (this.collides(this.player, enemy)) {
        // Only process score/effects if the enemy isn't already dying
        if (!enemy.isDying) {
          this.audioManager.playSound("explode", 0.6);
          this.createExplosion(enemy.x, enemy.y); // Spawn explosion particles

          // Determine base points based on enemy type
          let basePoints = 1; // Default for NORMAL
          switch (enemy.type) {
            case EnemyType.FAST:
              basePoints = 2;
              break;
            case EnemyType.SHOOTER:
              basePoints = 3;
              break;
            // No case needed for NORMAL as it's the default
          }

          // Apply the score multiplier
          const points = basePoints * this.player.scoreMultiplier;
          this.player.score += points;
          this.notify(`+${points}`, enemy.x, enemy.y, 1, [250, 250, 100]);

          // Trigger enemy death sequence *after* processing score/effects for the first hit
          enemy.startDying();
        }
      }
    }
  }

  private renderPlayer(): void {
    const sprite = this.sprites.playerSprite;
    if (!sprite || !this.player || !this.player.alive) {
      return; // Don't render if sprite missing or player dead/not initialized
    }

    this.context.save();
    try {
      // Keep try-finally for restore safety
      this.context.translate(
        Math.round(this.player.x),
        Math.round(this.player.y)
      );
      // Apply the PLAYER_SPRITE_SCALE to control visual size
      this.context.scale(this.PLAYER_SPRITE_SCALE, this.PLAYER_SPRITE_SCALE);
      this.context.rotate(this.player.spriteAngle);

      // Offset to draw the pre-rendered sprite centered around the player's logical x/y
      // The sprite itself was drawn centered within its own canvas in createSprites
      const offsetX = sprite.width / 2;
      const offsetY = sprite.height / 2;
      // Draw the cached sprite image
      this.context.drawImage(
        sprite,
        -offsetX,
        -offsetY,
        sprite.width,
        sprite.height
      );

      // Draw shield effect if active - relative to player center (0,0 in translated space)
      // Using direct player state (Improvement 3)
      if (this.player.shielded) {
        this.context.beginPath();
        // Scale the visual radius of the shield based on the player's sprite scale
        const shieldVisualRadius =
          (this.player.collisionRadius + 5) / this.PLAYER_SPRITE_SCALE;
        this.context.arc(0, 0, shieldVisualRadius, 0, Math.PI * 2);
        // Pulsing alpha effect
        const pulse = Math.sin(Date.now() * 0.005) * 0.15 + 0.6; // Oscillates between 0.45 and 0.75
        this.context.strokeStyle = `rgba(0, 255, 255, ${pulse})`;
        // Glow effect
        this.context.shadowColor = "rgba(0, 255, 255, 0.8)";
        this.context.shadowBlur = 10;
        // Adjust line width so it looks consistent regardless of scale
        this.context.lineWidth = 2 / this.PLAYER_SPRITE_SCALE;
        this.context.stroke();
        // Reset shadow for other elements
        this.context.shadowColor = "transparent";
        this.context.shadowBlur = 0;
      }

      // Debug: Draw center point (scaled)
      if (this.debugging) {
        const markerSize = 2 / this.PLAYER_SPRITE_SCALE; // Scale the marker size inversely
        this.context.fillStyle = "yellow";
        this.context.fillRect(
          -markerSize / 2,
          -markerSize / 2,
          markerSize,
          markerSize
        );
      }
    } finally {
      this.context.restore();
    }
  }

  private renderEnemies(): void {
    for (const enemy of this.enemies) {
      // Use for...of for slightly cleaner iteration
      if (!enemy.alive && enemy.type !== EnemyType.SUN) continue; // Skip dead normal enemies

      let sprite: HTMLCanvasElement | null;
      let tintColor: string | null = null; // Add this line

      switch (enemy.type) {
        case EnemyType.NORMAL:
          sprite = this.sprites.enemy;
          break;
        // Change this block for FAST enemy
        case EnemyType.FAST:
          sprite = this.sprites.enemy;
          tintColor = "rgba(255, 255, 0, 0.15)"; // Yellow tint
          break;
        // End of change block
        case EnemyType.SHOOTER:
          sprite = this.sprites.shooterSprite;
          break;
        case EnemyType.SUN:
          sprite = this.sprites.enemySun;
          break;
        default:
          sprite = null;
      }
      if (!sprite) continue;

      // Use enemy's current scale and alpha
      const currentScale = enemy.scale;
      const currentAlpha = enemy.alpha;

      this.context.save();
      this.context.globalAlpha = currentAlpha;
      this.context.translate(Math.round(enemy.x), Math.round(enemy.y));
      this.context.scale(currentScale, currentScale); // Apply enemy scale

      const offsetX = sprite.width / 2;
      const offsetY = sprite.height / 2;

      this.context.drawImage(sprite, -offsetX, -offsetY);

      // Add this block to apply tint if needed
      if (tintColor) {
        this.context.globalCompositeOperation = "source-atop"; // Apply tint over the sprite
        this.context.fillStyle = tintColor;
        this.context.fillRect(-offsetX, -offsetY, sprite.width, sprite.height);
        this.context.globalCompositeOperation = "source-over"; // Reset composite operation
      }
      // End of tint block

      // Debug visualization
      if (this.debugging) {
        this.context.beginPath();
        // Scale the collision radius visualization correctly
        this.context.arc(
          0,
          0,
          enemy.collisionRadius / currentScale,
          0,
          Math.PI * 2
        );
        this.context.strokeStyle =
          enemy.type === EnemyType.SUN
            ? "rgba(255,100,100,0.7)"
            : "rgba(100,255,255,0.7)";
        this.context.lineWidth = 1 / currentScale; // Adjust line width based on scale
        this.context.stroke();

        // Draw crosshair (scale line width and size)
        // const crosshairSize = 5 / currentScale;
        // this.context.beginPath();
        // this.context.moveTo(-crosshairSize, 0); this.context.lineTo(crosshairSize, 0);
        // this.context.moveTo(0, -crosshairSize); this.context.lineTo(0, crosshairSize);
        // this.context.strokeStyle = "rgba(255,255,255,0.7)";
        // this.context.stroke();
      }

      this.context.restore();
    }
  }

  private renderNotifications(): void {
    for (let i = this.notifications.length - 1; i >= 0; i--) {
      // Iterate backwards for removal
      const p = this.notifications[i];

      p.y -= 0.4 * this.timeFactor; // Make movement frame-rate independent
      p.alpha -= 0.015 * this.timeFactor; // Make fade frame-rate independent (adjust rate as needed)

      if (p.alpha <= 0) {
        this.notifications.splice(i, 1);
        continue;
      }

      this.context.save();
      this.context.globalAlpha = p.alpha; // Use particle's alpha

      // Text rendering
      this.context.font = `bold ${Math.round(12 * p.scale)}px Rajdhani, Arial`; // Use game font
      this.context.textAlign = "center"; // Center text
      this.context.fillStyle = `rgba( ${p.rgb[0]}, ${p.rgb[1]}, ${p.rgb[2]}, ${p.alpha} )`; // Use particle alpha here too
      this.context.shadowColor = "rgba(0, 0, 0, 0.7)"; // Text shadow for readability
      this.context.shadowBlur = 3;
      this.context.shadowOffsetX = 1;
      this.context.shadowOffsetY = 1;
      this.context.fillText(p.text, p.x, p.y + 4 * p.scale); // Adjust vertical alignment

      this.context.restore();
    }
  }

  private onWindowResizeHandler(): void {
    const margin = 8; // Keep margin for logical area calculation

    // 1. Set world/canvas size to full window
    this.world.width = window.innerWidth;
    this.world.height = window.innerHeight;
    this.canvas.width = this.world.width;
    this.canvas.height = this.world.height;

    // 2. Calculate logical game area (centered square)
    const minDimension = Math.min(this.world.width, this.world.height);
    this.logicalWidth = Math.max(100, minDimension - margin * 2); // Ensure minimum size
    this.logicalHeight = this.logicalWidth; // Keep it square
    this.logicalCenterX = this.world.width / 2; // Center X of the full canvas
    this.logicalCenterY = this.world.height / 2; // Center Y of the full canvas

    // 3. Update container style (optional, could be handled by CSS)
    // If #game container is meant only for the canvas, it should fill viewport too.
    // Let's assume CSS handles #game container sizing to fill body.
    // this.container.style.width = `${this.world.width}px`;
    // this.container.style.height = `${this.world.height}px`;

    // 4. Re-center the sun within the logical area
    this.updateSunPosition();

    // 5. Recreate background stars for new dimensions (optional, could just wrap)
    // Let's recreate for simplicity, could optimize later.
    this.createBackgroundStars(100); // Adjust count as needed

    // Buttons/Menus position themselves via CSS relative to the #game container (now full screen)
  }

  private updateSunPosition(): void {
    // Position sun at the logical center
    if (this.sunEnemy) {
      this.sunEnemy.x = this.logicalCenterX;
      this.sunEnemy.y = this.logicalCenterY;
    }
  }

  private collides(a: Entity, b: Entity): boolean {
    // Basic circle collision check
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const distanceSq = dx * dx + dy * dy;
    const radiiSum = a.collisionRadius + b.collisionRadius;
    const radiiSumSq = radiiSum * radiiSum;

    return distanceSq <= radiiSumSq;
  }

  private visualizeCollisions(): void {
    if (!this.player) return;

    for (const enemy of this.enemies) {
      if (enemy.type === EnemyType.SUN) continue; // Don't visualize sun collision boundary this way

      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const distanceSq = dx * dx + dy * dy;
      const requiredDistance =
        this.player.collisionRadius + enemy.collisionRadius;
      const isColliding = distanceSq <= requiredDistance * requiredDistance;

      // Only draw visualization for enemies relatively close
      if (distanceSq > requiredDistance * 4 * (requiredDistance * 4)) {
        // Check if within 4x collision distance
        continue;
      }

      const distance = Math.sqrt(distanceSq);

      this.context.save();
      const collisionColor = "rgba(255, 0, 0, 1.0)";
      const safeColor = "rgba(0, 255, 0, 0.8)";
      const enemySafeColor = "rgba(0, 150, 255, 0.8)";

      // Player collision circle
      this.context.beginPath();
      this.context.arc(
        this.player.x,
        this.player.y,
        this.player.collisionRadius,
        0,
        Math.PI * 2
      );
      this.context.strokeStyle = isColliding ? collisionColor : safeColor;
      this.context.lineWidth = 1.5;
      this.context.stroke();

      // Enemy collision circle
      this.context.beginPath();
      this.context.arc(enemy.x, enemy.y, enemy.collisionRadius, 0, Math.PI * 2);
      this.context.strokeStyle = isColliding ? collisionColor : enemySafeColor;
      this.context.lineWidth = 1.5;
      this.context.stroke();

      // Line between centers
      this.context.beginPath();
      this.context.moveTo(this.player.x, this.player.y);
      this.context.lineTo(enemy.x, enemy.y);
      this.context.strokeStyle = isColliding
        ? collisionColor
        : "rgba(255, 255, 255, 0.6)";
      this.context.lineWidth = 1;
      this.context.stroke();

      // Distance text
      const midX = (this.player.x + enemy.x) / 2;
      const midY = (this.player.y + enemy.y) / 2 - 10; // Position above line
      this.context.fillStyle = "rgba(0, 0, 0, 0.7)"; // Text background
      this.context.fillRect(midX - 35, midY - 10, 70, 18);
      this.context.fillStyle = isColliding
        ? "rgba(255, 150, 150, 1.0)"
        : "rgba(255, 255, 255, 1.0)";
      this.context.font = "bold 11px monospace";
      this.context.textAlign = "center";
      this.context.fillText(
        `${distance.toFixed(0)}/${requiredDistance.toFixed(0)}`,
        midX,
        midY + 3
      );

      this.context.restore();
    }
  }

  private createExplosion(x: number, y: number): void {
    const particleCount =
      this.EXPLOSION_PARTICLE_COUNT_MIN +
      Math.floor(
        Math.random() *
          (this.EXPLOSION_PARTICLE_COUNT_MAX -
            this.EXPLOSION_PARTICLE_COUNT_MIN +
            1)
      );

    for (let i = 0; i < particleCount; i++) {
      const particle = this.explosionParticlePool.get();

      const angle = Math.random() * Math.PI * 2;
      const speed =
        this.EXPLOSION_PARTICLE_SPEED_MIN +
        Math.random() *
          (this.EXPLOSION_PARTICLE_SPEED_MAX -
            this.EXPLOSION_PARTICLE_SPEED_MIN);
      const size =
        this.EXPLOSION_PARTICLE_SIZE_MIN +
        Math.random() *
          (this.EXPLOSION_PARTICLE_SIZE_MAX - this.EXPLOSION_PARTICLE_SIZE_MIN);
      const decay =
        this.EXPLOSION_PARTICLE_DECAY_MIN +
        Math.random() *
          (this.EXPLOSION_PARTICLE_DECAY_MAX -
            this.EXPLOSION_PARTICLE_DECAY_MIN);
      const alpha = 0.7 + Math.random() * 0.3;
      // Color variation: Mostly cyan/blue, some white sparks
      const color =
        Math.random() < 0.8
          ? [50 + Math.random() * 50, 180 + Math.random() * 75, 255] // Cyan/Blue range
          : [230 + Math.random() * 25, 230 + Math.random() * 25, 255]; // White/Light Blue range

      particle.init(x, y, angle, size, alpha, speed, decay, color);
      this.explosionParticles.push(particle);
    }
  }

  // --- Thrust Particles (Using Pooling - Improvement) ---
  private createThrustParticle(): void {
    if (!this.player) return;
    // Use logical center for particle direction calculation
    const centerX = this.logicalCenterX;
    const centerY = this.logicalCenterY;
    const directionAngle = Math.atan2(
      centerY - this.player.y, // Relative to logical center
      centerX - this.player.x // Relative to logical center
    );
    const particleBaseAngle = this.player.gravityReversed
      ? directionAngle + Math.PI
      : directionAngle;
    const particleCount =
      this.THRUST_PARTICLE_COUNT_MIN +
      Math.floor(
        Math.random() *
          (this.THRUST_PARTICLE_COUNT_MAX - this.THRUST_PARTICLE_COUNT_MIN + 1)
      );

    for (let i = 0; i < particleCount; i++) {
      // Get particle from pool instead of creating new
      const particle = this.particlePool.get();

      const spread = (Math.random() - 0.5) * this.THRUST_PARTICLE_SPREAD;
      const angle = particleBaseAngle + spread;
      const offsetDistance =
        this.THRUST_PARTICLE_OFFSET_MIN +
        Math.random() *
          (this.THRUST_PARTICLE_OFFSET_MAX - this.THRUST_PARTICLE_OFFSET_MIN);
      const startX = this.player.x + Math.cos(angle) * offsetDistance;
      const startY = this.player.y + Math.sin(angle) * offsetDistance;
      const size = 1 + Math.random() * 2;
      const alpha = 0.5 + Math.random() * 0.4;
      const speed = 0.5 + Math.random() * 1.5;
      const decay = 0.02 + Math.random() * 0.03;

      // Initialize the pooled particle
      particle.init(startX, startY, angle, size, alpha, speed, decay);
      this.thrustParticles.push(particle); // Add to active list
    }
  }

  private updateThrustParticles(): void {
    for (let i = this.thrustParticles.length - 1; i >= 0; i--) {
      const particle = this.thrustParticles[i];
      particle.update(this.timeFactor); // Use entity's update

      if (!particle.alive) {
        // Check alive flag set by particle's update
        this.thrustParticles.splice(i, 1); // Remove from active list
        this.particlePool.release(particle); // Return to pool
      }
    }
  }

  private updateExplosionParticles(): void {
    for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
      const particle = this.explosionParticles[i];
      particle.update(this.timeFactor); // Use entity's update

      if (!particle.alive) {
        this.explosionParticles.splice(i, 1); // Remove from active list
        this.explosionParticlePool.release(particle); // Return to pool
      }
    }
  }

  private renderThrustParticles(): void {
    this.context.save();
    this.context.fillStyle = "rgba(255, 120, 70, 0.8)"; // Consistent orange-red color
    for (const particle of this.thrustParticles) {
      this.context.globalAlpha = particle.alpha; // Use particle alpha
      this.context.beginPath();
      this.context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.context.fill();
    }
    this.context.restore();
  }

  private renderExplosionParticles(): void {
    this.context.save();
    // Optional: Add blend mode for brighter effect
    // this.context.globalCompositeOperation = 'lighter';

    for (const particle of this.explosionParticles) {
      const color = particle.color;
      this.context.fillStyle = `rgba(${Math.round(color[0])}, ${Math.round(
        color[1]
      )}, ${Math.round(color[2])}, ${particle.alpha.toFixed(2)})`;
      this.context.beginPath();
      // Draw simple squares for a blocky/digital explosion feel
      const halfSize = particle.size / 2;
      this.context.fillRect(
        particle.x - halfSize,
        particle.y - halfSize,
        particle.size,
        particle.size
      );
      // Or use circles:
      // this.context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      // this.context.fill();
    }
    this.context.restore(); // Restore composite operation if changed
  }

  // --- PowerUps ---
  private spawnPowerUp(): void {
    const now = Date.now();
    if (now - this.lastPowerUpSpawn < this.POWERUP_SPAWN_INTERVAL_MS) return;

    const minRadius = this.PLAYER_MIN_ORBIT_RADIUS + 30; // Spawn outside inner radius (relative to logical center)
    const maxRadius = this.maxPlayerRadius - 30; // Spawn inside outer radius (relative to logical center)
    if (maxRadius <= minRadius) return; // Avoid issues if world too small

    const radius = minRadius + Math.random() * (maxRadius - minRadius);
    const angle = Math.random() * Math.PI * 2;

    // Choose a random type from available power-ups
    const typeKeys = Object.keys(this.powerUpTypes);
    // Filter out the numeric keys if necessary (depends on how TS handles enums)
    const validKeys = typeKeys.filter((key) => isNaN(Number(key)));
    const randomTypeKey = validKeys[
      Math.floor(Math.random() * validKeys.length)
    ] as keyof typeof this.powerUpTypes;
    // Explicitly cast to the enum type
    const randomType = this.powerUpTypes[randomTypeKey] as PowerUpType;

    // Spawn relative to logical center
    const powerUp = new PowerUp(
      this.logicalCenterX + Math.cos(angle) * radius,
      this.logicalCenterY + Math.sin(angle) * radius,
      randomType
    );

    this.powerUps.push(powerUp);
    this.lastPowerUpSpawn = now;
  }

  private updatePowerUps(): void {
    const now = Date.now();

    // Handle Powerup Expiry & Reset State Directly (Improvement 3)
    const expiredKeys: PowerUpType[] = [];
    this.activePowerUps.forEach((endTime, type) => {
      if (now >= endTime) expiredKeys.push(type);
    });
    expiredKeys.forEach((type) => {
      this.activePowerUps.delete(type);
      switch (
        type // Reset player state
      ) {
        case PowerUpType.SHIELD:
          this.player.shielded = false;
          break;
        case PowerUpType.SCORE_MULTIPLIER:
          this.player.scoreMultiplier = 1;
          break;
        case PowerUpType.SLOW_TIME:
          this.player.slowTimeActive = false;
          break;
        case PowerUpType.MAGNET:
          this.player.magnetActive = false;
          break;
        case PowerUpType.GRAVITY_REVERSE:
          this.player.gravityReversed = false;
          break;
      }
      console.log(`PowerUp ${type} expired`);
    });

    // Update existing Powerups using Entity Update (Improvement: Code Structure)
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i];
      powerUp.update(this.timeFactor); // Call entity's update

      if (!powerUp.alive) {
        // Remove if faded out or lifetime expired
        this.powerUps.splice(i, 1);
        continue;
      }

      // Check collision
      if (this.player.alive && this.collides(this.player, powerUp)) {
        this.collectPowerUp(powerUp);
        this.powerUps.splice(i, 1);
      }
    }
    this.spawnPowerUp(); // Spawn new ones periodically
  }

  private collectPowerUp(powerUp: PowerUp): void {
    // Don't set activePowerUps immediately for RANDOM
    this.audioManager.playSound("powerup");

    let notificationText = "";
    let notificationColor: number[] = [200, 200, 200];
    let resolvedType = powerUp.type; // Store the potentially resolved type
    let originalTypeLabel = PowerUp.getLabelByType(powerUp.type); // Get label before potential change

    // --- Modify RANDOM type handling ---
    if (powerUp.type === PowerUpType.RANDOM) {
      const availableTypes = Object.values(PowerUpType).filter(
        (v) => typeof v === "number" && v !== PowerUpType.RANDOM
      ) as PowerUpType[];

      if (availableTypes.length > 0) {
        const chosenType =
          availableTypes[Math.floor(Math.random() * availableTypes.length)];
        console.log(
          `Random PowerUp resolved to: ${PowerUp.getLabelByType(
            chosenType
          )} (${chosenType})`
        );
        resolvedType = chosenType; // Update resolvedType with the actual chosen type
        // Remove the RANDOM entry from activePowerUps if it was added prematurely
        // (Shouldn't happen with the logic moved, but good practice)
        this.activePowerUps.delete(PowerUpType.RANDOM);
      } else {
        console.warn(
          "No other powerup types available for RANDOM to resolve to."
        );
        return; // Nothing to do
      }
    }
    // --- End of RANDOM modification ---

    // Use resolvedType for setting duration and player state
    const endTime = Date.now() + this.POWERUP_DURATION_MS;
    this.activePowerUps.set(resolvedType, endTime); // Use the RESOLVED type as the key

    // Set Player State Directly using resolvedType
    switch (
      resolvedType // Use resolvedType here
    ) {
      case PowerUpType.SHIELD:
        this.player.shielded = true;
        // Use static methods for consistency (Rule 4)
        notificationText = PowerUp.getLabelByType(resolvedType); // Get abbreviated label
        notificationColor = this.parseRgbaColor(
          PowerUp.getColorByType(resolvedType)
        ); // Get color
        break;
      case PowerUpType.SCORE_MULTIPLIER:
        this.player.scoreMultiplier = 2;
        notificationText = PowerUp.getLabelByType(resolvedType);
        notificationColor = this.parseRgbaColor(
          PowerUp.getColorByType(resolvedType)
        );
        break;
      case PowerUpType.SLOW_TIME:
        this.player.slowTimeActive = true;
        notificationText = PowerUp.getLabelByType(resolvedType);
        notificationColor = this.parseRgbaColor(
          PowerUp.getColorByType(resolvedType)
        );
        break;
      case PowerUpType.MAGNET:
        this.player.magnetActive = true;
        // Use static methods for consistency (Rule 3 & 4)
        notificationText = PowerUp.getLabelByType(resolvedType);
        notificationColor = this.parseRgbaColor(
          PowerUp.getColorByType(resolvedType)
        );
        break;
      case PowerUpType.GRAVITY_REVERSE:
        this.player.gravityReversed = true;
        notificationText = PowerUp.getLabelByType(resolvedType);
        notificationColor = this.parseRgbaColor(
          PowerUp.getColorByType(resolvedType)
        );
        break;
      // No default needed as RANDOM is resolved before this switch
    }

    if (notificationText)
      this.notify(
        `${notificationText} ACTIVE`, // Add "ACTIVE" for clarity
        this.player.x,
        this.player.y - 25,
        1.2,
        notificationColor // Use the parsed color
      );
    console.log(`PowerUp ${resolvedType} collected/refreshed`); // Use resolvedType in log

    // Track powerup collection
    let trackedType = PowerUp.getLabelByType(resolvedType);
    if (originalTypeLabel === "RANDOM") {
      trackedType = `RANDOM->${trackedType}`; // Indicate it came from random
    }
    this.analytics.track("powerup_collected", { powerup_type: trackedType });
  }

  // --- Helper Methods ---
  private parseRgbaColor(rgbaString: string): number[] {
    const match = rgbaString.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/
    );
    if (match) {
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }
    return [255, 255, 255]; // Default to white if parse fails
  }

  private renderPowerUps(): void {
    // Add this method signature for context
    this.context.save();
    for (const powerUp of this.powerUps) {
      this.context.globalAlpha = powerUp.alpha * 0.85; // Slightly transparent base
      this.context.translate(powerUp.x, powerUp.y);
      this.context.scale(powerUp.scale, powerUp.scale);
      this.context.rotate(powerUp.rotation);

      const color = powerUp.getColor();
      this.context.shadowBlur = 15;
      this.context.shadowColor = color;

      // Main circle
      this.context.beginPath();
      this.context.arc(0, 0, powerUp.collisionRadius * 0.8, 0, Math.PI * 2); // Base on collision radius
      this.context.fillStyle = color;
      this.context.fill();

      // Inner ring
      this.context.beginPath();
      this.context.arc(0, 0, powerUp.collisionRadius * 0.5, 0, Math.PI * 2);
      this.context.strokeStyle = "rgba(255, 255, 255, 0.8)";
      this.context.lineWidth = 2 / powerUp.scale; // Keep line width consistent
      this.context.stroke();

      // Center dot
      this.context.beginPath();
      this.context.arc(0, 0, powerUp.collisionRadius * 0.2, 0, Math.PI * 2);
      this.context.fillStyle = "rgba(255, 255, 255, 0.8)";
      this.context.fill();

      // Reset transform for next iteration
      this.context.setTransform(1, 0, 0, 1, 0, 0); // Faster than multiple restores
    }
    this.context.restore(); // Restore initial save
  }

  // --- Screen Shake ---
  private triggerShake(
    intensity: number = this.SHAKE_INTENSITY,
    duration: number = this.SHAKE_DURATION_MS
  ): void {
    this.shakeEndTime = Date.now() + duration;
    this.currentShakeIntensity = intensity;
  }

  private applyShake(): void {
    if (Date.now() < this.shakeEndTime) {
      const intensity = this.currentShakeIntensity;
      const shakeX = (Math.random() - 0.5) * intensity * 2;
      const shakeY = (Math.random() - 0.5) * intensity * 2;
      this.context.translate(shakeX, shakeY);
      // Optional: gradually reduce intensity
      // this.currentShakeIntensity *= 0.9;
    } else {
      this.currentShakeIntensity = 0; // Stop shaking
    }
  }

  // --- Game Loop ---

  private update(): void {
    const now = Date.now();
    this.timeDelta = Math.min(200, now - this.timeLastFrame);
    this.timeFactor = this.timeDelta / (1000 / this.FRAMERATE);
    this.timeLastFrame = now;
    this.framesThisSecond++;
    this.frameCount++;

    // --- State Machine Logic (Improvement) ---
    // Check if paused OR any menu is open before deciding to update game logic
    const shouldUpdateGame =
      this.gameState === GameState.PLAYING &&
      !this.paused &&
      !this.isMenuOpen &&
      !this.isCreditsOpen;

    if (shouldUpdateGame) {
      this.duration = (now - this.timeGameStart) / 1000; // Update duration only when playing actively

      // Update game elements
      this.updatePlayer();
      this.updateEnemies();
      this.updatePowerUps();
      this.updateProjectiles(); // Update projectiles
      this.updateThrustParticles();
      this.updateExplosionParticles();
      this.updateBackgroundStars(); // Update background scroll

      this.checkEndConditions();
    } else {
      // Game is paused, in menu, or in a non-playing state
      // Update things that should always update or animate in menus/pause
      this.updateBackgroundStars(); // Keep background moving slowly? Or stop? Let's keep it moving.
      this.updateNotificationsOnly(); // Allow notifications to fade even when paused/in menu
    }

    // --- Handle different states for UI, etc. ---
    // This switch is now more about what *else* happens in each state,
    // as the core game update is handled above.
    switch (this.gameState) {
      case GameState.PLAYING:
        // Already handled by shouldUpdateGame block
        break;
      case GameState.PAUSED:
        // Duration does not increase.
        // Potentially update paused UI elements here.
        break;
      case GameState.WELCOME:
      case GameState.LOSER:
      case GameState.WINNER:
        // Update background stars even when not playing for visual appeal
        this.updateBackgroundStars();
        // Update notifications (e.g., fade out)
        this.updateNotificationsOnly();
        break;
    }

    // --- FPS Calculation ---
    if (now > this.timeLastSecond + 1000) {
      const elapsedSeconds = (now - this.timeLastSecond) / 1000;
      this.fps = Math.round(this.framesThisSecond / elapsedSeconds); // Calculate FPS based on actual time
      this.fpsMin = Math.min(this.fpsMin, this.fps);
      this.fpsMax = Math.max(this.fpsMax, this.fps);

      this.timeLastSecond = now;
      this.framesThisSecond = 0;
    }

    // --- Rendering ---
    this.render();

    // --- Loop ---
    requestAnimationFrame(this.update.bind(this));
  }

  // Helper to update notifications when game isn't fully updating
  private updateNotificationsOnly(): void {
    for (let i = this.notifications.length - 1; i >= 0; i--) {
      const p = this.notifications[i];
      // Simplified update just for fading out
      p.alpha -= 0.015 * this.timeFactor; // Still use timeFactor for smooth fade
      if (p.alpha <= 0) {
        this.notifications.splice(i, 1);
      }
    }
  }

  private checkEndConditions(): void {
    if (!this.player || !this.player.alive) return;
    // Use logical center for collision checks
    // Removed unused centerX, centerY declarations
    const useDistSq = this.playerDistToSunSq; // Use pre-calculated (Improvement 1) - already relative to logical center

    // 1. Sun Collision
    if (useDistSq < this.sunDangerRadius * this.sunDangerRadius) {
      if (this.player.shielded) {
        this.activePowerUps.delete(PowerUpType.SHIELD);
        this.player.shielded = false;
        this.notify(
          "SHIELD DESTROYED!",
          this.player.x,
          this.player.y - 20,
          1.5,
          [255, 100, 100]
        );
        this.audioManager.playSound("shield_break");
        this.triggerShake(); // Trigger screen shake
        // Nudge player relative to logical center
        this.player.interactionDelta = this.PLAYER_MAX_INTERACTION_DELTA * 0.5;
        const angle = Math.atan2(
          this.player.y - this.logicalCenterY, // Use logical center
          this.player.x - this.logicalCenterX // Use logical center
        );
        this.player.radius = this.sunDangerRadius + 5;
        this.player.x =
          this.logicalCenterX + Math.cos(angle) * this.player.radius; // Use logical center
        this.player.y =
          this.logicalCenterY + Math.sin(angle) * this.player.radius; // Use logical center
        // Recalculate dist sq from logical center
        const dx_sun = this.player.x - this.logicalCenterX;
        const dy_sun = this.player.y - this.logicalCenterY;
        this.playerDistToSunSq = dx_sun * dx_sun + dy_sun * dy_sun;
      } else {
        // Sun Collision Death (Fix 2)
        console.error("Player hit sun WITHOUT shield!");
        this.audioManager.playSound("game_over");
        this.triggerShake(this.SHAKE_INTENSITY * 2, this.SHAKE_DURATION_MS * 2); // Bigger shake on death
        this.player.alive = false;
        this.endGame(false, "CONSUMED BY STAR");
        return;
      }
    }

    // 2. Out of Bounds
    if (this.player.radius >= this.maxPlayerRadius) {
      if (this.player.shielded) {
        this.activePowerUps.delete(PowerUpType.SHIELD);
        this.player.shielded = false;
        this.notify(
          "SHIELD OVERLOAD!",
          this.player.x,
          this.player.y - 20,
          1.5,
          [255, 100, 100]
        );
        this.audioManager.playSound("shield_break");
        this.triggerShake();
        // Nudge player relative to logical center
        this.player.interactionDelta = this.PLAYER_MIN_INTERACTION_DELTA * 0.5;
        this.player.radius = this.maxPlayerRadius - 5;
        const angle = this.player.angle;
        this.player.x =
          this.logicalCenterX + Math.cos(angle) * this.player.radius; // Use logical center
        this.player.y =
          this.logicalCenterY + Math.sin(angle) * this.player.radius; // Use logical center
        // Recalculate dist sq from logical center
        const dx_sun = this.player.x - this.logicalCenterX;
        const dy_sun = this.player.y - this.logicalCenterY;
        this.playerDistToSunSq = dx_sun * dx_sun + dy_sun * dy_sun;
      } else {
        // Out of Bounds Death
        console.error("Player went out of bounds!");
        this.audioManager.playSound("game_over");
        this.triggerShake(
          this.SHAKE_INTENSITY * 1.5,
          this.SHAKE_DURATION_MS * 1.5
        );
        this.player.alive = false;
        this.endGame(false, "LOST IN THE VOID");
        return;
      }
    }

    // 3. Survival Time Limit
    if (this.gameMode === "survival" && this.gameState === GameState.PLAYING) {
      const timeLeft = this.gameTimer - this.duration;
      if (timeLeft <= 0) {
        this.audioManager.playSound("victory");
        this.saveHighScore();
        this.player.alive = false;
        this.endGame(true, `SURVIVED! SCORE: ${this.player.score}`);
        return;
      }
      // Show countdown timer near top-center of logical area
      if (timeLeft <= 10.5 && Math.floor(timeLeft * 2) % 2 === 0)
        this.notify(
          `${Math.ceil(timeLeft)}s`,
          this.logicalCenterX, // Logical center X
          this.logicalCenterY - this.logicalHeight * 0.3, // Above logical center
          1.2,
          [255, 50, 50]
        );
    }

    // 4. Score Target Reached
    if (
      this.gameMode === "score" &&
      this.player.score >= this.victoryScore &&
      this.gameState === GameState.PLAYING
    ) {
      this.audioManager.playSound("victory");
      this.saveHighScore();
      this.player.alive = false;
      this.endGame(true, `TARGET REACHED! TIME: ${this.duration.toFixed(1)}s`);
      return;
    }
  }

  private endGame(isVictory: boolean, message: string): void {
    this.playing = false; // Stop main game logic flag
    if (this.player) this.player.alive = false;
    this.updateModeToggleVisual(); // Enable mode toggle
    const endState = isVictory ? GameState.WINNER : GameState.LOSER;
    this.setGameState(endState); // Set final state
    this.startButton.style.display = "none"; // Hide the main start button

    // Save score if it's a new high score (Improvement)
    // saveHighScore now also tracks high_score_achieved if applicable
    this.saveHighScore();

    this.thrustParticles = []; // Clear particles

    // --- Populate and Show Game Over Dialog ---
    if (this.gameOverDialog && this.gameOverTitle && this.gameOverMessage) {
      this.gameOverTitle.textContent = isVictory ? "VICTORY!" : "GAME OVER";
      this.gameOverMessage.textContent = isVictory ? "" : message; // Use the detailed message

      // Calculate and display result info in the format (Current / Target)
      let resultInfoText = "";
      if (this.gameMode === "survival") {
        const totalTime = this.gameTimer;
        resultInfoText = `${this.duration.toFixed(2)}s / ${totalTime.toFixed(
          0
        )}s`;
      } else {
        // Score mode
        const score = this.player?.score ?? 0;
        const targetScore = this.victoryScore;
        resultInfoText = `${score} / ${targetScore} PTS`;
      }
      this.gameOverResultInfoElement.textContent = isVictory
        ? `${this.gameMode.toUpperCase()} MODE`
        : `${this.gameMode.toUpperCase()} MODE: ${resultInfoText}`;

      this.gameOverDialog.classList.remove("hidden");
    } else {
      console.error("Game over dialog elements not found!");
      // Fallback notification if dialog fails
      this.notify(
        message,
        this.world.width / 2,
        this.world.height / 2 - 40,
        1.8,
        isVictory ? [100, 255, 100] : [255, 100, 100]
      );
      this.notify(
        `Score: ${this.player?.score ?? 0} | High: ${this.highScore}`,
        this.world.width / 2,
        this.world.height / 2 + 20,
        1.2,
        [200, 200, 100] // Keep score/high score fallback notification
      );
      // Update fallback restart instruction
      const restartInstruction = this.isLikelyMobile
        ? "TAP TO PLAY AGAIN"
        : "TAP/PRESS 'R' TO PLAY AGAIN";
      this.notify(
        restartInstruction,
        this.world.width / 2,
        this.world.height / 2 + 50, // Adjust position if needed
        1.0,
        [200, 200, 200]
      );
    }

    // Track game end event
    this.analytics.track("game_end", {
      reason: message, // Use the end message as the reason
      final_score: this.player?.score ?? 0,
      duration: parseFloat(this.duration.toFixed(1)),
      game_mode: this.gameMode,
    });
  }

  // Handles clicking the "Play Again" button in the game over dialog
  private onPlayAgainButtonClick(e: Event): void {
    e.preventDefault();
    this.gameOverDialog?.classList.add("hidden"); // Hide the dialog first
    this.reset(); // Full reset
    // Immediately start the game after reset
    this.onStartButtonClick(new MouseEvent("click"));
  }

  // Handles clicking the "Share Result" button
  private async onShareResultButtonClick(e: Event): Promise<void> {
    e.preventDefault();
    e.stopPropagation(); // Prevent other handlers

    const gameUrl = window.location.href; // Use dynamic URL
    const hashtag = "#OrbitGame";
    let shareText = "";
    const score = this.player?.score ?? 0;
    const duration = this.duration.toFixed(1); // Use 1 decimal place for time

    const isVictory = this.gameState === GameState.WINNER; // Check current state

    if (this.gameMode === "survival") {
      shareText = isVictory
        ? `I survived ${duration}s in Orbit! Can you beat my time? ${hashtag} ${gameUrl}`
        : `I lasted ${duration}s in Orbit! Try to survive longer! ${hashtag} ${gameUrl}`;
    } else {
      // Score mode
      shareText = isVictory
        ? `I reached ${score} PTS in Orbit! Can you beat my score? ${hashtag} ${gameUrl}`
        : `I scored ${score}/${this.victoryScore} PTS in Orbit! Try to reach the target! ${hashtag} ${gameUrl}`;
    }

    const shareData = {
      title: "Orbit",
      text: shareText,
      url: gameUrl,
    };

    let shareMethod = "none"; // For analytics

    try {
      const isLikelyMobile = navigator.maxTouchPoints > 0;
      if (navigator.share && isLikelyMobile) {
        await navigator.share(shareData);
        console.log("Result shared successfully via Web Share API.");
        shareMethod = "native";
        this.notify(
          "Shared!",
          this.world.width / 2,
          (3 * this.world.height) / 4,
          2.0,
          [100, 255, 100]
        );
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        console.log("Result copied to clipboard.");
        shareMethod = "clipboard";
        this.notify(
          "Copied to Clipboard!",
          this.world.width / 2,
          (3 * this.world.height) / 4,
          2.0,
          [100, 200, 255]
        );
      } else {
        console.warn("Web Share and Clipboard API not supported.");
        this.notify(
          "Sharing not supported",
          this.world.width / 2,
          (3 * this.world.height) / 4,
          2.0,
          [255, 100, 100]
        );
      }
    } catch (err) {
      console.error("Error sharing:", err);
      // Avoid notifying if user cancels native share dialog
      if (
        !(err instanceof DOMException && err.name === "AbortError") &&
        shareMethod !== "native"
      ) {
        this.notify(
          "Share Failed",
          this.world.width / 2,
          this.world.height / 2 + 60,
          1.0,
          [255, 100, 100]
        );
      }
      shareMethod = "error";
    }

    // Track share attempt
    this.analytics.track("share_attempt", {
      share_method: shareMethod,
      game_mode: this.gameMode,
      score: score,
      duration: parseFloat(duration),
      victory: isVictory,
    });
  }

  private render(): void {
    this.context.save(); // Save context state before potential shake

    // Apply Screen Shake offset (Improvement)
    this.applyShake();

    // Clear Canvas
    this.context.clearRect(0, 0, this.world.width, this.world.height);

    // Render Background (Improvement)
    this.renderBackground();

    // Render Game Elements
    this.renderOrbit();
    this.renderThrustParticles();
    this.renderEnemies();
    this.renderPowerUps();
    this.renderProjectiles(); // Render projectiles
    this.renderExplosionParticles();
    if (this.player && this.player.alive) this.renderPlayer();
    this.renderNotifications(); // Render notifications on top

    // Render UI / Info
    this.renderGameInfo(); // Score, Time, etc.
    this.renderPowerUpTimers(); // UI for powerup durations

    // Render Pause Overlay (Improvement) - Render only if paused AND *neither* menu is open
    if (
      this.gameState === GameState.PAUSED &&
      !this.isMenuOpen &&
      !this.isCreditsOpen
    ) {
      this.renderPauseScreen();
    }
    // Render Menu Dimming Overlay (if settings menu or credits are open)
    else if (this.isMenuOpen || this.isCreditsOpen) {
      this.renderMenuBackgroundDim();
    }
    // Render Welcome Instructions (Improvement) - Only if not paused/in menu
    else if (
      this.gameState === GameState.WELCOME &&
      !this.paused &&
      !this.isMenuOpen &&
      !this.isCreditsOpen
    ) {
      this.renderWelcomeScreen();
    }

    // Render Debug Info (if enabled)
    if (this.debugging) {
      this.renderDebugInfo();
      this.visualizeCollisions();
    }

    this.context.restore(); // Restore context state after shake
  }

  // Renders a dim overlay when the settings menu is open
  private renderMenuBackgroundDim(): void {
    this.context.save();
    this.context.fillStyle = "rgba(0, 0, 0, 0.6)"; // Same as pause screen dim
    this.context.fillRect(0, 0, this.world.width, this.world.height);
    this.context.restore();
  }

  private renderGameInfo(): void {
    this.context.save();
    this.context.font = "bold 16px Rajdhani, Arial";
    this.context.fillStyle = "rgba(140, 240, 255, 0.9)";
    this.context.shadowColor = "rgba(0, 0, 0, 0.5)";
    this.context.shadowBlur = 2;
    this.context.shadowOffsetY = 1;
    const bottomMargin = 25; // Margin from bottom edge of full screen
    const sideMargin = 15; // Margin from left/right edges of full screen

    // Score - Bottom Left
    this.context.textAlign = "left";
    this.context.fillText(
      `SCORE: ${this.player?.score ?? 0}`,
      sideMargin, // Use side margin
      this.world.height - bottomMargin // Use bottom margin
    );

    // High Score - Bottom Center (only when not playing/paused)
    if (
      this.gameState !== GameState.PLAYING &&
      this.gameState !== GameState.PAUSED
    ) {
      this.context.fillStyle = "rgba(140, 240, 255, 0.9)";
      this.context.textAlign = "center";
      this.context.font = "14px Rajdhani, Arial";
      const highScoreY = this.world.height - bottomMargin - 20; // Position above mode text
      this.context.fillText(
        `HI: ${this.highScore}`,
        this.world.width / 2, // Center of full screen
        highScoreY
      );
    }

    // Mode/Time Info - Bottom Right (or Mode info in Welcome)
    this.context.textAlign = "right";
    this.context.font = "bold 16px Rajdhani, Arial";
    this.context.fillStyle = "rgba(140, 240, 255, 0.9)";
    const rightEdge = this.world.width - sideMargin; // Use side margin

    if (
      this.gameState === GameState.PLAYING ||
      this.gameState === GameState.PAUSED
    ) {
      // Show Time/Target during play/pause
      if (this.gameMode === "survival") {
        const timeLeft = Math.max(0, Math.ceil(this.gameTimer - this.duration));
        this.context.fillText(
          `TIME: ${timeLeft}s`,
          rightEdge, // Right align
          this.world.height - bottomMargin // Use bottom margin
        );
      } else {
        this.context.fillText(
          `TARGET: ${this.victoryScore}`,
          rightEdge, // Right align
          this.world.height - bottomMargin // Use bottom margin
        );
      }
    } else if (this.gameState === GameState.WELCOME) {
      // Show Mode info in Welcome state (bottom center)
      this.context.textAlign = "center";
      this.context.font = "14px Rajdhani, Arial";
      this.context.fillStyle = "rgba(140, 240, 255, 0.7)";
      const modeText = this.isLikelyMobile
        ? `MODE: ${this.gameMode.toUpperCase()}`
        : `MODE: ${this.gameMode.toUpperCase()} (M to change)`;
      this.context.fillText(
        modeText,
        this.world.width / 2, // Center of full screen
        this.world.height - bottomMargin // Use bottom margin
      );
    }
    this.context.restore();
  }

  // Render UI for active powerup durations (Improvement)
  private renderPowerUpTimers(): void {
    if (this.activePowerUps.size === 0 || this.gameState !== GameState.PLAYING)
      return;

    this.context.save();
    this.context.font = "bold 12px Rajdhani, Arial";
    const startX = 15; // Position from top-left corner
    let currentY = 20; // Start Y position from top
    const lineHeight = 18;
    const barWidth = 80;
    const barHeight = 8;
    const now = Date.now();

    this.activePowerUps.forEach((endTime, type) => {
      const remaining = endTime - now;
      if (remaining <= 0) return; // Should be removed soon anyway

      const fraction = remaining / this.POWERUP_DURATION_MS;
      const powerUpColor = PowerUp.getColorByType(type); // Use static color getter

      // Draw Text Label
      let label = PowerUp.getLabelByType(type); // Use static label getter
      this.context.fillStyle = powerUpColor;
      this.context.textAlign = "left";
      this.context.fillText(label, startX, currentY + barHeight);

      // Draw Duration Bar Background
      this.context.fillStyle = "rgba(100, 100, 100, 0.5)";
      // Adjust X position of the bar to make space for potentially longer labels if needed
      const barStartX = startX + 45; // Increased offset slightly
      this.context.fillRect(barStartX, currentY, barWidth, barHeight);

      // Draw Duration Bar Foreground
      this.context.fillStyle = powerUpColor;
      this.context.fillRect(
        barStartX, // Use adjusted start X
        currentY,
        barWidth * fraction,
        barHeight
      );

      currentY += lineHeight;
    });

    this.context.restore();
  }

  // Render Pause Screen (Improvement)
  private renderPauseScreen(): void {
    this.context.save();
    this.context.fillStyle = "rgba(0, 0, 0, 0.6)"; // Dark overlay
    this.context.fillRect(0, 0, this.world.width, this.world.height);

    this.context.fillStyle = "rgba(200, 220, 255, 0.9)";
    this.context.font = "bold 36px Rajdhani, Arial";
    this.context.textAlign = "center";
    this.context.shadowColor = "rgba(0, 0, 0, 0.7)";
    this.context.fillText(
      "PAUSED",
      this.world.width / 2, // Center on full screen X
      this.world.height / 2 - 10 // Center on full screen Y offset
    );

    this.context.font = "16px Rajdhani, Arial";
    this.context.fillText(
      "Press 'P' to Resume",
      this.world.width / 2, // Center on full screen X
      this.world.height / 2 + 30 // Center on full screen Y offset
    );

    this.context.restore();
  }

  // Render Welcome Screen Instructions (Improvement)
  private renderWelcomeScreen(): void {
    this.context.save();
    this.context.fillStyle = "rgba(180, 210, 240, 0.8)";
    this.context.font = "16px Rajdhani, Arial";
    this.context.textAlign = "center";
    this.context.shadowColor = "rgba(0, 0, 0, 0.5)";
    this.context.shadowBlur = 3;

    // Center instructions on the full screen
    const midX = this.world.width / 2;
    let yPos = this.world.height * 0.65; // Adjust starting Y position relative to full height

    if (this.isLikelyMobile) {
      // Mobile/Touch Instructions
      this.context.fillText("TOUCH AND HOLD", midX, yPos);
      yPos += 20;
      this.context.fillText("TO EXPAND ORBIT", midX, yPos);
      yPos += 25;
      this.context.fillText("RELEASE TO CONTRACT", midX, yPos);
    } else {
      // Desktop/Keyboard/Mouse Instructions
      this.context.fillText("HOLD [MOUSE] / [SPACE]", midX, yPos);
      yPos += 20;
      this.context.fillText("TO EXPAND ORBIT", midX, yPos);
      yPos += 25;
      this.context.fillText("RELEASE TO CONTRACT", midX, yPos);
    }

    // Common instructions
    yPos += 25;
    this.context.fillText("COLLECT BLUE ENEMIES", midX, yPos);
    yPos += 20;
    this.context.fillText("AVOID THE STAR & EDGE", midX, yPos);

    this.context.restore();
  }

  private renderDebugInfo(): void {
    if (!this.player) return; // Ensure player exists

    this.context.save();
    this.context.fillStyle = "rgba(220, 220, 220, 0.85)"; // Brighter debug text
    this.context.font = "11px monospace";
    this.context.textAlign = "left";
    this.context.shadowColor = "rgba(0, 0, 0, 1)"; // Strong shadow for readability
    this.context.shadowBlur = 1;
    this.context.shadowOffsetX = 1;
    this.context.shadowOffsetY = 1;

    const x = 15; // Keep some left padding
    const lineHeight = 13;
    const debugStrings: string[] = []; // Array to hold all debug lines

    // --- Collect all debug strings ---
    const addLine = (text: string) => debugStrings.push(text);

    // Basic Info
    addLine(`FPS: ${this.fps} (Min: ${this.fpsMin}, Max: ${this.fpsMax})`);
    addLine(
      `Delta/Factor: ${this.timeDelta.toFixed(1)}ms / ${this.timeFactor.toFixed(
        2
      )}`
    );
    addLine(
      `State: ${this.gameState}, Playing: ${this.playing}, Paused: ${this.paused}, Menu: ${this.isMenuOpen}`
    );
    addLine(`Mode: ${this.gameMode}, Debug: ${this.debugging}`);
    addLine(`---`);
    // Player Info
    addLine(
      `Player Pos: ${this.player.x.toFixed(1)}, ${this.player.y.toFixed(1)}`
    );
    addLine(
      `Player Radius: ${this.player.radius.toFixed(
        1
      )} / ${this.maxPlayerRadius.toFixed(1)}`
    );
    addLine(
      `Player Angle: ${((this.player.angle * 180) / Math.PI).toFixed(1)}°`
    );
    addLine(`Player iDelta: ${this.player.interactionDelta.toFixed(3)}`);
    addLine(
      `Player Speed (rot): ${(
        this.PLAYER_ROTATION_SPEED_FACTOR / Math.max(1, this.player.radius)
      ).toFixed(3)}`
    );
    addLine(`---`);
    // Game State
    let activeEnemies = 0;
    this.enemies.forEach((e) => {
      if (e.type !== EnemyType.SUN) activeEnemies++;
    });
    addLine(`Enemies: ${activeEnemies}/${this.MAX_ENEMIES}`); // Use count/max (Improvement 2)
    addLine(
      `Enemy Spawn Interval: ${this.currentEnemySpawnInterval.toFixed(0)}ms`
    ); // Show current rate (Improvement 2)
    addLine(
      `Thrust Particles: ${
        this.thrustParticles.length
      } (Pool: ${this.particlePool.getPoolSize()})`
    );
    addLine(
      `Explosion Particles: ${
        this.explosionParticles.length
      } (Pool: ${this.explosionParticlePool.getPoolSize()})`
    );
    addLine(
      `Projectiles: ${
        this.projectiles.length
      } (Pool: ${this.projectilePool.getPoolSize()})`
    );
    addLine(
      `Powerups: ${this.powerUps.length} (Active: ${this.activePowerUps.size})`
    );
    addLine(`Score: ${this.player.score} (x${this.player.scoreMultiplier})`);
    addLine(`Duration: ${this.duration.toFixed(1)}s`);
    addLine(`Input Down: ${this.isInputDown}`); // Use combined input state
    addLine(`---`);
    // Use stored squared distance, calculate sqrt only for display (Improvement 1)
    const distToSun = Math.sqrt(this.playerDistToSunSq);
    addLine(`Dist to Sun: ${distToSun.toFixed(1)}px`);
    addLine(`Sun Danger Rad: ${this.sunDangerRadius.toFixed(1)}px`);
    addLine(`---`);
    // Active Powerups List
    if (this.activePowerUps.size > 0) {
      addLine(`Active: [${Array.from(this.activePowerUps.keys()).join(", ")}]`);
    }

    // --- Calculate starting position and render ---
    // Position debug info top-left
    // Removed unused totalHeight calculation
    // let currentY = this.world.height / 2 - totalHeight / 2; // Old centering logic
    let currentY = 20; // Start near top-left

    // Draw each line
    debugStrings.forEach((text) => {
      this.context.fillText(text, x, currentY);
      currentY += lineHeight;
    });

    // --- Visual Debug Elements ---

    // Draw logical center point (Sun Center)
    this.context.beginPath();
    this.context.arc(
      this.logicalCenterX, // Use logical center
      this.logicalCenterY, // Use logical center
      4,
      0,
      Math.PI * 2
    );
    this.context.fillStyle = "rgba(255, 255, 0, 0.8)";
    this.context.fill();

    // Draw player collision circle
    this.context.beginPath();
    this.context.arc(
      this.player.x,
      this.player.y,
      this.player.collisionRadius,
      0,
      Math.PI * 2
    );
    this.context.strokeStyle = "rgba(255, 0, 255, 0.9)";
    this.context.lineWidth = 1;
    this.context.stroke();

    // Draw player center point
    this.context.beginPath();
    this.context.arc(this.player.x, this.player.y, 2, 0, Math.PI * 2);
    this.context.fillStyle = "rgba(255, 255, 0, 0.9)";
    this.context.fill();

    // Draw sun danger radius (relative to logical center)
    this.context.beginPath();
    this.context.arc(
      this.logicalCenterX, // Use logical center
      this.logicalCenterY, // Use logical center
      this.sunDangerRadius,
      0,
      Math.PI * 2
    );
    this.context.strokeStyle = "rgba(255, 50, 50, 0.6)";
    this.context.setLineDash([4, 4]);
    this.context.lineWidth = 1;
    this.context.stroke();
    this.context.setLineDash([]); // Reset line dash

    this.context.restore();
  }

  // --- Projectile Management ---
  spawnProjectile(x: number, y: number, angle: number): void {
    const projectile = this.projectilePool.get();
    const spawnOffset = 10; // Distance ahead of shooter to spawn projectile
    const startX = x + Math.cos(angle) * spawnOffset;
    const startY = y + Math.sin(angle) * spawnOffset;

    projectile.init(
      startX, // Use offset start position
      startY, // Use offset start position
      angle,
      this.PROJECTILE_SPEED,
      this.PROJECTILE_SIZE,
      this.PROJECTILE_COLLISION_RADIUS,
      this.PROJECTILE_LIFETIME_MS
    );
    this.projectiles.push(projectile);
    // Optional: Play shoot sound
    // this.audioManager.playSound("shoot", 0.2);
  }

  updateProjectiles(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.update(this.timeFactor);

      if (!projectile.alive) {
        this.projectiles.splice(i, 1);
        this.projectilePool.release(projectile);
        continue;
      }

      // Check collision with player
      if (this.player.alive && this.collides(this.player, projectile)) {
        projectile.alive = false; // Mark projectile for removal
        this.projectiles.splice(i, 1);
        this.projectilePool.release(projectile);

        if (this.player.shielded) {
          this.activePowerUps.delete(PowerUpType.SHIELD);
          this.player.shielded = false;
          this.notify(
            "SHIELD HIT!",
            this.player.x,
            this.player.y - 20,
            1.2,
            [255, 180, 100]
          );
          this.audioManager.playSound("shield_break");
          this.triggerShake(this.SHAKE_INTENSITY * 0.8); // Smaller shake for projectile hit
        } else {
          console.error("Player hit by projectile!");
          this.audioManager.playSound("game_over"); // Or a specific hit sound
          this.triggerShake(
            this.SHAKE_INTENSITY * 1.5,
            this.SHAKE_DURATION_MS * 1.5
          );
          this.player.alive = false;
          this.endGame(false, "SHOT DOWN");
        }
        // No need to continue checking other projectiles once player is hit in a frame?
        // Or let multiple hits happen if applicable. For now, just handle one hit.
        // break; // Optional: Stop checking after first hit this frame
      }
      // Optional: Check collision with other enemies?
    }
  }

  renderProjectiles(): void {
    this.context.save();
    this.context.fillStyle = "rgba(255, 80, 80, 0.9)"; // Red color for projectiles
    this.context.shadowColor = "rgba(255, 0, 0, 0.8)";
    this.context.shadowBlur = 8;

    for (const projectile of this.projectiles) {
      this.context.beginPath();
      this.context.arc(
        projectile.x,
        projectile.y,
        projectile.size,
        0,
        Math.PI * 2
      );
      this.context.fill();

      // Debug projectile collision radius
      if (this.debugging) {
        this.context.beginPath();
        this.context.arc(
          projectile.x,
          projectile.y,
          projectile.collisionRadius,
          0,
          Math.PI * 2
        );
        this.context.strokeStyle = "rgba(255, 255, 0, 0.5)";
        this.context.lineWidth = 1;
        this.context.stroke();
      }
    }
    this.context.restore();
  }
} // End of OrbitGame Class

// =============================================================================
// Entity Classes (With update methods and pooling interface)
// =============================================================================

class Entity {
  public alive: boolean = true;
  public width: number = 0;
  public height: number = 0;
  public x: number = 0;
  public y: number = 0;
  public collisionRadius: number = 0;
  // Optional: Add generic reset for pooling if needed by base Entity
  // public reset(): void { this.alive = false; }
}

class Player extends Entity {
  public radius: number;
  public angle: number = 0;
  public spriteAngle: number = 0;
  public score: number = 0;
  public interactionDelta: number = -0.1;
  public shielded: boolean = false;
  public scoreMultiplier: number = 1;
  public magnetActive: boolean = false;
  public gravityReversed: boolean = false;
  public slowTimeActive: boolean = false;

  constructor(x: number, y: number, radius: number, collisionRadius: number) {
    super();
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.collisionRadius = collisionRadius;
    this.alive = false;
  }
  // Player update logic is handled directly in OrbitGame.updatePlayer for now
}

class Enemy extends Entity {
  public type: EnemyType;
  public scale: number = 0.01;
  public scaleTarget: number = 1;
  public alpha: number = 0;
  public alphaTarget: number = 1;
  public time: number = 0;
  public speedMultiplier: number = 1.0; // For speed variations

  // Shooter State
  private timeSinceLastShot: number = 0; // Time since last shot fired (ms)

  // Death Animation State (Improvement: Polish)
  private dying: boolean = false;
  private deathDuration: number = 0.15; // seconds (Shortened)
  private deathTimer: number = 0;

  // Public getter for dying state
  public get isDying(): boolean {
    return this.dying;
  }

  constructor(type: EnemyType) {
    super();
    this.type = type;
    this.alive = true;
    // Reset animation state explicitly
    this.dying = false;
    this.deathTimer = 0;
    this.scale = 0.01;
    this.alpha = 0;
    this.scaleTarget = 1;
    this.alphaTarget = 1;
    // this.shootCooldown = 0; // REMOVE THIS LINE
    this.timeSinceLastShot = 0; // Initialize to 0, don't use game here
  }

  // Improvement: Entity Update Method
  update(timeFactor: number, game: OrbitGame): void {
    // Accept OrbitGame instance
    if (!this.alive && !this.dying) return; // Already dead and finished animation

    // Calculate deltaMs based on timeFactor and a fixed reference rate (e.g., 60fps)
    // Avoids needing direct access to game.FRAMERATE
    const deltaMs = timeFactor * (1000 / 60); // Approximate ms passed based on 60fps reference

    this.time = Math.min(this.time + 0.2 * timeFactor, 100);

    if (this.dying) {
      this.deathTimer += timeFactor / 60; // Increment timer (assuming 60fps base)
      const deathProgress = Math.min(1, this.deathTimer / this.deathDuration);
      this.alpha = (1 - deathProgress) * 0.8; // Fade out
      // this.scale = 1 + deathProgress * 0.5; // Expand slightly while fading (Old)
      this.scale = 1 - deathProgress * 0.5; // Shrink slightly while fading (New)
      this.scaleTarget = this.scale; // Stop normal scaling
      this.alphaTarget = this.alpha;

      if (deathProgress >= 1) {
        this.alive = false; // Mark as fully dead after animation
        this.dying = false;
      }
    } else {
      // Normal spawn animation / behavior
      this.scale += (this.scaleTarget - this.scale) * 0.2 * timeFactor; // Slightly faster scale-in
      this.alpha += (this.alphaTarget - this.alpha) * 0.1 * timeFactor;

      // TODO: Add movement logic here if enemies move
      // --- Add FAST enemy movement logic ---
      // --- Add FAST enemy movement logic ---
      if (this.type === EnemyType.FAST) {
        // Use logical center for movement calculation
        const centerX = game.logicalCenterX;
        const centerY = game.logicalCenterY;
        const dx_sun = this.x - centerX; // Relative to logical center
        const dy_sun = this.y - centerY; // Relative to logical center
        const currentRadius = Math.sqrt(dx_sun * dx_sun + dy_sun * dy_sun);
        if (currentRadius > 0) {
          // Calculate tangential angle (perpendicular to radius vector)
          const angleToCenter = Math.atan2(dy_sun, dx_sun);
          const tangentialAngle = angleToCenter + Math.PI / 2; // 90 degrees offset

          // Base speed, scaled by multiplier and timeFactor
          const baseSpeed = 0.8; // Adjust base speed as needed
          const moveSpeed = baseSpeed * this.speedMultiplier * timeFactor;

          this.x += Math.cos(tangentialAngle) * moveSpeed;
          this.y += Math.sin(tangentialAngle) * moveSpeed;

          // Optional: Add slight drift inwards/outwards?
          // const driftFactor = 0.01;
          // this.x -= Math.cos(angleToCenter) * driftFactor * timeFactor;
          // this.y -= Math.sin(angleToCenter) * driftFactor * timeFactor;
        }
      }
      // --- End of FAST enemy movement logic ---

      // --- Shooting Logic (for SHOOTER type) ---
      if (this.type === EnemyType.SHOOTER && game.player.alive) {
        // Calculate distance to player first
        const dx = game.player.x - this.x;
        const dy = game.player.y - this.y;
        const distSq = dx * dx + dy * dy;
        const minFireDist =
          this.collisionRadius + game.player.collisionRadius + 20; // Enemy rad + player rad + buffer
        const minFireDistSq = minFireDist * minFireDist;

        // Only fire if player is not too close AND cooldown is ready
        if (distSq > minFireDistSq) {
          this.timeSinceLastShot += deltaMs;
          if (this.timeSinceLastShot >= game.SHOOTER_COOLDOWN_MS) {
            // Angle calculation already done
            const angleToPlayer = Math.atan2(dy, dx);

            // Spawn projectile (pass angle, not dx/dy)
            game.spawnProjectile(this.x, this.y, angleToPlayer);

            this.timeSinceLastShot = 0; // Reset timer
          }
        } else {
          // Optional: Reset cooldown if player gets too close? Or just pause it?
          // For now, just prevent firing. Cooldown continues.
          // this.timeSinceLastShot = 0; // Alternative: Reset cooldown if player is close
        }
      }
      // TODO: Add movement logic here if enemies move
      // Example: Apply speedMultiplier if enemy moves
      // this.x += someVelocityX * this.speedMultiplier * timeFactor;
      // this.y += someVelocityY * this.speedMultiplier * timeFactor;
    }
  }

  // Method to trigger death animation (Improvement: Polish)
  startDying(): void {
    if (this.dying || !this.alive) return; // Don't restart if already dying/dead
    this.dying = true;
    this.deathTimer = 0;
    this.collisionRadius = 0; // Prevent further collisions while dying
  }
}

class Notification extends Entity {
  public text: string;
  public scale: number;
  public rgb: number[];
  public alpha: number;

  constructor(
    text: string,
    x: number,
    y: number,
    scale: number,
    rgb: number[]
  ) {
    super();
    this.text = text;
    this.x = x;
    this.y = y;
    this.scale = scale;
    this.rgb = rgb;
    this.alpha = 1.0;
    this.alive = true;
    this.collisionRadius = 0;
  }

  // Improvement: Entity Update Method
  update(timeFactor: number): void {
    if (!this.alive) return;
    this.y -= 0.4 * timeFactor;
    this.alpha -= 0.015 * timeFactor;
    if (this.alpha <= 0) {
      this.alive = false; // Mark as dead when faded
    }
  }
}

class ThrustParticle extends Entity implements Poolable {
  // Implement Poolable
  public angle: number = 0;
  public size: number = 1;
  public alpha: number = 1;
  public speed: number = 1;
  public decay: number = 0.01;

  constructor(
    x: number,
    y: number,
    angle: number,
    size: number,
    alpha: number,
    speed: number,
    decay: number
  ) {
    super();
    this.init(x, y, angle, size, alpha, speed, decay);
  }

  // Initialization method for pooled objects
  init(
    x: number,
    y: number,
    angle: number,
    size: number,
    alpha: number,
    speed: number,
    decay: number
  ): void {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.size = size;
    this.alpha = alpha;
    this.speed = speed;
    this.decay = decay;
    this.alive = true;
    this.collisionRadius = 0;
  }

  // Reset method for pool (Improvement: Pooling)
  reset(): void {
    this.alive = false; // Mark as not alive when in pool
    this.x = -1000; // Move off-screen
    this.y = -1000;
    this.alpha = 0;
    this.size = 0;
  }

  // Improvement: Entity Update Method
  update(timeFactor: number): void {
    if (!this.alive) return;
    this.x += Math.cos(this.angle) * this.speed * timeFactor;
    this.y += Math.sin(this.angle) * this.speed * timeFactor;
    this.alpha -= this.decay * timeFactor;
    this.size = Math.max(0.1, this.size - 0.03 * timeFactor);
    if (this.alpha <= 0 || this.size <= 0.1) {
      this.alive = false; // Mark for removal / return to pool
    }
  }
}

class ExplosionParticle extends Entity implements Poolable {
  public angle: number = 0;
  public size: number = 1;
  public alpha: number = 1;
  public speed: number = 1;
  public decay: number = 0.02; // Controls fade speed
  public color: number[] = [255, 255, 255]; // RGB color

  constructor() {
    super();
    this.alive = false; // Start inactive
    this.collisionRadius = 0;
  }

  init(
    x: number,
    y: number,
    angle: number,
    size: number,
    alpha: number,
    speed: number,
    decay: number,
    color: number[]
  ): void {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.size = size;
    this.alpha = alpha;
    this.speed = speed;
    this.decay = decay;
    this.color = color;
    this.alive = true;
  }

  reset(): void {
    this.alive = false;
    this.x = -1000;
    this.y = -1000;
    this.alpha = 0;
    this.size = 0;
  }

  update(timeFactor: number): void {
    if (!this.alive) return;
    this.x += Math.cos(this.angle) * this.speed * timeFactor;
    this.y += Math.sin(this.angle) * this.speed * timeFactor;
    this.alpha -= this.decay * timeFactor;
    this.size = Math.max(0.1, this.size - 0.05 * timeFactor); // Shrink rate

    if (this.alpha <= 0 || this.size <= 0.1) {
      this.alive = false;
    }
  }
}

// --- Projectile Class ---
class Projectile extends Entity implements Poolable {
  public angle: number = 0;
  public speed: number = 0;
  public size: number = 0;
  public lifetimeMs: number = 0;
  private timeAlive: number = 0;

  constructor() {
    super();
    this.alive = false; // Start inactive
  }

  init(
    x: number,
    y: number,
    angle: number,
    speed: number,
    size: number,
    collisionRadius: number,
    lifetimeMs: number
  ): void {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = speed;
    this.size = size;
    this.collisionRadius = collisionRadius;
    this.lifetimeMs = lifetimeMs;
    this.timeAlive = 0;
    this.alive = true;
  }

  reset(): void {
    this.alive = false;
    this.x = -1000;
    this.y = -1000;
    this.timeAlive = 0;
  }

  update(timeFactor: number): void {
    if (!this.alive) return;

    this.x += Math.cos(this.angle) * this.speed * timeFactor;
    this.y += Math.sin(this.angle) * this.speed * timeFactor;

    // Use constant framerate assumption for lifetime calculation
    const deltaMs = timeFactor * (1000 / 60); // Approx ms
    this.timeAlive += deltaMs;

    if (this.timeAlive >= this.lifetimeMs) {
      this.alive = false; // Mark for removal
    }
  }
}

class PowerUp extends Entity {
  public type: PowerUpType;
  public rotation: number = 0;
  public rotationSpeed: number = (Math.random() - 0.5) * 0.1;
  public alpha: number = 0;
  public alphaTarget: number = 1;
  public scale: number = 0.1;
  public scaleTarget: number = 1;
  public time: number = 0;

  constructor(x: number, y: number, type: PowerUpType) {
    super();
    this.x = x;
    this.y = y;
    this.type = type;
    this.collisionRadius = 15;
    this.alive = true;
  }

  // Improvement: Entity Update Method
  update(timeFactor: number): void {
    if (!this.alive) return;
    this.rotation += this.rotationSpeed * timeFactor;
    this.time = Math.min(this.time + 0.15 * timeFactor, 100);
    this.scale += (this.scaleTarget - this.scale) * 0.1 * timeFactor;
    this.alpha += (this.alphaTarget - this.alpha) * 0.05 * timeFactor;
    // Optional: Add lifetime limit?
    // if (this.time > someLimit) this.alive = false;
  }

  // Moved from OrbitGame, made static for utility
  static getColorByType(type: PowerUpType): string {
    switch (type) {
      case PowerUpType.SHIELD:
        return "rgba(20, 180, 255, 0.9)";
      case PowerUpType.SCORE_MULTIPLIER:
        return "rgba(255, 215, 20, 0.9)";
      case PowerUpType.SLOW_TIME:
        return "rgba(0, 255, 180, 0.9)";
      // Change MAGNET color
      case PowerUpType.MAGNET:
        return "rgba(250, 50, 50, 0.9)"; // Changed from magenta to sun-like red
      case PowerUpType.GRAVITY_REVERSE:
        return "rgba(255, 100, 50, 0.9)";
      // Add case for RANDOM (visual representation before collection)
      case PowerUpType.RANDOM:
        // Pulsating rainbow or just gray/white? Let's use white for now.
        return "rgba(220, 220, 220, 0.9)";
      default:
        return "rgba(200, 200, 200, 0.8)";
    }
  }
  // Added static label getter for UI timers
  static getLabelByType(type: PowerUpType): string {
    let label = "";
    switch (type) {
      case PowerUpType.SHIELD:
        label = "SHIELD";
        break;
      case PowerUpType.SCORE_MULTIPLIER:
        label = "SCORE MULTIPLIER";
        break; // Use full name for abbreviation logic
      case PowerUpType.SLOW_TIME:
        label = "SLOW TIME";
        break;
      case PowerUpType.MAGNET:
        label = "MAGNET";
        break;
      case PowerUpType.GRAVITY_REVERSE:
        label = "ANTI GRAVITY";
        break;
      case PowerUpType.RANDOM:
        label = "RANDOM";
        break; // Keep RANDOM as ??? before pickup
      default:
        return "???";
    }

    // Abbreviation logic: Capitalize, remove vowels (except maybe first letter if vowel?)
    if (type === PowerUpType.RANDOM) return "???"; // Special case for display before pickup

    // Simple vowel removal (can be improved)
    // const abbreviated = label.toUpperCase().replace(/[AEIOU]/g, '');
    // Ensure at least 2 chars, maybe take first 3-4 consonants?
    // Example: SHIELD -> SHLD, SCORE MULTIPLIER -> SCRMLTPLR -> SCRM, SLOW TIME -> SLWTM -> SLWT, MAGNET -> MGNT, ANTI GRAVITY -> NTGRVTY -> NTGR
    // Let's try a simpler fixed length abbreviation
    switch (type) {
      case PowerUpType.SHIELD:
        return "SHLD";
      case PowerUpType.SCORE_MULTIPLIER:
        return "SCRx2"; // Special case for clarity
      case PowerUpType.SLOW_TIME:
        return "SLW";
      case PowerUpType.MAGNET:
        return "MGNT";
      case PowerUpType.GRAVITY_REVERSE:
        return "NGRV"; // Anti-Gravity
      default:
        return label.substring(0, 4).toUpperCase(); // Fallback: First 4 chars, uppercase
    }
  }
  // Instance method calls static method
  public getColor(): string {
    return PowerUp.getColorByType(this.type);
  }
}

// =============================================================================
// Initialization
// =============================================================================

// Shim layer for requestAnimationFrame
window.requestAnimationFrame =
  window.requestAnimationFrame ||
  (window as any).webkitRequestAnimationFrame ||
  (window as any).mozRequestAnimationFrame ||
  (window as any).oRequestAnimationFrame ||
  (window as any).msRequestAnimationFrame ||
  function (callback) {
    window.setTimeout(callback, 1000 / 60);
  };

// Start game when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new OrbitGame();
});
