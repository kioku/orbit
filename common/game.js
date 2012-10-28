(function(exports) {
/**
 * The game instance that's shared across all clients and the server
 */
var Game = function() {
  this.state = {
    objects: {},
    timeStamp: (new Date()).valueOf()
  };
  this.oldState = {};

  // Last used ID
  this.lastId = 0;
  this.callbacks = {};

  // List of player ids
  this.playerIds = [];

  // will need to remove
  //this.state.timeStamp = (new Date()).valueOf();
  //this.state.objects = {};

  // Counter for the number of updates
  this.updateCount = 0;
  // Timer for the update loop
  this.timer = null;
  this.timeFactor = 0;
};

Game.UPDATE_INTERVAL = Math.round(1000 / 60);
Game.MAX_DELTA = 10000;
Game.TRANSFER_RATE = 0.05;
Game.TARGET_LATENCY = 1000; // Max latency skew.
// must test
/*
Game.timeThisFrame = 0;
Game.timeLastFrame = 0;
Game.timeThisSecond = 0;
Game.timeLastSecond = 0;
Game.fps = 0;
Game.fpsMin = 0;
Game.fpsMax = 0;
*/

/**
 * Computes the game state
 * @param {number} delta Number of milliseconds in the future
 * @return {object} The new game state at that timestamp
 */
//Game.prototype.computeState = function(delta) {
  //if (typeof this.state.objects === 'undefined') {
    //return;
  //}
  //var newState = {
    //objects: this.state.objects, //{},
    //timeStamp: this.state.timeStamp + delta
  //};
  //var newObjects = newState.objects;
  //var objects = this.state.objects;
  //// Generate a new state based on the old one
  //for (var objId in objects) {
    //var obj = objects[objId];
    ////if (typeof obj === 'undefined') {
      ////delete this.state.objects[objId];
    ////}
    //if (obj.alive) {
      //// Updates the object obj for the delta timestamp
      //newObjects[obj.id] = obj.update();
    //}
  //}

  //// Check for collisions
  //for (i in this.playerIds) {
    //var p = newObjects[i];
    //for (j in newObjects) {
      //var o = newObjects[j];
      //try {
        //if (p !== o && p.intersects(o)) {
          //// Only works with player - food interaction
          //o.alive = false;
          ////newObjects.splice(j, 1);
          //delete newObjects[j];
          //p.score++; 
        //}
      //}
      //catch (e) {
      //}
      //// Also check to see if food / enemy should be killed
      ////if (o.time === 100 && typeof window === 'undefined') {
      ////if (o.time === 100) {
        ////console.log('deleting object ' + o.id)
        ////o.alive = false;
        ////delete newObjects[j];
      ////}
    //}
  //}

  //for (j in newObjects) {
    //var o = newObjects[j]
    //if (o.time === 100) {
      //console.log('deleting object ' + o.id + ' now');
      //o.alive = false;
      //delete newObjects[j];
    //}
  //}

  //// Experimental food / enemy generation
  //// Might need to relocate code
  //if (Math.random() > 0.99 && typeof window === 'undefined') {
    //var enemy = new Enemy();
    //enemy.alive = true;
    //newObjects[enemy.id] = enemy;
  //}

  //newState.objects = newObjects;

  //// Need to check for collisions and bounds
  //// check for game termination
  //return newState;
//};

Game.prototype.computeState = function(delta) {
  var newState = {
    objects: this.state.objects,
    timeStamp: this.state.timeStamp + delta
  };
  var newObjects = newState.objects;
  var objects = this.state.objects;
  // Generate new state
  for (var objId in objects) {
    var obj = objects[objId];
    if (obj.alive) {
      newObjects[obj.id] = obj.update();
    }
  }

  for (j in newObjects) {
    var o = newObjects[j]
    if (o.time === 100) {
      console.log('deleting object ' + o.id + ' now');
      o.alive = false;
      delete newObjects[j];
    }
  }

  // Experimental food / enemy generation
  // Might need to relocate code
  if (Math.random() > 0.99 && typeof window === 'undefined') {
    var enemy = new Enemy();
    enemy.alive = true;
    newObjects[enemy.id] = enemy;
  }

  newState.objects = newObjects;

  return newState;
}

Game.prototype.update = function(timeStamp) {
  var delta = timeStamp - this.state.timeStamp;
  if (delta < 0) {
    throw "Can't compute state in the past. Delta: " + delta;
  }
  if (delta > Game.MAX_DELTA) {
    throw "Can't compute state so far in the future. Delta: " + delta;
  }
  this.state = this.computeState(delta);
  this.updateCount++;
  // Might need to recalculate this on a different delta
  this.timeFactor = delta / Game.UPDATE_INTERVAL;
};

Game.prototype.updateEvery = function(interval, skew) {
  if(!skew) {
    skew = 0;
  }
  console.log('updating the game');
  var lastUpdate = (new Date()).valueOf() - skew;
  var ctx = this;
  this.time = setInterval(function() {
    var date = (new Date()).valueOf() - skew;
    if (date - lastUpdate >= interval) {
      ctx.update(date);
      lastUpdate += interval;
    }
  }, 1);
};

Game.prototype.over = function() {
  clearInterval(this.timer);
};

Game.prototype.join = function(id) {
  var x, y;
  switch (this.getPlayerCount() % 4) {
    case 0:
      x = 200; y = 200;
    break;
    case 1:
      x = 200; y = 400;
    break;
    case 2:
      x = 400; y = 200;
    break;
    case 3:
      x = 400; y = 400;
    break;
  }
  // Add the player to the world
  var player = new Player({
    id: id,
    x: x,
    y: y
    //other properties
  });
  player.alive = true;
  this.state.objects[player.id] = player;
  this.playerIds.push(player.id);
  return player.id;
};

/**
 * Called when a player leaves
 */
Game.prototype.leave = function(playerId) {
  if (!playerId) {
    return;
  }
  this.state.objects[playerId].alive = false;
  delete this.state.objects[playerId];
};

Game.prototype.getPlayerCount = function() {
  var count = 0;
  var objects = this.state.objects;
  for (var id in objects) {
    if (objects[id].type == 'player') {
      count++;
    }
  }
  return count;
};

/*********
 * Loading and saving
 */

/**
 * Save the game state
 * @return {object} JSON of the game state
 */
Game.prototype.save = function() {
  var serialized = {
    objects: {},
    timeStamp: this.state.timeStamp
  };
  //console.log(this.state.objects);
  for (var id in this.state.objects) {
    var obj = this.state.objects[id];
    // Serialize to JSON!
    serialized.objects[id] = obj.toJSON();
  }

  return serialized;
};

/**
 * Load the game state.
 * @param {object} gameState JSON of the game state
 */
Game.prototype.load = function(savedState) {
  var objects;
  try {
    //console.log('fetched game objects succesfully');
    objects = savedState.objects;
    //console.log('grabbed objs', objects);
  }
  catch (e) {
    console.log('no game state exists, creating empty game object');
    //objects = {};
  }
  this.state = {
    objects: this.state.objects, // instead of {}
    timeStamp: savedState.timeStamp.valueOf()
  };
  for (var id in objects) {
    var obj = objects[id];
    // Depending on type, instantiate
    if (obj.type === 'enemy') {
      this.state.objects[obj.id] = new Enemy(obj);
      //console.log(this.state.objects[obj.id]);
    } else if (obj.type === 'player') {
      this.state.objects[obj.id] = new Player(obj);
    }

    // Increment this.lastId
    //if (obj.id > this.lastId) {
      //this.lastId = obj.id;
    //}
  }
};

Game.prototype.entityExists = function(entId) {
  return this.state.objects[entId] !== undefined;
};

Game.prototype.callback_ = function(event, data) {
  var callback = this.callbacks[event];
  if (callback) {
    callback(data);
  } else {
    throw "Warning: No callback defined!";
  }
};

Game.prototype.newId_ = function() {
  return ++this.lastId;
};

Game.prototype.on = function(event, callback) {
  // Sample use in a client:
  // game.on('dead', function(data) {
  //    if( data.id === player.id ) {
  //        // Darn -- player died!
  //    }
  // });
  this.callbacks[event] = callback;
};


var Entity = function(params) {
  if (!params) {
    return;
  }
  this.id = params.id || 0;
  this.alive = true;
  this.x = params.x || 0;
  this.y = params.y || 0;
  this.width = 0;
  this.height = 0;
  this.r = 0;
  if( !this.type ) {
    this.type = 'entity';
  }
};

//Entity.prototype.update = function() {
  //console.log('update entity');
  //return 1;
//}

Entity.prototype.distanceFrom = function(ent) {
  return Math.sqrt(Math.pow(this.x - ent.x, 2) + Math.pow(this.y - ent.y, 2));
};

Entity.prototype.intersects = function(ent) {
  return this.distanceFrom(ent) < this.r + ent.r;
};

Entity.prototype.toJSON = function() {
  var obj = {};
  for (var prop in this) {
    if (this.hasOwnProperty(prop)) {
      obj[prop] = this[prop];
    }
  }
  return obj;
};

var Player = function(params) {
  this.name = params.name;
  this.type = 'player'
  this.velocity = {
    x: 0,
    y: 0
  };
  this.angle = 0;

  Entity.call(this, params);
};

Player.prototype = new Entity;

Player.prototype.update = function() {
  var rotationVel = Math.PI / (180 * 1);
  var thrust = 0.01;

  this.velocity.x += Math.cos(this.angle) * thrust;
  this.velocity.y += Math.sin(this.angle) * thrust;

  //if (hold || mouse.down) {
    //this.angle -= rotationVel;
  //} else {
    //this.angle += rotationVel;
  //}

  if (this.angle > Math.PI / 2 &&
      this.angle < -Math.PI / 2) {
    this.x -= this.velocity.x;
    this.y += this.velocity.y;
  } else {
    this.x += this.velocity.x;
    this.y += this.velocity.y;
  }

  return this;
};
Player.update = Player.prototype.update;

//Player.prototype.constructor = Player;


var Enemy = function(params) {
  // TODO: Find a way to send the world dimensions from client to server
  //if (typeof params === "undefined") {
    //console.log('enemy params undefined');
    //return;
  //}
  this.x = params ? params.x : Math.round(Math.random() * 800);//window.innerWidth);
  this.y = params ? params.y : Math.round(Math.random() * 800);//window.innerHeight);
  // Override the neutral inherited id with a
  // unique one based on the generated points
  this.id = params ? params.id : this.x + this.y;
  this.type = params ? params.type : 'enemy';
  this.scale = params ? params.scale : 0.01;
  this.scaleTarget = 1;
  this.alpha = params ? params.alpha : 0;
  this.alphaTarget = 1;
  this.time = params ? params.time : 0;

  Entity.call(this, params);
};

Enemy.prototype = new Entity;

Enemy.prototype.update = function() {
  this.time = Math.min(this.time + (0.2 * 1), 100);//Game.timeFactor), 100);
  //this.scale += ((enemy.scaleTarget - enemy.scale) + 0.01) * 0.3;
  this.alpha += (this.alphaTarget - this.alpha) * 0.01;
  return this;

  /*
  var collision = collides(player, enemy);
  if (enemy.alive                      &&
      enemy.time === 100               &&
      enemy.type === ENEMY_TYPE_NORMAL ||
      collision                        &&
      enemy.type === ENEMY_TYPE_NORMAL) {

      enemies.splice(i, 1);
      enemy.alive = false;

      if (collision) {
        player.score++;
        // TODO: implement notify
        //notify(player.score, player.x, player.y - 10, 1, [250, 250, 100]);
      }
  */
};
Enemy.update = Enemy.prototype.update;

//Enemy.prototype.constructor = Enemy;

// TODO: params are wrong, change to work with the new entity class
/*
var Notification(text, x, y, scale, rgb) {
  this.text = text || '';
  this.x = x || 0;
  this.y = y || 0;
  this.scale = scale || 1;
  this.rgb = rgb || [255, 255, 255];
  this.alpha = 1;
};
*/
//Notification.prototype = new Entity();

exports.Game = Game;
exports.Player = Player;
exports.Entity = Entity;
exports.Enemy = Enemy;
//exports.Notification = Notification;

})(typeof global === "undefined" ? window : exports);
