var xkcdHelper = require('./comics/xkcd.js'),
    logger = require('tracer').colorConsole({level: 'info'}),
    config = require('./local.js'),
    SECRET_TOKENS,
    HELP_TEXT;

SECRET_TOKENS = config.slackTokens;
HELP_TEXT = 'I don\'t know how to do that yet :skull: \nTry `/showme xkcd`';
var getCommandName = function (messageText) {
  logger.debug('Command ', messageText);
  var result = {};
  if (messageText) {
    textTokens = messageText.split(' ');
    if (textTokens[0] === ''){
      textTokens = [];
    }
    if (textTokens.length > 0) {
      result.command = textTokens.shift();
      result.args = textTokens;
    }
  }
  return result;
};

module.exports = {
  handleSlashCmds: function (bot, message) {
    var parsedMessage;
    if (SECRET_TOKENS.indexOf(message.token) === -1) {
      return bot.replyPublic({text: 'I don\'t talk to strangers :innocent: '});
    }
    switch (message.command) {
      case '/showme':
      {
        parsedMessage = getCommandName(message.text);
        if (parsedMessage.command === 'xkcd') {
          xkcdHelper.getComic(parsedMessage.args, function (xkcdComic) {
            logger.debug("Replying with : %j", xkcdComic);
            return bot.replyPublic(message, xkcdComic);
          });
        } else {
          return bot.replyPublic(message, {'text' : HELP_TEXT});
        }
        break;
      }
      default:
        return bot.replyPublic(message, {'text': 'Not implemented yet.'});
        break;
    }
  }
}
