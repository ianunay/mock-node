"use strict";

const configFile      = __dirname + '/config.json',
      interfaceFolder = __dirname + '/dist';

let express      = require('express'),
    app          = express(),
    router       = express.Router(),
    proxy        = require('express-http-proxy'),
    Url          = require('url'),
    fs           = require('fs'),
    path         = require('path'),
    bodyParser   = require('body-parser'),
    cookieParser = require('cookie-parser'),
    rimraf       = require('rimraf'),
    winston      = require('winston'),
    SandCastle   = require('sandcastle').SandCastle,
    sandcastle   = new SandCastle(),
    async        = require('async'),
    config       = require(configFile);

let argv = require('minimist')(process.argv.slice(2));

if (argv.location)
  console.log('mocknode installation directory: ', __dirname);
else if (argv.export) {
  let fse = require('fs-extra'),
      tmp_path = path.join(__dirname, 'tmp'),
      tar = require('tar-fs');

  fse.emptyDirSync(tmp_path);
  fse.copySync(__dirname + '/stubs', tmp_path + '/stubs');
  fse.copySync(__dirname + '/config.json', tmp_path + '/config.json');
  tar.pack(tmp_path).pipe(fs.createWriteStream('mocknode-config.tar'));
  console.log('mocknode config has been exported to mocknode-config.tar');
} else if (argv.import) {
  let tar = require('tar-fs');
  fs.createReadStream(argv.import).pipe(tar.extract(__dirname));
  console.log('configuration has been imported');
} else {

// App starts
const port = process.env.PORT || argv.port || config.port;

// Support for v0.x
let assign = require('object-assign');

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cookieParser())
app.use(router);

let sleep = (milliseconds) => {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

let logger = {
  changelog: new (winston.Logger)({
    transports: [
      new (winston.transports.File)({
        name: 'changelog',
        filename: path.join(__dirname , 'logs', 'change.log')
      })
    ]
  }),
  accesslog: new (winston.Logger)({
    transports: [
      new (winston.transports.File)({
        name: 'accesslog',
        filename: path.join(__dirname , 'logs', 'access.log')
      })
    ]
  })
}

// Global headers and gloabl delay
// currently this is only read from the config file
// TODO: buid and interface for this.
let globalHeaders = (globalConfig) => ((req, res, next) => {
  Object.keys(globalConfig.headers).map((header) => {
    res.setHeader(header, globalConfig.headers[header]);
  });
  if (globalConfig.delay)
    sleep(globalConfig.delay);
  return next();
});

// Returns a middleware which proxies to the target
// TODO: exception handling for targets which are wrong,
//       currently the proxy fails and breaks the server.
let assignNewProxy = (target) => (
  proxy(target, {
    forwardPath: (req, res) => Url.parse(req.originalUrl).path
  })
);

// Filesystems dont allow '/' in the names of folders / files,
// Converting this character to a '!'
let encodeRoutePath = (route) => route.replace(/\//g, "!");
let decodeRoutePath = (route) => route.replace(/!/g, "/");


// Creators and assigners - subtle abstraction : These return middlewares
let createProxyRoute = (route, target) => router.use(route, assignNewProxy(target));

let createStubRoute = (route, stub) => router.use(route, stubHandler(route, stub));

let createDynamicStubRoute = (route, dynamicStub) => router.use(route, dynamicStubHandler(route, dynamicStub));


let dynamicStubHandler = (_route, _name) => {
  let dynamicObj;
  configLoop:
  for (let i = 0; i < config.routes.length; i++) {
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
}

// Middleware which returns a stub
let stubHandler = (route, stub) => (req, res, next) => res.sendFile(path.join(__dirname, 'stubs', encodeRoutePath(route), stub));

// Middleware which handles the dynamic stubs conditions
// Uses sandcastle to execute evals on a node sanbox.
// The req object parameters are injected into the execution
// runtime, so the eval expressions can access the req object.
let dynamicStubRequestHandler = (_route, _stub) => {
  return (req, res) => {
    let returnedStub = _stub.defaultStub,
        continueLoop = true,
		statusCode=_stub.statusCode||200,
        count = 0;
		

    if (_stub.conditions.length) {
      async.whilst(
        () => (count < _stub.conditions.length) && continueLoop,
        (callback) => {
          let script = sandcastle.createScript(`exports.main = function() {
            try {
              if (${_stub.conditions[count].eval})
                exit('${count}')
              else
                exit(false)
            } catch(e) {
              exit(false)
            }
          }`);

          count++;

          script.on('exit', function(err, output) {
            if (output) {
              continueLoop = false
              returnedStub = _stub.conditions[output].stub
			  statusCode= _stub.conditions[output].statusCode||statusCode
            }
            callback();
          });

          script.run({
            req: assign({}, {
              baseURL: req.baseURL,
              body: req.body,
              cookies: req.cookies,
              headers: req.headers,
              hostname: req.hostname,
              ip: req.ip,
              ips: req.ips,
              method: req.method,
              originalUrl: req.originalUrl,
              params: req.params,
              path: req.path,
              protocol: req.protocol,
              query: req.query,
              route: req.route,
              signedCookies: req.signedCookies,
              stale: req.stale,
              subdomains: req.subdomains,
              xhr: req.xhr
            })
          });
        },
        (err) => {
		  res.status(statusCode);
          res.sendFile(path.join(__dirname, 'stubs', encodeRoutePath(_route), returnedStub));
        }
      );
    }
    else {
	  res.status(statusCode);
      res.sendFile(path.join(__dirname, 'stubs', encodeRoutePath(_route), returnedStub));
    }
  }
}

// Create and update a route
// TODO: RE-Implement this and make it pretty
let updateRoute = (_req) => {
  let matchCount = 0;
  if (_req.old_route != _req.route) {
    if (_req.old_route)
      deleteroute(_req.old_route);
    delete _req.old_route;
  } else {
    delete _req.old_route;
    for (let layer of router.stack) {
      let match = _req.route.match(layer.regexp);
      if (match && match[0] == _req.route) {
        layer.handle = (_req.handle == "stub")
                     ? stubHandler(_req.route, _req.stub)
                     : (_req.handle == "proxy")
                     ? assignNewProxy(_req.proxy)
                     : dynamicStubHandler(_req.route, _req.dynamicStub);
        for (var i = 0; i < config.routes.length; i++) {
          if (config.routes[i].route == _req.route) {
            config.routes[i] = assign({}, config.routes[i], _req);
          }
        }
        matchCount++;
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
    config.routes.push(assign({}, _req, {stubs:[], dynamicStubs: []}));
    let dir = path.join(__dirname, 'stubs', encodeRoutePath(_req.route));
    if (!fs.existsSync(dir))
      fs.mkdirSync(dir)
  }
  fs.writeFile(configFile, JSON.stringify(config, null, 2));
}

// Create and update for stubs
let updateStubs = (_req) => {
  let matchCount = 0;
  routeLoop:
  for (var i = 0; i < config.routes.length; i++) {
    if (config.routes[i].route == _req.route) {
      for (var j = 0; j < config.routes[i].stubs.length; j++) {
        if(config.routes[i].stubs[j].name == _req.oldname || config.routes[i].stubs[j].name == _req.name) {
          config.routes[i].stubs[j].name = _req.name;
          config.routes[i].stubs[j].description = _req.description;
          fs.writeFileSync(path.join(__dirname, 'stubs', encodeRoutePath(_req.route), _req.name), _req.content);
          if (_req.oldname) {
            fs.rename(
              path.join(__dirname, 'stubs', encodeRoutePath(_req.route), _req.oldname),
              path.join(__dirname, 'stubs', encodeRoutePath(_req.route), _req.name)
            )
          }
          matchCount++;
          break routeLoop;
        }
      }
      if (matchCount == 0) {
        fs.writeFile(path.join(__dirname, 'stubs', encodeRoutePath(_req.route), _req.name), _req.content);
        config.routes[i].stubs.push({name: _req.name, description: _req.description});
      }
    }
  }
  fs.writeFile(configFile, JSON.stringify(config, null, 2));
}

// Create and update for dynamic stubs, this is very similar
// to that of stubs but there is no file associated, only the
// config is updated.
let updateDynamicStubs = (_req) => {
  let req = assign({}, _req);
  let matchCount = 0,
      oldname = req.oldname,
      route = req.route;
  delete req.oldname;
  delete req.route;
  routeLoop:
  for (var i = 0; i < config.routes.length; i++) {
    if (config.routes[i].route == route) {
      for (var j = 0; j < config.routes[i].dynamicStubs.length; j++) {
        if(config.routes[i].dynamicStubs[j].name == oldname || config.routes[i].dynamicStubs[j].name == req.name) {
          config.routes[i].dynamicStubs[j] = req;
          matchCount++;
          break routeLoop;
        }
      }
      if (matchCount == 0) {
        config.routes[i].dynamicStubs.push(req);
      }
    }
  }
  fs.writeFile(configFile, JSON.stringify(config, null, 2));
}

// Delete a route:
// 1. Remove it from the router stack
// 2. Remote it from config
// 3. Delete the stubs/route folder
let deleteroute = (_route) => {
  let index = router.stack.map((layer) => _route.match(layer.regexp))
                          .reduce((index, item, i) => !!item ? i : index, 0);
  if (index > -1) {
    router.stack.splice(index, 1);
    rimraf(path.join(__dirname, 'stubs', encodeRoutePath(_route)), () => {});
  }
  let newRoutes = config.routes.filter((route) => route.route != _route);
  config = assign(config, {routes: newRoutes});
  fs.writeFile(configFile, JSON.stringify(config, null, 2));
}

// Delete a stub:
// 1. Delete the file
// 2. Remove the entry from config file
let deletestub = (_route, _stub) => {
  fs.unlinkSync(path.join(__dirname, 'stubs', encodeRoutePath(_route), _stub));

  routeLoop:
  for (var i = 0; i < config.routes.length; i++) {
    if (config.routes[i].route == _route) {
      for (var j = 0; j < config.routes[i].stubs.length; j++) {
        if(config.routes[i].stubs[j].name == _stub) {
          config.routes[i].stubs.splice(j, 1);
          break routeLoop;
        }
      }
    }
  }
  fs.writeFile(configFile, JSON.stringify(config, null, 2));
}

// Delete a dynamic stub:
// 1. Remove the entry from config file
let deleteDynamicstub = (_route, _stub) => {

  routeLoop:
  for (var i = 0; i < config.routes.length; i++) {
    if (config.routes[i].route == _route) {
      for (var j = 0; j < config.routes[i].dynamicStubs.length; j++) {
        if(config.routes[i].dynamicStubs[j].name == _stub) {
          config.routes[i].dynamicStubs.splice(j, 1);
          break routeLoop;
        }
      }
    }
  }
  fs.writeFile(configFile, JSON.stringify(config, null, 2));
}

// Expects that the dynamic stub properties are updated
// checks if the route is using this dynamic stub and updates its layer.handle
let updateDynamicRoutes = (_route, _dynamicStub) => {
  for (var i = 0; i < config.routes.length; i++) {
    if ( (_route == config.routes[i].route)
         && (_dynamicStub == config.routes[i].dynamicStub)
         && ("dynamicStub" == config.routes[i].handle) ) {

      for (let layer of router.stack) {
        let match = config.routes[i].route.match(layer.regexp);
        if (match && match[0] == config.routes[i].route) {
          layer.handle = dynamicStubHandler(_route, _dynamicStub);
        }
      }

    }
  }
}

let logRequest = (_req, _type, _method) => {
  logger[_type][_method]({
    'route': _req.path,
    'query_strings': JSON.stringify(_req.query),
    'request_body': JSON.stringify(_req.body),
    'ip': _req.ip
  });
}

// Logs all requests which do not start with '/mocknode/'
router.use('/', (req, res, next) => {
  if (/^(?!\/mocknode\/)/.test(req.originalUrl) && /^(?!\/favicon.ico)/.test(req.originalUrl))
    logRequest(req, 'accesslog', 'info');
  next();
});

// Logs requests that change the configuration of mocknode
router.use('/mocknode/api', (req, res, next) => {
  let logList = [ '/modifyroute', '/deleteroute', '/modifystub', '/deletestub',
                  '/modifydynamicstub', '/deletedynamicstub'];
  if (logList.indexOf(req.path) > -1)
    logRequest(req, 'changelog', 'info');
  next();
});


router.use('/mocknode', express.static(interfaceFolder));
router.use('/mocknode/api/config', (req, res) => res.json(config));

router.use('/mocknode/api/stubconfig', (req, res) => res.json(stubConfig));

router.use('/mocknode/api/logs', (req, res) => {
  res.sendFile(path.join(__dirname, 'logs', req.query.name));
})

router.use('/mocknode/api/getstub', (req, res) => {
  res.sendFile(path.join(__dirname, 'stubs', encodeRoutePath(req.query.route), req.query.name));
});

router.use('/mocknode/api/modifyroute', (req, res, next) => {
  updateRoute(req.body);
  res.send({success: true});
});

router.use('/mocknode/api/deleteroute', (req, res, next) => {
  deleteroute(req.query.route);
  res.send({success: true});
});

router.use('/mocknode/api/modifystub', (req, res) => {
  updateStubs(req.body);
  res.send({success: true});
});

router.use('/mocknode/api/deletestub', (req, res) => {
  deletestub(req.query.route, req.query.name);
  res.send({success: true});
});

router.use('/mocknode/api/modifydynamicstub', (req, res) => {
  updateDynamicStubs(req.body);
  updateDynamicRoutes(req.body.route, req.body.name);
  res.send({success: true});
});

router.use('/mocknode/api/deletedynamicstub', (req, res) => {
  deleteDynamicstub(req.query.route, req.query.name);
  res.send({success: true});
});

router.use(globalHeaders(config.global));

config.routes.filter((configObj) => configObj.handle == "proxy")
             .map((configObj) => createProxyRoute(configObj.route, configObj.proxy));

config.routes.filter((configObj) => configObj.handle == "stub")
             .map((configObj) => createStubRoute(configObj.route, configObj.stub));

config.routes.filter((configObj) => configObj.handle == "dynamicStub")
             .map((configObj) => createDynamicStubRoute(configObj.route, configObj.dynamicStub));

app.listen( port );
console.log( "Mocknode started on port: " + port );
console.log( "open 'http://localhost:" + port + "/mocknode' in your browser to configure mocknode" );

// App ends
}
