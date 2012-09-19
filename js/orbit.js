/**
 * Intro comment
 * to be done at another time.
 * don't forget to set license and contact info
 */

var Orbit = (function() {

  var FRAMERATE = 60;

  var DEFAULT_WIDTH = 600,
      DEFAULT_HEIGHT = 600;

  var TOUCH_INPUT = navigator.userAgent.match( /(iPhone|iPad|iPod|Android)/i );

  var ENEMY_SIZE = 10,
      ENEMY_COUNT = 2;

  var ENEMY_TYPE_NORMAL = 1,
      ENEMY_TYPE_SUN = 2;

  var haveSun = false;

  // Game states applied to the body so that elements can be
  // toggled as needed in CSS
  var STATE_WELCOME = 'start',
      STATE_PLAYING = 'playing',
      STATE_LOSER = 'loser',
      STATE_WINNER = 'winner';

  var sprites = {
        playerSprite: null,
        enemySun: null,
        enemy: null
  }

  var theta = 0;

  var mouse = {
    down: false
  }

  var canvas,
      context,

      // WebGL canvas and context
      canvas3d,
      context3d,

      dirtyRegions = [],

      // for 3d
      effectsEnabled = false,
      effectsShaderProgram,
      effectsVertices,
      effectsBuffer,
      effectsTexture,
      effectTime = 0,

      // DOM elements
      container,
      menu,
      startButton,

      // Game state
      playing = false,
      score = 0,
      duration = 0,
      difficulty = 1,

      // Scoring meta
      frameCount = 0,

      // Time tracking
      timeStart = Date.now(),
      timeLastFrame = Date.now(),
      timeLastSecond = Date.now(),
      timeGameStart = Date.now(),

      // Time values ued to trakc performance on every frame
      timeDelta = 0,
      timeFactor = 0,

      // Performance (FPS) tracking
      fps = 0,
      fpsMin = 1000,
      fpsMax = 0,
      framesThisSecond = 0,

      // Game elements
      enemies = [],
      player;

      function initialize() {

        // Run selectors and cache element references
        container = $( '#game' );
        menu = $( '#menu' );
        canvas = document.querySelector( '#world' );
        // canvas3d = document.querySelector( '#effects' );
        startButton = document.querySelector( '#start-button' );

        if ( canvas && canvas.getContext ) {
              context = canvas.getContext('2d');

              // Bind event listeners
              //startButton.addEventListener('click', onStartButtonClick, false);
              document.addEventListener('mousedown', onMouseDownHandler, false);
              document.addEventListener('mousemove', onMouseMoveHandler, false);
              document.addEventListener('mouseup', onMouseUpHandler, false);
              canvas.addEventListener('touchstart', onCanvasTouchStartHandler, false);
              canvas.addEventListener('touchmove', onCanvasTouchMoveHandler, false);
              canvas.addEventListener('touchenc', onCanvasTouchEndHandler, false);
              window.addEventListener('resize', onWindowResizeHandler, false);

              // Force an initial layout
              onWindowResizeHandler();

              createSprites();

              // Update the game state
              document.body.setAttribute('class', STATE_WELCOME);

              start();
              reset();
              update();
        }
        else {
              alert('Does\'t seem like you can play this :(');
        }
      }

      function createSprites() {
        var canvasWidth = 64,
            canvasHeight = 64,
            cvx,
            ctx;

        // Enemy Sprite
        cvs = document.createElement('canvas');
        cvs.setAttribute('width', canvasWidth);
        cvs.setAttribute('height', canvasHeight);
        ctx = cvs.getContext('2d');
        ctx.beginPath();
        ctx.arc(canvasWidth * 0.5, canvasHeight * 0.5, ENEMY_SIZE, 0, Math.PI * 2, true);
        ctx.lineWidth = 0;
        ctx.fillStyle = 'rgba(0, 200, 220, 0.9)';
        //ctx.strokeStyle = 'rbga(255, 255, 255, 0.4)';
        ctx.shadowColor = 'rgba(0, 240, 255, 0.9)';
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 20;
        //ctx.stroke();
        ctx.fill();

        sprites.enemy = cvs;


        // Player -- needs to be redone
        cvs = document.createElement('canvas');
        cvs.setAttribute('width', canvasWidth);
        cvs.setAttribute('height', canvasHeight);
        ctx = cvs.getContext('2d');
        ctx.beginPath();
        ctx.fillStyle = 'rgba(220, 50, 50, 0.9)';
        ctx.fillRect(0, 0, 30, 30);
        ctx.shadowColor = 'rgba(255,100,100,0.9)';
        ctx.shadowOffsetX = 20;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 20;
        //ctx.fill();

        sprites.playerSprite = cvs;

        // Sun enemy
        cvs = document.createElement('canvas');
        cvs.setAttribute('width', canvasWidth);
        cvs.setAttribute('height', canvasHeight);
        ctx = cvs.getContext('2d');
        ctx.beginPath();
        ctx.arc(canvasWidth * 0.5, canvasHeight * 0.5, ENEMY_SIZE*2, 0, Math.PI * 2, true);
        ctx.fillStyle = 'rgba(250, 50, 50, 1)';
        ctx.shadowColor = 'rgba(250, 20, 20, 0.9)';
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 20;
        ctx.fill();

        sprites.enemySun = cvs;

      }

      function start() {
        reset();

        timeStart = Date.now();
        timeLastFrame = timeStart;

        playing = true;

        document.body.setAttribute('class', STATE_PLAYING);
      }

      function stop() {
        playing = false;
      }

      function reset() {
        player = new Player();

        enemies = [];
      }

      function update() {
        clear();

        if (playing) {
              context.save();
              context.globalCompositeOperation = 'lighter';

              updatePlayer();
              renderPlayer();

              updateMeta();

              updateEnemies();
              renderEnemies();

              context.restore();
        }

        requestAnimFrame(update);
      }

      function clear() {
        context.clearRect(0, 0, world.width, world.height);
      }

      function onStartButtonClick(event) {
        start();
        event.preventDefault();
      }

      function onMouseDownHandler(event) {
        mouse.down = true;

        //player.radius += 0.2;
        //console.log("mouse down");
      }

      function onMouseMoveHandler(event) {
      }

      function onMouseUpHandler(event) {
        mouse.down = false;
      }

      function onCanvasTouchStartHandler(event) {
        event.preventDefault();
        //player.radius += 0.2;
      }

      function onCanvasTouchMoveHandler(event) {
        event.preventDefault();
        //player.radius += 0.2;
      }

      function onCanvasTouchEndHandler(event) {
        event.preventDefault();
      }

      function updateMeta() {
        // Fetch the current time for this frame
        var timeThisFrame = Date.now();

        // Increase the frame count
        framesThisSecond++;

        // Check if a second has passed since the last time we updated the FPS
        if (timeThisFrame > timeLastSecond + 1000) {
          // Establish the current, minimum and maximum FPS
          fps = Math.min(Math.round((framesThisSecond * 1000) / ( timeThisFrame - timeLastSecond)), FRAMERATE);
          fpsMin = Math.min(fpsMin, fps);
          fpsMax = Math.max(fpsMax, fps);

          timeLastSecond = timeThisFrame;
          framesThisSecond = 0;
        }

        timeDelta = timeThisFrame - timeLastFrame;
        timeFactor = timeDelta / (1000 / FRAMERATE);

        // Increment the difficulty by a factor of the time
        // passed since the last rendered frame to ensure that
        // difficulty progresses at the same speed no matter what
        // FPS the game runs at
        difficulty += 0.002 * Math.max(timeFactor, 1);

        frameCount++;

        duration = timeThisFrame - timeStart;

        timeLastFrame = timeThisFrame;
      }

      function updatePlayer() {

        player.x = world.width/2 + player.radius * Math.cos(theta);
        player.y = world.height/2 + player.radius * Math.sin(theta);

        //if ( keydown.space ) {
        //  player.radius += 0.1;
        //}

        $("#world").hammer({prevent_default:true}).bind("hold", function(ev) {
          if ( player.radius < (world.width / 2) ) {
            player.radius += 0.001;
          }
          console.log("holding");
        });

        if ( player.radius > 0) {
          player.radius -= 0.1;
        }
        //console.log(player.radius);

        if (theta < 360) {
          theta += 0.04;
        }
        else {
          theta = 0;
        }
      }

      function updateEnemies() {
        var enemy;
        var padding = 60;

        var i = enemies.length;

        while (i--) {
          if (enemies[i].type === ENEMY_TYPE_SUN) {
            haveSun = true;
            break;
          }
          else {
            haveSun = false;
          }
        }

        i = 0.0002 * Math.floor(ENEMY_COUNT + difficulty) - enemies.length;
        //console.log(i);

        while (i-- && Math.random() > 0.99) {
          enemy = new Enemy();

          if (haveSun) {
            enemy.type = ENEMY_TYPE_NORMAL;
            enemy.x = Math.round(Math.random() * (world.width - padding - padding));
            enemy.y = Math.round(Math.random() * (world.height - padding - padding));
          }
          else {
            enemy.type = ENEMY_TYPE_SUN;
            enemy.x = world.width / 2 - sprites.enemySun.width/2;
            enemy.y = world.height / 2 - sprites.enemySun.height;
          }

          enemies.push(enemy);
        }

        i = enemies.length;

        while (i--) {
          enemy = enemies[i];

          //console.log("time factor: " + timeFactor);
          enemy.time = Math.min(enemy.time + (0.2 * timeFactor), 100);
          enemy.scale += ((enemy.scaleTarget - enemy.scale) + 0.01) * 0.3;
          enemy.alpha += (enemy.alphaTarget - enemy.alpha) * 0.01;

          if (enemy.alive && 
              enemy.time === 100 && 
              enemy.type === ENEMY_TYPE_NORMAL ||
              collides(player, enemy)) {
            //handleEnemyDeath(enemy);
            //console.log(i);
            enemies.splice(i,1);
            enemy.alive = false;
          }
        }
      }

      function renderPlayer() {
        var sprite = sprites.playerSprite;
        player.width = sprite.width /4;
        player.height = sprite.height /4;
        //console.log(player.x)
        context.save();
        context.translate(Math.round(player.x), Math.round(player.y));
        context.drawImage(sprite, Math.round(sprite.width/2), Math.round(sprite.height/2));
        context.restore();
      }

      function renderEnemies() {
        var i = enemies.length;
        var sprite = sprites.enemy;

        while (i--) {
          var enemy = enemies[i];
          if (enemy.type === ENEMY_TYPE_NORMAL) {
            sprite = sprites.enemy;
          }
          else {
            sprite = sprites.enemySun;
          }

          enemy.width = sprite.width;
          enemy.height = sprite.height;

          context.save();
          context.globalAlpha = enemy.alpha;

          context.translate(Math.round(enemy.x), Math.round(enemy.y));
          //context.scale(enemy.scale, enemy.scale);
          context.drawImage(sprite, Math.round(sprite.width/2), Math.round(sprite.height/2));
          context.restore();
        }
      }

      function onWindowResizeHandler() {
        // Update the game size
        world.width = TOUCH_INPUT ? window.innerWidth : DEFAULT_WIDTH;
        world.height = TOUCH_INPUT ? window.innerHeight : DEFAULT_HEIGHT;

        // Resize the container
        container.width(world.width);
        container.height(world.height);

        // Resize the canvas
        canvas.width = world.width;
        canvas.height = world.height;

        // Determine the x/y position of the canvas
        var cx = Math.max((window.innerWidth - world.width) * 0.5, 1);
        var cy = Math.max((window.innerHeight - world.height) * 0.5, 1);

        // Update the position of the canvas
        container.css( {
          left: cx,
          top: cy
        });

        // Center the menu -- not needed atm might add it 
      }

      function collides(a, b) {

        return a.x < b.x + Math.round(b.width/2) &&
               a.x + Math.round(a.width/2) > b.x &&
               a.y < b.y + Math.round(b.height/2) &&
               a.y + Math.round(a.height/2) > b.y;
        /*
        var left1, left2, right1, right2;
        var top1, top2, bottom1, bottom2;

        left1 = a.x;
        left2 = b.x
        right1 = a.x + a.width;
        right2 = b.x + b.width;
        */

      }

      initialize();

})();

// Base class for all game entities
function Entity(x, y) {
  this.alive = false;
  this.width = 0;
  this.height = 0;
}
  Entity.prototype = new Point();

// Player entity
function Player() {
  this.radius = 100;//Math.random();
  var angle = this.radius * Math.PI * 2;
  this.x = 220;//Math.cos(angle) * this.radius;
  this.y = 270;//Math.sin(angle) * this.radius;
}
Player.prototype = new Entity();

function Enemy() {
  this.alive = true;

  this.type = 1;

  this.scale = 0.01;
  this.scaleTarget = 1;

  this.alpha = 0;
  this.alphaTarget = 1;

  this.time = 0;
}
Enemy.prototype = new Entity();



