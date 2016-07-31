var Botkit = require('botkit'),
    logger = require('tracer').colorConsole(),
    botHandler = require('./bot_handler.js'),
    controller,
    app,
    PORT;

controller = Botkit.slackbot({
  debug: true
});

PORT = process.env.PORT || 3123;

controller.setupWebserver(PORT, function (err, webserver) {
  app = webserver;
  controller.createWebhookEndpoints(webserver);
  app.get('/', function( req, res) {
    res.status(200).send("Hello! Everthing is A OK!");
  });
});

controller.on('slash_command', botHandler.handleSlashCmds);
