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
  // Keep these state constants for future use
  // private STATE_LOSER: string = "loser";
  // private STATE_WINNER: string = "winner";
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
  // Remove timeGameStart if not used
  // private timeGameStart: number = Date.now();
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
      this.settingsButton.textContent = "Debug: ON";
      this.settingsButton.id = "settings-button";
      this.styleSettingsButton();
      this.container.appendChild(this.settingsButton);
      this.settingsButton.addEventListener(
        "click",
        this.onSettingsButtonClick.bind(this)
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
    button.style.position = "absolute";
    button.style.top = "50%";
    button.style.left = "50%";
    button.style.transform = "translate(-50%, -50%)";

    // Make button larger and more touchable for mobile
    button.style.padding = "20px 40px"; // Larger padding
    button.style.fontSize = "28px"; // Larger font
    button.style.backgroundColor = "rgba(255, 100, 100, 0.8)";
    button.style.color = "white";
    button.style.border = "none";
    button.style.borderRadius = "12px"; // Larger border radius
    button.style.cursor = "pointer";
    button.style.boxShadow = "0 0 20px rgba(255, 100, 100, 0.5)";
    button.style.zIndex = "100";
    button.style.fontFamily = "Arial, sans-serif";
    button.style.transition = "all 0.2s ease";
    button.style.minWidth = "200px"; // Ensure minimum width for better tap target
    button.style.textAlign = "center"; // Center text

    // Add hover effect with event listeners
    button.addEventListener("mouseover", () => {
      button.style.backgroundColor = "rgba(255, 50, 50, 0.9)";
      button.style.boxShadow = "0 0 30px rgba(255, 100, 100, 0.7)";
    });

    button.addEventListener("mouseout", () => {
      button.style.backgroundColor = "rgba(255, 100, 100, 0.8)";
      button.style.boxShadow = "0 0 20px rgba(255, 100, 100, 0.5)";
    });

    // Add explicit touch event listeners for mobile/iOS
    button.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault(); // Prevent default to avoid double-firing
        button.style.backgroundColor = "rgba(255, 50, 50, 0.9)";
        button.style.boxShadow = "0 0 30px rgba(255, 100, 100, 0.7)";
      },
      { passive: false }
    );

    button.addEventListener(
      "touchend",
      (e) => {
        e.preventDefault(); // Prevent default to avoid double-firing
        button.style.backgroundColor = "rgba(255, 100, 100, 0.8)";
        button.style.boxShadow = "0 0 20px rgba(255, 100, 100, 0.5)";
        // Call the start function directly to ensure it works
        this.start();
      },
      { passive: false }
    );
  }

  private styleSettingsButton(): void {
    const button = this.settingsButton;
    button.style.position = "absolute";
    button.style.top = "10px";
    button.style.right = "10px";
    button.style.padding = "8px 12px";
    button.style.fontSize = "14px";
    button.style.backgroundColor = this.debugging
      ? "rgba(0, 200, 0, 0.7)"
      : "rgba(200, 0, 0, 0.7)";
    button.style.color = "white";
    button.style.border = "none";
    button.style.borderRadius = "4px";
    button.style.cursor = "pointer";
    button.style.zIndex = "100";
    button.style.fontFamily = "Arial, sans-serif";
    button.style.transition = "all 0.2s ease";
    button.style.opacity = "0.7";

    // Add hover effect with event listeners
    button.addEventListener("mouseover", () => {
      button.style.opacity = "1";
      button.style.boxShadow = "0 0 10px rgba(255, 255, 255, 0.5)";
    });

    button.addEventListener("mouseout", () => {
      button.style.opacity = "0.7";
      button.style.boxShadow = "none";
    });
  }

  private onSettingsButtonClick(_event: Event): void {
    // Toggle debug mode
    this.debugging = !this.debugging;

    // Update button text and color
    this.settingsButton.textContent = `Debug: ${this.debugging ? "ON" : "OFF"}`;
    this.settingsButton.style.backgroundColor = this.debugging
      ? "rgba(0, 200, 0, 0.7)"
      : "rgba(200, 0, 0, 0.7)";

    console.log(`Debug mode: ${this.debugging ? "ON" : "OFF"}`);
    _event.preventDefault();
  }

  // Add keyboard handler for debug mode
  private onKeyDownHandler(event: KeyboardEvent): void {
    // Toggle debug mode with 'D' key
    if (event.key.toLowerCase() === "d") {
      this.debugging = !this.debugging;

      // Also update the settings button to reflect current state
      if (this.settingsButton) {
        this.settingsButton.textContent = `Debug: ${
          this.debugging ? "ON" : "OFF"
        }`;
        this.settingsButton.style.backgroundColor = this.debugging
          ? "rgba(0, 200, 0, 0.7)"
          : "rgba(200, 0, 0, 0.7)";
      }

      console.log(`Debug mode: ${this.debugging ? "ON" : "OFF"}`);
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
    canvasWidth = canvasHeight = 38;
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
  private onStartButtonClick(_event: Event): void {
    // Prevent default for both mouse and touch events
    _event.preventDefault();

    // Check if the game is already playing to avoid multiple starts
    if (!this.playing) {
      this.start();

      // Log for debugging
      if (this.debugging) {
        console.log("Game started via button click");
      }
    }
  }

  // If this method isn't used, either comment it out or use it somewhere
  /* 
  private stop(): void {
    this.playing = false;
  }
  */

  private reset(): void {
    this.player = new Player();
    this.enemies = [];
    this.notifications = [];
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
    this.context.arc(centerX, centerY, 70, 0, Math.PI * 2);
    this.context.stroke();

    this.context.restore();
  }

  private updateEnemies(): void {
    let enemy: Enemy;
    const padding: number = 60;
    let i: number = this.enemies.length;

    while (i-- && !this.haveSun) {
      if (this.enemies[i].type === this.ENEMY_TYPE_SUN) {
        this.haveSun = true;
        break;
      } else {
        this.haveSun = false;
      }
    }

    if (!this.haveSun) {
      enemy = new Enemy();
      enemy.type = this.ENEMY_TYPE_SUN;

      // Explicitly set the sun position at the exact center of the world
      enemy.x = this.world.width / 2;
      enemy.y = this.world.height / 2;

      enemy.collisionRadius = this.ENEMY_SIZE * 2;
      enemy.scale = 1; // Ensure full scale immediately
      enemy.alpha = 1; // Ensure full visibility immediately
      enemy.scaleTarget = 1;
      enemy.alphaTarget = 1;
      this.enemies.push(enemy);
    }

    while (Math.random() > 0.99) {
      enemy = new Enemy();
      enemy.type = this.ENEMY_TYPE_NORMAL;

      // Update enemy spawn logic to avoid spawning too close to player
      const minDistanceFromPlayer = 100;
      let validPosition = false;
      let attempts = 0;

      while (!validPosition && attempts < 10) {
        enemy.x = Math.round(
          Math.random() * (this.world.width - padding - padding) + padding
        );
        enemy.y = Math.round(
          Math.random() * (this.world.height - padding - padding) + padding
        );

        // Check distance from player
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

    // Update settings button position to stay in top right
    if (this.settingsButton) {
      this.settingsButton.style.top = "10px";
      this.settingsButton.style.right = "10px";
    }

    // Update sun position if it exists
    this.updateSunPosition();
  }

  // Add a new method to update the sun position when needed
  private updateSunPosition(): void {
    // Find the sun enemy and update its position if it exists
    for (let i = 0; i < this.enemies.length; i++) {
      if (this.enemies[i].type === this.ENEMY_TYPE_SUN) {
        // Make sure sun is exactly at center of the world
        this.enemies[i].x = this.world.width / 2;
        this.enemies[i].y = this.world.height / 2;
        break;
      }
    }
  }

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

    this.context.restore();
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
    this.clear();

    if (this.playing) {
      this.context.save();
      this.context.globalCompositeOperation = "lighter";

      this.updatePlayer();
      this.renderOrbit();
      this.updateThrustParticles();
      this.renderThrustParticles();

      this.updateMeta();
      this.updateEnemies();
      this.renderEnemies();

      this.renderPlayer(); // Moved after enemies to ensure player is on top

      // Show debug info when enabled
      if (this.debugging) {
        this.renderDebugInfo();
      }

      this.context.restore();
      this.renderNotifications();
    } else {
      // Draw a subtle pulsing effect in the background when not playing
      const centerX = this.world.width / 2;
      const centerY = this.world.height / 2;
      const time = Date.now() / 1000;
      const pulseSize = 100 + Math.sin(time * 2) * 20;

      this.context.save();
      this.context.globalAlpha = 0.2;
      this.context.beginPath();
      this.context.arc(centerX, centerY, pulseSize, 0, Math.PI * 2);
      this.context.fillStyle = "rgba(255, 100, 100, 0.3)";
      this.context.fill();
      this.context.restore();
    }

    requestAnimationFrame(this.update.bind(this));
  }

  /**
   * Render debugging information
   */
  private renderDebugInfo(): void {
    this.context.save();
    this.context.fillStyle = "rgba(255,255,255,0.7)";
    this.context.font = "12px monospace";

    // Display some useful debug info
    this.context.fillText(`FPS: ${this.fps}`, 10, 20);
    this.context.fillText(
      `Player radius: ${this.player.radius.toFixed(1)}`,
      10,
      35
    );
    this.context.fillText(
      `Collision radius: ${this.player.collisionRadius.toFixed(1)}`,
      10,
      50
    );
    this.context.fillText(`Enemies: ${this.enemies.length}`, 10, 65);
    this.context.fillText(`Score: ${this.player.score}`, 10, 80);
    this.context.fillText(`Time: ${this.duration / 1000}`, 10, 95);
    this.context.fillText(`Touch/Mouse down: ${this.mouse.down}`, 10, 110); // Add touch status

    // Draw center point
    const centerX = this.world.width / 2;
    const centerY = this.world.height / 2;
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
