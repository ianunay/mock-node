"use strict";

const configFile      = './config.json',
      stubConfigFile  = './config-stub.json',
      interfaceFolder = './dist';

let express     = require('express'),
    app         = express(),
    router      = express.Router(),
    proxy       = require('express-http-proxy'),
    Url         = require('url'),
    fs          = require('fs'),
    path        = require('path'),
    bodyParser  = require('body-parser'),
    config      = require(configFile),
    stubConfig  = require(stubConfigFile);

let argv = require('minimist')(process.argv.slice(2));

const port = process.env.PORT || argv.port || config.port;

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(router);

let sleep = (milliseconds) => {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

let assignNewProxy = (target) => (
  proxy(target, {
    forwardPath: (req, res) => Url.parse(req.originalUrl).path
  })
);

let stubHandler = (stub) => (req, res, next) => res.sendFile(path.join(__dirname, '/stubs/'+stub));

let createProxyRoute = (route, target) => router.use(route, assignNewProxy(target));

let createStubRoute = (route, stub) => router.use(route, stubHandler(stub));

let createDynamicStubRoute = (route, dynamicStub) => router.use(route, dynamicStubHandler(dynamicStub));

let globalHeaders = (globalConfig) => ((req, res, next) => {
  Object.keys(globalConfig.headers).map((header) => {
    res.setHeader(header, globalConfig.headers[header]);
  });
  if (globalConfig.delay)
    sleep(globalConfig.delay);
  return next();
});

let dynamicStubHandler = (_name) => {
  let dynamicObj;
  for (let i = 0; i < stubConfig.dynamic.length; i++) {
    if(stubConfig.dynamic[i].name == _name) {
      dynamicObj = stubConfig.dynamic[i];
      break;
    }
  }
  return dynamicStubRequestHandler(dynamicObj);
}

let dynamicStubRequestHandler = (_stub) => {
  return (req, res) => {
    let returnedStub = _stub.defaultStub;
    for (let i = 0; i < _stub.conditions.length; i++) {
      try {
        if(eval(_stub.conditions[i].eval)) {
          returnedStub = _stub.conditions[i].stub;
          break;
        }
      } catch(e){

      }
    }
    res.sendFile(path.join(__dirname, '/stubs/'+returnedStub));
  }
}

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
                     ? stubHandler(_req.stub)
                     : (_req.handle == "proxy")
                     ? assignNewProxy(_req.proxy)
                     : dynamicStubHandler(_req.dynamicStub);
        for (var i = 0; i < config.routes.length; i++) {
          if (config.routes[i].route == _req.route) {
            config.routes[i] = Object.assign({}, config.routes[i], _req);
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
    config.routes.push(_req);
  }
  fs.writeFile(configFile, JSON.stringify(config, null, 2));
}

let updateStubs = (_req) => {
  let matchCount = 0;
  for (let stub of stubConfig.stubs) {
    if (stub.name == _req.oldname || stub.name == _req.name) {
      stub.name = _req.name;
      stub.description = _req.description;
      fs.writeFileSync('./stubs/'+ _req.name, _req.content);
      if (_req.oldname) {
        fs.rename('./stubs/'+ _req.oldname, './stubs/'+ _req.name);
      }
      matchCount++;
    }
  }
  if (matchCount == 0) {
    fs.writeFile('./stubs/'+ _req.name, _req.content);
    stubConfig.stubs.push({name: _req.name, description: _req.description});
  }
  fs.writeFile(stubConfigFile, JSON.stringify(stubConfig, null, 2));
}

let updateDynamicStubs = (_req) => {
  let matchCount = 0;
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
}

let deleteroute = (_route) => {
  let index = router.stack.map((layer) => _route.match(layer.regexp))
                          .reduce((index, item, i) => !!item ? i : index, 0);
  if (index > -1)
    router.stack.splice(index, 1);
  let newRoutes = config.routes.filter((route) => route.route != _route);
  config = Object.assign(config, {routes: newRoutes});
  fs.writeFile(configFile, JSON.stringify(config, null, 2));
}

let deletestub = (_stub) => {
  let newStubs = stubConfig.stubs.filter((stub) => stub.name != _stub);
  stubConfig = Object.assign({}, stubConfig, {stubs: newStubs});
  fs.writeFile(stubConfigFile, JSON.stringify(stubConfig, null, 2));
}

let deleteDynamicstub = (_stub) => {
  let newStubs = stubConfig.dynamic.filter((stub) => stub.name != _stub);
  stubConfig = Object.assign({}, stubConfig, {dynamic: newStubs});
  fs.writeFile(stubConfigFile, JSON.stringify(stubConfig, null, 2));
}

let updateStubList = (_req) => {
  for (var i = 0; i < config.routes.length; i++) {
    if (config.routes[i].route == _req.route) {
      if (_req.type == "stub") {
        config.routes[i].stubs = _req.list;
      } else if(_req.type == "dynamicStub") {
        config.routes[i].dynamicStubs = _req.list;
      }
    }
  }
  fs.writeFile(configFile, JSON.stringify(config, null, 2));
}

router.use('/mocknode', express.static(interfaceFolder));
router.use('/mocknode/api/config', (req, res) => res.json(config));

router.use('/mocknode/api/stubconfig', (req, res) => res.json(stubConfig));

router.use('/mocknode/api/getstub', (req, res) => {
  res.sendFile(path.join(__dirname, '/stubs/'+req.query.name));
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
  fs.unlinkSync('./stubs/'+req.query.name);
  deletestub(req.query.name);
  res.send({success: true});
});

router.use('/mocknode/api/modifydynamicstub', (req, res) => {
  updateDynamicStubs(req.body);
  res.send({success: true});
});

router.use('/mocknode/api/deletedynamicstub', (req, res) => {
  deleteDynamicstub(req.query.name);
  res.send({success: true});
});

router.use('/mocknode/api/modifystublist', (req, res) => {
  updateStubList(req.body);
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
