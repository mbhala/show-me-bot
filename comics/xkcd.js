var reqHelper = require('../helpers/requestUtil.js'),
    async = require('async'),
    logger = require('tracer').colorConsole({level: 'info'}),
    _ = require('lodash'),
    config = require('../local.js'),
    DOMAIN_URL = 'http://xkcd.com/',
    METADATA_URL = 'info.0.json',
    XKCD_TEMPLATE,
    XKCD_UNRECOGINZED_OPTION,
    CSE_ID,
    CSE_KEY;

CSE_KEY = config.cseKey;
CSE_ID = config.cseId;

XKCD_UNRECOGINZED_OPTION = 'I dont undertstand that option :disappointed: '
XKCD_UNRECOGINZED_OPTION += '\n Please try one of these options `/showme xkcd [latest|random|comicNum]`';

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
var searchComic = function (searchQuery, callback) {
  var searchURL = 'https://www.googleapis.com/customsearch/v1',
      searchParams = {
        q: searchQuery,
        cx: CSE_ID,
        key: CSE_KEY
      };
  reqHelper.doGET(searchURL, searchParams, function (err, searchResult) {
    if (err || _.has(searchResult, 'items') === false) {
      if (err) {
        logger.error("Error doing search : %s", err.message);
      } else {
        logger.error("No results for search term %s ", searchQuery);
      }
      getLatest( function (err, jsonResult) {
        if (!err) {
          logger.debug('Got latest comic instead of requested searchQuery %s', searchQuery);
          jsonResult.feedback = 'Couldn\'t find comic for search term \''  + searchQuery + '\'\n' ;
          jsonResult.feedback += 'Fear not, here is the latest comic instead ! :smiley:';
        }
        callback(err, jsonResult);
      });
    } else {
      logger.debug("Found results for search term %s", searchQuery);
      var baseLink = _.get(searchResult, 'items[0].link');
      reqHelper.doGET(baseLink + METADATA_URL, null, callback);
    }
  });
};
var getLatest =  function (callback) {
  var result;
  reqHelper.doGET(DOMAIN_URL + METADATA_URL, null, function(err, jsonResult) {
    if (err) {
      callback(err, null);
    } else {
      callback(null, jsonResult);
    }
  });
};

var getComicNum = function ( comicNum, callback) {
  if (comicNum < 0) {
    return this.getLatest(callback);
  }
  var metadata_url = DOMAIN_URL + comicNum.toString() + '/' + METADATA_URL;
  reqHelper.doGET(metadata_url, null, function (err, jsonResult) {
    if (err) {
      getLatest( function (err, jsonResult) {
        if (!err) {
          logger.debug('Got latest comic instead of requested');
          jsonResult.feedback = 'Couldn\'t find comic #' + comicNum.toString();
          jsonResult.feedback += ' Latest Comic is #' + jsonResult.num.toString();
          callback(null, jsonResult);
        } else {
          callback(err, null);
        }
      });
    } else {
      callback(null, jsonResult);
    }
  });
};

var getRandom = function (callback) {
  async.waterfall([
    function (next) {
      getLatest(function (err, latestMetadata) {
        if (err) {
          next(err, null);
        } else {
          var comicNum = Math.floor(Math.random() * latestMetadata['num'] +1);
          next(null, comicNum);
        }
      });
    },
    function (comicNum, next) {
      getComicNum(comicNum, next);
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
        getComicNum(comicNum, callback);
      } else {
        searchComic(whichComic, callback)
      }
    }
  }
};

var formatMessage = function (xkcdMetadata) {
  var formattedMessage = _.cloneDeep(XKCD_TEMPLATE),
      formattedAttachment = {'attachments' : [] };

  formattedMessage.title = xkcdMetadata.title;
  formattedMessage.title_link = DOMAIN_URL + xkcdMetadata.num.toString();
  formattedMessage.text = xkcdMetadata.alt;
  formattedMessage.image_url = xkcdMetadata.img;
  formattedMessage.fallback = xkcdMetadata.title + ' ' + DOMAIN_URL + xkcdMetadata.num.toString();
  if (xkcdMetadata.feedback) {
    formattedMessage.pretext = xkcdMetadata.feedback;
  } else {
    formattedMessage.pretext = 'Here is the comic ! ';
  }
  formattedAttachment.attachments.push(formattedMessage);
  return formattedAttachment;
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
    xkcd_args = req_args.join(' ');
  } else {
    xkcd_args = 'random';
  }
  async.waterfall([
    function (next) {
      getXkcdComic(xkcd_args, next);
    },
    function (result, next) {
      var formattedMessage = formatMessage(result);
      next(null, formattedMessage);
    }
  ],
  function (err, xkcdComic) {
    if (err) {
      return callback(FALLBACK_MSG);
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
