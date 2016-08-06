var request = require('request');

var parseJSON = function (str){
    try {
        return JSON.parse(str);
    }
    catch(e) {
        return false;
    }
}

module.exports = {
  doGET : function (url, queryParams, callback) {
    var reqParams = {};

    if (!url) {
      return callback(new Error("URL not defined"));
    }

    reqParams['url'] = url;
    if (queryParams ) { //Check if query params is object
      reqParams['qs'] = queryParams;
    }

    request(reqParams, function (err, res, body) {
      if (err) {
        callback(err, null);
      } else if (res.statusCode !== 200) {
        callback(new Error(" Request returned - " + res.statusCode.toString()));
      } else {
        jsonBody = parseJSON(body);
        if (jsonBody !== false) {
          return callback(null, jsonBody);
        } else {
          return callback(null, body);
        }
      }
    });
  }
}
