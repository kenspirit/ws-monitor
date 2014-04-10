var config = require('./config'),
    soap = require('soap');

function soapResponseHandler(ws, wsResultHandler, err, result) {
  var wsResponse = {
    name: ws.name,
    url: ws.url,
    status: 'Success',
    remark: '',
    groups: ws.groups,
    type: 'SOAP'
  };

  if (err) {
    wsResponse.status = 'Failed';
    wsResponse.remark = 'Failed to call ' + ws.name + ' with params ' +
        JSON.stringify(ws.criteria);

    wsResultHandler(wsResponse);
    return;
  }

  var isValid = true;
  if (ws.validator) {
    isValid = ws.validator(result);
  }

  if (isValid !== true) {
    wsResponse.status = 'Failed';
    wsResponse.remark = isValid;
  }

  wsResultHandler(wsResponse);
}

function soapHandler(soapService, wsResultHandler, err, client) {
  if (err) {
    var groups = [];
    for (var endPoint in soapService.endPoints) {
      for (var i = 0; i < soapService.endPoints[endPoint].groups.length; i++) {
        var group = soapService.endPoints[endPoint].groups[i];
        if (groups.indexOf(group) < 0) {
          groups.push(group);
        }
      }
    }

    var wsResponse = {
      name: soapService.name,
      url: soapService.url,
      status: 'Failed',
      remark: 'Failed to connect to SOAP service WSDL.',
      groups: groups,
      type: 'SOAP'
    };

    wsResultHandler(wsResponse);
    return;
  }

  for (var endPoint in soapService.endPoints) {
    var ws = soapService.endPoints[endPoint];
    ws.name = endPoint;

    eval('client.' + ws.method + 
      '(ws.criteria || {}, soapResponseHandler.bind(this, ws, wsResultHandler));');
  }
}

function setupDemoService(server) {
  // SOAP server
  var demoService = {
    StockQuoteService: {
      StockQuotePort: {
        GetLastTradePrice: function(args) {
          if (args.tickerSymbol === 'error') {
            throw new Error('triggered server error');
          } else {
            return { price: 19.56 };
          }
        }
      }
    }
  }

  var xml = require('fs').readFileSync('stockquote.wsdl', 'utf8');
  soap.listen(server, '/stockquote', demoService, xml);
}

function getRegisteredWS(server) {
  setupDemoService(server); // Just for demo purpose

  return [{
    url: config.soapServerHost + 'stockquote?wsdl',
    name: 'Stock Quote',
    endPoints: {
      'GetLastTradePrice OK': {
        method: 'GetLastTradePrice',
        validator: function(result) {
          if (!result.price) {
            return false;
          }
          return true;
        },
        groups: ['SOAP', 'Working']
      },
      'GetLastTradePrice Failed': {
        method: 'GetLastTradePrice',
        criteria: { tickerSymbol: 'error'},
        groups: ['SOAP', 'Error']
      }
    }
  }];
}

module.exports.monitor = function(server, wsResultHandler) {
  var soapWS = getRegisteredWS(server);

  for (var i = 0; i < soapWS.length; i++) {
    var ws = soapWS[i];
    soap.createClient(ws.url, soapHandler.bind(this, ws, wsResultHandler));
  }
}
