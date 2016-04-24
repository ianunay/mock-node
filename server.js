"use strict";

var configFile = __dirname + '/config.json',
    stubConfigFile = __dirname + '/config-stub.json',
    interfaceFolder = __dirname + '/dist';

var express = require('express'),
    app = express(),
    router = express.Router(),
    proxy = require('express-http-proxy'),
    Url = require('url'),
    fs = require('fs'),
    path = require('path'),
    bodyParser = require('body-parser'),
    config = require(configFile),
    stubConfig = require(stubConfigFile);

var argv = require('minimist')(process.argv.slice(2));

var port = process.env.PORT || argv.port || config.port;

// Support for v0.12
var assign = require('object-assign');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(router);

var sleep = function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if (new Date().getTime() - start > milliseconds) {
      break;
    }
  }
};

var assignNewProxy = function assignNewProxy(target) {
  return proxy(target, {
    forwardPath: function forwardPath(req, res) {
      return Url.parse(req.originalUrl).path;
    }
  });
};

var stubHandler = function stubHandler(stub) {
  return function (req, res, next) {
    return res.sendFile(path.join(__dirname, '/stubs/' + stub));
  };
};

var createProxyRoute = function createProxyRoute(route, target) {
  return router.use(route, assignNewProxy(target));
};

var createStubRoute = function createStubRoute(route, stub) {
  return router.use(route, stubHandler(stub));
};

var createDynamicStubRoute = function createDynamicStubRoute(route, dynamicStub) {
  return router.use(route, dynamicStubHandler(dynamicStub));
};

var globalHeaders = function globalHeaders(globalConfig) {
  return function (req, res, next) {
    Object.keys(globalConfig.headers).map(function (header) {
      res.setHeader(header, globalConfig.headers[header]);
    });
    if (globalConfig.delay) sleep(globalConfig.delay);
    return next();
  };
};

var dynamicStubHandler = function dynamicStubHandler(_name) {
  var dynamicObj = void 0;
  for (var i = 0; i < stubConfig.dynamic.length; i++) {
    if (stubConfig.dynamic[i].name == _name) {
      dynamicObj = stubConfig.dynamic[i];
      break;
    }
  }
  return dynamicStubRequestHandler(dynamicObj);
};

var dynamicStubRequestHandler = function dynamicStubRequestHandler(_stub) {
  return function (req, res) {
    var returnedStub = _stub.defaultStub;
    for (var i = 0; i < _stub.conditions.length; i++) {
      try {
        if (eval(_stub.conditions[i].eval)) {
          returnedStub = _stub.conditions[i].stub;
          break;
        }
      } catch (e) {}
    }
    res.sendFile(path.join(__dirname, '/stubs/' + returnedStub));
  };
};

var updateRoute = function updateRoute(_req) {
  var matchCount = 0;
  if (_req.old_route != _req.route) {
    if (_req.old_route) deleteroute(_req.old_route);
    delete _req.old_route;
  } else {
    delete _req.old_route;
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = router.stack[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var layer = _step.value;

        var match = _req.route.match(layer.regexp);
        if (match && match[0] == _req.route) {
          layer.handle = _req.handle == "stub" ? stubHandler(_req.stub) : _req.handle == "proxy" ? assignNewProxy(_req.proxy) : dynamicStubHandler(_req.dynamicStub);
          for (var i = 0; i < config.routes.length; i++) {
            if (config.routes[i].route == _req.route) {
              config.routes[i] = assign({}, config.routes[i], _req);
            }
          }
          matchCount++;
        }
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }
  }
  if (matchCount == 0) {
    if (_req.handle == "stub") {
      createStubRoute(_req.route, _req.stub);
    } else if (_req.handle == "proxy") {
      createProxyRoute(_req.route, _req.proxy);
    } else if (_req.handle == "dynamicStub") {
      createDynamicStubRoute(_req.route, _req.dynamicStub);
    }
    config.routes.push(_req);
  }
  fs.writeFile(configFile, JSON.stringify(config, null, 2));
};

var updateStubs = function updateStubs(_req) {
  var matchCount = 0;
  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = stubConfig.stubs[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var stub = _step2.value;

      if (stub.name == _req.oldname || stub.name == _req.name) {
        stub.name = _req.name;
        stub.description = _req.description;
        fs.writeFileSync(__dirname + '/stubs/' + _req.name, _req.content);
        if (_req.oldname) {
          fs.rename(__dirname + '/stubs/' + _req.oldname, __dirname + '/stubs/' + _req.name);
        }
        matchCount++;
      }
    }
  } catch (err) {
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion2 && _iterator2.return) {
        _iterator2.return();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }

  if (matchCount == 0) {
    fs.writeFile(__dirname + '/stubs/' + _req.name, _req.content);
    stubConfig.stubs.push({ name: _req.name, description: _req.description });
  }
  fs.writeFile(stubConfigFile, JSON.stringify(stubConfig, null, 2));
};

var updateDynamicStubs = function updateDynamicStubs(_req) {
  var matchCount = 0;
  for (var i = 0; i < stubConfig.dynamic.length; i++) {
    if (stubConfig.dynamic[i].name == _req.oldname || stubConfig.dynamic[i].name == _req.name) {
      stubConfig.dynamic[i] = _req;
      delete stubConfig.dynamic[i].oldname;
      matchCount++;
    }
  }
  if (matchCount == 0) {
    delete _req.oldname;
    stubConfig.dynamic.push(_req);
  }
  fs.writeFile(stubConfigFile, JSON.stringify(stubConfig, null, 2));
};

var deleteroute = function deleteroute(_route) {
  var index = router.stack.map(function (layer) {
    return _route.match(layer.regexp);
  }).reduce(function (index, item, i) {
    return !!item ? i : index;
  }, 0);
  if (index > -1) router.stack.splice(index, 1);
  var newRoutes = config.routes.filter(function (route) {
    return route.route != _route;
  });
  config = assign(config, { routes: newRoutes });
  fs.writeFile(configFile, JSON.stringify(config, null, 2));
};

var deletestub = function deletestub(_stub) {
  var newStubs = stubConfig.stubs.filter(function (stub) {
    return stub.name != _stub;
  });
  stubConfig = assign({}, stubConfig, { stubs: newStubs });
  fs.writeFile(stubConfigFile, JSON.stringify(stubConfig, null, 2));
};

var deleteDynamicstub = function deleteDynamicstub(_stub) {
  var newStubs = stubConfig.dynamic.filter(function (stub) {
    return stub.name != _stub;
  });
  stubConfig = assign({}, stubConfig, { dynamic: newStubs });
  fs.writeFile(stubConfigFile, JSON.stringify(stubConfig, null, 2));
};

var updateStubList = function updateStubList(_req) {
  for (var i = 0; i < config.routes.length; i++) {
    if (config.routes[i].route == _req.route) {
      if (_req.type == "stub") {
        config.routes[i].stubs = _req.list;
      } else if (_req.type == "dynamicStub") {
        config.routes[i].dynamicStubs = _req.list;
      }
    }
  }
  fs.writeFile(configFile, JSON.stringify(config, null, 2));
};

// Expects that the dynamic stub properties are updated
// Finds the route using this dynamic stub and updates its layer.handle
var updateDynamicRoutes = function updateDynamicRoutes(_dynamicStub) {
  for (var i = 0; i < config.routes.length; i++) {
    if (_dynamicStub == config.routes[i].dynamicStub && "dynamicStub" == config.routes[i].handle) {
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {

        for (var _iterator3 = router.stack[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var layer = _step3.value;

          var match = config.routes[i].route.match(layer.regexp);
          if (match && match[0] == config.routes[i].route) {
            layer.handle = dynamicStubHandler(_dynamicStub);
          }
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }
    }
  }
};

router.use('/mocknode', express.static(interfaceFolder));
router.use('/mocknode/api/config', function (req, res) {
  return res.json(config);
});

router.use('/mocknode/api/stubconfig', function (req, res) {
  return res.json(stubConfig);
});

router.use('/mocknode/api/getstub', function (req, res) {
  res.sendFile(path.join(__dirname, '/stubs/' + req.query.name));
});

router.use('/mocknode/api/modifyroute', function (req, res, next) {
  updateRoute(req.body);
  res.send({ success: true });
});

router.use('/mocknode/api/deleteroute', function (req, res, next) {
  deleteroute(req.query.route);
  res.send({ success: true });
});

router.use('/mocknode/api/modifystub', function (req, res) {
  updateStubs(req.body);
  res.send({ success: true });
});

router.use('/mocknode/api/deletestub', function (req, res) {
  fs.unlinkSync(__dirname + '/stubs/' + req.query.name);
  deletestub(req.query.name);
  res.send({ success: true });
});

router.use('/mocknode/api/modifydynamicstub', function (req, res) {
  updateDynamicStubs(req.body);
  // Update routes which use this dynamic stub
  updateDynamicRoutes(req.body.name);
  res.send({ success: true });
});

router.use('/mocknode/api/deletedynamicstub', function (req, res) {
  deleteDynamicstub(req.query.name);
  res.send({ success: true });
});

router.use('/mocknode/api/modifystublist', function (req, res) {
  updateStubList(req.body);
  res.send({ success: true });
});

router.use(globalHeaders(config.global));

config.routes.filter(function (configObj) {
  return configObj.handle == "proxy";
}).map(function (configObj) {
  return createProxyRoute(configObj.route, configObj.proxy);
});

config.routes.filter(function (configObj) {
  return configObj.handle == "stub";
}).map(function (configObj) {
  return createStubRoute(configObj.route, configObj.stub);
});

config.routes.filter(function (configObj) {
  return configObj.handle == "dynamicStub";
}).map(function (configObj) {
  return createDynamicStubRoute(configObj.route, configObj.dynamicStub);
});

app.listen(port);
console.log("Mocknode started on port: " + port);
console.log("open 'http://localhost:" + port + "/mocknode' in your browser to configure mocknode");

