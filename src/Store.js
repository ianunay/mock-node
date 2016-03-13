let Store = {
  config: {},
  stubs: {},
  stubUpdate: {
    listners: [],
    addListner: (listner) => Store.stubUpdate.listners.push(listner),
    removeListner: (listner) => {
      let index = Store.stubUpdate.listners.indexOf(listner);
      if(index != -1) {
        Store.stubUpdate.listners.splice(index, 1);
      }
    },
    updateListners: (_callback) => {
      Store.stubUpdate.listners.map((listner) => {
        listner();
      });
      if (_callback)
        _callback();
    }
  },
  getstubAction: {
    listners: [],
    addListner: (listner) => Store.getstubAction.listners.push(listner),
    updateListners: (_callback) => {
      Store.getstubAction.listners.map((listner) => {
        listner();
      });
      if (_callback)
        _callback();
    }
  },
  updatePage: (page) => {
    Store.page = page;
    Store.App.changePage(page);
  },
  getConfig: () => {
    fetch('/frontnode/api/config').then((response) => {
      return response.json()
    }).then((json) => {
      Store.config = json;
      Store.Routing.updateState();
    })
  },
  changeConfig: (config) => {
    let {route, activeInput, proxy, stub} = config;

    fetch('/frontnode/api/modifyroute', {
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: route,
        handle: activeInput,
        proxy: proxy,
        stub: stub
      })
    }).then((json) => {
      Store.getConfig();
    })

  },
  getStubConfig: (_callback) => {
    fetch('/frontnode/api/stubconfig').then((response) => {
      return response.json()
    }).then((json) => {
      Store.stubConfig = Object.assign({}, json);
      Store.stubUpdate.updateListners(_callback);
    })
  },
  getStub: (stub) => {
    fetch('/frontnode/api/getstub?name='+stub).then((response) => {
      return response.json()
    }).then((json) => {
      Store.stubs[stub] = json;
      Store.getstubAction.updateListners();
    })
  },
  postStubData: (state) => {
    fetch('/frontnode/api/modifystub', {
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        oldname: state.oldName,
        name: state.name,
        description: state.description,
        json: state.json
      })
    }).then((json) => {
      Store.getStubConfig();
    })
  },
  deleteStub: (stub) => {
    fetch('/frontnode/api/deletestub?name='+stub).then((res) => {
      Store.getStubConfig(() => {
        Store.stubContainer.activateTab(1);
      });
    })
  },
  deleteRoute: (route) => {
    fetch('/frontnode/api/deleteroute?route='+route).then((res) => {
      Store.getStubConfig(() => {
        Store.getConfig();
      });
    })
  }
};

export default Store;