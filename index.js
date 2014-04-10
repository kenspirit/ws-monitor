var express = require('express'),
    app = express(),
    http = require('http'),
    server = http.createServer(app),
    io = require('socket.io').listen(server),
    moment = require('moment'),
    restfulWS = require('./restfulWS'),
    soapWS = require('./soapWS'),
    config = require('./config');

app.configure(function() {
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.static(__dirname + '/'));
  app.use(app.router);
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

server.listen(3000);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html'); // demo page
});

function wsResultHandler(socket, wsStatus) {
  // wsStatus format
  // {
  //   name: ws.name,
  //   url: ws.url,
  //   status: 'Success'/'Failed',
  //   remark: '',
  //   groups: ws.groups,
  //   type: 'REST'/'SOAP'
  // }
  wsStatus.lastCheckingTime = moment().format("MMM DD YYYY, h:mm:ss a");;

  socket.emit('update', wsStatus);
}

function getWebServiceStatus(socket) {
  var handler = wsResultHandler.bind(this, socket);

  restfulWS.monitor(app, handler);

  soapWS.monitor(server, handler);
}

io.sockets.on('connection', function (socket) {
  var monitorProcess;

  socket.on('list', function (data) {
    if (monitorProcess) {
      clearInterval(monitorProcess);
    }
    getWebServiceStatus(socket);

    monitorProcess = setInterval(function() {
      getWebServiceStatus(socket);
    }, config.checkInterval);
  });

  socket.on('disconnect', function() {
    clearInterval(monitorProcess);
  });
});
