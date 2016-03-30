"use strict";

require('babel-register');

const configFile      = './data/config.json',
      stubConfigFile  = './data/config-stub.json',
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

const port = process.env.PORT || config.sourcePort;

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(router);

let assignNewProxy = (target) => (
  proxy(target, {
    forwardPath: (req, res) => Url.parse(req.originalUrl).path
  })
);

let stubHandler = (stub) => (req, res, next) => res.sendFile(path.join(__dirname, '/stubs/'+stub));

let createProxyRoute = (route, target) => router.use(route, assignNewProxy(target));

let createStubRoute = (route, stub) => router.use(route, stubHandler(stub));

let createDynamicStubRoute = (route, dynamicStub) => router.use(route, dynamicStubHandler(dynamicStub));

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
    let returnedStub = _stub.default;
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
  for (let layer of router.stack) {
    let match = _req.route.match(layer.regexp);
    if (match && match[0] == _req.route) {
      layer.handle = (_req.handle == "stub")
                   ? stubHandler(_req.stub)
                   : assignNewProxy(_req.proxy);
      for (let configRoute of config.routes) {
        if (configRoute.route == _req.route) {
          if (_req.handle == "stub") {
            configRoute.stub = _req.stub;
            if (configRoute.hasOwnProperty("proxy")) {
              configRoute.proxy = undefined;
            }
          } else if (_req.handle == "proxy") {
            configRoute.proxy = _req.proxy;
            if (configRoute.hasOwnProperty("stub")) {
              configRoute.stub = undefined;
            }
          }
        }
      }
      matchCount++;
    }
  }
  if (matchCount == 0) {
    if (_req.handle == "stub") {
      createStubRoute(_req.route, _req.stub);
      config.routes.push({route: _req.route, stub: _req.stub});
    } else if (_req.handle == "proxy") {
      createProxyRoute(_req.route, _req.proxy);
      config.routes.push({route: _req.route, proxy: _req.proxy});
    }
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
  for (let stub of stubConfig.dynamic) {
    if (stub.name == _req.oldname || stub.name == _req.name) {
      stub = _req;
      matchCount++;
    }
  }
  if (matchCount == 0) {
    stubConfig.dynamic.push(_req);
  }
  fs.writeFile(stubConfigFile, JSON.stringify(stubConfig, null, 2));
}

let deleteroute = (_route) => {
  let index = router.stack.map((layer) => _route.match(layer.regexp))
                          .reduce((index, item, i) => !!item && i, 0);
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

config.routes.filter((configObj) => configObj.proxy)
             .map((configObj) => createProxyRoute(configObj.route, configObj.proxy));

config.routes.filter((configObj) => configObj.stub)
             .map((configObj) => createStubRoute(configObj.route, configObj.stub));

config.routes.filter((configObj) => configObj.dynamicStub)
             .map((configObj) => createDynamicStubRoute(configObj.route, configObj.dynamicStub));

router.use('/frontnode', express.static(interfaceFolder));
router.use('/frontnode/api/config', (req, res) => res.json(config));

router.use('/frontnode/api/stubconfig', (req, res) => res.json(stubConfig));

router.use('/frontnode/api/getstub', (req, res) => {
  res.sendFile(path.join(__dirname, '/stubs/'+req.query.name));
});

router.use('/frontnode/api/modifyroute', (req, res, next) => {
  updateRoute(req.body);
  res.send({success: true});
});

router.use('/frontnode/api/deleteroute', (req, res, next) => {
  deleteroute(req.query.route);
  res.send({success: true});
});

router.use('/frontnode/api/modifystub', (req, res) => {
  updateStubs(req.body);
  res.send({success: true});
});

router.use('/frontnode/api/deletestub', (req, res) => {
  fs.unlinkSync('./stubs/'+req.query.name);
  deletestub(req.query.name);
  res.send({success: true});
});

router.use('/frontnode/api/modifydynamicstub', (req, res) => {
  updateDynamicStubs(req.body);
  res.send({success: true});
});

router.use('/frontnode/api/deletedynamicstub', (req, res) => {
  deleteDynamicstub(req.query.name);
  res.send({success: true});
});

app.listen( port );
console.log( "Frontnode started on port: " + port );
