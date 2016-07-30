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
  app.get('/hello', function( req, res) {
    res.status(200).send("Hello man!");
  });
});

controller.on('slash_command', botHandler.handleSlashCmds);
