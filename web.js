var express = require('express');

var app = express.createServer(express.logger());

app.use(express.static(__dirname + "/js"));
app.use(express.static(__dirname + "/css"));
app.use(express.static(__dirname + "/images"));

app.get('/', function(request, response) {
  response.sendfile('game.html');
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
