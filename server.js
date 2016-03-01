"use strict";

let express     = require('express'),
    app         = express(),
    router      = express.Router(),
    proxy       = require('express-http-proxy'),
    Url         = require('url'),
    fs          = require('fs'),
    bodyParser  = require('body-parser'),
    config      = require('./config'),
    stubConfig  = require('./config-stub');

const port = process.env.PORT || config.sourcePort;

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(router);

let assignNewProxy = (target) => (
  proxy(target, {
    forwardPath: (req, res) => Url.parse(req.originalUrl).path
  })
);

let stubHandler = (stub) => (req, res, next) => res.send(require('./stubs/'+stub));

let createProxyRoute = (route, target) => router.use(route, assignNewProxy(target));

let createStubRoute = (route, stub) => router.use(route, stubHandler(stub));

let updateRoute = (_req) => {
  let matchCount = 0;
  for (let layer of router.stack) {
    let match = _req.route.match(layer.regexp);
    if (match && match[0] == _req.route) {
      layer.handle = _req.handle == "stub" ? stubHandler(_req.stub) : assignNewProxy(_req.proxy);
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
  fs.writeFile('./config.json', JSON.stringify(config, null, 2));
}

let updateStubs = (_req) => {
  let matchCount = 0;
  for (let stub of stubConfig.stubs) {
    if (stub.name == _req.oldname || stub.name == _req.name) {
      stub.name = _req.name;
      stub.description = _req.description;
      fs.writeFileSync('./stubs/'+ _req.name +'.json', _req.json);
      if (_req.oldname) {
        fs.rename('./stubs/'+ _req.oldname +'.json', './stubs/'+ _req.name +'.json');
      }
      matchCount++;
    }
  }
  if (matchCount == 0) {
    fs.writeFile('./stubs/'+ _req.name +'.json', _req.json);
    stubConfig.stubs.push({name: _req.name, description: _req.description});
  }
  fs.writeFile('./config-stub.json', JSON.stringify(stubConfig, null, 2));
}

config.routes.filter((configObj) => configObj.proxy).map((configObj) => createProxyRoute(configObj.route, configObj.proxy));
config.routes.filter((configObj) => configObj.stub).map((configObj) => createStubRoute(configObj.route, configObj.name));

router.use('/frontnode', express.static('./configure'));
router.use('/frontnode/api/config', (req, res) => res.json(config));

router.use('/frontnode/api/stubconfig', (req, res) => res.json(stubConfig));

router.use('/frontnode/api/getstub', (req, res) => {
  let contents = fs.readFileSync('./stubs/'+req.query.name+'.json', 'utf8');
  res.send(contents);
});

router.use('/frontnode/api/modifyroute', (req, res, next) => {
  updateRoute(req.body);
  res.send({"success": true});
});

router.use('/frontnode/api/modifystub', (req, res) => {
  updateStubs(req.body);
  res.send({"success": true});
});

app.listen( port );
console.log( "Frontnode started on port: " + port );
