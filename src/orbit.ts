import $ from "jquery";
import JQuery from "jquery";

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
    const rotationVel: number = Math.PI / (180 * 1);
    const thrust: number = 0.01;

    this.player.velocity.x += Math.cos(this.player.angle) * thrust;
    this.player.velocity.y += Math.sin(this.player.angle) * thrust;

    if (this.mouse.down) {
      this.player.angle -= rotationVel;
    } else {
      this.player.angle += rotationVel;
    }

    const offs: number = 64;

    if (this.player.angle > Math.PI / 2 && this.player.angle < -Math.PI / 2) {
      this.player.x -= this.player.velocity.x;
      this.player.y += this.player.velocity.y;
    } else {
      this.player.x += this.player.velocity.x;
      this.player.y += this.player.velocity.y;
    }
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
      this.enemies.push(enemy);
    }

    while (Math.random() > 0.99) {
      enemy = new Enemy();
      enemy.type = this.ENEMY_TYPE_NORMAL;
      enemy.x = Math.round(
        Math.random() * (this.world.width - padding - padding)
      );
      enemy.y = Math.round(
        Math.random() * (this.world.height - padding - padding)
      );
      this.enemies.push(enemy);
    }

    i = this.enemies.length;

    while (i--) {
      enemy = this.enemies[i];
      enemy.time = Math.min(enemy.time + 0.2 * this.timeFactor, 100);
      enemy.scale += (enemy.scaleTarget - enemy.scale + 0.01) * 0.3;
      enemy.alpha += (enemy.alphaTarget - enemy.alpha) * 0.01;

      if (
        (enemy.alive &&
          enemy.time === 100 &&
          enemy.type === this.ENEMY_TYPE_NORMAL) ||
        this.collides(this.player, enemy)
      ) {
        this.enemies.splice(i, 1);
        enemy.alive = false;

        if (this.collides(this.player, enemy)) {
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

    this.context.save();
    this.context.translate(
      Math.round(this.player.x),
      Math.round(this.player.y)
    );
    this.context.scale(0.5, 0.5);
    this.context.rotate(this.player.angle);
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

  private collides(a: Player, b: Enemy): boolean {
    return (
      a.x < b.x + Math.round(b.width) &&
      a.x + Math.round(a.width) - 14 > b.x &&
      a.y < b.y + Math.round(b.height) &&
      a.y + Math.round(a.height) - 14 > b.y
    );
  }

  private update(): void {
    this.clear();

    if (this.playing) {
      this.context.save();
      this.context.globalCompositeOperation = "lighter";

      this.updatePlayer();
      this.renderPlayer();

      this.updateMeta();

      this.updateEnemies();
      this.renderEnemies();

      this.context.restore();
      this.renderNotifications();
    }

    requestAnimationFrame(this.update.bind(this));
  }
}

// Base class for all game entities
class Entity {
  public alive: boolean = false;
  public width: number = 0;
  public height: number = 0;
  public x: number = 0;
  public y: number = 0;
}

// Player entity
class Player extends Entity {
  public radius: number = 200;
  public velocity: { x: number; y: number } = { x: 0, y: 0 };
  public angle: number = -Math.PI / 4;
  public score: number = 0;

  constructor() {
    super();
    this.x = 200;
    this.y = 200;
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
