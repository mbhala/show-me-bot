var request = require('request'),
    async = require('async'),
    _ = require('lodash'),
    DOMAIN_URL = 'http://xkcd.com/';
    METADATA_URL = 'info.0.json';

module.exports = {
  getLatest: function (callback) {
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
  },
  getComic: function ( comic_num, callback) {
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
  },
  getRandom: function (callback) {
    var self = this;
    async.waterfall([
      function (next) {
        self.getLatest(function (err, result) {
          if (err) {
            next(err, null);
          } else {
            var comic_num = Math.floor(Math.random() * result['latest_num'] +1);
            next(null, comic_num);
          }
        });
      },
      function (comic_num, next) {
        self.getComic(comic_num, next);
      }
    ],
    function (err, result) {
        callback(err, result);
    });
  },
  XKCD_BASE_URL : DOMAIN_URL
}
