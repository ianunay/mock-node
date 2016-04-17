import React from 'react';
import Store from 'store';
import {Input, ButtonToolbar, ButtonGroup, Button, Grid, Row, Col, Modal} from 'react-bootstrap';

class RoutingManager extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.handleChange = this.handleChange.bind(this);
    this.validate = this.validate.bind(this);
    this.updateRoute = this.updateRoute.bind(this);
    this.deleteRoute = this.deleteRoute.bind(this);
    this.manageStubs = this.manageStubs.bind(this);
    this.stubCheck = this.stubCheck.bind(this);
    this.dynamicstubCheck = this.dynamicstubCheck.bind(this);
    this.updateStubs = this.updateStubs.bind(this);

    this.state = Object.assign({formValid: false, old_route: this.props.route}, this.props);
  };
  validate(state){
    let validity = state.route && state.route.charAt(0) == '/' && state.route.charAt(state.route.length - 1) == '/'
                  && state.route.length > 2 &&
                  ((state.handle == "proxy" && state.proxy)
                    || (state.handle == "stub" && state.stub)
                    || (state.handle == "dynamicStub" && state.dynamicStub));
    this.setState({formValid: validity})
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
  deleteRoute(){
    if (confirm("Are you sure you want to delete the route : "+ (this.props.route || "new route") + " ?")) {
      this.props.delete();
      if (!this.props.newRoute) {
        Store.deleteRoute(this.props.route);
      }
    }
  }
  manageStubs() {
    this.setState({manageStubsShow: true});
  }
  stubCheck(stub) {
    let routeStubList = this.state.stubs.slice(),
        stubIndex = routeStubList.indexOf(stub);
    if (stubIndex > -1) {
      routeStubList.splice(stubIndex, 1);
    } else {
      routeStubList.push(stub);
    }
    this.setState({stubs: routeStubList});
  }
  dynamicstubCheck(stub) {
    let routeStubList = this.state.dynamicStubs.slice(),
        stubIndex = routeStubList.indexOf(stub);
    if (stubIndex > -1) {
      routeStubList.splice(stubIndex, 1);
    } else {
      routeStubList.push(stub);
    }
    this.setState({dynamicStubs: routeStubList});
  }
  updateStubs() {
    let list = this.state.handle == "stub" ? this.state.stubs : this.state.dynamicStubs;
    Store.updateStubs(this.state.route, this.state.handle, list);
    this.setState({manageStubsShow: false});
  }
  render(){
    let routeInput,
        stublist;
    if (this.state.handle == "proxy") {
      routeInput = <Input type="text" label="Proxy to" value={this.state.proxy} placeholder="http://someaddress.com/" onChange={this.handleChange.bind(this, "proxy")} onBlur={this.handleChange.bind(this, "proxy")}/>;
    } else if (this.state.handle == "stub") {
      let options = this.state.stubs.map((stub, i) => <option key={i} value={stub}>{stub}</option>);
      routeInput = (
        <div>
        <Input type="select" label="Select Stub" value={this.state.stub} placeholder="select" onChange={this.handleChange.bind(this, "stub")} onBlur={this.handleChange.bind(this, "stub")}>
          <option value="">select</option>
          {options}
        </Input>
        <a href="javscript:;" onClick={this.manageStubs}>Manage stubs</a>
        </div>
      );
      stublist = this.props.stublist.map((stub, i) => {
        return <Input key={i} type="checkbox" label={stub.name} onChange={this.stubCheck.bind(this, stub.name)} checked={this.state.stubs.indexOf(stub.name) > -1} />
      })
    } else if (this.state.handle == "dynamicStub") {
      let options = this.state.dynamicStubs.map((stub, i) => <option key={i} value={stub}>{stub}</option>);
      routeInput = (
        <div>
        <Input type="select" label="Select Dynamic Stub" value={this.state.dynamicStub} placeholder="select" onChange={this.handleChange.bind(this, "dynamicStub")} onBlur={this.handleChange.bind(this, "dynamicStub")}>
          <option value="">select</option>
          {options}
        </Input>
        <a href="javscript:;" onClick={this.manageStubs}>Manage dynamic stubs</a>
        </div>
      );
      stublist = this.props.dynamiclist.map((stub, i) => {
        return <Input key={i} type="checkbox" label={stub.name} onChange={this.dynamicstubCheck.bind(this, stub.name)} checked={this.state.dynamicStubs.indexOf(stub.name) > -1} />
      })
    }
    return (
      <div>
        <Grid>
          <Row>
            <Col xs={6} md={6}>
              <Input type="text" help="Starts and ends with a '/'" value={this.state.route} label="Route" placeholder="/route/" onChange={this.handleChange.bind(this, "route")} onBlur={this.handleChange.bind(this, "route")} />
              <div style={{"marginTop": "25px"}}>
                {routeInput}
              </div>
            </Col>
            <Col xs={6} md={6} pullRight={true}>
              <div style={{'paddingLeft': '75px'}}>
                <label>Handle</label>
                <Input type="radio" label="Proxy" value="proxy" checked={this.state.handle == "proxy"} onChange={this.handleChange.bind(this, "handle")}/>
                <Input type="radio" label="Stub" value="stub" checked={this.state.handle == "stub"} onChange={this.handleChange.bind(this, "handle")}/>
                <Input type="radio" label="Dynamic Stub" value="dynamicStub" checked={this.state.handle == "dynamicStub"} onChange={this.handleChange.bind(this, "handle")}/>
              </div>
              <ButtonToolbar style={{"margin": "25px 0 0 75px"}}>
                <Button bsStyle="primary" onClick={this.updateRoute} disabled={!this.state.formValid}>Update</Button>
                <Button bsStyle="danger" onClick={this.deleteRoute}>Delete</Button>
              </ButtonToolbar>
            </Col>
          </Row>
        </Grid>
        <Modal show={this.state.manageStubsShow} bsSize="small" aria-labelledby="contained-modal-title-sm">
          <Modal.Header>
            <Modal.Title id="contained-modal-title-sm">Manage stubs</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <h4>Choose Stubs</h4>
            {stublist}
          </Modal.Body>
          <Modal.Footer>
            <Button bsStyle="primary" onClick={this.updateStubs}>Update</Button>
            <Button onClick={() => this.setState({manageStubsShow: false})}>Close</Button>
          </Modal.Footer>
        </Modal>
      </div>
    )
  }
}

module.exports = RoutingManager;
