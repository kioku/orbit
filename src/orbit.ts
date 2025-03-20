import "./main.css";

/**
 * Intro comment
 * to be done at another time.
 * don't forget to set license and contact info
 */

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

interface RegionInterface {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

class OrbitGame {
  private FRAMERATE: number = 60;
  private DEFAULT_WIDTH: number = 600;
  private DEFAULT_HEIGHT: number = 600;
  // private TOUCH_INPUT: boolean =
  // navigator.userAgent.match(/(iPhone|iPad|iPod|Android)/i) !== null;
  private ENEMY_SIZE: number = 10;
  // Remove or use the ENEMY_COUNT variable
  // private ENEMY_COUNT: number = 2;
  private ENEMY_TYPE_NORMAL: number = 1;
  private ENEMY_TYPE_SUN: number = 2;
  private STATE_WELCOME: string = "start";
  private STATE_PLAYING: string = "playing";
  // Use these state constants for game end conditions
  private STATE_LOSER: string = "loser";
  private STATE_WINNER: string = "winner";
  private sprites: Sprites = {
    playerSprite: null,
    enemySun: null,
    enemy: null,
  };
  // Remove theta if not used
  // private theta: number = 0;
  private mouse: Mouse = {
    down: false,
  };
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private container: HTMLElement;
  // Keep references but mark them as potentially used in future
  private playing: boolean = false;
  private duration: number = 0; // Add back duration property for tracking game time
  private difficulty: number = 1;
  private frameCount: number = 0;
  private timeStart: number = Date.now();
  private timeLastFrame: number = Date.now();
  private timeLastSecond: number = Date.now();
  private timeGameStart: number = Date.now(); // Now we'll use this for game duration tracking
  private timeDelta: number = 0;
  private timeFactor: number = 0;
  private fps: number = 0;
  private fpsMin: number = 1000;
  private fpsMax: number = 0;
  private framesThisSecond: number = 0;
  private enemies: Enemy[] = [];
  private player: Player;
  private haveSun: boolean = false;
  private world: World = {
    width: this.DEFAULT_WIDTH,
    height: this.DEFAULT_HEIGHT,
  };
  private notifications: Notification[] = [];
  private dirtyRegions: RegionInterface[] = [];
  private thrustParticles: ThrustParticle[] = [];
  private debugging: boolean = true; // Now we'll add a way to toggle this
  private startButton: HTMLButtonElement; // Add start button reference
  private settingsButton: HTMLButtonElement; // Add settings button reference
  private gameState: string = ""; // Track current game state
  private gameTimer: number = 60; // Game duration in seconds (default 60s)
  private gameMode: string = "survival"; // Default game mode
  private victoryScore: number = 15; // Score needed to win in score mode
  private sunDangerRadius: number = 70; // How close to sun is dangerous
  private gameOverMessage: string = ""; // Message to display when game ends

  constructor() {
    this.canvas = null as any;
    this.context = null as any;
    this.container = null as any;
    this.startButton = null as any;
    this.settingsButton = null as any;
    // Still initialize these but don't keep the properties
    this.player = null as any;
    this.initialize();
  }

  private initialize(): void {
    this.container = document.getElementById("game") as HTMLElement;
    this.canvas = document.querySelector("#world") as HTMLCanvasElement;

    if (this.canvas && this.canvas.getContext) {
      this.context = this.canvas.getContext("2d") as CanvasRenderingContext2D;

      // Create start button
      this.startButton = document.createElement("button");
      this.startButton.textContent = "Start Game";
      this.startButton.id = "start-button";
      this.styleStartButton();
      this.container.appendChild(this.startButton);

      // Add click event listener - this will work for mouse clicks
      this.startButton.addEventListener(
        "click",
        this.onStartButtonClick.bind(this),
        { passive: false } // Add passive: false for consistency
      );

      // Create settings button
      this.settingsButton = document.createElement("button");
      this.settingsButton.id = "settings-button";
      this.styleSettingsButton();
      this.container.appendChild(this.settingsButton);

      // Add click event listener with passive: false for consistency
      this.settingsButton.addEventListener(
        "click",
        this.onSettingsButtonClick.bind(this),
        { passive: false }
      );

      // Add keyboard listener for debugging toggle
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
      );
      document.addEventListener(
        "mouseup",
        this.onMouseUpHandler.bind(this),
        false
      );

      // Touch events need to be added to the document instead of canvas for iOS
      document.addEventListener(
        "touchstart",
        this.onTouchStartHandler.bind(this),
        { passive: false }
      );
      document.addEventListener(
        "touchmove",
        this.onTouchMoveHandler.bind(this),
        { passive: false }
      );
      document.addEventListener("touchend", this.onTouchEndHandler.bind(this), {
        passive: false,
      });

      window.addEventListener(
        "resize",
        this.onWindowResizeHandler.bind(this),
        false
      );

      this.onWindowResizeHandler();
      this.createSprites();
      document.body.setAttribute("class", this.STATE_WELCOME);

      // Initialize the game but don't start playing yet
      this.reset();
      this.update();
    } else {
      alert("Doesn't seem like you can play this :(");
    }
  }

  private styleStartButton(): void {
    const button = this.startButton;

    // Force clear any existing elements first
    button.innerHTML = ""; // Clear any existing content

    // Position in center
    button.style.position = "absolute";
    button.style.top = "50%";
    button.style.left = "50%";
    button.style.transform = "translate(-50%, -50%)";

    // Set visible text content
    button.textContent = "INITIALIZE";

    // Ensure display is visible
    button.style.display = "block";

    // TRON-inspired styling with glowing edges and true TRON aesthetic
    button.style.padding = "15px 40px";
    button.style.fontSize = "22px";
    button.style.fontFamily = "'Rajdhani', 'Arial', sans-serif"; // Futuristic font
    button.style.fontWeight = "300";
    button.style.letterSpacing = "6px";
    button.style.textTransform = "uppercase";
    button.style.backgroundColor = "rgba(0, 10, 20, 0.7)"; // Very dark blue, nearly black
    button.style.color = "rgba(140, 240, 255, 1)"; // TRON blue

    // Complex border with corner accents - authentic TRON UI design
    button.style.border = "1px solid rgba(80, 220, 255, 0.8)";
    button.style.borderRadius = "0"; // TRON interface is sharp-edged
    button.style.boxShadow =
      "0 0 15px rgba(80, 220, 255, 0.5), inset 0 0 8px rgba(80, 220, 255, 0.2)";
    button.style.textShadow = "0 0 8px rgba(140, 240, 255, 0.8)";
    button.style.cursor = "pointer";
    button.style.zIndex = "100";
    button.style.transition = "all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1.0)";
    button.style.minWidth = "220px";
    button.style.textAlign = "center";
    button.style.overflow = "hidden"; // For the before/after effects

    // Create pseudo-elements for geometric accent lines (using JavaScript since we can't use CSS ::before/::after)
    const createCornerAccent = (
      size: number,
      position: string
    ): HTMLDivElement => {
      const accent = document.createElement("div");
      accent.style.position = "absolute";
      accent.style.width = `${size}px`;
      accent.style.height = `${size}px`;
      accent.style.borderTop = position.includes("top")
        ? "2px solid rgba(80, 220, 255, 0.9)"
        : "none";
      accent.style.borderBottom = position.includes("bottom")
        ? "2px solid rgba(80, 220, 255, 0.9)"
        : "none";
      accent.style.borderLeft = position.includes("left")
        ? "2px solid rgba(80, 220, 255, 0.9)"
        : "none";
      accent.style.borderRight = position.includes("right")
        ? "2px solid rgba(80, 220, 255, 0.9)"
        : "none";

      // Position the accent
      if (position.includes("top")) accent.style.top = "-1px";
      if (position.includes("bottom")) accent.style.bottom = "-1px";
      if (position.includes("left")) accent.style.left = "-1px";
      if (position.includes("right")) accent.style.right = "-1px";

      return accent;
    };

    // Add corner accents - classic TRON UI feature
    button.appendChild(createCornerAccent(15, "top-left"));
    button.appendChild(createCornerAccent(15, "top-right"));
    button.appendChild(createCornerAccent(15, "bottom-left"));
    button.appendChild(createCornerAccent(15, "bottom-right"));

    // Create background grid effect
    const gridOverlay = document.createElement("div");
    gridOverlay.style.position = "absolute";
    gridOverlay.style.top = "0";
    gridOverlay.style.left = "0";
    gridOverlay.style.right = "0";
    gridOverlay.style.bottom = "0";
    gridOverlay.style.backgroundImage =
      "linear-gradient(0deg, rgba(80, 220, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(80, 220, 255, 0.1) 1px, transparent 1px)";
    gridOverlay.style.backgroundSize = "10px 10px";
    gridOverlay.style.opacity = "0.4";
    gridOverlay.style.zIndex = "-1";
    button.appendChild(gridOverlay);

    // Make responsive for small screens
    if (window.innerWidth < 450) {
      button.style.fontSize = "18px";
      button.style.padding = "12px 30px";
      button.style.letterSpacing = "4px";
      button.style.minWidth = "180px";
    }

    // Create TRON-style pulsing animation with circuit-like glow effect
    let glowIntensity = 0.5;
    let increasing = true;

    // Store interval ID so it can be properly cleared
    const startButtonPulseInterval = setInterval(() => {
      if (this.playing) {
        clearInterval(startButtonPulseInterval);
        return;
      }

      if (increasing) {
        glowIntensity += 0.025;
        if (glowIntensity >= 1) {
          increasing = false;
        }
      } else {
        glowIntensity -= 0.025;
        if (glowIntensity <= 0.5) {
          increasing = true;
        }
      }

      const glowColor = `rgba(80, 220, 255, ${0.5 + glowIntensity * 0.3})`;
      const textGlowColor = `rgba(140, 240, 255, ${0.6 + glowIntensity * 0.4})`;

      button.style.boxShadow = `0 0 ${
        15 + 10 * glowIntensity
      }px ${glowColor}, inset 0 0 8px ${glowColor}`;
      button.style.textShadow = `0 0 ${
        5 + 5 * glowIntensity
      }px ${textGlowColor}`;
      button.style.borderColor = `rgba(80, 220, 255, ${
        0.7 + glowIntensity * 0.3
      })`;

      // Update grid overlay for pulse effect
      gridOverlay.style.opacity = `${0.3 + glowIntensity * 0.2}`;
    }, 40);

    // Add hover states with TRON light cycle activation feel
    button.addEventListener("mouseover", () => {
      button.style.backgroundColor = "rgba(10, 30, 50, 0.8)";
      button.style.color = "rgba(180, 255, 255, 1)";
      button.style.boxShadow =
        "0 0 30px rgba(80, 220, 255, 0.7), inset 0 0 15px rgba(80, 220, 255, 0.4)";
      button.style.borderColor = "rgba(140, 240, 255, 1)";
      gridOverlay.style.opacity = "0.6";
    });

    button.addEventListener("mouseout", () => {
      button.style.backgroundColor = "rgba(0, 10, 20, 0.7)";
      button.style.color = "rgba(140, 240, 255, 1)";
      button.style.borderColor = `rgba(80, 220, 255, ${
        0.7 + glowIntensity * 0.3
      })`;
      gridOverlay.style.opacity = `${0.3 + glowIntensity * 0.2}`;

      // Restore the pulsing effect's current state
      const glowColor = `rgba(80, 220, 255, ${0.5 + glowIntensity * 0.3})`;
      button.style.boxShadow = `0 0 ${
        15 + 10 * glowIntensity
      }px ${glowColor}, inset 0 0 8px ${glowColor}`;
    });

    button.addEventListener("mousedown", () => {
      button.style.transform = "translate(-50%, -48%)"; // Press down effect
      button.style.boxShadow =
        "0 0 20px rgba(80, 220, 255, 0.9), inset 0 0 12px rgba(80, 220, 255, 0.6)";
      button.style.backgroundColor = "rgba(20, 40, 60, 0.9)";
    });

    button.addEventListener("mouseup", () => {
      button.style.transform = "translate(-50%, -50%)";
      button.style.boxShadow =
        "0 0 30px rgba(80, 220, 255, 0.7), inset 0 0 15px rgba(80, 220, 255, 0.4)";
      button.style.backgroundColor = "rgba(10, 30, 50, 0.8)";
    });

    // Touch event handling for mobile devices
    button.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        button.style.transform = "translate(-50%, -48%)";
        button.style.boxShadow =
          "0 0 20px rgba(80, 220, 255, 0.9), inset 0 0 12px rgba(80, 220, 255, 0.6)";
        button.style.backgroundColor = "rgba(20, 40, 60, 0.9)";
      },
      { passive: false }
    );

    button.addEventListener(
      "touchend",
      (e) => {
        e.preventDefault();
        button.style.transform = "translate(-50%, -50%)";
        button.style.boxShadow =
          "0 0 15px rgba(80, 220, 255, 0.5), inset 0 0 8px rgba(80, 220, 255, 0.2)";
        button.style.backgroundColor = "rgba(0, 10, 20, 0.7)";
        this.start();
      },
      { passive: false }
    );
  }

  private styleSettingsButton(): void {
    const button = this.settingsButton;

    // Clear any existing content
    button.innerHTML = "";

    // TRON-style minimalist debug control inspired by Identity Disc design
    const buttonSize = window.innerWidth < 450 ? "42px" : "48px";
    const cornerSpacing = window.innerWidth < 450 ? "12px" : "16px";

    // Position in top right corner
    button.style.position = "absolute";
    button.style.top = cornerSpacing;
    button.style.right = cornerSpacing;

    // Create circular button with TRON Identity Disc appearance
    button.style.width = buttonSize;
    button.style.height = buttonSize;
    button.style.padding = "0";
    button.style.display = "flex";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    button.style.overflow = "hidden"; // For inner ring effect

    // Modern TRON UI styling - cleaner, more minimal
    button.style.backgroundColor = "rgba(0, 10, 20, 0.7)";
    button.style.border = `1px solid ${
      this.debugging ? "rgba(80, 220, 255, 0.8)" : "rgba(255, 100, 100, 0.8)"
    }`;
    button.style.borderRadius = "50%"; // Identity Disc is circular

    // Remove text, use only visual design elements for cleaner look
    button.style.cursor = "pointer";
    button.style.boxShadow = `0 0 15px ${
      this.debugging ? "rgba(80, 220, 255, 0.5)" : "rgba(255, 100, 100, 0.5)"
    }`;
    button.style.zIndex = "100";
    button.style.transition = "all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1.0)";

    // Create TRON-style inner ring, like the Identity Disc
    const innerRing = document.createElement("div");
    innerRing.style.position = "absolute";
    innerRing.style.top = "50%";
    innerRing.style.left = "50%";
    innerRing.style.transform = "translate(-50%, -50%)";
    innerRing.style.width = "60%";
    innerRing.style.height = "60%";
    innerRing.style.borderRadius = "50%";
    innerRing.style.border = `1px solid ${
      this.debugging ? "rgba(80, 220, 255, 0.9)" : "rgba(255, 100, 100, 0.9)"
    }`;
    button.appendChild(innerRing);

    // Add center dot to indicate debug state
    const centerDot = document.createElement("div");
    centerDot.style.position = "absolute";
    centerDot.style.top = "50%";
    centerDot.style.left = "50%";
    centerDot.style.transform = "translate(-50%, -50%)";
    centerDot.style.width = "30%";
    centerDot.style.height = "30%";
    centerDot.style.borderRadius = "50%";
    centerDot.style.backgroundColor = this.debugging
      ? "rgba(80, 220, 255, 0.9)"
      : "rgba(255, 100, 100, 0.9)";
    button.appendChild(centerDot);

    // Setup pulse animation for the debug button
    let glowIntensity = 0.5;
    let increasing = true;

    // Store interval ID so it can be properly cleared
    const settingsButtonPulseInterval = setInterval(() => {
      if (this.playing) {
        // Also clear this interval when the game starts
        clearInterval(settingsButtonPulseInterval);
        return;
      }

      if (increasing) {
        glowIntensity += 0.03;
        if (glowIntensity >= 1) {
          increasing = false;
        }
      } else {
        glowIntensity -= 0.03;
        if (glowIntensity <= 0.5) {
          increasing = true;
        }
      }

      const glowColor = this.debugging
        ? `rgba(80, 220, 255, ${0.3 + glowIntensity * 0.3})`
        : `rgba(255, 100, 100, ${0.3 + glowIntensity * 0.3})`;

      button.style.boxShadow = `0 0 ${10 + 8 * glowIntensity}px ${glowColor}`;
      button.style.borderColor = this.debugging
        ? `rgba(80, 220, 255, ${0.6 + glowIntensity * 0.3})`
        : `rgba(255, 100, 100, ${0.6 + glowIntensity * 0.3})`;

      innerRing.style.borderColor = this.debugging
        ? `rgba(80, 220, 255, ${0.7 + glowIntensity * 0.3})`
        : `rgba(255, 100, 100, ${0.7 + glowIntensity * 0.3})`;
    }, 40);

    // Add hover effect with TRON power-up feel
    button.addEventListener("mouseover", () => {
      button.style.backgroundColor = "rgba(10, 30, 50, 0.8)";
      button.style.boxShadow = `0 0 25px ${
        this.debugging ? "rgba(80, 220, 255, 0.7)" : "rgba(255, 100, 100, 0.7)"
      }`;
      innerRing.style.width = "70%";
      innerRing.style.height = "70%";
      centerDot.style.width = "35%";
      centerDot.style.height = "35%";
    });

    button.addEventListener("mouseout", () => {
      button.style.backgroundColor = "rgba(0, 10, 20, 0.7)";
      innerRing.style.width = "60%";
      innerRing.style.height = "60%";
      centerDot.style.width = "30%";
      centerDot.style.height = "30%";

      // Restore pulsing state
      const glowColor = this.debugging
        ? `rgba(80, 220, 255, ${0.3 + glowIntensity * 0.3})`
        : `rgba(255, 100, 100, ${0.3 + glowIntensity * 0.3})`;

      button.style.boxShadow = `0 0 ${10 + 8 * glowIntensity}px ${glowColor}`;
    });

    // Add press effect that resembles TRON disc activation
    button.addEventListener("mousedown", () => {
      button.style.transform = "scale(0.92)";
      innerRing.style.width = "50%";
      innerRing.style.height = "50%";
      button.style.boxShadow = `0 0 15px ${
        this.debugging ? "rgba(80, 220, 255, 0.9)" : "rgba(255, 100, 100, 0.9)"
      }`;
    });

    button.addEventListener("mouseup", () => {
      button.style.transform = "scale(1)";
      innerRing.style.width = "70%";
      innerRing.style.height = "70%";
      button.style.boxShadow = `0 0 25px ${
        this.debugging ? "rgba(80, 220, 255, 0.7)" : "rgba(255, 100, 100, 0.7)"
      }`;
    });

    // Touch handlers for mobile
    button.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        button.style.transform = "scale(0.92)";
        innerRing.style.width = "50%";
        innerRing.style.height = "50%";
        button.style.boxShadow = `0 0 15px ${
          this.debugging
            ? "rgba(80, 220, 255, 0.9)"
            : "rgba(255, 100, 100, 0.9)"
        }`;
      },
      { passive: false }
    );

    button.addEventListener(
      "touchend",
      (e) => {
        e.preventDefault();
        button.style.transform = "scale(1)";

        // Toggle debug mode
        this.debugging = !this.debugging;

        // Update button appearance with TRON theme
        button.style.color = this.debugging
          ? "rgba(140, 240, 255, 1)"
          : "rgba(255, 100, 100, 1)";
        button.style.textShadow = `0 0 6px ${
          this.debugging
            ? "rgba(80, 220, 255, 0.7)"
            : "rgba(255, 100, 100, 0.7)"
        }`;
        button.style.borderColor = this.debugging
          ? "rgba(80, 220, 255, 0.8)"
          : "rgba(255, 100, 100, 0.8)";
        button.style.boxShadow = `0 0 15px ${
          this.debugging
            ? "rgba(80, 220, 255, 0.5)"
            : "rgba(255, 100, 100, 0.5)"
        }`;

        // Update inner ring color
        innerRing.style.borderColor = this.debugging
          ? "rgba(80, 220, 255, 0.9)"
          : "rgba(255, 100, 100, 0.9)";

        console.log(`Debug mode: ${this.debugging ? "ON" : "OFF"}`);
      },
      { passive: false }
    );
  }

  private onSettingsButtonClick(e: Event): void {
    e.preventDefault();

    // Toggle debugging state
    this.debugging = !this.debugging;

    this.styleSettingsButton();
  }

  private onKeyDownHandler(e: KeyboardEvent): void {
    // Press 'R' to restart game after win/loss
    if (
      (e.key === "r" || e.key === "R") &&
      (this.gameState === this.STATE_WINNER ||
        this.gameState === this.STATE_LOSER)
    ) {
      this.reset();
      this.onStartButtonClick(new MouseEvent("click"));
    }

    // Press 'M' to toggle game mode when not playing
    if ((e.key === "m" || e.key === "M") && !this.playing) {
      this.gameMode = this.gameMode === "survival" ? "score" : "survival";

      // Show notification about game mode change
      if (this.gameMode === "survival") {
        this.notify(
          "SURVIVAL MODE",
          this.world.width / 2,
          this.world.height / 2.5,
          1.5,
          [50, 200, 255]
        );
      }

      if (this.gameMode === "score") {
        this.notify(
          "SCORE MODE",
          this.world.width / 2,
          this.world.height / 2.5,
          1.5,
          [255, 200, 50]
        );
      }
    }

    // Press 'D' to toggle debugging
    if (e.key === "d" || e.key === "D") {
      this.onSettingsButtonClick(e);
    }
  }

  private createSprites(): void {
    let canvasWidth: number = 64;
    let canvasHeight: number = 64;
    let cvs: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;
    const ENEMY_SIZE = this.ENEMY_SIZE;

    // Enemy Sprite
    cvs = document.createElement("canvas");
    canvasWidth = canvasHeight = 48;
    cvs.setAttribute("width", canvasWidth.toString());
    cvs.setAttribute("height", canvasHeight.toString());
    ctx = cvs.getContext("2d") as CanvasRenderingContext2D;
    ctx.beginPath();
    ctx.arc(
      canvasWidth * 0.5,
      canvasHeight * 0.5,
      ENEMY_SIZE,
      0,
      Math.PI * 2,
      true
    );
    ctx.lineWidth = 0;
    ctx.fillStyle = "rgba(0, 200, 220, 0.9)";
    ctx.shadowColor = "rgba(0, 240, 255, 0.9)";
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 20;
    ctx.fill();

    this.sprites.enemy = cvs;

    // Player - redefined to have a more centered appearance
    cvs = document.createElement("canvas");
    canvasWidth = canvasHeight = 64;
    cvs.setAttribute("width", canvasWidth.toString());
    cvs.setAttribute("height", canvasHeight.toString());
    ctx = cvs.getContext("2d") as CanvasRenderingContext2D;

    // Draw a ship that's more visibly centered
    ctx.beginPath();
    ctx.fillStyle = "rgba(220, 50, 50, 0.9)";
    ctx.moveTo(0, 20);
    ctx.lineTo(50, 35);
    ctx.lineTo(0, 50);
    ctx.lineTo(20, 35);
    ctx.shadowColor = "rgba(255,100,100,0.9)";
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 10;
    ctx.fill();

    // Optional: Add visual indicator of center point for debugging
    if (this.debugging) {
      ctx.fillStyle = "rgba(255,255,0,0.5)";
      ctx.fillRect(31, 31, 2, 2);
    }

    this.sprites.playerSprite = cvs;

    // Sun enemy
    cvs = document.createElement("canvas");
    canvasWidth = canvasHeight = 64;
    cvs.setAttribute("width", canvasWidth.toString());
    cvs.setAttribute("height", canvasHeight.toString());
    ctx = cvs.getContext("2d") as CanvasRenderingContext2D;
    ctx.beginPath();
    ctx.arc(
      canvasWidth * 0.5,
      canvasHeight * 0.5,
      ENEMY_SIZE * 2,
      0,
      Math.PI * 2,
      true
    );
    ctx.fillStyle = "rgba(250, 50, 50, 1)";
    ctx.shadowColor = "rgba(250, 20, 20, 0.9)";
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 20;
    ctx.fill();

    this.sprites.enemySun = cvs;
  }

  private start(): void {
    // Don't restart if already playing
    if (this.playing) {
      return;
    }

    this.reset();

    this.timeStart = Date.now();
    this.timeLastFrame = this.timeStart;

    this.playing = true;

    // Hide the start button
    if (this.startButton) {
      this.startButton.style.display = "none";
    }

    document.body.setAttribute("class", this.STATE_PLAYING);

    if (this.debugging) {
      console.log("Game started - timestamp:", Date.now());
    }
  }

  // Uncomment the onStartButtonClick method
  private onStartButtonClick(e: MouseEvent): void {
    e.preventDefault();

    this.reset();
    this.player.alive = true;
    this.playing = true;
    this.timeGameStart = Date.now();
    this.gameState = this.STATE_PLAYING;
    document.body.setAttribute("class", this.STATE_PLAYING);

    this.startButton.style.display = "none";

    // Show game mode notification at start
    if (this.gameMode === "survival") {
      this.notify(
        `SURVIVE ${this.gameTimer}s`,
        this.world.width / 2,
        this.world.height / 2.5,
        1.5,
        [50, 200, 255]
      );
    }

    if (this.gameMode === "score") {
      this.notify(
        `SCORE ${this.victoryScore} TO WIN`,
        this.world.width / 2,
        this.world.height / 2.5,
        1.5,
        [50, 200, 255]
      );
    }
  }

  private reset(): void {
    this.enemies = [];
    this.thrustParticles = [];
    this.notifications = [];
    this.haveSun = false;
    this.playing = false;
    this.duration = 0;

    this.player = new Player();
    this.player.x = (1.5 * this.world.width) / 2; // Start right of center
    this.player.y = this.world.height / 2; // Start at vertical center
    this.player.radius = 100; // Initial orbit radius
    this.player.score = 0;

    this.gameState = this.STATE_WELCOME;
    this.gameOverMessage = "";
    document.body.setAttribute("class", this.STATE_WELCOME);

    if (this.startButton) {
      this.startButton.style.display = "block";
    }
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

  private invalidate(
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    this.dirtyRegions.push({
      left: x,
      top: y,
      right: x + width,
      bottom: y + height,
    });
  }

  private clear(): void {
    this.context.clearRect(0, 0, this.world.width, this.world.height);
  }

  // Fix event parameter warnings by prefixing with underscore
  private onMouseDownHandler(_event: MouseEvent): void {
    this.mouse.down = true;
  }

  private onMouseMoveHandler(_event: MouseEvent): void {}

  private onMouseUpHandler(_event: MouseEvent): void {
    this.mouse.down = false;
  }

  // Touch event handlers - Updated to work on iOS
  private onTouchStartHandler(event: TouchEvent): void {
    // Always prevent default to avoid scrolling/zooming
    event.preventDefault();

    // Set mouse down to true on touch start
    this.mouse.down = true;

    // Optional: log for debugging
    if (this.debugging) {
      console.log("Touch start detected, mouse.down =", this.mouse.down);
    }
  }

  private onTouchMoveHandler(event: TouchEvent): void {
    // Always prevent default to avoid scrolling
    event.preventDefault();

    // Keep mouse down state during move
    this.mouse.down = true;
  }

  private onTouchEndHandler(event: TouchEvent): void {
    // Always prevent default
    event.preventDefault();

    // Set mouse down to false on touch end
    this.mouse.down = false;

    // Optional: log for debugging
    if (this.debugging) {
      console.log("Touch end detected, mouse.down =", this.mouse.down);
    }
  }

  private updateMeta(): void {
    const timeThisFrame: number = Date.now();
    this.framesThisSecond++;

    if (timeThisFrame > this.timeLastSecond + 1000) {
      this.fps = Math.min(
        Math.round(
          (this.framesThisSecond * 1000) / (timeThisFrame - this.timeLastSecond)
        ),
        this.FRAMERATE
      );
      this.fpsMin = Math.min(this.fpsMin, this.fps);
      this.fpsMax = Math.max(this.fpsMax, this.fps);

      this.timeLastSecond = timeThisFrame;
      this.framesThisSecond = 0;
    }

    this.timeDelta = timeThisFrame - this.timeLastFrame;
    this.timeFactor = this.timeDelta / (1000 / this.FRAMERATE);
    this.difficulty += 0.002 * Math.max(this.timeFactor, 1);
    this.frameCount++;
    this.duration = timeThisFrame - this.timeStart;
    this.timeLastFrame = timeThisFrame;
  }

  private updatePlayer(): void {
    const centerX: number = this.world.width / 2;
    const centerY: number = this.world.height / 2;

    // Calculate maximum safe radius based on container size
    const maxRadius = Math.min(this.world.width, this.world.height) / 2 - 20; // Leave margin
    const minRadius = 50; // Minimum safe distance from center

    // More intuitive acceleration/deceleration with smoother ramping
    const pushAcceleration = 0.03; // How quickly you accelerate outward
    const gravityStrength = 0.025; // How strongly gravity pulls inward

    // Update player's interaction delta based on input
    this.player.interactionDelta = this.mouse.down
      ? Math.min(
          1.5,
          this.player.interactionDelta + pushAcceleration * this.timeFactor
        )
      : Math.max(
          -0.8,
          this.player.interactionDelta - gravityStrength * this.timeFactor
        );

    // Apply radius change with minimum/maximum constraints based on container size
    this.player.radius = Math.max(
      minRadius,
      Math.min(maxRadius, this.player.radius + this.player.interactionDelta)
    );

    // Calculate rotational velocity inversely proportional to radius
    // This makes the ship move at a more constant linear speed regardless of radius
    const baseRotationSpeed = 5.5;
    const rotationVel: number = baseRotationSpeed / this.player.radius;

    // Update angle based on rotational velocity
    this.player.angle += rotationVel * this.timeFactor;

    // Calculate the player's new position based on the orbit
    this.player.x = centerX + Math.cos(this.player.angle) * this.player.radius;
    this.player.y = centerY + Math.sin(this.player.angle) * this.player.radius;

    // Calculate the tangential and radial components of velocity for proper ship orientation
    const dx =
      -Math.sin(this.player.angle) * rotationVel * this.player.radius +
      Math.cos(this.player.angle) * this.player.interactionDelta;
    const dy =
      Math.cos(this.player.angle) * rotationVel * this.player.radius +
      Math.sin(this.player.angle) * this.player.interactionDelta;

    // Set the ship's angle based on its motion direction
    this.player.spriteAngle = Math.atan2(dy, dx);

    // Add visual effect for thrust when pushing outward
    if (this.mouse.down && this.frameCount % 3 === 0) {
      this.createThrustParticle();
    }
  }

  // Add visual indicator for orbit path
  private renderOrbit(): void {
    const centerX: number = this.world.width / 2;
    const centerY: number = this.world.height / 2;
    const maxRadius = Math.min(this.world.width, this.world.height) / 2 - 20;

    this.context.save();

    // Draw current orbit path
    this.context.beginPath();
    this.context.strokeStyle = "rgba(255, 255, 255, 0.2)";
    this.context.setLineDash([5, 5]);
    this.context.arc(centerX, centerY, this.player.radius, 0, Math.PI * 2);
    this.context.stroke();

    // Draw max safe orbit
    this.context.beginPath();
    this.context.strokeStyle = "rgba(255, 255, 255, 0.1)";
    this.context.setLineDash([2, 8]);
    this.context.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
    this.context.stroke();

    // Draw danger zone near sun
    this.context.beginPath();
    this.context.strokeStyle = "rgba(255, 100, 100, 0.3)";
    this.context.setLineDash([]);
    this.context.arc(centerX, centerY, this.sunDangerRadius, 0, Math.PI * 2);
    this.context.stroke();

    this.context.restore();
  }

  private updateEnemies(): void {
    let enemy: Enemy;
    let i: number = this.enemies.length;

    // Check for sun enemy
    while (i-- && !this.haveSun) {
      if (this.enemies[i].type === this.ENEMY_TYPE_SUN) {
        this.haveSun = true;
        break;
      } else {
        this.haveSun = false;
      }
    }

    // Create sun if needed
    if (!this.haveSun) {
      enemy = new Enemy();
      enemy.type = this.ENEMY_TYPE_SUN;
      enemy.x = this.world.width / 2;
      enemy.y = this.world.height / 2;
      enemy.collisionRadius = this.ENEMY_SIZE * 2;
      enemy.scale = 1;
      enemy.alpha = 1;
      enemy.scaleTarget = 1;
      enemy.alphaTarget = 1;
      this.enemies.push(enemy);
    }

    // Spawn new enemies with improved placement logic
    const centerX = this.world.width / 2;
    const centerY = this.world.height / 2;

    // Calculate spawn boundaries based on player's orbital constraints
    const minRadius = 60; // Minimum safe distance from center (slightly more than player minimum)
    const maxRadius = Math.min(this.world.width, this.world.height) / 2 - 30; // Maximum safe distance (less than player max)

    // Randomly spawn enemies
    while (Math.random() > 0.99) {
      enemy = new Enemy();
      enemy.type = this.ENEMY_TYPE_NORMAL;

      // Update enemy spawn logic to spawn within the orbital range
      const minDistanceFromPlayer = 100; // Minimum distance from player
      let validPosition = false;
      let attempts = 0;

      while (!validPosition && attempts < 10) {
        // Choose a random radius between min and max
        const spawnRadius = minRadius + Math.random() * (maxRadius - minRadius);

        // Choose a random angle
        const spawnAngle = Math.random() * Math.PI * 2;

        // Calculate position based on radius and angle
        enemy.x = centerX + Math.cos(spawnAngle) * spawnRadius;
        enemy.y = centerY + Math.sin(spawnAngle) * spawnRadius;

        // Check distance from player to avoid spawning too close
        const dx = enemy.x - this.player.x;
        const dy = enemy.y - this.player.y;
        const distSquared = dx * dx + dy * dy;

        if (distSquared > minDistanceFromPlayer * minDistanceFromPlayer) {
          validPosition = true;
        }

        attempts++;
      }

      enemy.collisionRadius = this.ENEMY_SIZE;
      this.enemies.push(enemy);
    }

    // Update existing enemies
    i = this.enemies.length;
    while (i--) {
      enemy = this.enemies[i];
      enemy.time = Math.min(enemy.time + 0.2 * this.timeFactor, 100);
      enemy.scale += (enemy.scaleTarget - enemy.scale + 0.01) * 0.3;
      enemy.alpha += (enemy.alphaTarget - enemy.alpha) * 0.01;

      const collision = this.collides(this.player, enemy);
      if (
        (enemy.alive &&
          enemy.time === 100 &&
          enemy.type === this.ENEMY_TYPE_NORMAL) ||
        collision
      ) {
        this.enemies.splice(i, 1);
        enemy.alive = false;

        if (collision) {
          this.player.score++;
          this.notify(
            this.player.score.toString(),
            this.player.x,
            this.player.y - 10,
            1,
            [250, 250, 100]
          );
        }
      }
    }
  }

  private renderPlayer(): void {
    const bounds: Region = new Region();
    const sprite: HTMLCanvasElement | null = this.sprites.playerSprite;

    if (!sprite) return;

    this.player.width = sprite.width / 4;
    this.player.height = sprite.height / 4;

    // Update collision radius to match visual representation better
    this.player.collisionRadius = 12;

    // Draw player sprite
    this.context.save();

    // First translate to the player's position
    this.context.translate(
      Math.round(this.player.x),
      Math.round(this.player.y)
    );

    // Apply scaling
    this.context.scale(0.5, 0.5);

    // Rotate for direction
    this.context.rotate(this.player.spriteAngle);

    // Center the sprite by translating back by half the original sprite dimensions
    this.context.translate(-32, -32);

    // Draw the sprite
    this.context.drawImage(sprite, 0, 0, sprite.width, sprite.height);

    if (this.debugging) {
      // Draw indicator for sprite center in local coordinates
      this.context.fillStyle = "rgba(0,255,255,0.9)";
      this.context.fillRect(30, 32, 5, 5);
    }

    this.context.restore();

    bounds.inflate(this.player.x, this.player.y);
    bounds.expand(4, 4);

    const boundsRect = bounds.toRectangle();
    this.invalidate(
      boundsRect.x,
      boundsRect.y,
      boundsRect.width,
      boundsRect.height
    );
  }

  private renderEnemies(): void {
    let i: number = this.enemies.length;
    let sprite: HTMLCanvasElement | null = this.sprites.enemy;

    while (i--) {
      const enemy: Enemy = this.enemies[i];
      sprite =
        enemy.type === this.ENEMY_TYPE_NORMAL
          ? this.sprites.enemy
          : this.sprites.enemySun;

      if (!sprite) continue;

      enemy.width = sprite.width;
      enemy.height = sprite.height;

      // Update enemy collision radius based on type and scale
      if (enemy.type === this.ENEMY_TYPE_SUN) {
        // Sun is larger, match its visual size
        enemy.collisionRadius = this.ENEMY_SIZE * 2 * enemy.scale;
      } else {
        // Regular enemy - make collision radius match visual appearance better
        enemy.collisionRadius = this.ENEMY_SIZE * enemy.scale;
      }

      this.context.save();
      this.context.globalAlpha = enemy.alpha;
      this.context.translate(Math.round(enemy.x), Math.round(enemy.y));

      // Fix the rendering offset - we were drawing off-center
      // Draw the sprite centered at the enemy's position
      this.context.drawImage(
        sprite,
        -Math.round(sprite.width / 2),
        -Math.round(sprite.height / 2)
      );

      // Debug visualization for enemies
      if (this.debugging) {
        // Draw a circle showing the enemy's collision boundary
        this.context.beginPath();
        this.context.arc(0, 0, enemy.collisionRadius, 0, Math.PI * 2);
        this.context.strokeStyle =
          enemy.type === this.ENEMY_TYPE_SUN
            ? "rgba(255,100,100,0.5)"
            : "rgba(100,255,255,0.5)";
        this.context.lineWidth = 1;
        this.context.stroke();

        // Draw crosshair at center for clarity
        this.context.beginPath();
        this.context.moveTo(-5, 0);
        this.context.lineTo(5, 0);
        this.context.moveTo(0, -5);
        this.context.lineTo(0, 5);
        this.context.strokeStyle = "rgba(255,255,255,0.5)";
        this.context.stroke();
      }

      this.context.restore();
    }
  }

  private renderNotifications(): void {
    let i: number = this.notifications.length;

    while (i--) {
      const p: Notification = this.notifications[i];
      p.y -= 0.4;

      const r: number = 14 * p.scale;

      this.context.save();
      this.context.font = `bold ${Math.round(12 * p.scale)}px Arial`;
      this.context.beginPath();
      this.context.fillStyle = `rgba(0,0,0,${0.7 * p.alpha})`;
      this.context.arc(p.x, p.y, r, 0, Math.PI * 2, true);
      this.context.fill();

      this.context.fillStyle = `rgba( ${p.rgb[0]}, ${p.rgb[1]}, ${p.rgb[2]}, ${p.alpha} )`;
      this.context.fillText(
        p.text,
        p.x - this.context.measureText(p.text).width * 0.5,
        p.y + (4 + p.scale)
      );
      this.context.restore();

      p.alpha *= 1 - 0.08 * (1 - (p.alpha - 0.08) / 1);

      if (p.alpha < 0.05) {
        this.notifications.splice(i, 1);
      }
    }
  }

  private onWindowResizeHandler(): void {
    // Get the smallest dimension of the viewport
    const minDimension = Math.min(window.innerWidth, window.innerHeight);

    // Apply a small margin to ensure it's not flush against the edge on small screens
    const margin = 10;
    const effectiveSize = minDimension - margin * 2;

    // Set both width and height to this dimension to create a square
    this.world.width = effectiveSize;
    this.world.height = effectiveSize;

    // Set container size
    this.container.style.width = `${effectiveSize}px`;
    this.container.style.height = `${effectiveSize}px`;

    // Set canvas size
    this.canvas.width = effectiveSize;
    this.canvas.height = effectiveSize;

    // Add a background color to the container to make it more visible
    this.container.style.backgroundColor = "rgba(0, 0, 0, 0.3)";

    // Ensure the container has proper box-sizing
    this.container.style.boxSizing = "border-box";

    // Update start button position if it exists
    if (this.startButton) {
      // Center the button
      this.startButton.style.top = "50%";
      this.startButton.style.left = "50%";
    }

    // Update settings button position to stay in top left
    if (this.settingsButton) {
      this.settingsButton.style.top = "10px";
      this.settingsButton.style.right = "10px"; // Changed from right to left
    }

    // Update sun position if it exists
    // this.updateSunPosition();

    // Update button styles on resize to ensure responsiveness
    if (this.startButton) {
      this.styleStartButton();
    }

    if (this.settingsButton) {
      this.styleSettingsButton();
    }
  }

  // Add a new method to update the sun position when needed
  // private updateSunPosition(): void {
  //   // Find the sun enemy and update its position if it exists
  //   for (let i = 0; i < this.enemies.length; i++) {
  //     if (this.enemies[i].type === this.ENEMY_TYPE_SUN) {
  //       // Make sure sun is exactly at center of the world
  //       this.enemies[i].x = this.world.width / 2;
  //       this.enemies[i].y = this.world.height / 2;
  //       break;
  //     }
  //   }
  // }

  /**
   * Improved circle-to-circle collision detection for circular game objects.
   */
  private collides(a: Player, b: Enemy): boolean {
    // Skip collision with the central sun - it's a special entity
    if (b.type === this.ENEMY_TYPE_SUN) {
      return false; // Sun isn't collectible or collidable
    }

    // Define collision radii sum
    const maxDistance = a.collisionRadius + b.collisionRadius;

    // Calculate the actual distance between centers
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const distanceSquared = dx * dx + dy * dy;

    // Collision occurs when distance is less than or equal to sum of radii
    const isColliding = distanceSquared <= maxDistance * maxDistance;

    // Always visualize collision for debugging when near miss or hit
    if (
      this.debugging &&
      distanceSquared <= maxDistance * 3 * (maxDistance * 3)
    ) {
      this.visualizeCollision(a, b, isColliding);
    }

    return isColliding;
  }

  /**
   * Enhanced visualization for collision boundaries
   */
  private visualizeCollision(a: Player, b: Enemy, isColliding: boolean): void {
    if (!this.debugging) return;

    this.context.save();
    this.context.globalAlpha = 1.0; // Full opacity for debug visualization

    // Draw player collision circle
    this.context.beginPath();
    this.context.arc(a.x, a.y, a.collisionRadius, 0, Math.PI * 2);
    this.context.strokeStyle = isColliding
      ? "rgba(255,0,0,0.9)"
      : "rgba(0,255,0,0.9)";
    this.context.lineWidth = 2;
    this.context.stroke();

    // Draw enemy collision circle
    this.context.beginPath();
    this.context.arc(b.x, b.y, b.collisionRadius, 0, Math.PI * 2);
    this.context.strokeStyle = isColliding
      ? "rgba(255,0,0,0.9)"
      : "rgba(0,100,255,0.9)";
    this.context.lineWidth = 2;
    this.context.stroke();

    // Draw line between centers with distance
    this.context.beginPath();
    this.context.moveTo(a.x, a.y);
    this.context.lineTo(b.x, b.y);
    this.context.strokeStyle = isColliding
      ? "rgba(255,0,0,0.9)"
      : "rgba(255,255,255,0.5)";
    this.context.lineWidth = 1;
    this.context.stroke();

    // Display distance for debugging
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const requiredDistance = a.collisionRadius + b.collisionRadius;

    // Make text more visible
    this.context.fillStyle = "rgba(0,0,0,0.6)";
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2 - 12;
    this.context.fillRect(midX - 30, midY - 10, 60, 16);

    this.context.fillStyle = isColliding
      ? "rgba(255,0,0,0.9)"
      : "rgba(255,255,255,0.9)";
    this.context.font = "10px monospace";
    this.context.fillText(
      `${Math.round(distance)}/${Math.round(requiredDistance)}`,
      midX - 25,
      midY
    );

    // this.context.restore();
  }

  private createThrustParticle(): void {
    // Calculate center of the world
    const centerX: number = this.world.width / 2;
    const centerY: number = this.world.height / 2;

    // Calculate direction from player to center (interior of the orbit)
    const towardsCenterAngle = Math.atan2(
      centerY - this.player.y,
      centerX - this.player.x
    );

    // Create 1-3 particles for a more dynamic effect
    const particleCount = 1 + Math.floor(Math.random() * 3);

    for (let i = 0; i < particleCount; i++) {
      const spreadAngle = towardsCenterAngle + (Math.random() - 0.5) * 0.5; // Add some spread
      const distance = 15 + Math.random() * 10;

      const particle = new ThrustParticle(
        this.player.x + Math.cos(spreadAngle) * distance,
        this.player.y + Math.sin(spreadAngle) * distance,
        spreadAngle,
        1 + Math.random() * 3, // Size variation
        0.6 + Math.random() * 0.4 // Lifespan variation
      );

      this.thrustParticles.push(particle);
    }
  }

  private updateThrustParticles(): void {
    let i = this.thrustParticles.length;

    while (i--) {
      const particle = this.thrustParticles[i];
      particle.update(this.timeFactor);

      if (particle.alpha <= 0) {
        this.thrustParticles.splice(i, 1);
      }
    }
  }

  private renderThrustParticles(): void {
    this.thrustParticles.forEach((particle) => {
      this.context.save();
      this.context.globalAlpha = particle.alpha;
      this.context.beginPath();
      this.context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.context.fillStyle = `rgba(255, 100, 50, ${particle.alpha})`;
      this.context.fill();
      this.context.restore();
    });
  }

  private update(): void {
    // Get timing info
    const now = Date.now();
    this.timeDelta = now - this.timeLastFrame;

    // Handle excessive frame time (if tab was inactive)
    if (this.timeDelta > 200) this.timeDelta = 200;

    this.timeFactor = this.timeDelta / (1000 / this.FRAMERATE);
    this.timeLastFrame = now;
    this.framesThisSecond++;

    // Update game if playing
    if (this.playing) {
      this.duration = (now - this.timeGameStart) / 1000; // Track game duration in seconds

      this.updatePlayer();
      this.updateEnemies();
      this.updateThrustParticles();

      // Check for end conditions
      this.checkEndConditions();
    }

    // Track FPS calculation
    if (now > this.timeLastSecond + 1000) {
      this.fps = this.framesThisSecond;
      this.fpsMin = Math.min(this.fpsMin, this.fps);
      this.fpsMax = Math.max(this.fpsMax, this.fps);
      this.timeLastSecond = now;
      this.framesThisSecond = 0;
    }

    // Render the world
    this.render();

    // Schedule next update
    window.requestAnimationFrame(this.update.bind(this));
  }

  private checkEndConditions(): void {
    // Get player position relative to center (sun)
    const centerX = this.world.width / 2;
    const centerY = this.world.height / 2;
    const dx = this.player.x - centerX;
    const dy = this.player.y - centerY;
    const distToSun = Math.sqrt(dx * dx + dy * dy);

    // Check for collision with sun (game over)
    if (distToSun < this.sunDangerRadius) {
      this.endGame(false, "CONSUMED BY THE SUN");
      return;
    }

    // Check for falling out of bounds (game over)
    const maxRadius = Math.min(this.world.width, this.world.height) / 2 - 20;
    if (distToSun > maxRadius) {
      this.endGame(false, "LOST IN DEEP SPACE");
      return;
    }

    // Time-based end condition (survival mode)
    if (this.gameMode === "survival") {
      // Check if time is up (victory)
      const timeLeft = this.gameTimer - Math.floor(this.duration);

      if (timeLeft <= 0) {
        this.endGame(true, `SURVIVED! SCORE: ${this.player.score}`);
        return;
      }

      // Show time warning when low
      if (timeLeft <= 10 && timeLeft % 2 === 0) {
        this.notify(`${timeLeft}s`, centerX, centerY - 100, 1, [255, 50, 50]);
      }
    }

    // Score-based end condition (score mode)
    if (this.gameMode === "score" && this.player.score >= this.victoryScore) {
      this.endGame(true, `VICTORY! TIME: ${Math.floor(this.duration)}s`);
      return;
    }
  }

  private endGame(isVictory: boolean, message: string): void {
    this.playing = false;
    this.gameState = isVictory ? this.STATE_WINNER : this.STATE_LOSER;
    this.gameOverMessage = message;
    document.body.setAttribute("class", this.gameState);

    // Large notification for game over message
    this.notify(
      message,
      this.world.width / 2,
      this.world.height / 2 - 40,
      2,
      isVictory ? [100, 255, 100] : [255, 100, 100]
    );

    // Add restart instruction
    this.notify(
      "PRESS 'R' TO RESTART",
      this.world.width / 2,
      this.world.height / 2 + 80,
      1,
      [200, 200, 200]
    );

    // Show start button again
    this.startButton.style.display = "block";
    this.startButton.textContent = "PLAY AGAIN";
  }

  private render(): void {
    // Clear canvas
    this.context.clearRect(0, 0, this.world.width, this.world.height);

    // Render game elements
    this.renderOrbit();
    this.renderThrustParticles();
    this.renderEnemies();

    if (this.player && this.player.alive) {
      this.renderPlayer();
    }

    this.renderNotifications();

    // Display game info (scores, target, etc)
    this.renderGameInfo();

    // Add debug info rendering if debugging is enabled
    if (this.debugging) {
      this.renderDebugInfo();
    }
  }

  private renderGameInfo(): void {
    // Display game stats at the bottom instead of the top
    this.context.save();
    this.context.fillStyle = "rgba(140, 240, 255, 0.8)";
    this.context.font = "14px Rajdhani, Arial";

    // Left align score at the bottom
    this.context.textAlign = "left";
    this.context.fillText(
      `SCORE: ${this.player.score}`,
      10,
      this.world.height - 40
    );

    // Right align time or goal at the bottom
    this.context.textAlign = "right";
    if (this.gameMode === "survival" && this.playing) {
      const timeLeft = Math.max(0, Math.ceil(this.gameTimer - this.duration));
      this.context.fillText(
        `TIME: ${timeLeft}s`,
        this.world.width - 10,
        this.world.height - 40
      );
    } else if (this.gameMode === "score" && this.playing) {
      this.context.fillText(
        `TARGET: ${this.victoryScore}`,
        this.world.width - 10,
        this.world.height - 40
      );
    }

    // Center align game mode when not playing
    if (!this.playing && this.gameState === this.STATE_WELCOME) {
      this.context.textAlign = "center";
      this.context.fillText(
        `MODE: ${this.gameMode.toUpperCase()}`,
        this.world.width / 2,
        this.world.height - 20
      );
      this.context.fillText(
        `PRESS 'M' TO CHANGE MODE`,
        this.world.width / 2,
        this.world.height - 40
      );
    }

    this.context.restore();
  }

  /**
   * Render debugging information
   */
  private renderDebugInfo(): void {
    this.context.save();
    this.context.fillStyle = "rgba(255,255,255,0.7)";
    this.context.font = "12px monospace";

    // Display some useful debug info in the top left corner
    this.context.fillText(`FPS: ${this.fps}`, 10, 40); // Move down to avoid button
    this.context.fillText(
      `Player radius: ${this.player.radius.toFixed(1)}`,
      10,
      55
    );
    this.context.fillText(
      `Collision radius: ${this.player.collisionRadius.toFixed(1)}`,
      10,
      70
    );
    this.context.fillText(`Enemies: ${this.enemies.length}`, 10, 85);
    this.context.fillText(`Score: ${this.player.score}`, 10, 100);
    this.context.fillText(
      `Time: ${(this.duration / 1000).toFixed(1)}s`,
      10,
      115
    );
    this.context.fillText(`Touch/Mouse down: ${this.mouse.down}`, 10, 130);

    // Add orbital distance
    const centerX = this.world.width / 2;
    const centerY = this.world.height / 2;
    const dx = this.player.x - centerX;
    const dy = this.player.y - centerY;
    const distToSun = Math.sqrt(dx * dx + dy * dy).toFixed(1);
    this.context.fillText(`Distance to sun: ${distToSun}px`, 10, 145);

    // Add danger zone info
    this.context.fillText(`Danger radius: ${this.sunDangerRadius}px`, 10, 160);
    this.context.fillText(`Game mode: ${this.gameMode}`, 10, 175);

    // Draw center point
    this.context.beginPath();
    this.context.arc(centerX, centerY, 5, 0, Math.PI * 2);
    this.context.fillStyle = "rgba(255,255,0,0.7)";
    this.context.fill();

    // Always draw player collision circle in debug mode with extreme clarity
    this.context.beginPath();
    this.context.arc(
      this.player.x,
      this.player.y,
      this.player.collisionRadius,
      0,
      Math.PI * 2
    );
    this.context.strokeStyle = "rgba(255,0,255,1.0)"; // Bright magenta for visibility
    this.context.lineWidth = 2;
    this.context.stroke();

    // Draw a center point on the player
    this.context.beginPath();
    this.context.arc(this.player.x, this.player.y, 3, 0, Math.PI * 2);
    this.context.fillStyle = "rgba(255,255,0,1.0)"; // Bright yellow
    this.context.fill();

    // Draw axes for clarity
    this.context.beginPath();
    this.context.moveTo(this.player.x - 20, this.player.y);
    this.context.lineTo(this.player.x + 20, this.player.y);
    this.context.moveTo(this.player.x, this.player.y - 20);
    this.context.lineTo(this.player.x, this.player.y + 20);
    this.context.strokeStyle = "rgba(100,100,255,0.5)";
    this.context.stroke();

    // Draw sun danger radius for visualization
    this.context.beginPath();
    this.context.arc(centerX, centerY, this.sunDangerRadius, 0, Math.PI * 2);
    this.context.strokeStyle = "rgba(255,50,50,0.5)";
    this.context.setLineDash([5, 5]);
    this.context.lineWidth = 2;
    this.context.stroke();
    this.context.setLineDash([]);

    this.context.restore();
  }
}

// Base class for all game entities
class Entity {
  public alive: boolean = false;
  public width: number = 0;
  public height: number = 0;
  public x: number = 0;
  public y: number = 0;
  public collisionRadius: number = 0; // Rename to collisionRadius for clarity
}

// Player entity
class Player extends Entity {
  public radius: number = 200; // This is the orbital radius
  public velocity: { x: number; y: number } = { x: 0, y: 0 };
  public angle: number = -Math.PI / 4;
  public spriteAngle: number = 0;
  public score: number = 0;
  public interactionDelta = -0.1;

  constructor() {
    super();
    this.x = 200;
    this.y = 200;
    this.collisionRadius = 8; // Default collision radius
  }
}

class Enemy extends Entity {
  public type: number = 1;
  public scale: number = 0.01;
  public scaleTarget: number = 1;
  public alpha: number = 0;
  public alphaTarget: number = 1;
  public time: number = 0;
}

class Notification extends Entity {
  public text: string;
  public scale: number;
  public rgb: number[];
  public alpha: number;
  public x: number;
  public y: number;

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
    this.alpha = 1;
  }
}

class Point {
  public x: number;
  public y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  public distanceTo(p: Point): number {
    const dx: number = p.x - this.x;
    const dy: number = p.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public clonePosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  public interpolate(x: number, y: number, amp: number): void {
    this.x += (x - this.x) * amp;
    this.y += (y - this.y) * amp;
  }
}

class Region {
  public left: number = 999999;
  public top: number = 999999;
  public right: number = 0;
  public bottom: number = 0;

  public reset(): void {
    this.left = 999999;
    this.top = 999999;
    this.right = 0;
    this.bottom = 0;
  }

  public inflate(x: number, y: number): void {
    this.left = Math.min(this.left, x);
    this.top = Math.min(this.top, y);
    this.right = Math.max(this.right, x);
    this.bottom = Math.max(this.bottom, y);
  }

  public expand(x: number, y: number): void {
    this.left -= x;
    this.top -= y;
    this.right += x;
    this.bottom += y;
  }

  public contains(x: number, y: number): boolean {
    return x > this.left && x < this.right && y > this.top && y < this.bottom;
  }

  public size(): number {
    return (this.right - this.left + (this.bottom - this.top)) / 2;
  }

  public center(): Point {
    return new Point(
      this.left + (this.right - this.left) / 2,
      this.top + (this.bottom - this.top) / 2
    );
  }

  public toRectangle(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    return {
      x: this.left,
      y: this.top,
      width: this.right - this.left,
      height: this.bottom - this.top,
    };
  }
}

// Add ThrustParticle class
class ThrustParticle {
  public x: number;
  public y: number;
  public angle: number;
  public size: number;
  public alpha: number;
  public speed: number;
  public decay: number;

  constructor(
    x: number,
    y: number,
    angle: number,
    size: number,
    alpha: number
  ) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.size = size;
    this.alpha = alpha;
    this.speed = 1 + Math.random() * 2;
    this.decay = 0.01 + Math.random() * 0.03;
  }

  public update(timeFactor: number): void {
    // Move in the direction of the angle
    this.x += Math.cos(this.angle) * this.speed * timeFactor;
    this.y += Math.sin(this.angle) * this.speed * timeFactor;

    // Gradually fade out
    this.alpha -= this.decay * timeFactor;

    // Gradually shrink
    this.size = Math.max(0.1, this.size - 0.05 * timeFactor);
  }
}

// shim layer with setTimeout fallback
window.requestAnimationFrame = (function () {
  return (
    window.requestAnimationFrame ||
    (window as any).webkitRequestAnimationFrame ||
    (window as any).mozRequestAnimationFrame ||
    (window as any).oRequestAnimationFrame ||
    (window as any).msRequestAnimationFrame ||
    function (callback) {
      window.setTimeout(callback, 1000 / 60);
    }
  );
})();

document.addEventListener("DOMContentLoaded", function () {
  new OrbitGame();
});
