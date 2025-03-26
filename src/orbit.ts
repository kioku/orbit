import "./main.css";

// Interface definitions
interface Sprites {
  playerSprite: HTMLCanvasElement | null;
  enemySun: HTMLCanvasElement | null;
  enemy: HTMLCanvasElement | null;
}

interface Mouse {
  down: boolean;
}

interface World {
  width: number;
  height: number;
}

class OrbitGame {
  // --- Constants ---
  private readonly FRAMERATE: number = 60;
  private readonly DEFAULT_WIDTH: number = 600;
  private readonly DEFAULT_HEIGHT: number = 600;
  private readonly ENEMY_SIZE: number = 10;
  private readonly SUN_SIZE_MULTIPLIER: number = 2; // Sun size relative to ENEMY_SIZE
  private readonly ENEMY_TYPE_NORMAL: number = 1;
  private readonly ENEMY_TYPE_SUN: number = 2;
  private readonly STATE_WELCOME: string = "state-welcome"; // Match CSS classes
  private readonly STATE_PLAYING: string = "state-playing";
  private readonly STATE_LOSER: string = "state-loser";
  private readonly STATE_WINNER: string = "state-winner";
  private readonly PLAYER_START_RADIUS: number = 150;
  private readonly PLAYER_COLLISION_RADIUS: number = 12;
  private readonly PLAYER_SPRITE_SCALE: number = 1.0; // Ship size (Fix 1)
  private readonly PLAYER_BASE_ACCELERATION = 0.03;
  private readonly PLAYER_BASE_GRAVITY = 0.025;
  private readonly PLAYER_MAX_INTERACTION_DELTA = 1.5;
  private readonly PLAYER_MIN_INTERACTION_DELTA = -0.8;
  private readonly PLAYER_ROTATION_SPEED_FACTOR = 5.5; // Lower is faster linear speed for given radius change rate
  private readonly PLAYER_MIN_ORBIT_RADIUS = 50;
  private readonly POWERUP_SPAWN_INTERVAL_MS: number = 5000; // 5 seconds
  private readonly POWERUP_DURATION_MS: number = 10000; // 10 seconds
  private readonly POWERUP_MAGNET_RANGE: number = 150;
  private readonly POWERUP_MAGNET_STRENGTH: number = 2;
  private readonly SUN_DANGER_RADIUS_FACTOR: number = 0.03; // % of world min dimension added to base radius
  // Enemy Spawning (Improvement 2)
  private readonly MAX_ENEMIES: number = 15; // Max non-sun enemies on screen
  private readonly ENEMY_SPAWN_INTERVAL_MS_BASE: number = 1000; // Initial spawn delay
  private readonly ENEMY_SPAWN_INTERVAL_MS_MIN: number = 250; // Minimum spawn delay
  private readonly ENEMY_SPAWN_INTERVAL_REDUCTION_PER_SEC: number = 5; // How many ms faster per game second
  // End Improvement 2
  private readonly ENEMY_MIN_SPAWN_RADIUS_OFFSET: number = 10; // min enemy radius = PLAYER_MIN_ORBIT_RADIUS + offset
  private readonly ENEMY_MAX_SPAWN_RADIUS_OFFSET: number = 10; // max enemy radius = max player radius - offset
  private readonly ENEMY_MIN_DISTANCE_FROM_PLAYER: number = 100;
  private readonly THRUST_PARTICLE_COUNT_MIN = 1;
  private readonly THRUST_PARTICLE_COUNT_MAX = 3;
  private readonly THRUST_PARTICLE_SPREAD = 0.5; // Radians
  private readonly THRUST_PARTICLE_OFFSET_MIN = 15;
  private readonly THRUST_PARTICLE_OFFSET_MAX = 25;

  // --- Properties ---
  private sprites: Sprites = {
    playerSprite: null,
    enemySun: null,
    enemy: null,
  };
  private mouse: Mouse = { down: false };
  private canvas!: HTMLCanvasElement; // Assert non-null after init
  private context!: CanvasRenderingContext2D; // Assert non-null after init
  private container!: HTMLElement; // Assert non-null after init
  private startButton!: HTMLButtonElement; // Assert non-null after init
  private settingsButton!: HTMLButtonElement; // Assert non-null after init

  private playing: boolean = false;
  private duration: number = 0; // Game time in seconds
  private frameCount: number = 0;
  private timeLastFrame: number = 0;
  private timeLastSecond: number = 0;
  private timeGameStart: number = 0;
  private timeDelta: number = 0;
  private timeFactor: number = 1; // Scales physics updates based on frame time delta
  private fps: number = 0;
  private fpsMin: number = 1000;
  private fpsMax: number = 0;
  private framesThisSecond: number = 0;

  private enemies: Enemy[] = [];
  private player!: Player; // Assert non-null after init/reset
  private sunEnemy: Enemy | null = null; // Direct reference to the sun
  private playerDistToSunSq: number = 0; // Store squared distance player <-> sun (Improvement 1)

  private world: World = {
    width: this.DEFAULT_WIDTH,
    height: this.DEFAULT_HEIGHT,
  };
  private notifications: Notification[] = [];
  private thrustParticles: ThrustParticle[] = [];
  private debugging: boolean = false;
  private gameState: string = this.STATE_WELCOME;
  private gameTimer: number = 60; // Game duration in seconds (default 60s)
  private gameMode: string = "survival"; // Default game mode
  private victoryScore: number = 30; // Score needed to win in score mode
  private powerUps: PowerUp[] = [];
  private powerUpTypes = {
    SHIELD: 1,
    SCORE_MULTIPLIER: 2,
    SLOW_TIME: 3,
    MAGNET: 4,
    GRAVITY_REVERSE: 5,
  };
  private activePowerUps: Map<number, number> = new Map(); // type -> endTime
  private lastPowerUpSpawn: number = 0;
  // Enemy Spawning Timers (Improvement 2)
  private timeLastEnemySpawn: number = 0;
  private currentEnemySpawnInterval: number = this.ENEMY_SPAWN_INTERVAL_MS_BASE;

  // Use getter for dynamic calculation based on world size
  private get sunBaseRadius(): number {
    return this.ENEMY_SIZE * this.SUN_SIZE_MULTIPLIER;
  }
  private get sunDangerRadius(): number {
    const worldMinDimension = Math.min(this.world.width, this.world.height);
    return (
      this.sunBaseRadius + worldMinDimension * this.SUN_DANGER_RADIUS_FACTOR
    );
  }
  private get maxPlayerRadius(): number {
    // Max radius player can reach without dying (slight buffer)
    return Math.min(this.world.width, this.world.height) / 2 - 20;
  }

  constructor() {
    // Initialize properties that need it before calling methods
    this.timeLastFrame = Date.now();
    this.timeLastSecond = Date.now();
    this.lastPowerUpSpawn = Date.now();
    this.timeLastEnemySpawn = Date.now(); // Initialize spawn timer
    this.initialize();
  }

  private initialize(): void {
    this.container = document.getElementById("game") as HTMLElement;
    this.canvas = document.querySelector("#world") as HTMLCanvasElement;

    if (!(this.container && this.canvas && this.canvas.getContext)) {
      alert("Initialization failed: Cannot find required elements.");
      return; // Stop initialization
    }

    this.context = this.canvas.getContext("2d") as CanvasRenderingContext2D;

    // --- Button Creation (using CSS classes) ---
    this.startButton = document.createElement("button");
    this.startButton.id = "start-button";
    this.startButton.classList.add("start-button");
    this.container.appendChild(this.startButton);
    // Text content set in reset/endGame

    // Add click/touch listeners for start button
    this.startButton.addEventListener(
      "click",
      this.onStartButtonClick.bind(this)
    );
    this.startButton.addEventListener(
      "touchend",
      (e) => {
        e.preventDefault(); // Prevent potential double-triggering / zooming
        this.onStartButtonClick(e);
      },
      { passive: false }
    );

    // Create settings button
    this.settingsButton = document.createElement("button");
    this.settingsButton.id = "settings-button";
    this.settingsButton.classList.add("settings-button");
    this.container.appendChild(this.settingsButton);

    // Add click/touch listeners for settings
    this.settingsButton.addEventListener(
      "click",
      this.onSettingsButtonClick.bind(this)
    );
    this.settingsButton.addEventListener(
      "touchstart",
      this.onSettingsButtonClick.bind(this),
      { passive: false }
    );

    // --- Event Listeners ---
    document.addEventListener(
      "keydown",
      this.onKeyDownHandler.bind(this),
      false
    );
    document.addEventListener(
      "mousedown",
      this.onMouseDownHandler.bind(this),
      false
    );
    document.addEventListener(
      "mousemove",
      this.onMouseMoveHandler.bind(this),
      false
    ); // Keep for potential future use
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

    // --- Initial Setup ---
    this.onWindowResizeHandler(); // Set initial size
    this.createSprites();
    this.setGameState(this.STATE_WELCOME); // Set initial state and body class

    this.reset(); // Reset game variables
    this.update(); // Start the game loop
  }

  private setGameState(newState: string): void {
    this.gameState = newState;
    document.body.className = newState; // Apply class to body for CSS rules
  }

  private onSettingsButtonClick(e: Event): void {
    e.preventDefault();
    e.stopPropagation();

    this.debugging = !this.debugging;
    this.settingsButton.classList.toggle(
      "settings-button--debugging",
      this.debugging
    );

    console.log(`Debug mode: ${this.debugging ? "ON" : "OFF"}`);
  }

  private onKeyDownHandler(e: KeyboardEvent): void {
    // Restart game
    if (
      (e.key === "r" || e.key === "R") &&
      (this.gameState === this.STATE_WINNER ||
        this.gameState === this.STATE_LOSER)
    ) {
      // Simulate a click/tap on the start button to restart
      this.onStartButtonClick(new MouseEvent("click"));
    }

    // Toggle game mode (only when not playing)
    if ((e.key === "m" || e.key === "M") && !this.playing) {
      this.gameMode = this.gameMode === "survival" ? "score" : "survival";
      this.notifyGameMode();
    }

    // Toggle debugging
    if (e.key === "d" || e.key === "D") {
      this.onSettingsButtonClick(e); // Reuse existing toggle logic
    }
  }

  private notifyGameMode(): void {
    const text =
      this.gameMode === "survival"
        ? `SURVIVAL MODE: ${this.gameTimer}s`
        : `SCORE MODE: ${this.victoryScore} PTS`;
    const color =
      this.gameMode === "survival" ? [50, 200, 255] : [255, 200, 50];
    this.notify(
      text,
      this.world.width / 2,
      this.world.height / 2.5,
      1.5,
      color
    );
  }

  private createSprites(): void {
    // --- Enemy Sprite ---
    let cvsEnemy = document.createElement("canvas");
    let ctxEnemy: CanvasRenderingContext2D;
    const enemySpriteSize = 48; // Use a variable
    cvsEnemy.width = enemySpriteSize;
    cvsEnemy.height = enemySpriteSize;
    ctxEnemy = cvsEnemy.getContext("2d")!;
    ctxEnemy.beginPath();
    // Draw centered arc
    ctxEnemy.arc(
      enemySpriteSize * 0.5,
      enemySpriteSize * 0.5,
      this.ENEMY_SIZE,
      0,
      Math.PI * 2,
      true
    );
    ctxEnemy.fillStyle = "rgba(0, 200, 220, 0.9)";
    ctxEnemy.shadowColor = "rgba(0, 240, 255, 0.9)";
    ctxEnemy.shadowBlur = 15; // Adjusted blur
    ctxEnemy.fill();
    this.sprites.enemy = cvsEnemy;

    // --- Player Sprite - Revised Appearance (Fix 1) ---
    let cvsPlayer = document.createElement("canvas");
    let ctxPlayer: CanvasRenderingContext2D;
    const playerSpriteSize = 64; // Keep base canvas size reasonable for caching
    cvsPlayer.width = playerSpriteSize;
    cvsPlayer.height = playerSpriteSize;
    ctxPlayer = cvsPlayer.getContext("2d")!;

    ctxPlayer.translate(playerSpriteSize / 2, playerSpriteSize / 2); // Center drawing origin

    // Style settings for the player ship
    ctxPlayer.fillStyle = "rgba(255, 255, 255, 0.95)"; // White color
    ctxPlayer.shadowColor = "rgba(200, 220, 255, 0.8)"; // White/light blue glow
    ctxPlayer.shadowBlur = 15; // Increased blur behind the ship
    ctxPlayer.lineWidth = 2; // Gives fill a slightly softer edge with lineJoin
    ctxPlayer.lineJoin = "round"; // Round the corners of the filled shape

    // Draw the ship shape (adjust coordinates relative to new 0,0 center)
    // Using PLAYER_SPRITE_SCALE to control the drawn size within the sprite canvas
    const shipLength = 20 * this.PLAYER_SPRITE_SCALE; // Base length for drawing geometry
    const shipWidth = 15 * this.PLAYER_SPRITE_SCALE; // Base width for drawing geometry
    ctxPlayer.beginPath();
    ctxPlayer.moveTo(shipLength * 0.6, 0); // Nose point
    ctxPlayer.lineTo(-shipLength * 0.4, shipWidth * 0.5); // Back corner 1
    ctxPlayer.lineTo(-shipLength * 0.3, 0); // Engine middle indent (slight)
    ctxPlayer.lineTo(-shipLength * 0.4, -shipWidth * 0.5); // Back corner 2
    ctxPlayer.closePath();
    ctxPlayer.fill(); // Fill the rounded shape
    // Note: ctxPlayer.stroke() could be added here if an outline is desired

    ctxPlayer.setTransform(1, 0, 0, 1, 0, 0); // Reset transform before saving sprite
    this.sprites.playerSprite = cvsPlayer;
    // --- End Fix 1 ---

    // --- Sun Enemy Sprite ---
    let cvsSun = document.createElement("canvas");
    let ctxSun: CanvasRenderingContext2D;
    const sunSpriteSize = 64; // Use a variable
    cvsSun.width = sunSpriteSize;
    cvsSun.height = sunSpriteSize;
    ctxSun = cvsSun.getContext("2d")!;
    ctxSun.beginPath();
    // Draw centered arc
    ctxSun.arc(
      sunSpriteSize * 0.5,
      sunSpriteSize * 0.5,
      this.sunBaseRadius,
      0,
      Math.PI * 2,
      true
    );
    ctxSun.fillStyle = "rgba(250, 50, 50, 1)";
    ctxSun.shadowColor = "rgba(250, 20, 20, 0.9)";
    ctxSun.shadowBlur = 20;
    ctxSun.fill();
    this.sprites.enemySun = cvsSun;
  }

  private onStartButtonClick(e: Event): void {
    e.preventDefault();

    // If game ended, reset first before starting
    if (
      this.gameState === this.STATE_LOSER ||
      this.gameState === this.STATE_WINNER
    ) {
      this.reset();
    }

    // Prevent starting if already playing
    if (this.playing) {
      return;
    }

    // Reset necessary game state for a fresh start
    this.resetGameStats(); // Ensure stats/timers are reset for a new round

    // Start the game
    this.player.alive = true;
    this.playing = true;
    this.timeGameStart = Date.now();
    this.setGameState(this.STATE_PLAYING); // This hides the button via CSS

    // Initial game mode notification
    this.notifyGameMode();
  }

  // Resets everything for a completely new game session (e.g., after page load or explicit full reset)
  private reset(): void {
    this.enemies = [];
    this.thrustParticles = [];
    this.notifications = [];
    this.powerUps = [];
    this.activePowerUps.clear();

    // Create the player centered
    this.player = new Player(
      this.world.width / 2 + this.PLAYER_START_RADIUS, // Start on orbit
      this.world.height / 2,
      this.PLAYER_START_RADIUS,
      this.PLAYER_COLLISION_RADIUS
    );
    this.player.angle = 0; // Start at a predictable angle

    // Create the sun reliably
    this.sunEnemy = new Enemy();
    this.sunEnemy.type = this.ENEMY_TYPE_SUN;
    this.sunEnemy.x = this.world.width / 2;
    this.sunEnemy.y = this.world.height / 2;
    this.sunEnemy.collisionRadius = this.sunBaseRadius;
    this.sunEnemy.scale = 1; // Sun starts at full size
    this.sunEnemy.alpha = 1;
    this.sunEnemy.scaleTarget = 1;
    this.sunEnemy.alphaTarget = 1;
    this.sunEnemy.alive = true; // Sun is always 'alive'
    this.enemies.push(this.sunEnemy); // Add sun to enemies list

    this.resetGameStats(); // Reset scores, timers etc.

    this.setGameState(this.STATE_WELCOME); // Set initial state
    this.startButton.textContent = "INITIALIZE"; // Set initial button text
  }

  // Resets only the elements needed for restarting a round (score, time, player state)
  private resetGameStats(): void {
    this.playing = false;
    this.duration = 0;
    if (this.player) {
      // Ensure player exists before resetting its properties
      this.player.score = 0;
      this.player.alive = false; // Player starts dead until game starts
      this.player.shielded = false;
      this.player.scoreMultiplier = 1;
      this.player.magnetActive = false;
      this.player.gravityReversed = false;
      this.player.slowTimeActive = false; // Reset powerup states
      this.player.interactionDelta = -0.1; // Reset delta
      this.player.radius = this.PLAYER_START_RADIUS; // Reset radius
    }
    this.powerUps = []; // Clear existing powerups
    this.activePowerUps.clear();
    this.lastPowerUpSpawn = Date.now(); // Reset spawn timer
    this.timeLastEnemySpawn = Date.now(); // Reset enemy spawn timer too (Improvement 2)
    this.currentEnemySpawnInterval = this.ENEMY_SPAWN_INTERVAL_MS_BASE; // Reset spawn rate (Improvement 2)
    this.timeFactor = 1; // Reset time factor

    // Clear non-persistent notifications (like score popups)
    this.notifications = this.notifications.filter(() => {
      // Maybe keep certain notifications? For now, clear all on restart.
      return false;
    });
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

  // --- Input Handlers ---
  private onMouseDownHandler(event: MouseEvent): void {
    // Prevent interaction if clicking on buttons
    if ((event.target as HTMLElement).closest("button")) return;
    this.mouse.down = true;
  }

  private onMouseMoveHandler(event: MouseEvent): void {
    // Can be used for aiming or other features later
    event.preventDefault();
  }

  private onMouseUpHandler(event: MouseEvent): void {
    event.preventDefault();
    this.mouse.down = false;
  }

  private onTouchStartHandler(event: TouchEvent): void {
    // Prevent interaction if touching buttons
    if ((event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    this.mouse.down = true;
    if (this.debugging)
      console.log("Touch start detected, mouse.down =", this.mouse.down);
  }

  private onTouchMoveHandler(event: TouchEvent): void {
    // Prevent scrolling during gameplay
    if (this.playing) {
      event.preventDefault();
    }
    // Ensure mouse.down stays true if touch moves off/on target
    if (event.touches.length > 0) {
      this.mouse.down = true;
    }
  }

  private onTouchEndHandler(event: TouchEvent): void {
    // Only set mouse.down to false if *all* touches are lifted
    if (event.touches.length === 0) {
      // Only prevent default if a touch actually ended (might prevent clicks elsewhere otherwise)
      // Check if the target is the canvas or within the game container
      if (
        event.target === this.canvas ||
        this.container.contains(event.target as Node)
      ) {
        event.preventDefault();
      }
      this.mouse.down = false;
      if (this.debugging)
        console.log("Touch end detected, mouse.down =", this.mouse.down);
    }
  }

  // --- Update Logic ---

  private updatePlayer(): void {
    const centerX: number = this.world.width / 2;
    const centerY: number = this.world.height / 2;

    // Calculate squared distance to sun once per frame (Improvement 1)
    const dx_sun = this.player.x - centerX;
    const dy_sun = this.player.y - centerY;
    this.playerDistToSunSq = dx_sun * dx_sun + dy_sun * dy_sun;

    // Update slowTimeActive based on map (Improvement 3 clarification)
    // Other flags (shielded, magnetActive, etc.) are now set directly on collect/expire
    this.player.slowTimeActive = this.activePowerUps.has(
      this.powerUpTypes.SLOW_TIME
    );

    // Apply time scale based on slow time power-up
    const timeScale = this.player.slowTimeActive ? 0.5 : 1;
    const effectiveTimeFactor = this.timeFactor * timeScale;

    const gravityMult = this.player.gravityReversed ? -1 : 1;
    const pushAcceleration =
      this.PLAYER_BASE_ACCELERATION * effectiveTimeFactor;
    const gravityStrength = this.PLAYER_BASE_GRAVITY * effectiveTimeFactor;

    if (this.mouse.down) {
      // Push outwards (or inwards if reversed)
      this.player.interactionDelta = Math.min(
        this.PLAYER_MAX_INTERACTION_DELTA,
        this.player.interactionDelta + pushAcceleration * gravityMult
      );
      // Add thrust particles only when actively pushing
      if (this.frameCount % 3 === 0) {
        // Throttle particle creation
        this.createThrustParticle();
      }
    } else {
      // Drift inwards (or outwards if reversed) due to gravity
      this.player.interactionDelta = Math.max(
        this.PLAYER_MIN_INTERACTION_DELTA,
        this.player.interactionDelta - gravityStrength * gravityMult
      );
    }

    // Update radius based on interaction delta
    this.player.radius = Math.max(
      this.PLAYER_MIN_ORBIT_RADIUS,
      Math.min(
        this.maxPlayerRadius,
        this.player.radius + this.player.interactionDelta * effectiveTimeFactor
      ) // Apply time factor here too
    );

    // Rotational velocity inversely proportional to radius for constant linear speed feel
    const rotationVel: number =
      this.PLAYER_ROTATION_SPEED_FACTOR / Math.max(1, this.player.radius); // Avoid division by zero

    // Update angle
    this.player.angle += rotationVel * effectiveTimeFactor; // Apply time factor

    // Calculate position
    this.player.x = centerX + Math.cos(this.player.angle) * this.player.radius;
    this.player.y = centerY + Math.sin(this.player.angle) * this.player.radius;

    // Calculate velocity components for orientation
    const dx =
      -Math.sin(this.player.angle) * rotationVel * this.player.radius +
      Math.cos(this.player.angle) * this.player.interactionDelta;
    const dy =
      Math.cos(this.player.angle) * rotationVel * this.player.radius +
      Math.sin(this.player.angle) * this.player.interactionDelta;

    // Set sprite angle based on motion direction
    this.player.spriteAngle = Math.atan2(dy, dx);
  }

  private renderOrbit(): void {
    const centerX: number = this.world.width / 2;
    const centerY: number = this.world.height / 2;

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
    const centerX = this.world.width / 2;
    const centerY = this.world.height / 2;

    // --- Timer-based Spawning (Improvement 2) ---
    // Calculate current number of non-sun enemies
    let activeEnemies = 0;
    for (const enemy of this.enemies) {
      if (enemy.type !== this.ENEMY_TYPE_SUN) {
        activeEnemies++;
      }
    }

    // Decrease spawn interval over time, clamping at the minimum
    this.currentEnemySpawnInterval = Math.max(
      this.ENEMY_SPAWN_INTERVAL_MS_MIN,
      this.ENEMY_SPAWN_INTERVAL_MS_BASE -
        this.duration * this.ENEMY_SPAWN_INTERVAL_REDUCTION_PER_SEC
    );

    // Check if it's time to spawn and if below max count
    if (
      activeEnemies < this.MAX_ENEMIES &&
      now - this.timeLastEnemySpawn > this.currentEnemySpawnInterval
    ) {
      const minSpawnRadius =
        this.PLAYER_MIN_ORBIT_RADIUS + this.ENEMY_MIN_SPAWN_RADIUS_OFFSET;
      const maxSpawnRadius =
        this.maxPlayerRadius - this.ENEMY_MAX_SPAWN_RADIUS_OFFSET;

      if (maxSpawnRadius > minSpawnRadius) {
        // Ensure valid spawn range exists
        let enemy = new Enemy(); // Create outside loop
        enemy.type = this.ENEMY_TYPE_NORMAL;

        let validPosition = false;
        let attempts = 0;
        const maxAttempts = 10; // Limit attempts to find a good spot

        while (!validPosition && attempts < maxAttempts) {
          // Choose random position within the allowed orbital band
          const spawnRadius =
            minSpawnRadius + Math.random() * (maxSpawnRadius - minSpawnRadius);
          const spawnAngle = Math.random() * Math.PI * 2;
          enemy.x = centerX + Math.cos(spawnAngle) * spawnRadius;
          enemy.y = centerY + Math.sin(spawnAngle) * spawnRadius;

          // Check distance from player to avoid spawning too close
          const dx_player = enemy.x - this.player.x;
          const dy_player = enemy.y - this.player.y;
          const distSq = dx_player * dx_player + dy_player * dy_player;

          if (
            distSq >
            this.ENEMY_MIN_DISTANCE_FROM_PLAYER *
              this.ENEMY_MIN_DISTANCE_FROM_PLAYER
          ) {
            validPosition = true;
          }
          attempts++;
        }

        // Only add if a valid position was found
        if (validPosition) {
          enemy.collisionRadius = this.ENEMY_SIZE;
          this.enemies.push(enemy);
          this.timeLastEnemySpawn = now; // Reset timer only on successful spawn
        } else {
          // Optional: Slightly delay next spawn attempt if finding a spot failed
          // this.timeLastEnemySpawn = now - this.currentEnemySpawnInterval * 0.5;
        }
      }
    }
    // --- End Improvement 2 ---

    // --- Update Existing Enemies ---
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      // Iterate downwards for safe removal
      const enemy = this.enemies[i];

      // Skip the sun for most updates/checks
      if (enemy.type === this.ENEMY_TYPE_SUN) continue;

      // Update enemy animation/state (scale, alpha)
      enemy.time = Math.min(enemy.time + 0.2 * this.timeFactor, 100); // Cap time value
      enemy.scale += (enemy.scaleTarget - enemy.scale) * 0.3 * this.timeFactor; // Use timeFactor
      enemy.alpha += (enemy.alphaTarget - enemy.alpha) * 0.1 * this.timeFactor; // Use timeFactor

      // Apply magnet effect (using player's direct state from Improvement 3)
      if (this.player.magnetActive) {
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        const distSq = dx * dx + dy * dy;

        // Check range and avoid division by zero if enemy is already on top
        if (
          distSq < this.POWERUP_MAGNET_RANGE * this.POWERUP_MAGNET_RANGE &&
          distSq > 1
        ) {
          const dist = Math.sqrt(distSq);
          const moveX =
            (dx / dist) * this.POWERUP_MAGNET_STRENGTH * this.timeFactor;
          const moveY =
            (dy / dist) * this.POWERUP_MAGNET_STRENGTH * this.timeFactor;
          enemy.x += moveX;
          enemy.y += moveY;
        }
      }

      // Check collision with player
      if (enemy.alive && this.collides(this.player, enemy)) {
        this.enemies.splice(i, 1); // Remove enemy
        enemy.alive = false;

        const points = this.player.scoreMultiplier; // Use direct player state (Improvement 3)
        this.player.score += points;

        this.notify(
          `+${points}`, // Always show + sign
          enemy.x, // Notify at enemy location
          enemy.y,
          1,
          [250, 250, 100]
        );
      }
      // Optional: Remove enemies that fade out completely or go out of bounds
      // else if (enemy.alpha <= 0.01) {
      //     this.enemies.splice(i, 1);
      // }
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
        this.context.strokeStyle = "rgba(0, 255, 255, 0.7)";
        // Adjust line width so it looks consistent regardless of scale
        this.context.lineWidth = 2 / this.PLAYER_SPRITE_SCALE;
        this.context.stroke();
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
      if (!enemy.alive && enemy.type !== this.ENEMY_TYPE_SUN) continue; // Skip dead normal enemies

      const sprite =
        enemy.type === this.ENEMY_TYPE_NORMAL
          ? this.sprites.enemy
          : this.sprites.enemySun;
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
          enemy.type === this.ENEMY_TYPE_SUN
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
    const margin = 8;
    // Calculate size based on smallest dimension to maintain square
    const minDimension = Math.min(window.innerWidth, window.innerHeight);
    const effectiveSize = Math.max(100, minDimension - margin * 2); // Ensure a minimum size

    this.world.width = effectiveSize;
    this.world.height = effectiveSize;

    // Update container and canvas size
    this.container.style.width = `${effectiveSize}px`;
    this.container.style.height = `${effectiveSize}px`;
    this.canvas.width = effectiveSize;
    this.canvas.height = effectiveSize;

    // Re-center the sun if it exists
    this.updateSunPosition();

    // Buttons position themselves via CSS (absolute, top/left/transform)
  }

  // Ensure sun is always centered after resize or initialization
  private updateSunPosition(): void {
    if (this.sunEnemy) {
      this.sunEnemy.x = this.world.width / 2;
      this.sunEnemy.y = this.world.height / 2;
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
      if (enemy.type === this.ENEMY_TYPE_SUN) continue; // Don't visualize sun collision boundary this way

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

  private createThrustParticle(): void {
    if (!this.player) return;

    const centerX: number = this.world.width / 2;
    const centerY: number = this.world.height / 2;

    // Angle towards center (or away if reversed) determines base direction
    const directionAngle = Math.atan2(
      centerY - this.player.y,
      centerX - this.player.x
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
      const spread = (Math.random() - 0.5) * this.THRUST_PARTICLE_SPREAD;
      const angle = particleBaseAngle + spread;
      const offsetDistance =
        this.THRUST_PARTICLE_OFFSET_MIN +
        Math.random() *
          (this.THRUST_PARTICLE_OFFSET_MAX - this.THRUST_PARTICLE_OFFSET_MIN);

      // Position particle slightly behind the player relative to thrust direction
      const startX = this.player.x + Math.cos(angle) * offsetDistance;
      const startY = this.player.y + Math.sin(angle) * offsetDistance;

      const size = 1 + Math.random() * 2; // Small variation in size
      const alpha = 0.5 + Math.random() * 0.4; // Start fairly transparent
      const speed = 0.5 + Math.random() * 1.5; // Slower particles
      const decay = 0.02 + Math.random() * 0.03; // Faster decay

      this.thrustParticles.push(
        new ThrustParticle(startX, startY, angle, size, alpha, speed, decay)
      );
    }
  }

  private updateThrustParticles(): void {
    for (let i = this.thrustParticles.length - 1; i >= 0; i--) {
      const particle = this.thrustParticles[i];
      particle.update(this.timeFactor);

      if (particle.alpha <= 0 || particle.size <= 0.1) {
        this.thrustParticles.splice(i, 1);
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

  // --- PowerUps ---
  private spawnPowerUp(): void {
    const now = Date.now();
    if (now - this.lastPowerUpSpawn < this.POWERUP_SPAWN_INTERVAL_MS) return;

    const centerX = this.world.width / 2;
    const centerY = this.world.height / 2;
    const minRadius = this.PLAYER_MIN_ORBIT_RADIUS + 30; // Spawn outside inner radius
    const maxRadius = this.maxPlayerRadius - 30; // Spawn inside outer radius
    if (maxRadius <= minRadius) return; // Avoid issues if world too small

    const radius = minRadius + Math.random() * (maxRadius - minRadius);
    const angle = Math.random() * Math.PI * 2;

    // Choose a random type from available power-ups
    const typeKeys = Object.keys(this.powerUpTypes);
    const randomTypeKey = typeKeys[
      Math.floor(Math.random() * typeKeys.length)
    ] as keyof typeof this.powerUpTypes;
    const randomType = this.powerUpTypes[randomTypeKey];

    const powerUp = new PowerUp(
      centerX + Math.cos(angle) * radius,
      centerY + Math.sin(angle) * radius,
      randomType
    );

    this.powerUps.push(powerUp);
    this.lastPowerUpSpawn = now;
  }

  private updatePowerUps(): void {
    const now = Date.now();

    // Handle Powerup Expiry & Reset State Directly (Improvement 3)
    const expiredKeys: number[] = [];
    for (const [type, endTime] of this.activePowerUps.entries()) {
      if (now >= endTime) {
        expiredKeys.push(type);
      }
    }
    expiredKeys.forEach((type) => {
      this.activePowerUps.delete(type);
      // Directly reset player state when powerup expires
      switch (type) {
        case this.powerUpTypes.SHIELD:
          this.player.shielded = false;
          break;
        case this.powerUpTypes.SCORE_MULTIPLIER:
          this.player.scoreMultiplier = 1;
          break;
        case this.powerUpTypes.SLOW_TIME:
          this.player.slowTimeActive = false;
          break; // Reset here too
        case this.powerUpTypes.MAGNET:
          this.player.magnetActive = false;
          break;
        case this.powerUpTypes.GRAVITY_REVERSE:
          this.player.gravityReversed = false;
          break;
      }
      console.log(`PowerUp ${type} expired`);
    });

    // Check collisions with spawned powerups
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i];
      powerUp.update(this.timeFactor);

      // Remove collected or faded out powerups
      if (this.player.alive && this.collides(this.player, powerUp)) {
        this.collectPowerUp(powerUp);
        this.powerUps.splice(i, 1); // Remove collected powerup
      } else if (powerUp.alpha <= 0.01) {
        // Also remove if faded out
        this.powerUps.splice(i, 1);
      }
    }

    // Spawn new powerups periodically
    this.spawnPowerUp();
  }

  private collectPowerUp(powerUp: PowerUp): void {
    // Allow refreshing duration if already active
    const endTime = Date.now() + this.POWERUP_DURATION_MS;
    this.activePowerUps.set(powerUp.type, endTime);

    let notificationText = "";
    let notificationColor: number[] = [200, 200, 200];

    // Directly Set Player State on Collect (Improvement 3)
    switch (powerUp.type) {
      case this.powerUpTypes.SHIELD:
        this.player.shielded = true;
        notificationText = "SHIELD ACTIVE";
        notificationColor = [0, 255, 255];
        break;
      case this.powerUpTypes.SCORE_MULTIPLIER:
        // Ensure multiplier doesn't stack if collected again quickly (it just refreshes duration)
        this.player.scoreMultiplier = 2;
        notificationText = "2X SCORE";
        notificationColor = [255, 255, 0];
        break;
      case this.powerUpTypes.SLOW_TIME:
        this.player.slowTimeActive = true; // Set directly, checked in updatePlayer
        notificationText = "TIME WARP";
        notificationColor = [0, 255, 150];
        break;
      case this.powerUpTypes.MAGNET:
        this.player.magnetActive = true;
        notificationText = "MAGNETISM";
        notificationColor = [255, 0, 255];
        break;
      case this.powerUpTypes.GRAVITY_REVERSE:
        this.player.gravityReversed = true;
        notificationText = "ANTI-GRAVITY";
        notificationColor = [255, 128, 0];
        break;
    }

    if (notificationText) {
      this.notify(
        notificationText,
        this.player.x,
        this.player.y - 25,
        1.2,
        notificationColor
      );
    }
    console.log(`PowerUp ${powerUp.type} collected`);
  }

  private renderPowerUps(): void {
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

  // --- Game Loop ---

  private update(): void {
    // --- Timing ---
    const now = Date.now();
    this.timeDelta = Math.min(200, now - this.timeLastFrame); // Clamp delta time to avoid large jumps
    this.timeFactor = this.timeDelta / (1000 / this.FRAMERATE); // Normalize based on target framerate
    this.timeLastFrame = now;
    this.framesThisSecond++;
    this.frameCount++;

    // --- Game Logic Update ---
    if (this.playing && this.player.alive) {
      this.duration = (now - this.timeGameStart) / 1000; // Keep track of game duration

      this.updatePlayer(); // Calculates playerDistToSunSq (Improvement 1)
      this.updateEnemies(); // Includes timer-based spawning (Improvement 2)
      this.updatePowerUps(); // Includes direct state reset on expiry (Improvement 3)
      this.updateThrustParticles();

      this.checkEndConditions(); // Uses playerDistToSunSq (Improvement 1)
    }

    // --- FPS Calculation ---
    if (now > this.timeLastSecond + 1000) {
      this.fps = this.framesThisSecond;
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

  private checkEndConditions(): void {
    if (!this.player || !this.player.alive) return; // Should not happen if playing, but safe check

    const centerX = this.world.width / 2; // Still needed for push direction
    const centerY = this.world.height / 2;
    // Use pre-calculated squared distance (Improvement 1)
    const useDistSq = this.playerDistToSunSq;

    // 1. Collision with Sun Danger Zone
    if (useDistSq < this.sunDangerRadius * this.sunDangerRadius) {
      if (this.player.shielded) {
        // Use direct player state (Improvement 3)
        // Break shield, remove powerup, notify
        this.activePowerUps.delete(this.powerUpTypes.SHIELD); // Remove from map
        this.player.shielded = false; // Update state immediately
        this.notify(
          "SHIELD DESTROYED!",
          this.player.x,
          this.player.y - 20,
          1.5,
          [255, 100, 100]
        );

        // Give a small outward nudge
        this.player.interactionDelta = this.PLAYER_MAX_INTERACTION_DELTA * 0.5; // Moderate push
        // Instantly move player just outside danger zone to prevent immediate re-collision
        const angle = Math.atan2(
          this.player.y - centerY,
          this.player.x - centerX
        ); // Correct angle calc
        this.player.radius = this.sunDangerRadius + 5; // Move just outside
        // Update position and recalculate distance immediately for consistency
        this.player.x = centerX + Math.cos(angle) * this.player.radius;
        this.player.y = centerY + Math.sin(angle) * this.player.radius;
        this.playerDistToSunSq = this.player.radius * this.player.radius; // Update stored dist immediately
      } else {
        // Player hit sun WITHOUT shield - Game Over (Fix 2)
        console.error("Player hit sun WITHOUT shield! Ending game."); // Add log for debugging
        this.player.alive = false; // Ensure player is marked dead *before* endGame call
        this.endGame(false, "CONSUMED BY STAR");
        return; // Stop further checks this frame
      }
    }

    // 2. Falling Out of Bounds (Check against pre-calculated radius)
    // Use >= to catch exact boundary case
    if (this.player.radius >= this.maxPlayerRadius) {
      if (this.player.shielded) {
        // Use direct player state (Improvement 3)
        // Break shield, similar to sun collision
        this.activePowerUps.delete(this.powerUpTypes.SHIELD);
        this.player.shielded = false;
        this.notify(
          "SHIELD OVERLOAD!",
          this.player.x,
          this.player.y - 20,
          1.5,
          [255, 100, 100]
        );
        // Give a small inward nudge
        this.player.interactionDelta = this.PLAYER_MIN_INTERACTION_DELTA * 0.5;
        this.player.radius = this.maxPlayerRadius - 5; // Move back inside slightly
        // Update position and recalculate distance immediately
        const angle = this.player.angle; // Use current angle
        this.player.x = centerX + Math.cos(angle) * this.player.radius;
        this.player.y = centerY + Math.sin(angle) * this.player.radius;
        this.playerDistToSunSq = this.player.radius * this.player.radius; // Update stored dist immediately
      } else {
        // Player fell out WITHOUT shield - Game Over
        this.player.alive = false; // Mark dead immediately
        this.endGame(false, "LOST IN THE VOID");
        return; // Stop further checks this frame
      }
    }

    // 3. Survival Mode Time Limit
    if (this.gameMode === "survival") {
      const timeLeft = this.gameTimer - this.duration;
      if (timeLeft <= 0) {
        this.player.alive = false; // Stop player actions on win
        this.endGame(true, `SURVIVED! SCORE: ${this.player.score}`); // Victory
        return;
      }
      // Time warning notification (throttled)
      if (timeLeft <= 10.5 && Math.floor(timeLeft * 2) % 2 === 0) {
        // Check every half second in last 10s
        this.notify(
          `${Math.ceil(timeLeft)}s`,
          centerX,
          centerY - 100,
          1.2,
          [255, 50, 50]
        );
      }
    }

    // 4. Score Mode Target Reached
    if (this.gameMode === "score" && this.player.score >= this.victoryScore) {
      this.player.alive = false; // Stop player actions on win
      this.endGame(true, `TARGET REACHED! TIME: ${this.duration.toFixed(1)}s`); // Victory
      return;
    }
  }

  private endGame(isVictory: boolean, message: string): void {
    // Ensure these states are set even if called redundantly
    this.playing = false;
    if (this.player) this.player.alive = false; // Ensure player is inactive

    const endState = isVictory ? this.STATE_WINNER : this.STATE_LOSER;
    this.setGameState(endState); // Update body class (shows start button via CSS)

    // Clear volatile game elements
    this.thrustParticles = [];
    // Maybe clear enemies except sun? Or let them fade?
    // this.enemies = this.enemies.filter(e => e.type === this.ENEMY_TYPE_SUN);
    // this.powerUps = []; // Clear remaining powerups

    // Show end message
    this.notify(
      message,
      this.world.width / 2,
      this.world.height / 2 - 40, // Position higher
      1.8, // Slightly smaller main message
      isVictory ? [100, 255, 100] : [255, 100, 100]
    );

    // Add restart instructions (centered)
    const instructionY = this.world.height / 2 + 20;
    this.notify(
      "TAP / PRESS 'R'",
      this.world.width / 2,
      instructionY,
      1.0,
      [200, 200, 200]
    );
    this.notify(
      "TO PLAY AGAIN",
      this.world.width / 2,
      instructionY + 25,
      1.0,
      [200, 200, 200]
    );

    // Update button text for restart
    this.startButton.textContent = "PLAY AGAIN";
  }

  private render(): void {
    // --- Clear Canvas ---
    this.context.clearRect(0, 0, this.world.width, this.world.height);

    // --- Render Game Elements (Order matters for layering) ---
    this.renderOrbit(); // Render orbits first (background)
    this.renderThrustParticles();
    this.renderEnemies();
    this.renderPowerUps();

    // Render player only if alive
    if (this.player && this.player.alive) {
      this.renderPlayer();
    }

    this.renderNotifications();

    // --- Render UI / Info ---
    this.renderGameInfo();

    // --- Render Debug Info (if enabled) ---
    if (this.debugging) {
      this.renderDebugInfo();
      this.visualizeCollisions(); // Render collision lines/circles if debugging
    }
  }

  private renderGameInfo(): void {
    this.context.save();
    this.context.font = "bold 16px Rajdhani, Arial"; // Slightly larger UI font
    this.context.fillStyle = "rgba(140, 240, 255, 0.9)";
    this.context.shadowColor = "rgba(0, 0, 0, 0.5)";
    this.context.shadowBlur = 2;
    this.context.shadowOffsetY = 1;

    const bottomMargin = 25; // Position from bottom edge

    // Score (bottom left)
    this.context.textAlign = "left";
    this.context.fillText(
      `SCORE: ${this.player?.score ?? 0}`,
      15,
      this.world.height - bottomMargin
    ); // Use optional chaining for safety

    // Mode-specific info (bottom right)
    this.context.textAlign = "right";
    const rightEdge = this.world.width - 15;
    if (this.playing) {
      if (this.gameMode === "survival") {
        const timeLeft = Math.max(0, Math.ceil(this.gameTimer - this.duration));
        this.context.fillText(
          `TIME: ${timeLeft}s`,
          rightEdge,
          this.world.height - bottomMargin
        );
      } else {
        // score mode
        this.context.fillText(
          `TARGET: ${this.victoryScore}`,
          rightEdge,
          this.world.height - bottomMargin
        );
      }
    } else if (this.gameState === this.STATE_WELCOME) {
      // Mode info when waiting to start
      this.context.textAlign = "center";
      this.context.font = "14px Rajdhani, Arial";
      this.context.fillStyle = "rgba(140, 240, 255, 0.7)";
      this.context.fillText(
        `MODE: ${this.gameMode.toUpperCase()} (M to change)`,
        this.world.width / 2,
        this.world.height - bottomMargin - 20
      );
    }

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

    const x = 10;
    let y = 20; // Start lower to avoid settings button
    const lineHeight = 13;

    const print = (text: string) => {
      this.context.fillText(text, x, y);
      y += lineHeight;
    };

    // Basic Info
    print(`FPS: ${this.fps} (Min: ${this.fpsMin}, Max: ${this.fpsMax})`);
    print(
      `Delta/Factor: ${this.timeDelta.toFixed(1)}ms / ${this.timeFactor.toFixed(
        2
      )}`
    );
    print(`State: ${this.gameState}, Playing: ${this.playing}`);
    print(`Mode: ${this.gameMode}, Debug: ${this.debugging}`);
    print(`---`);
    // Player Info
    print(
      `Player Pos: ${this.player.x.toFixed(1)}, ${this.player.y.toFixed(1)}`
    );
    print(
      `Player Radius: ${this.player.radius.toFixed(
        1
      )} / ${this.maxPlayerRadius.toFixed(1)}`
    );
    print(`Player Angle: ${((this.player.angle * 180) / Math.PI).toFixed(1)}°`);
    print(`Player iDelta: ${this.player.interactionDelta.toFixed(3)}`);
    print(
      `Player Speed (rot): ${(
        this.PLAYER_ROTATION_SPEED_FACTOR / Math.max(1, this.player.radius)
      ).toFixed(3)}`
    );
    print(`---`);
    // Game State
    let activeEnemies = 0;
    this.enemies.forEach((e) => {
      if (e.type !== this.ENEMY_TYPE_SUN) activeEnemies++;
    });
    print(`Enemies: ${activeEnemies}/${this.MAX_ENEMIES}`); // Use count/max (Improvement 2)
    print(
      `Enemy Spawn Interval: ${this.currentEnemySpawnInterval.toFixed(0)}ms`
    ); // Show current rate (Improvement 2)
    print(`Particles: ${this.thrustParticles.length}`);
    print(
      `Powerups: ${this.powerUps.length} (Active: ${this.activePowerUps.size})`
    );
    print(`Score: ${this.player.score} (x${this.player.scoreMultiplier})`);
    print(`Duration: ${this.duration.toFixed(1)}s`);
    print(`Input Down: ${this.mouse.down}`);
    print(`---`);
    // Use stored squared distance, calculate sqrt only for display (Improvement 1)
    const distToSun = Math.sqrt(this.playerDistToSunSq);
    print(`Dist to Sun: ${distToSun.toFixed(1)}px`);
    print(`Sun Danger Rad: ${this.sunDangerRadius.toFixed(1)}px`);
    print(`---`);
    // Active Powerups List
    if (this.activePowerUps.size > 0) {
      print(`Active: [${Array.from(this.activePowerUps.keys()).join(", ")}]`);
    }

    // --- Visual Debug Elements ---

    // Draw center point (Sun Center)
    this.context.beginPath();
    this.context.arc(
      this.world.width / 2,
      this.world.height / 2,
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

    // Draw sun danger radius
    this.context.beginPath();
    this.context.arc(
      this.world.width / 2,
      this.world.height / 2,
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
} // End of OrbitGame Class

// =============================================================================
// Entity Classes
// =============================================================================

class Entity {
  public alive: boolean = true; // Assume alive by default unless set otherwise
  public width: number = 0; // Primarily for sprite reference, not physics
  public height: number = 0;
  public x: number = 0;
  public y: number = 0;
  public collisionRadius: number = 0; // Central physics property
}

class Player extends Entity {
  public radius: number; // Orbital radius from center
  public angle: number = 0; // Orbital angle (radians)
  public spriteAngle: number = 0; // Visual rotation angle
  public score: number = 0;
  public interactionDelta: number = -0.1; // Rate of change for radius

  // Power-up states (managed by OrbitGame directly on collect/expire - Improvement 3)
  public shielded: boolean = false;
  public scoreMultiplier: number = 1;
  public magnetActive: boolean = false;
  public gravityReversed: boolean = false;
  public slowTimeActive: boolean = false; // Still checked in updatePlayer

  constructor(x: number, y: number, radius: number, collisionRadius: number) {
    super();
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.collisionRadius = collisionRadius;
    this.alive = false; // Player starts inactive until game starts
  }
}

class Enemy extends Entity {
  public type: number = 1;
  public scale: number = 0.01; // Start small for spawn animation
  public scaleTarget: number = 1;
  public alpha: number = 0; // Start invisible
  public alphaTarget: number = 1;
  public time: number = 0; // Can be used for animation timing

  constructor() {
    super();
    this.alive = true; // Enemies usually start alive
  }

  // Optional: Add an update method here if enemies have complex behavior
  // public update(timeFactor: number): void {
  //    // E.g. movement patterns, animations
  // }
}

class Notification extends Entity {
  public text: string;
  public scale: number;
  public rgb: number[];
  public alpha: number;
  // x, y inherited from Entity

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
    this.alpha = 1.0; // Start fully visible
    this.alive = true; // Notifications are 'alive' while visible
    this.collisionRadius = 0; // Not collidable
  }
}

class ThrustParticle extends Entity {
  public angle: number;
  public size: number;
  public alpha: number;
  public speed: number;
  public decay: number;

  // Added explicit constructor parameters matching usage
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

  public update(timeFactor: number): void {
    // Move in the direction of the angle
    this.x += Math.cos(this.angle) * this.speed * timeFactor;
    this.y += Math.sin(this.angle) * this.speed * timeFactor;

    // Gradually fade out
    this.alpha -= this.decay * timeFactor;

    // Gradually shrink
    this.size = Math.max(0.1, this.size - 0.03 * timeFactor); // Shrink slightly faster
  }
}

class PowerUp extends Entity {
  public type: number;
  public rotation: number = 0;
  public rotationSpeed: number = (Math.random() - 0.5) * 0.1; // Random slow rotation
  public alpha: number = 0; // Fade in
  public alphaTarget: number = 1;
  public scale: number = 0.1; // Scale in
  public scaleTarget: number = 1;
  public time: number = 0; // For animation timing

  constructor(x: number, y: number, type: number) {
    super();
    this.x = x;
    this.y = y;
    this.type = type;
    this.collisionRadius = 15; // Set collision size
    this.alive = true;
  }

  public update(timeFactor: number): void {
    this.rotation += this.rotationSpeed * timeFactor;
    this.time = Math.min(this.time + 0.15 * timeFactor, 100); // Slower time accumulation for animation
    this.scale += (this.scaleTarget - this.scale) * 0.1 * timeFactor; // Slower scale in
    this.alpha += (this.alphaTarget - this.alpha) * 0.05 * timeFactor; // Slower fade in
  }

  // Static method for colors, easier access
  public getColor(): string {
    switch (this.type) {
      case 1:
        return "rgba(20, 180, 255, 0.9)"; // Shield - Electric blue
      case 2:
        return "rgba(255, 215, 20, 0.9)"; // Score - Golden energy
      case 3:
        return "rgba(0, 255, 180, 0.9)"; // Slow Time - Cyan green
      case 4:
        return "rgba(255, 50, 255, 0.9)"; // Magnet - Magenta energy
      case 5:
        return "rgba(255, 100, 50, 0.9)"; // Gravity Reverse - Orange energy
      default:
        return "rgba(200, 200, 200, 0.8)"; // Default grey
    }
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
