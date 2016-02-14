# Frontnode
A nodejs based extendable webserver with a reverse proxy, load balancer and caching

Frontnode is an easy to setup webserver, you can configure routes, nodes and callbacks to control
the requests and handle them appropriately.

## Installing and Runing the server
1. clone/download this repository.
2. make sure you have node and npm installed.
3. run <code>npm install</code> to download required packages.
4. Rename/Copy config.json.sample to config.json and setup your routing rules.
5. <code>node server.js</code> to run the server.

## Reverse Proxy
Reverse proxies are used to serve different applications running on different ports/domains on a single domain.
Read more about reverse proxies [here](https://en.wikipedia.org/wiki/Reverse_proxy).
Below is an example config.json file
```json
{
  "sourcePort": 80,
  "routes": [
    {
      "route": "/users",
      "target": "http://178.23.45.120:8090"
    },
    {
      "route": "/id",
      "target": "http://117.92.181.212:8010"
    }
  ]
}
```
#### Options

- **sourcePort** - The port that the webserver will listen on.
- **routes** - An array of all your routes.
- **route** - The route that needs to handled.
- **target** - The node where an application is running. The resolved url would be target + route: http://178.23.45.120:8090/users*. During loadbalancing this would be an array of hosts.

## Load balancer
WIP
