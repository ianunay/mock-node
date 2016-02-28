"use strict";

let app     = require('express')(),
    router  = require('express').Router(),
    proxy   = require('express-http-proxy'),
    Url     = require('url'),
    fs      = require('fs'),
    config  = require('./config');

const port = process.env.PORT || config.sourcePort;

app.use(router);

let assignNewProxy = (target) => (
  proxy(target, {
    forwardPath: (req, res) => Url.parse(req.originalUrl).path
  })
);

let createProxyRoute = (route, target) => router.use(route, assignNewProxy(target));

let updateProxy = (route, target) => {
  let matchCount = 0;
  for (let layer of router.stack) {
    let match = route.match(layer.regexp);
    if (match && match[0] == route) {
      layer.handle = assignNewProxy(target);
      for (let configRoute of config.routes) {
        if (configRoute.route == '/'+route)
          configRoute.target = target;
      }
      matchCount++;
    }
  }
  if (matchCount == 0) {
    createProxyRoute(route, target);
    config.routes.push({route, target});
  }
  fs.writeFile('./config.json', JSON.stringify(config, null, 2));
}

config.routes.map((configObj) => createProxyRoute(configObj.route, configObj.target));

if (config.configURL) {
  app.route(config.configURL)
     .get(express.static('config'))
     .post((req, res) => {
        console.log( "target is " + req.query.target + " route is " + req.query.route );
        updateProxy( '/' + req.query.route + '/' , req.query.target );
        res.send( req.query );
     });
}


app.listen( port );
console.log( "Frontnode started on port: " + port );
