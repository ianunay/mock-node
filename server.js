"use strict";

let app     = require('express')(),
    proxy   = require('express-http-proxy'),
    Url     = require('url'),
    config  = require('./config');

const port = process.env.PORT || config.sourcePort;

config.routes.map((configObj) => {
  app.use(configObj.route, proxy(configObj.target, {
    forwardPath: (req, res) => {
      return Url.parse(req.originalUrl).path;
    }
  }))
});

app.listen(port);
console.log("Frontnode started on port: "+ port);
