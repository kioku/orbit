(function(exports) {
window.requestAnimFrame = (function() {
  return window.requestAnimationFrame       ||
         window.webkitRequestAnimationFrame ||
         window.mozRequestAnimationFrame    ||
         window.oRequestAnimationFrame      ||
         window.msRequestAnimationFrame     ||
         function(/* function */ callback, /* DOMElement */ element) {
            window.setTimeout(callback, 1000 / 60);
         };
})();

var CanvasRenderer = function(game) {
  this.game = game;
  this.canvas = document.getElementById('canvas');
  this.context = this.canvas.getContext('2d');
  this.sprites = CanvasRenderer.prototype.createSprites();
};

CanvasRenderer.prototype.createSprites = function() {
  var canvasWidth = 64,
      canvasHeight = 64,
      cvx,
      ctx;
  var sprites = {
    playerSprite: null,
    enemy: null,
    enemySun: null
  };

  var ENEMY_SIZE = 10;
  // Enemy Sprite
  cvs = document.createElement('canvas');
  canvasWidth = canvasHeight = 38;
  cvs.setAttribute('width', canvasWidth);
  cvs.setAttribute('height', canvasHeight);
  ctx = cvs.getContext('2d');
  ctx.beginPath();
  ctx.arc(canvasWidth * 0.5, canvasHeight * 0.5, ENEMY_SIZE, 0,
          Math.PI * 2, true);
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


 // Player
  cvs = document.createElement('canvas');
  canvasWidth = canvasHeight = 64;
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
  canvasWidth = canvasHeight = 64;
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

  return sprites;
};

CanvasRenderer.prototype.render = function() {
  // Clear the screen
  // Need to refactor to clear only the dirty parts
  this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  var objectsToRender = this.game.state.objects;
  // Render the game state
  for (var i in objectsToRender) {
    var o = objectsToRender[i];
    /*
    if (o.dead) {
      if (o.type === 'player') {
        console.log('player', o.id, 'died');
      }
    }
    */
    //if (o.r > 0) {
    this.renderObject_(o);
    //}
  }

  var ctx = this;
  requestAnimFrame(function() {
    ctx.render.call(ctx);
  });
};

CanvasRenderer.prototype.renderObject_ = function(obj) {
  //console.log(obj.toJSON());
  var ctx = this.context;
  /*
  ctx.fillStyle = (obj.type === 'player' ? 'green' : 'red');
  ctx.beginPath();
  var rad = 10;
  var xx = 200;
  var yy = 200;
  ctx.arc(xx, yy, rad, 0, 2 * Math.PI, true);
  ctx.arc(obj.x, obj.y, rad, 0, 2 * Math.PI, true);
  ctx.closePath();
  ctx.fill();
  
  if (obj.type === 'player') {
    ctx.font = '8pt monospace';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.fillText(obj.id, obj.x, obj.y);
  }
  */
  var sprite = (obj.type === 'player' ? this.sprites.playerSprite : this.sprites.enemy);
  ctx.save()
  ctx.globalAlpha = obj.alpha;
  ctx.translate(Math.round(obj.x), Math.round(obj.y));
  //ctx.scale(0.5, 0.5);
  ctx.drawImage(sprite, Math.round(sprite.width / 2), Math.round(sprite.height / 2));
  ctx.restore();
};

exports.Renderer = CanvasRenderer;

})(window);
