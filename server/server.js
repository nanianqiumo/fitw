const Koa = require('koa'),
      app = new Koa(),
      http = require('http').Server(app),
      gameService =require('./game-service');


const port = 8001;
new gameService(port,http);
http.listen(port, () => {
  console.log(`server is running on port ${port}`);
});

process.on("uncaughtException", function(err){
  console.error(err);
})
