# Mock Node
A configurable mock server with an intuitive configuration management interface and a http api.

[![Build Status](https://travis-ci.org/ianunay/mock-node.svg?branch=master)](https://travis-ci.org/ianunay/mock-node)

Mocknode allows you to mock http endpoints quickly and easily. The simple management interface lets you configure how the server responds to different endpoints:

 1. Proxy         -   Proxies the request to an existing service
 2. Stub          -   A static response which you can manage in the 'manage stubs' link of the route
 3. Dynamic Stub  -   Responds with a configured stub if the condition defined evaluates to true

The interface allows every one working on the team to have clear visibility on what routes are being used by an application and all possible responses of the route. Thus making stubs to act as proper documented examples.

You can use mocknode to write integration tests for your application. Dynamic stubs can be used to define strategies which can be asserted in your test scripts. You can have even more granular control on the integration tests by using the http api exposed by mocknode. Use the API to toggle the handle for a route, change the stub which is being responded, etc.

## A running instance on heroku

[https://mocknode.herokuapp.com/mocknode/](https://mocknode.herokuapp.com/mocknode/)
please go easy on this :)

## Installing and Runing the server

### Standalone

  1. clone/download this repository
  2. make sure you have node and npm installed
  3. run <code>npm install</code> to download required packages
  4. <code>node server.js</code> to run the server

### npm global install

  1. npm install -g mocknode
  2. run <code>mocknode</code> to start the server

### npm local install

  1. npm install --save mocknode
  2. add an npm script entry in the package.json <code>"mocknode": "mocknode"</code>
  3. run <code>npm run mocknode</code> to start the server

and open [https://localhost:3000/mocknode/](https://localhost:3000/mocknode/) in your browser to configure mocknode


## The Port

The order of preference for the port on which mocknode runs is:

env variable of process > port option passed > 3000

<code>mocknode --port 4000</code> starts the server on port 4000, unless a PORT env variable exists for the process.


## Mocknode configuration

Open [https://localhost:3000/mocknode/](https://localhost:3000/mocknode/) in your browser to configure mocknode

![alt tag](https://cloud.githubusercontent.com/assets/1129363/14989097/237e4478-114e-11e6-8083-b56cfa95dc4f.png)

All your changes are saved in the config.json file and the stubs folder. This ensures all your changes are saved if you restart mocknode. You can easily backup all of your configuration by making a copy of these files.

## Installation directory

If you have installed mocknode as a global npm package

<code>mocknode --location</code> prints the installation path of mocknode.

## Logs

mocknode stores logs in the logs/ folder of the installation directory
access.log - logs all requests to mocknode
change.log - logs all configuration change requests made to mocknode

## Export and Import config

The config.json file and stubs folder hold all the configuration of mocknode.

<code>mocknode --export</code> creates a mocknode-config.tar file which can be used to setup another instance of mocknode.
<code>mocknode --import [file_path]</code> imports a config.tar file to configure mocknode.

## HTTP API

Mocknode exposes a series of endpoints which can help you integrate it with your code - [ test scripts for example ]


| enpoint                         |  method  |     params      |
| :------------------------------ | --------:| :------------:  |
| /mocknode/api/config            |    GET   |        -        |
| /mocknode/api/stubconfig        |    GET   |        -        |
| /mocknode/api/getstub           |    GET   |      name       |
| /mocknode/api/modifyroute       |   POST   |   route config  |
| /mocknode/api/deleteroute       |    GET   |      route      |
| /mocknode/api/modifystub        |   POST   |    stub config  |
| /mocknode/api/deletestub        |    GET   |      name       |
| /mocknode/api/modifydynamicstub |   POST   |    stub config  |
| /mocknode/api/deletedynamicstub |    GET   |      name       |


mocknode interface uses the above endpoints to interact with the server, inspect the network of the browser to better understand the parameters used in each api.

### Troubleshooting

The config files and the stubs folder mentioned above have all the information regarding your configuration.

### License

MIT
