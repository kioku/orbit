document.addEventListener('DOMContentLoaded', function() {

  //socket = io.connect('http://orbit-fork.herokuapp.com:5050');
  socket = io.connect('http://localhost:5000');
  game = new Game();
  playerId = null;
  totalSkew = 0;

  var canvas = document.getElementById('canvas');
  canvas.setAttribute('width', window.innerWidth);
  canvas.setAttribute('height', window.innerHeight);

  //console.log(game.save());

  var renderer = new Renderer(game);
  //var input = new Input(game);

  socket.on('start', function(data) {
    console.log('recv start', data);

    game.load(data.state);
    // Get the initial time to calibrate synchronization.
    var startDelta = new Date().valueoff - data.state.timeStamp;
    // Setup the game progress loop
    game.updateEvery(Game.UPDATE_INTERVAL, startDelta);

    //var renderer = new Renderer(game);
    renderer.render();

    // Check if there's a name specified
    if (window.location.hash) {
      var name = window.location.hash.slice(1);
      socket.emit('join', {name: name});
      //document.querySelector('#join').style.display = 'none';
    }
  });

  socket.on('state', function(data) {
    console.log('recv state', data);
    game.load(data.state);
  });

  // A new client joins
  socket.on('join', function(data) {
    console.log('recv join', data);
    game.join(data.name);
    if (data.isme) {
      playerId = data.name;
      // Set the hash
      window.location.hash = '#' + data.name;
    }
  });

  // A client leaves
  socket.on('leave', function(data) {
    console.log('recv leave', data);
    if( playerId === data.name ) {
      //gameover('game over!');
    }
    game.leave(data.name);
  });

  // Get a time sync from the server
  socket.on('time', function(data) {
    // Compute how much we've skewed from the server since the last tick
    var updateDelta = data.lastUpdate - game.state.timeStamp;
    // Add to the cumulative skew offset
    totalSkew += updateDelta;
    // If the skew offset is too large in either direction, get the real state
    // from the server
    //if( Math.abs(totalSkew) > Game.TARGET_LATENCY ) {
      // Fetch the new truth from the server.
      console.log('trying to fetch state');
      socket.emit('state');
      totalSkew = 0;
    //}
    // Set the true timestamp anyway now
    game.state.timeStamp = data.lastUpdate;

    // Number of clients that aren't playing
    //document.getElementById('observer-count').innerText = 
      //Math.max(data.observerCount - game.getPlayerCount(), 0);
    //document.getElementById('player-count').innerText = game.getPlayerCount();
    //document.getElementById('average-lag').innerText = Math.abs(updateDelta);
  });

  /*
  // Server reports that somebody won
  socket.on('victory', function(data) {
    if (playerId) {
      if (data.id === playerId) {
        //gameover('you win, play again?');
      } else {
        gameover(data.id + 'won and you lost!, play again?');
      }
    } else {
      gameover('game over. ' + data.id + ' won! play again?');
    }
  });

  function gameover(msg) {
    smoke.confirm(msg, function(yes) {
      if (yes && playerId) {
        socket.emit('join', {name: playerId});
      } else {
        smoke.signal('watching mode');
        // Show the button
        document.querySelector('#join').style.display = 'inline';
        playerId = null;
      }
      // Get a fresh state
      socket.emit('state');
    });
  }
   */

});
