"use strict";
(function(){

let {
  Navbar, Nav, MenuItem, NavDropdown, NavItem, Tabs,
  Tab, PageHeader, Well, Input, Grid, Row, Col, Badge, Label,
  Button, Accordion, Panel, ButtonToolbar, ButtonGroup
} = ReactBootstrap;

// Single store that manages everything :D :D
// using an MVC model as the functionality
// is small?
let Store = {
  config: {},
  StubForm: {},
  stubs: {},
  stubUpdate: {
    listners: [],
    addListner: (listner) => Store.stubUpdate.listners.push(listner),
    updateListners: () => {
      Store.stubUpdate.listners.map((listner) => {
        listner();
      });
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
    console.log(route, activeInput, proxy, stub);

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
  getStubConfig: () => {
    fetch('/frontnode/api/stubconfig').then((response) => {
      return response.json()
    }).then((json) => {
      Store.stubConfig = json;
      Store.stubUpdate.updateListners();
    })
  },
  getStub: (stub) => {
    fetch('/frontnode/api/getstub?name='+stub).then((response) => {
      return response.json()
    }).then((json) => {
      Store.stubs[stub] = json;
      Store.StubForm[stub].updateState();
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
  }
};

// Page header
class Header extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.handleSelect = this.handleSelect.bind(this);

    this.state = {
      activeKey: 1
    };
  };
  handleSelect(activeKey) {
    this.setState({activeKey});
    Store.updatePage(activeKey);
  }
  render(){
    return (
      <Navbar inverse>
        <Navbar.Header>
          <Navbar.Brand>
            <a href="#">Front Node</a>
          </Navbar.Brand>
        </Navbar.Header>
        <Nav activeKey={this.state.activeKey} onSelect={this.handleSelect}>
          <NavItem eventKey={1} href="#">Routing</NavItem>
          <NavItem eventKey={2} href="#">Stubs</NavItem>
          <NavItem eventKey={3} href="#">Dynamic Stubs</NavItem>
        </Nav>
      </Navbar>
    );
  }
}

// A singleton that is used to show and manage a route
class RoutingManager extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.handleChange = this.handleChange.bind(this);
    this.validate = this.validate.bind(this);
    this.updateRoute = this.updateRoute.bind(this);
    this.updateStubs = this.updateStubs.bind(this);

    this.state = Object.assign({formValid: false, stublist: (Store.stubConfig && Store.stubConfig.stubs) || []}, this.props);
  };
  validate(state){
    this.setState({formValid: state.route && (state.proxy || state.stub)})
  }
  handleChange(elem, event){
    let partialState = {};
    partialState[elem] = event ? event.target.value : window.event.target.value;
    this.setState(partialState);
    this.validate(Object.assign(this.state, partialState));
  }
  updateRoute(){
    Store.changeConfig(this.state);
  }
  updateStubs(){
    this.setState({stublist: Store.stubConfig.stubs});
  }
  componentWillMount() {
    Store.stubUpdate.addListner(this.updateStubs);
  }
  render(){
    let routeInput;
    if (this.state.activeInput == "proxy") {
      routeInput = <Input type="text" label="Proxy to" value={this.state.proxy} placeholder="http://someaddress.com/" onChange={this.handleChange.bind(this, "proxy")} onBlur={this.handleChange.bind(this, "proxy")}/>;
    } else if (this.state.activeInput == "stub") {
      let options = this.state.stublist.map((stub, i) => <option key={i} value={stub.name}>{stub.name}</option>)
      routeInput = (
        <Input type="select" label="Select Stub" value={this.state.stub} placeholder="select" onChange={this.handleChange.bind(this, "stub")} onBlur={this.handleChange.bind(this, "stub")}>
          <option value="">select</option>
          {options}
        </Input>
      );
    }
    return (
      <Grid>
        <Row>
          <Col xs={6} md={6}>
            <Input type="text" value={this.state.route} label="Route" placeholder="/route/" onChange={this.handleChange.bind(this, "route")} onBlur={this.handleChange.bind(this, "route")} />
          </Col>
          <Col xs={6} md={6} pullRight={true}>
            <div style={{'paddingLeft': '75px'}}>
              <label>Handle</label>
              <ButtonToolbar>
                <ButtonGroup>
                  <Button bsStyle={(this.state.activeInput == 'proxy') ? 'warning' : 'default'} onClick={this.handleChange.bind(this, "activeInput")} value="proxy">Proxy</Button>
                  <Button bsStyle={(this.state.activeInput == 'stub') ? 'info' : 'default'} onClick={this.handleChange.bind(this, "activeInput")} value="stub">Stub</Button>
                </ButtonGroup>
              </ButtonToolbar>
            </div>
          </Col>
        </Row>
        <Row>
          <Col xs={6} md={6}>
            {routeInput}
          </Col>
          <Col xs={6} md={6}>
            <Button bsStyle="primary" onClick={this.updateRoute} style={{"margin": "25px 0 0 75px"}} disabled={!this.state.formValid}>Update</Button>
          </Col>
        </Row>
      </Grid>
    )
  }
}

// Routing tab
class Routing extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.updateState = this.updateState.bind(this);
    this.addRoute = this.addRoute.bind(this);
    Store.Routing = this;

    this.state = {
      routes: []
    };
  };
  componentWillMount(){
    Store.getConfig();
  }
  addRoute() {
    this.setState({count: this.state.routes.push({newRoute: true})});
  }
  updateState(){
    this.setState({routes: Store.config.routes, count: Store.config.routes.length});
  }
  render(){
    let PanelArray = [];
    this.state.routes.map(function(route, i){
      let header = <p className="route-panel"><Label bsStyle={route.newRoute ? "danger" : route.proxy ? "warning" : "info"}>{route.newRoute ? "new" : route.proxy ? "proxy" : "stub"}</Label>&nbsp;<span className="route">{route.route || 'New Route'}</span></p>;
      PanelArray.push(
        <Panel bsStyle="success" header={header} key={i + 1} eventKey={i + 1}>
          <RoutingManager activeInput={route.proxy ? "proxy" : "stub"} formValid={!route.newRoute} route={route.route} proxy={route.proxy} stub={route.stub} />
        </Panel>
      )
    });
    PanelArray.push(<Button style={{"marginTop": "10px"}} key='add' onClick={this.addRoute} bsStyle="success" bsSize="small">Add Route</Button>);
    return (
      <div>
        <Grid>
          <Row>
            <Col xs={12} md={6}>
              <PageHeader>Manage routes</PageHeader>
              <Accordion>
                {PanelArray}
              </Accordion>
            </Col>
          </Row>
        </Grid>
      </div>
    )
  }
}

// Stub form
class StubForm extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.updateState = this.updateState.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.validate = this.validate.bind(this);
    this.postData = this.postData.bind(this);
    Store.StubForm[this.props.name] = this;

    this.state = Object.assign({json: "", oldName: this.props.name}, this.props);
  };
  componentWillMount(){
    if (this.props.name)
      Store.getStub(this.props.name);
  }
  updateState(){
    this.setState({json: JSON.stringify(Store.stubs[this.props.name], null, 2)});
  }
  handleChange(elem, event){
    let partialState = {};
    partialState[elem] = event ? event.target.value : window.event.target.value;
    this.setState(partialState);
    this.validate(Object.assign(this.state, partialState));
  }
  validate(state){
    this.setState({formValid: state.name && state.json})
  }
  postData(){
    Store.postStubData(this.state);
  }
  render(){
    let actions = this.state.new
                ? <div><Button bsStyle="primary" className="pull-right" onClick={this.postData} disabled={!this.state.formValid}>Create</Button></div>
                : ( <div><Button bsStyle="primary" className="pull-right" onClick={this.postData} disabled={!this.state.formValid}>Update</Button>
                    <Button bsStyle="danger">Delete</Button></div>);
    return (
      <form style={{"marginBottom": "10px"}} className="clearfix">
        <Input type="text" label="Name" placeholder="Enter name of the stub" value={this.state.name}
         onChange={this.handleChange.bind(this, "name")} onBlur={this.handleChange.bind(this, "name")}/>
        <Input type="textarea" label="Description" placeholder="textarea" value={this.state.description}
         onChange={this.handleChange.bind(this, "description")} onBlur={this.handleChange.bind(this, "description")}/>
        <Input type="textarea" rows="20" label="JSON" value={this.state.json}
         onChange={this.handleChange.bind(this, "json")} onBlur={this.handleChange.bind(this, "json")}/>
        {actions}
      </form>
    )
  }
}

// Stubs tab
class Stubs extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.updateState = this.updateState.bind(this);
    Store.Stubs = this;

    this.state = {
      stubs: []
    };
  };
  componentWillMount(){
    Store.getStubConfig();
    Store.stubUpdate.addListner(this.updateState);
  }
  updateState(){
    this.setState({stubs: Store.stubConfig.stubs});
  }
  render(){
    var tabs = [];
    tabs.push(
      <Tab eventKey={1} key={1} title="Add a stub"><StubForm new={true} /></Tab>
    );
    this.state.stubs.map((stub, i) => {
      tabs.push(
        <Tab eventKey={i+2} key={i+2} title={stub.name}><StubForm name={stub.name} description={stub.description} /></Tab>
      )
    });
    return (
      <div>
        <PageHeader>Manage Stubs</PageHeader>
        <Tabs defaultActiveKey={1} position="left" tabWidth={3}>
          {tabs}
        </Tabs>
      </div>
    )
  }
}


// The application component
class App extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.changePage = this.changePage.bind(this);
    Store.App = this;

    this.state = {
      activePage: 1
    };
  };
  changePage(activePage) {
    this.setState({activePage});
  }
  render(){
    return (
      <div>
        <Header />
        <div className="container">
          <Tabs activeKey={this.state.activePage} bsStyle="pills">
            <Tab eventKey={1}><Routing /></Tab>
            <Tab eventKey={2}><Stubs /></Tab>
            <Tab eventKey={3}><h3>Coming soon...</h3></Tab>
          </Tabs>
        </div>
      </div>
    )
  }
}

ReactDOM.render(<App />, document.getElementById('app'));

})();
