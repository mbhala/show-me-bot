var xkcdHelper = require('./comics/xkcd.js'),
    logger     = require('tracer').colorConsole(),
    _ = require('lodash'),
    async = require('async'),
    XKCD_TEMPLATE,
    SECRET_TOKEN,
    XKCD_UNRECOGINZED_OPTION;


SECRET_TOKEN = process.env.SLACK_TOKEN;
XKCD_UNRECOGINZED_OPTION = 'Unrecognized option :disappointed: Available options `/showme xkcd [latest|random|comic_num]`';

var XKCD_TEMPLATE = {
  fallback: 'You broke it.. There should be a comic here..',
  color: '#3655A6',
  pretext: '',
  author_name: 'XKCD',
  author_link: 'http://xkcd.com/about/',
  author_icon: 'http://explainxkcd.com/wiki/images/1/1f/xkcd_favicon.png',
  title: 'Politifact',
  title_link: 'https://xkcd.com/1712/',
  text: 'Optional text that appears within the attachment',
  image_url: 'http://imgs.xkcd.com/comics/politifact.png',
};

var FALLBACK_MSG = {
  text: 'Something went wrong in fetching the comic :disappointed: Please Try again.',
  icon_emoji: ':skull_and_crossbones:'
};

var getCommandName = function (messageText) {
  logger.info('Command ', messageText);
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

var getXkcdComic = function (whichComic, callback) {
  switch (whichComic) {
    case 'random':
    {
      xkcdHelper.getRandom(callback);
      break;
    }
    case 'latest':
    {
      xkcdHelper.getLatest(callback);
      break;
    }
    default: {
      var comicNum = Number(whichComic);
      if (!isNaN(comicNum)) {
        xkcdHelper.getComic(comicNum, function (err, metadata) {
          if (err) {
            logger.warn('Error retrieving comic #%d, Getting Latest', comicNum);
            xkcdHelper.getLatest( function (err, metadata) {
              if (!err) {
                metadata.feedback = 'Couldn\'t find comic #' + comicNum.toString();
                metadata.feedback += ' Latest Comic is #' + metadata.latest_num.toString();
                callback(null, metadata);
              } else {
                callback(err, null);
              }
            });
          } else {
            callback(null, metadata);
          }
        });
      } else {
        logger.error('unrecognized option %s passed', whichComic);
        callback(XKCD_UNRECOGINZED_OPTION, null);
      }
    }
  }
};
var formatMessage = function (xkcdMetadata, callback) {
  var formattedMessage = _.cloneDeep(XKCD_TEMPLATE),
      formattedAttachment = {'attachments' : [] };

  formattedMessage.title = xkcdMetadata.title;
  formattedMessage.title_link = xkcdMetadata.comic_url;
  formattedMessage.text = xkcdMetadata.alttext;
  formattedMessage.image_url = xkcdMetadata.img_url;
  if (xkcdMetadata.feedback) {
    formattedMessage.pretext = xkcdMetadata.feedback;
  } else {
    formattedMessage.pretext = 'Here is the comic ! ';
  }
  formattedAttachment.attachments.push(formattedMessage);
  callback(null, formattedAttachment);
}
/**
* we expect the argument to be either a number or the text 'latest' | 'random'
* if 'latest' return the latest comic.
* if 'random' return a random comic.
* if number, try to get the comic number. If it doesnt exist return the latest one
*/
var xkcdHandler = function (req_args, callback) {
  var xkcd_args, xkcd_data;
  if (req_args.length > 0 ) {
    xkcd_args = req_args[0];
  } else {
    xkcd_args = 'random';
  }
  async.waterfall([
    function (next) {
      getXkcdComic(xkcd_args, next);
    },
    function (result, next) {
      formatMessage(result, next);
    }
  ],
  function (err, xkcdComic) {
    if (err) {
      var errMsg = _.cloneDeep(FALLBACK_MSG);
      if (err === XKCD_UNRECOGINZED_OPTION) {
        errMsg.text = XKCD_UNRECOGINZED_OPTION;
      }
      return callback(errMsg);
    } else {
      return callback(xkcdComic);
    }
  });
};
module.exports = {
  handleSlashCmds: function (bot, message) {
    var parsedMessage;
    if (message.token !== SECRET_TOKEN) {
      return bot.res.status(200).send({text: 'I don\'t talk to strangers'});
    }
    parsedMessage = getCommandName(message.text);
    switch (message.command) {
      case '/showme':
      {
        if (parsedMessage.command === 'xkcd') {
          xkcdHandler(parsedMessage.args, function (xkcdComic) {
            bot.replyPublic(message, xkcdComic);
          });
        }
        break;
      }
      default:
        bot.replyPrivate(message, 'Not implemented yet.');
        break;
    }
  }
}
