(function(exports) {

  function DesktopInput(game) {
    this.game = game;
    var ctx = this;

    // Listen for mouse events on the canvas element
    var canvas = document.getElementById('canvas');
    canvas.addEventListener('click', function(e) {
      ctx.onclick.call(ctx, e);
    });
  }

  DesktopInput.prototype.onjoin = function() {
    if (!playerId) {
      smoke.prompt('what is your name', function(name) {
        if (name) {
          socket.emit('join', {name: name});
          document.querySelector('#join').style.display = 'none';
        } else {
          smoke.signal('sorry, name required');
        }
      });
    }
  };

  DesktopInput.prototype.onleave = function() {
    socket.emit('leave', {name: playerId});
  };

  DesktopInput.prototype.onclick = function(event) {
  };

  exports.Input = DesktopInput;

})(window);
