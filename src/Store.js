let EventEmitter = require('events').EventEmitter,
    assign       = require('object-assign');

let Store = assign({}, EventEmitter.prototype, {
  config: {},
  stubs: {},
  routeOfInterest: "",
  updatePage: (page) => {
    Store.page = page;
    Store.emit('PAGE_CHANGE_EVENT', page);
  },
  getConfig: () => {
    fetch('/mocknode/api/config').then((response) => {
      return response.json()
    }).then((json) => {
      Store.config = json;
      Store.emit('CONFIG_FETCH_COMPLETE_EVENT');
    })
  },
  changeConfig: (config) => {
    let {old_route, route, handle, proxy, stub, stubs, dynamicStub, dynamicStubs} = config;

    fetch('/mocknode/api/modifyroute', {
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        old_route: old_route,
        route: route,
        handle: handle,
        proxy: proxy,
        stub: stub,
        dynamicStub: dynamicStub
      })
    }).then((json) => {
      Store.getConfig();
    })

  },
  getStub: (stub) => {
    fetch('/mocknode/api/getstub?name='+stub+"&route="+Store.routeOfInterest).then((response) => {
      return response.text()
    }).then((json) => {
      Store.stubs[stub] = json;
      Store.emit('STUB_GET_COMPLETE_EVENT');
    })
  },
  postStubData: (state) => {
    fetch('/mocknode/api/modifystub', {
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: Store.routeOfInterest,
        oldname: state.oldName,
        name: state.name,
        description: state.description,
        content: state.content
      })
    }).then((json) => {
      Store.getConfig();
    })
  },
  postDynamicStubData: (state) => {
    fetch('/mocknode/api/modifydynamicstub', {
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: Store.routeOfInterest,
        oldname: state.oldName,
        name: state.name,
        description: state.description,
        defaultStub: state.defaultStub,
        statusCode:state.statusCode,
        conditions: state.conditions
      })
    }).then((json) => {
      Store.getConfig();
    })
  },
  deleteStub: (stub) => {
    fetch('/mocknode/api/deletestub?name='+stub+"&route="+Store.routeOfInterest).then((res) => {
      Store.getConfig();
      Store.emit('STUBS_ACTIVATE_TAB_EVENT', 1);
    })
  },
  deleteDynamicStub: (stub) => {
    fetch('/mocknode/api/deletedynamicstub?name='+stub+"&route="+Store.routeOfInterest).then((res) => {
      Store.getConfig();
      Store.emit('DYNAMIC_STUBS_ACTIVATE_TAB_EVENT', 1);
    })
  },
  deleteRoute: (route) => {
    fetch('/mocknode/api/deleteroute?route='+route).then((res) => {
      Store.getConfig();
    })
  }
});

module.exports = Store;
