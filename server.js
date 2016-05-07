"use strict";

var configFile = __dirname + '/config.json',
    interfaceFolder = __dirname + '/dist';

var express = require('express'),
    app = express(),
    router = express.Router(),
    proxy = require('express-http-proxy'),
    Url = require('url'),
    fs = require('fs'),
    path = require('path'),
    bodyParser = require('body-parser'),
    rimraf = require('rimraf'),
    winston = require('winston'),
    config = require(configFile);

var argv = require('minimist')(process.argv.slice(2));

if (argv.location) console.log('mocknode installation directory: ', __dirname);else if (argv.export) {
  var fse = require('fs-extra'),
      tmp_path = path.join(__dirname, 'tmp'),
      tar = require('tar-fs');

  fse.emptyDirSync(tmp_path);
  fse.copySync(__dirname + '/stubs', tmp_path + '/stubs');
  fse.copySync(__dirname + '/config.json', tmp_path + '/config.json');
  tar.pack(tmp_path).pipe(fs.createWriteStream('mocknode-config.tar'));
  console.log('mocknode config has been exported to mocknode-config.tar');
} else if (argv.import) {
  var _tar = require('tar-fs');
  fs.createReadStream(argv.import).pipe(_tar.extract(__dirname));
  console.log('configuration has been imported');
} else {
  (function () {

    // App starts
    var port = process.env.PORT || argv.port || config.port;

    // Support for v0.x
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

    var logger = {
      changelog: new winston.Logger({
        transports: [new winston.transports.File({
          name: 'changelog',
          filename: path.join(__dirname, 'logs', 'changelog.log')
        })]
      }),
      accesslog: new winston.Logger({
        transports: [new winston.transports.File({
          name: 'accesslog',
          filename: path.join(__dirname, 'logs', 'accesslog.log')
        })]
      })
    };

    // Global headers and gloabl delay
    // currently this is only read from the config file
    // TODO: buid and interface for this.
    var globalHeaders = function globalHeaders(globalConfig) {
      return function (req, res, next) {
        Object.keys(globalConfig.headers).map(function (header) {
          res.setHeader(header, globalConfig.headers[header]);
        });
        if (globalConfig.delay) sleep(globalConfig.delay);
        return next();
      };
    };

    // Returns a middleware which proxies to the target
    // TODO: exception handling for targets which are wrong,
    //       currently the proxy fails and breaks the server.
    var assignNewProxy = function assignNewProxy(target) {
      return proxy(target, {
        forwardPath: function forwardPath(req, res) {
          return Url.parse(req.originalUrl).path;
        }
      });
    };

    // Filesystems dont allow '/' in the names of folders / files,
    // Converting this character to a '!'
    var encodeRoutePath = function encodeRoutePath(route) {
      return route.replace(/\//g, "!");
    };
    var decodeRoutePath = function decodeRoutePath(route) {
      return route.replace(/!/g, "/");
    };

    // Creators and assigners - subtle abstraction : These return middlewares
    var createProxyRoute = function createProxyRoute(route, target) {
      return router.use(route, assignNewProxy(target));
    };

    var createStubRoute = function createStubRoute(route, stub) {
      return router.use(route, stubHandler(route, stub));
    };

    var createDynamicStubRoute = function createDynamicStubRoute(route, dynamicStub) {
      return router.use(route, dynamicStubHandler(route, dynamicStub));
    };

    var dynamicStubHandler = function dynamicStubHandler(_route, _name) {
      var dynamicObj = void 0;
      configLoop: for (var i = 0; i < config.routes.length; i++) {
        if (config.routes[i].route == _route) {
          for (var j = 0; j < config.routes[i].dynamicStubs.length; j++) {
            if (config.routes[i].dynamicStubs[j].name == _name) {
              dynamicObj = config.routes[i].dynamicStubs[j];
              break configLoop;
            }
          };
        };
      }
      return dynamicStubRequestHandler(_route, dynamicObj);
    };

    // Middleware which returns a stub
    var stubHandler = function stubHandler(route, stub) {
      return function (req, res, next) {
        return res.sendFile(path.join(__dirname, 'stubs', encodeRoutePath(route), stub));
      };
    };

    // Middleware which handles the dynamic stubs conditions
    var dynamicStubRequestHandler = function dynamicStubRequestHandler(_route, _stub) {
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
        res.sendFile(path.join(__dirname, 'stubs', encodeRoutePath(_route), returnedStub));
      };
    };

    // Create and update a route
    // TODO: RE-Implement this and make it pretty
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
              layer.handle = _req.handle == "stub" ? stubHandler(_req.route, _req.stub) : _req.handle == "proxy" ? assignNewProxy(_req.proxy) : dynamicStubHandler(_req.route, _req.dynamicStub);
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
        config.routes.push(assign({}, _req, { stubs: [], dynamicStubs: [] }));
        var dir = path.join(__dirname, 'stubs', encodeRoutePath(_req.route));
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
      }
      fs.writeFile(configFile, JSON.stringify(config, null, 2));
    };

    // Create and update for stubs
    var updateStubs = function updateStubs(_req) {
      var matchCount = 0;
      routeLoop: for (var i = 0; i < config.routes.length; i++) {
        if (config.routes[i].route == _req.route) {
          for (var j = 0; j < config.routes[i].stubs.length; j++) {
            if (config.routes[i].stubs[j].name == _req.oldname || config.routes[i].stubs[j].name == _req.name) {
              config.routes[i].stubs[j].name = _req.name;
              config.routes[i].stubs[j].description = _req.description;
              fs.writeFileSync(path.join(__dirname, 'stubs', encodeRoutePath(_req.route), _req.name), _req.content);
              if (_req.oldname) {
                fs.rename(path.join(__dirname, 'stubs', encodeRoutePath(_req.route), _req.oldname), path.join(__dirname, 'stubs', encodeRoutePath(_req.route), _req.name));
              }
              matchCount++;
              break routeLoop;
            }
          }
          if (matchCount == 0) {
            fs.writeFile(path.join(__dirname, 'stubs', encodeRoutePath(_req.route), _req.name), _req.content);
            config.routes[i].stubs.push({ name: _req.name, description: _req.description });
          }
        }
      }
      fs.writeFile(configFile, JSON.stringify(config, null, 2));
    };

    // Create and update for dynamic stubs, this is very similar
    // to that of stubs but there is no file associated, only the
    // config is updated.
    var updateDynamicStubs = function updateDynamicStubs(_req) {
      var matchCount = 0,
          oldname = _req.oldname,
          route = _req.route;
      delete _req.oldname;
      delete _req.route;
      routeLoop: for (var i = 0; i < config.routes.length; i++) {
        if (config.routes[i].route == route) {
          for (var j = 0; j < config.routes[i].dynamicStubs.length; j++) {
            if (config.routes[i].dynamicStubs[j].name == oldname || config.routes[i].dynamicStubs[j].name == _req.name) {
              config.routes[i].dynamicStubs[j] = _req;
              matchCount++;
              break routeLoop;
            }
          }
          if (matchCount == 0) {
            config.routes[i].dynamicStubs.push(_req);
          }
        }
      }
      fs.writeFile(configFile, JSON.stringify(config, null, 2));
    };

    // Delete a route:
    // 1. Remove it from the router stack
    // 2. Remote it from config
    // 3. Delete the stubs/route folder
    var deleteroute = function deleteroute(_route) {
      var index = router.stack.map(function (layer) {
        return _route.match(layer.regexp);
      }).reduce(function (index, item, i) {
        return !!item ? i : index;
      }, 0);
      if (index > -1) {
        router.stack.splice(index, 1);
        rimraf(path.join(__dirname, 'stubs', encodeRoutePath(_route)), function () {});
      }
      var newRoutes = config.routes.filter(function (route) {
        return route.route != _route;
      });
      config = assign(config, { routes: newRoutes });
      fs.writeFile(configFile, JSON.stringify(config, null, 2));
    };

    // Delete a stub:
    // 1. Delete the file
    // 2. Remove the entry from config file
    var deletestub = function deletestub(_route, _stub) {
      fs.unlinkSync(path.join(__dirname, 'stubs', encodeRoutePath(_route), _stub));

      routeLoop: for (var i = 0; i < config.routes.length; i++) {
        if (config.routes[i].route == _route) {
          for (var j = 0; j < config.routes[i].stubs.length; j++) {
            if (config.routes[i].stubs[j].name == _stub) {
              config.routes[i].stubs.splice(j, 1);
              break routeLoop;
            }
          }
        }
      }
      fs.writeFile(configFile, JSON.stringify(config, null, 2));
    };

    // Delete a dynamic stub:
    // 1. Remove the entry from config file
    var deleteDynamicstub = function deleteDynamicstub(_route, _stub) {

      routeLoop: for (var i = 0; i < config.routes.length; i++) {
        if (config.routes[i].route == _route) {
          for (var j = 0; j < config.routes[i].dynamicStubs.length; j++) {
            if (config.routes[i].dynamicStubs[j].name == _stub) {
              config.routes[i].dynamicStubs.splice(j, 1);
              break routeLoop;
            }
          }
        }
      }
      fs.writeFile(configFile, JSON.stringify(config, null, 2));
    };

    // Expects that the dynamic stub properties are updated
    // checks if the route is using this dynamic stub and updates its layer.handle
    var updateDynamicRoutes = function updateDynamicRoutes(_route, _dynamicStub) {
      for (var i = 0; i < config.routes.length; i++) {
        if (_route == config.routes[i].route && _dynamicStub == config.routes[i].dynamicStub && "dynamicStub" == config.routes[i].handle) {
          var _iteratorNormalCompletion2 = true;
          var _didIteratorError2 = false;
          var _iteratorError2 = undefined;

          try {

            for (var _iterator2 = router.stack[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
              var layer = _step2.value;

              var match = config.routes[i].route.match(layer.regexp);
              if (match && match[0] == config.routes[i].route) {
                layer.handle = dynamicStubHandler(_route, _dynamicStub);
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
        }
      }
    };

    var logRequest = function logRequest(_req, _type, _method) {
      logger[_type][_method]({
        'route': _req.path,
        'query_strings': JSON.stringify(_req.query),
        'request_body': JSON.stringify(_req.body),
        'ip': _req.ip
      });
    };

    // Logs all requests which do not start with '/mocknode/'
    router.use('/', function (req, res, next) {
      if (/^(?!\/mocknode\/)/.test(req.originalUrl) && /^(?!\/favicon.ico)/.test(req.originalUrl)) logRequest(req, 'accesslog', 'info');
      next();
    });

    // Logs requests that change the configuration of mocknode
    router.use('/mocknode/api', function (req, res, next) {
      var logList = ['/modifyroute', '/deleteroute', '/modifystub', '/deletestub', '/modifydynamicstub', '/deletedynamicstub'];
      if (logList.indexOf(req.path) > -1) logRequest(req, 'changelog', 'info');
      next();
    });

    router.use('/mocknode', express.static(interfaceFolder));
    router.use('/mocknode/api/config', function (req, res) {
      return res.json(config);
    });

    router.use('/mocknode/api/stubconfig', function (req, res) {
      return res.json(stubConfig);
    });

    router.use('/mocknode/api/getstub', function (req, res) {
      res.sendFile(path.join(__dirname, 'stubs', encodeRoutePath(req.query.route), req.query.name));
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
      deletestub(req.query.route, req.query.name);
      res.send({ success: true });
    });

    router.use('/mocknode/api/modifydynamicstub', function (req, res) {
      updateDynamicStubs(req.body);
      updateDynamicRoutes(req.body.route, req.body.name);
      res.send({ success: true });
    });

    router.use('/mocknode/api/deletedynamicstub', function (req, res) {
      deleteDynamicstub(req.query.route, req.query.name);
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

    // App ends
  })();
}

