var request = require('request'),
    async = require('async'),
    logger = require('tracer').colorConsole({level: 'info'}),
    _ = require('lodash'),
    DOMAIN_URL = 'http://xkcd.com/',
    METADATA_URL = 'info.0.json',
    XKCD_TEMPLATE,
    XKCD_UNRECOGINZED_OPTION;

XKCD_UNRECOGINZED_OPTION = 'I dont undertstand that option :disappointed: '
XKCD_UNRECOGINZED_OPTION += '\n Please try one of these options `/showme xkcd [latest|random|comic_num]`';

XKCD_TEMPLATE = {
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

var getLatest =  function (callback) {
  request(DOMAIN_URL + METADATA_URL, function (err, res, body) {
    if (!err && res.statusCode == 200) {
      var reqResult = JSON.parse(body);
      var result = {
        'title': reqResult['title'],
        'alttext': reqResult['alt'],
        'comic_url': DOMAIN_URL ,
        'img_url': reqResult['img'],
        'latest_num' : reqResult['num']
      };
      return callback(null, result);
    } else {
      return callback(err, null);
    }
  });
};

var getComicNum = function ( comic_num, callback) {
  if (comic_num < 0) {
    return this.getLatest(callback);
  }
  var comic_url = DOMAIN_URL + comic_num.toString(),
      metadata_url = comic_url + '/' + METADATA_URL;
  request(metadata_url, function (err, res, body) {
    if (!err && res.statusCode == 200) {
      var reqResult = JSON.parse(body);
      var result = {
        'title': reqResult['title'],
        'alttext': reqResult['alt'],
        'comic_url': comic_url,
        'img_url': reqResult['img'],
      };
      return callback(null, result);
    } else {
      return callback('Not Found - 404', null);
    }
  });
};

var getRandom = function (callback) {
  async.waterfall([
    function (next) {
      getLatest(function (err, result) {
        if (err) {
          next(err, null);
        } else {
          var comic_num = Math.floor(Math.random() * result['latest_num'] +1);
          next(null, comic_num);
        }
      });
    },
    function (comic_num, next) {
      getComicNum(comic_num, next);
    }
  ],
  function (err, result) {
      callback(err, result);
  });
};

var getXkcdComic = function (whichComic, callback) {
  switch (whichComic) {
    case 'random':
    {
      getRandom(callback);
      break;
    }
    case 'latest':
    {
      getLatest(callback);
      break;
    }
    default: {
      var comicNum = Number(whichComic);
      logger.debug("Requested Comic Num : , %d", comicNum);
      if (!isNaN(comicNum)) {
        getComicNum(comicNum, function (err, metadata) {
          if (err) {
            logger.debug('Error retrieving comic #%d, Getting Latest', comicNum);
            getLatest( function (err, metadata) {
              if (!err) {
                logger.debug('Got latest comic instead of requested');
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
  logger.debug('Req Args ', req_args);
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
  getRandom: getRandom,
  getLatest: getLatest,
  getComicNum: getComicNum,
  getComic: xkcdHandler,
  XKCD_BASE_URL : DOMAIN_URL
}
