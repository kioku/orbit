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

  // Hammer.js variable
  //var hammer = new Hammer(document.getElementById("game"));

  // Variables for hold touch event
  var hStartTime = 0,
      hMove = false,
      hold = false;

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
      notifications = [],
      enemies = [],
      player;

      function initialize() {

        // Run selectors and cache element references
        container = $( '#game' );
        menu = $( '#menu' );
        canvas = document.querySelector( '#world' );
        // canvas3d = document.querySelector( '#effects' );
        startButton = document.querySelector( '#start-button' );

        if( canvas && canvas.getContext ) {
              context = canvas.getContext('2d');

              // Bind event listeners
              //startButton.addEventListener('click', onStartButtonClick, false);
              document.addEventListener('mousedown', onMouseDownHandler, false);
              document.addEventListener('mousemove', onMouseMoveHandler, false);
              document.addEventListener('mouseup', onMouseUpHandler, false);
              canvas.addEventListener('touchstart', onCanvasTouchStartHandler, false);
              canvas.addEventListener('touchmove', onCanvasTouchMoveHandler, false);
              canvas.addEventListener('touchend', onCanvasTouchEndHandler, false);
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
        //ctx.fillRect(0, 0, 30, 30);
        ctx.moveTo(0, 20);
        ctx.lineTo(50, 35);
        ctx.lineTo(0, 50);
        ctx.lineTo(20, 35);
        ctx.shadowColor = 'rgba(255,100,100,0.9)';
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 10;
        ctx.fill();

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

        notifications = [];
        enemies = [];
      }

      function notify(text, x, y, scale, rgb) {
        notifications.push( new Notification(text, x, y, scale, rgb) );
      }

      function invalidate(x, y, width, height) {
        dirtyRegions.push( {
          x: x,
          y: y,
          width: width,
          height: height
        } );
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

              renderNotifications();
        }

        requestAnimFrame(update);
      }

      function clear() {
        /*
        var i = dirtyRegions.length;

        while( i-- ) {
          var r = dirtyRegions[i];
          context.clearRect( Math.floor( r.x ), Math.floor( r.y ), Math.ceil( r.width ), Math.ceil( r.height ) );
        }

        dirtyRegions = [];
        */
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

      function checkTapHold(nID) {
        if ( !hMove && hStartTime == nID ) {
          hStartTime = 0;
          hMove = 0;
        }
      }

      function onCanvasTouchStartHandler(event) {
        //event.preventDefault();
        hStartTime = Number(new Date());
        hold = true;
        //alert(hold);
        /*
        setTimeout(function() { 
          checkTapHold(hStartTime);
          clearTimeout();
        }, 2000);
        */
      }

      function onCanvasTouchMoveHandler(event) {
        //event.preventDefault();
        hMove = true;
      }

      function onCanvasTouchEndHandler(event) {
        //event.preventDefault();
        hold = false;
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

        player.x = world.width/2 + player.radius  * Math.cos(theta);
        player.y = world.height/2 + player.radius * Math.sin(theta);

        if ( hold && (player.radius < (world.width / 2))) {
          player.radius += 0.5;
        } else if ( player.radius > 0) {
          player.radius -= 0.5;
        }
        //console.log(player.radius);

        if (theta < 360) {
          theta += 0.04;
        }
        else {
          theta = 0;
        }
      }
      /*
      function updatePlayer() {
        var angle = player.rotation;
        player.x = Math.cos(angle * Math.PI ) * player.velocity + player.radius;
        player.y = Math.sin(angle * Math.PI) * -player.velocity + player.radius;
        //console.log('x: ' + player.x + ' y: ' + player.y);

        if ( hold ) {
          player.rotation += 1;
          player.radius += 0.01;
        } else {
          player.rotation -= 1;
          player.radius -= 0.01;
        }
      }
      */

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
        if( !haveSun ) {
          enemy = new Enemy();
          enemy.type = ENEMY_TYPE_SUN;
          enemy.x = world.width / 2 - sprites.enemySun.width;
          enemy.y = world.height / 2 - sprites.enemySun.height;
          enemies.push(enemy);
        }

        //i = 0.0002 * Math.floor(ENEMY_COUNT + difficulty) - enemies.length;
        //console.log(i);

        while ( Math.random() > 0.99 ) {
          enemy = new Enemy();

          enemy.type = ENEMY_TYPE_NORMAL;
          enemy.x = Math.round(Math.random() * (world.width - padding - padding));
          enemy.y = Math.round(Math.random() * (world.height - padding - padding));

          enemies.push(enemy);
        }

        i = enemies.length;

        while (i--) {
          enemy = enemies[i];

          //console.log("time factor: " + timeFactor);
          enemy.time = Math.min(enemy.time + (0.2 * timeFactor), 100);
          enemy.scale += ((enemy.scaleTarget - enemy.scale) + 0.01) * 0.3;
          enemy.alpha += (enemy.alphaTarget - enemy.alpha) * 0.01;

          var collision = collides(player, enemy);
          if( enemy.alive && 
              enemy.time === 100 && 
              enemy.type === ENEMY_TYPE_NORMAL ||
              collision &&
              enemy.type === ENEMY_TYPE_NORMAL ) {
            //handleEnemyDeath(enemy);
            //console.log(i);
            enemies.splice(i,1);
            enemy.alive = false;

            if( collision ) {
              player.score++;

              notify(player.score, player.x, player.y - 10, 1, [250, 250, 100]);
            }
          }
        }
      }

      function renderPlayer() {
        var bounds = new Region();

        var sprite = sprites.playerSprite;
        player.width = sprite.width /4;
        player.height = sprite.height /4;
        //console.log(player.x)
        context.save();
        context.translate(Math.round(player.x), Math.round(player.y));
        context.scale(0.5, 0.5);
        //context.rotate(player.rotation * Math.PI / 180);
        context.rotate(theta);
        context.drawImage(sprite, Math.round(sprite.width/2), Math.round(sprite.height/2));
        context.restore();

        bounds.inflate( player.x, player.y );
        bounds.expand( 4, 4);

        var boundsRect = bounds.toRectangle();

        invalidate( boundsRect.x, boundsRect.y, boundsRect.width, boundsRect.height );
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

          var sw = ( sprite.width * enemy.scale ) + 4;
          var sh = ( sprite.height * enemy.scale ) + 4;

          invalidate( enemy.x - (sw / 2), enemy.y - (sw / 2), sw, sh);
        }
      }

      function renderNotifications() {
        var i = notifications.length;

        // Go through and draw all notification texts
        while( i-- ) {
          var p = notifications[i];

          // Make the text float upwards 
          p.y -= 0.4;

          var r = 14 * p.scale;

          // Draw the notification
          context.save();
          context.font = 'bold ' + Math.round(12 * p.scale) + "px Arial";

          context.beginPath();
          context.fillStyle = 'rgba(0,0,0,'+(0.7 * p.alpha)+')';
          context.arc( p.x, p.y, r, 0, Math.PI*2, true );
          context.fill();

          context.fillStyle = "rgba( " + p.rgb[0] + ", " + p.rgb[1] + ", " + p.rgb[2] + ", " + p.alpha + " )";
          context.fillText( p.text, p.x - (context.measureText( p.text ).width * 0.5), p.y + (4 + p.scale) );
          context.restore();

          // Fade out 
          p.alpha *= 1 - (0.08 * (1 - ((p.alpha-0.08)/1)) );

          // If the notification is faded out, remove it
          if( p.alpha < 0.05 ) {
            notifications.splice(i, 1);
          }

          r += 2;

          invalidate( p.x - r, p.y - r, r * 2, r * 2);

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
  this.radius = 200;//Math.random();
  //var angle = this.radius * Math.PI * 2;
  this.x = 200;//Math.cos(angle) * this.radius;
  this.y = 200;//Math.sin(angle) * this.radius;
  this.rotation = 45;
  this.velocity = 1;
  this.score = 0;
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

function Notification(text, x, y, scale, rgb) {
  this.text = text || '';
  this.x = x || 0;
  this.y = y || 0;
  this.scale = scale || 1;
  this.rgb = rgb || [255,255,255];
  this.alpha = 1;
}
Notification.prototype = new Entity();


