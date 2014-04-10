var config = require('./config'),
    rest = require('restler'),
    _ = require('underscore'),
    registeredWS = {
      'Working': {
        url: config.restServerHost + 'rest/working/12345678',
        groups: ['Working', 'Another Group']
      },
      'Working but response not expected': {
        url: config.restServerHost + 'rest/workingResponseNotExpected',
        validator: function(data) {
          if (!data.expectedAttribute) {
            return 'Response doesn\'t contain field expectedAttribute. Response: ' +
              JSON.stringify(data);
          }
          return true;
        },
        groups: ['Working']
      },
      'Working with Params': {
        url: config.restServerHost + 'rest/workingWithParams',
        params: {
          foo: 'bar'
        },
        validator: function(data) {
          var obj = JSON.parse(data);
          if (!obj.foo && obj.foo !== 'bar') {
            return false;
          }
          return true;
        },
        groups: ['Working', 'Another Group']
      },
      'Post with Params': {
        url: config.restServerHost + 'rest/postWithParams',
        method: 'post',
        params: {
          bar: 'foo'
        },
        validator: function(data) {
          var obj = JSON.parse(data);
          if (!obj.bar && obj.bar !== 'foo') {
            return false;
          }
          return true;
        },
        groups: ['Another Group']
      },
      'Expected error': {
        url: config.restServerHost + 'rest/expectedError',
        groups: ['Error']
      },
      'Unexpected error': {
        url: config.restServerHost + 'rest/unexpectedError',
        groups: ['Error']
      }
    };

function registerDemoRoute(app) {
  app.get('/rest/working/:id', function (req, res) {
    res.json(200, {id: req.params['id']});
  });

  app.get('/rest/workingResponseNotExpected', function (req, res) {
    res.json(200, {unExpectedAttribute: true});
  });

  app.get('/rest/workingWithParams', function (req, res) {
    res.json(200, req.body);
  });

  app.get('/rest/expectedError', function (req, res) {
    res.send(500, {err: 'Something I am not happy with.'});
  });

  app.get('/rest/unexpectedError', function (req, res) {
    throw new Error('Unexpected things happened.');
    res.send(200, 'Not reaching here.');
  });

  app.post('/rest/postWithParams', function (req, res) {
    res.json(200, req.body);
  });
}

function getRegisteredWS(app) {
  registerDemoRoute(app); // Just for demo purpose

  return registeredWS;
}

function restResponseHandler(ws, wsResultHandler, result, response) {
  var wsResponse = {
    name: ws.name,
    url: ws.url,
    status: 'Success',
    remark: '',
    groups: ws.groups,
    type: 'REST'
  };

  if (result instanceof Error) {
    wsResponse.remark = result.valueOf();
    wsResponse.status = 'Failed';
  } else {
    if (result.error) {
      wsResponse.status = 'Failed';
      wsResponse.remark = result.error.valueOf();
    } else if (response.statusCode >= 400) {
      var msg = result.toString();
      if (typeof result === 'object') {
        msg = JSON.stringify(result);
      }

      wsResponse.status = 'Failed';
      wsResponse.remark = 'HTTP status: ' + response.statusCode +
        ' Msg: ' + msg;
    }

    var validationResult = true;
    if (ws.validator) {
      validationResult = ws.validator(result);
    }
    if (validationResult !== true) {
      wsResponse.status = 'Failed';
      wsResponse.remark = validationResult;
    }
  }

  wsResultHandler(wsResponse);
}

module.exports.monitor = function(app, wsResultHandler) {
  var restful = getRegisteredWS(app);

  for (var wsName in restful) {
    var ws = restful[wsName];
    ws.name = wsName;

    rest.request(ws.url, {
      method: ws.method || 'get',
      headers: _.extend(config.defaultRestHeaders, ws.headers),
      data: ws.params
    })
    .on('complete', restResponseHandler.bind(this, ws, wsResultHandler));
  }
}
