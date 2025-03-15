var express = require('express');
var logger = require('morgan');


console.log('what?');
var app = express();

app.use("/js", express.static(__dirname + "/js"));
app.use("/css", express.static(__dirname + "/css"));
app.use("/images", express.static(__dirname + "/images"));

app.use(logger);

app.get('/', function(request, response) {
  response.sendfile('game.html');
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
  //console.log("Listening on " + port);
});
