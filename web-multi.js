var express = require('express');
var io = require('socket.io').listen(5050);
var gamejs = new require('/common/game.js');

var app = express.createServer(express.logger());

app.use("/js", express.static(__dirname + "/js"));
app.use("/css", express.static(__dirname + "/css"));
app.use("/images", express.static(__dirname + "/images"));
app.use("/common", express.static(__dirname + "/common"));

app.get('/', function(request, response) {
  response.sendfile('game.html');
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});

var Game = gamejs.Game;
var game = new Game();
var observerCount = 0;

io.sockets.on('connection', function(socket) {
  observerCount++;
  // Keep track of the player associated with this socket
  var playerID = null;

  // When client connects, dump game state
  socket.emit('start', {
    state: game.save()
  });

  // Client joins the game as a player
  socket.on('join', function(data) {
    console.log('recv join', data);
    if( game.nameExists(data.name) ) {
      // Don't allow duplicate names
      return;
    }
    if( game.getPlayerCount() >= 4 ) {
      // Don't allow more than 4 players
      return;
    }
    playerId = game.join(data.name);
    data.timeStamp = new Date();
    // Broadcast that client has joined
    socket.broadcast.emit('join', data);
    data.isme = true;
    socket.emit('join', data);
  });

  // Client leaves the game
  socket.on('leave', function(data) {
    console.log('recv leave', data);
    observerCount--;
    game.leave(playerId);
    data.timeStamp = new Date();
    // Broadcast that client has left
    io.sockets.emit('leave', data);
  });

  socket.on('disconnect', function(data) {
    console.log('recv disconnect', data);
    observerCount--;
    game.leave(playerId);
    // If this was a player, it just left
    if( playerId ) {
      socket.broadcast.emit('leave', {name: playerId, timeStamp: new Date()});
    }
  });

  // Periodically emit time sync commands
  var timeSyncTime = setInterval(function() {
    socket.emit('time', {
      timeStamp: (new Date()).valueOf(),
      lastUpdate: game.state.timeStamp,
      updateCount: game.updateCount,
      observerCount: observerCount
    });
  }, 2000);
});

// When someone dies, let the clients know
game.on('dead', function(data) {
  io.sockets.emit('leave', {name: data.id, type: data.type, timeStamp: newDate()});
});

// When the game ends, let the clients know
game.on('victory', function(data) {
  console.log('game victory event fired');
  io.sockets.emit('victory', {id: data.id});
  // Stop the game
  game.over();
  //TODO : Wait a bit and restart.
});

