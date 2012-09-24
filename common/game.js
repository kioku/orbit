(function(exports) {
/**
 * The game instance that's shared across all clients and the server
 */
var Game = function() {
  this.state = {};
  this.oldState = {};

  // Last used ID
  this.lastId = 0;
  this.callbacks = {};

  // Counter for the number of updates
  this.updateCount = 0;
  // Timer for the update loop
  this.timer = null;
};

Game.UPDATE_INTERVAL = Math.round(1000 / 30);
Game.TRANSFER_RATE = 0.05;
Game.TARGET_LATENCY = 1000; // Max latency skew.

/**
 * Computes the game state
 * @param {number} delta Number of milliseconds in the future
 * @return {object} The new game state at that timestamp
 */
Game.prototype.computeState = function(delta) {
  var newState = {
    objects: {},
    timeStamp: this.state.timeStamp + delta
  };
  var newObjects = newState.objects;
  var objects = this.state.objects;
  // Generate a new state based on the old one
  for( var objId in objects ) {
    var obj = objects[objId];
    if( !obj.dead ) {
      newObjects[obj.id] = obj.computeState(delta);
    }
  }

  // Need to check for collisions and bounds
  // check for game termination
  
  return newState;
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
  this.state.objects[player.id] = player;
  return player.id;
};

/**
 * Called when a player leaves
 */
Game.prototype.leave = function(playerId) {
  delete this.state.objects[playerId];
};

Game.prototype.getPlayerCount = function() {
  var count = 0;
  var objects = this.state.objects;
  for( var id in objects ) {
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
  for( var id in this.state.objects ) {
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
  var objects = savedState.objects;
  this.state = {
    objects: {}
    timeStamp: savedState.timeStamp.valueOf()
  }
  for( var id in objects ) {
    var obj = objects[id];
    // Depending on type, instantiate
    if( obj.type === 'enemy' ) {
      this.state.objects[obj.id] = new Enemy(obj);
    } else if( obj.type === 'player') {
      this.state.objects[obj.id] = new Player(obj);
    }

    // Increment this.lastId
    if( obj.id > this.lastId ) {
      this.lastId = obj.id;
    }
  }
};

Game.prototype.entityExists = function(entId) {
  return this.state.objects[entId] !== undefined;
};

Game.prototype.callback_ = function(event, data) {
  var callback = this.callbacks[event];
  if( callback ) {
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
  if( !params ) {
    return;
  }
  this.id = params.id;
  this.x = params.x;
  this.y = params.y;
  if( !this.type ) {
    this.type = 'entity';
  }
};

Entity.prototype.toJSON = function() {
  var obj = {};
  for( var prop in this ) {
    if( this.hasOwnProperty(prop) ) {
      obj[prop] = this[prop];
    }
  }
  return obj;
};

var Player = function(params) {
  this.name = params.name;
  this.type = 'player'

  Entity.call(this, params);
};

Player.prototype = new Entity();
Player.prototype.constructor = Player;

exports.Game = Game;
exports.Player = Player;
exports.Entity = Entity;

})(typeof global === "undefined" ? window : exports);
