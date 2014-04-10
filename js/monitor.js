var app = angular.module('Monitor', ['ngSanitize', 'ui.bootstrap']);
app.controller('MonitorCtrl', ['$scope', '$sce', function($scope, $sce) {
    $scope.groups = {};

    $scope.isOpen = function(group) {
      for (var wsName in $scope.groups[group]) {
        if ($scope.groups[group][wsName].status === 'Failed') {
          return true;
        }
      }
      return false;
    }
    // data structure
    // {
    //   DOC: {
    //     "Find BL": {
    //       type:
    //       name:
    //       status:
    //       lastUpTime:
    //       lastCheckingTime:
    //       remark:
    //     }
    //   }
    // }

    var socket = io.connect('http://localhost:3000');

    socket.emit('list', {});

    socket.on('update', function (data) {
      for (var i = 0; i < data.groups.length; i++) {
        var group = data.groups[i];

        if (!$scope.groups[group]) {
          $scope.groups[group] = {
            ws: {}
          };
        }

        var wsGroup = $scope.groups[group];

        if (!wsGroup.ws[data.name]) {
          wsGroup.ws[data.name] = data;
        }

        var ws = wsGroup.ws[data.name];
        ws.status = data.status;
        ws.lastCheckingTime = data.lastCheckingTime;
        ws.remark = data.remark;

        if (data.status === 'Success') {
          ws.lastUpTime = data.lastCheckingTime;
        }

        wsGroup.containsFailed = false;
        for (var wsName in wsGroup.ws) {
          if (wsGroup.ws[wsName].status === 'Failed') {
            wsGroup.containsFailed = true;
            break;
          }
        }
      }

      $scope.$apply();
    });
  }]);
