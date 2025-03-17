import $ from "jquery";
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
  private TOUCH_INPUT: boolean =
    navigator.userAgent.match(/(iPhone|iPad|iPod|Android)/i) !== null;
  private ENEMY_SIZE: number = 10;
  private ENEMY_COUNT: number = 2;
  private ENEMY_TYPE_NORMAL: number = 1;
  private ENEMY_TYPE_SUN: number = 2;
  private STATE_WELCOME: string = "start";
  private STATE_PLAYING: string = "playing";
  private STATE_LOSER: string = "loser";
  private STATE_WINNER: string = "winner";
  private sprites: Sprites = {
    playerSprite: null,
    enemySun: null,
    enemy: null,
  };
  private theta: number = 0; // Suppress unused variable hint
  private mouse: Mouse = {
    down: false,
  };
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private container: JQuery<HTMLElement>;
  private menu: JQuery<HTMLElement>; // Suppress unused variable hint
  private startButton: HTMLElement; // Suppress unused variable hint
  private playing: boolean = false;
  private score: number = 0; // Suppress unused variable hint
  private duration: number = 0; // Suppress unused variable hint
  private difficulty: number = 1;
  private frameCount: number = 0;
  private timeStart: number = Date.now();
  private timeLastFrame: number = Date.now();
  private timeLastSecond: number = Date.now();
  private timeGameStart: number = Date.now(); // Suppress unused variable hint
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

  constructor() {
    this.canvas = null as any;
    this.context = null as any;
    this.container = null as any;
    this.menu = null as any;
    this.startButton = null as any;
    this.player = null as any;
    this.initialize();
  }

  private initialize(): void {
    this.container = $("#game");
    this.menu = $("#menu");
    this.canvas = document.querySelector("#world") as HTMLCanvasElement;
    this.startButton = document.querySelector("#start-button") as HTMLElement;

    if (this.canvas && this.canvas.getContext) {
      this.context = this.canvas.getContext("2d") as CanvasRenderingContext2D;

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
      this.canvas.addEventListener(
        "touchstart",
        this.onCanvasTouchStartHandler.bind(this),
        false
      );
      this.canvas.addEventListener(
        "touchmove",
        this.onCanvasTouchMoveHandler.bind(this),
        false
      );
      this.canvas.addEventListener(
        "touchend",
        this.onCanvasTouchEndHandler.bind(this),
        false
      );
      window.addEventListener(
        "resize",
        this.onWindowResizeHandler.bind(this),
        false
      );

      this.onWindowResizeHandler();
      this.createSprites();
      document.body.setAttribute("class", this.STATE_WELCOME);

      this.start();
      this.reset();
      this.update();
    } else {
      alert("Does't seem like you can play this :(");
    }
  }

  // Add keyboard handler for debug mode
  private onKeyDownHandler(event: KeyboardEvent): void {
    // Toggle debug mode with 'D' key
    if (event.key.toLowerCase() === "d") {
      this.debugging = !this.debugging;
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

    // Player
    cvs = document.createElement("canvas");
    canvasWidth = canvasHeight = 64;
    cvs.setAttribute("width", canvasWidth.toString());
    cvs.setAttribute("height", canvasHeight.toString());
    ctx = cvs.getContext("2d") as CanvasRenderingContext2D;
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
    this.reset();

    this.timeStart = Date.now();
    this.timeLastFrame = this.timeStart;

    this.playing = true;

    document.body.setAttribute("class", this.STATE_PLAYING);
  }

  private stop(): void {
    // Suppress unused variable hint
    this.playing = false;
  }

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

  private onStartButtonClick(event: Event): void {
    // Suppress unused variable hint
    this.start();
    event.preventDefault();
  }

  private onMouseDownHandler(event: MouseEvent): void {
    this.mouse.down = true;
  }

  private onMouseMoveHandler(event: MouseEvent): void {}

  private onMouseUpHandler(event: MouseEvent): void {
    this.mouse.down = false;
  }

  private onCanvasTouchStartHandler(event: TouchEvent): void {}

  private onCanvasTouchMoveHandler(event: TouchEvent): void {
    event.preventDefault();
  }

  private onCanvasTouchEndHandler(event: TouchEvent): void {}

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

    // Define a constant linear velocity (pixels per frame)
    const constantLinearVelocity: number = 5.5; // Current speed

    // Calculate angular velocity based on radius to maintain constant linear velocity
    const rotationVel: number = constantLinearVelocity / this.player.radius;

    // More intuitive acceleration/deceleration with smoother ramping
    const pushAcceleration = 0.03; // How quickly you accelerate outward
    const gravityStrength = 0.025; // How strongly gravity pulls inward

    this.player.interactionDelta = this.mouse.down
      ? Math.min(
          1.5,
          this.player.interactionDelta + pushAcceleration * this.timeFactor
        )
      : Math.max(
          -0.8,
          this.player.interactionDelta - gravityStrength * this.timeFactor
        );

    // Apply radius change with minimum/maximum constraints
    this.player.radius = Math.max(
      50,
      Math.min(300, this.player.radius + this.player.interactionDelta)
    );

    this.player.angle += rotationVel * this.timeFactor; // Apply time factor for consistent speed

    // Calculate the player's new position based on the orbit
    this.player.x = centerX + Math.cos(this.player.angle) * this.player.radius;
    this.player.y = centerY + Math.sin(this.player.angle) * this.player.radius;

    const dx =
      -Math.sin(this.player.angle) * rotationVel * this.player.radius +
      Math.cos(this.player.angle) * this.player.interactionDelta;
    const dy =
      Math.cos(this.player.angle) * rotationVel * this.player.radius +
      Math.sin(this.player.angle) * this.player.interactionDelta;
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

    // Draw current orbit path
    this.context.save();
    this.context.beginPath();
    this.context.strokeStyle = "rgba(255, 255, 255, 0.2)";
    this.context.setLineDash([5, 5]);
    this.context.arc(centerX, centerY, this.player.radius, 0, Math.PI * 2);
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
      enemy.x = this.world.width / 2 - (this.sprites.enemySun?.width || 0);
      enemy.y = this.world.height / 2 - (this.sprites.enemySun?.height || 0);
      enemy.collisionRadius = this.ENEMY_SIZE * 2; // Changed from radius to collisionRadius
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

    // Significantly increase collision radius to match the visual ship size
    this.player.collisionRadius = 12; // Fixed collision radius that works well with the visual

    this.context.save();
    this.context.translate(
      Math.round(this.player.x),
      Math.round(this.player.y)
    );
    this.context.scale(0.5, 0.5);
    // Use the spriteAngle for rendering to face the direction of travel
    this.context.rotate(this.player.spriteAngle);
    this.context.translate(-32, -32);
    this.context.drawImage(
      sprite,
      Math.round(sprite.width / 2),
      Math.round(sprite.height / 2)
    );
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

      // Update enemy collision radius based on type and scale - but make it more accurate
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
      this.context.drawImage(
        sprite,
        Math.round(sprite.width / 2),
        Math.round(sprite.height / 2)
      );
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
    this.world.width = this.TOUCH_INPUT
      ? window.innerWidth
      : this.DEFAULT_WIDTH;
    this.world.height = this.TOUCH_INPUT
      ? window.innerHeight
      : this.DEFAULT_HEIGHT;

    this.container.width(this.world.width);
    this.container.height(this.world.height);

    this.canvas.width = this.world.width;
    this.canvas.height = this.world.height;

    // const cx: number = Math.max(
    //   (window.innerWidth - this.world.width) * 0.5,
    //   1
    // );
    // const cy: number = Math.max(
    //   (window.innerHeight - this.world.height) * 0.5,
    //   1
    // );

    this.container.css({
      // left: cx,
      // top: cy,
    });
  }

  /**
   * Improved collision detection using circle-to-circle collision
   * This is more accurate for the circular shapes in our game
   */
  private _collides(a: Player, b: Enemy): boolean {
    // Skip collision check for the central sun - it's special
    if (b.type === this.ENEMY_TYPE_SUN) {
      return false; // Don't collect the sun
    }

    // Early optimization: Skip collision check for enemies too far away
    const maxDistance = a.collisionRadius + b.collisionRadius;
    const approximateDistance = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

    // Quick check to avoid unnecessary calculations
    if (approximateDistance > maxDistance) {
      return false;
    }

    // Calculate the actual distance between centers
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Debugging visualization
    if (this.debugging && distance < maxDistance * 2) {
      this.visualizeCollision(a, b, distance <= maxDistance);
    }

    // Collision occurs when distance is less than or equal to sum of radii
    return distance <= maxDistance;
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

    // Draw line between centers
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

    this.context.fillStyle = isColliding
      ? "rgba(255,0,0,0.9)"
      : "rgba(255,255,255,0.9)";
    this.context.font = "10px monospace";
    this.context.fillText(
      `${Math.round(distance)}/${Math.round(requiredDistance)}`,
      (a.x + b.x) / 2,
      (a.y + b.y) / 2 - 10
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

$(function () {
  new OrbitGame();
});
