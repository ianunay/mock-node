import React from 'react';
import Store from 'store';
import {Input, ButtonToolbar, ButtonGroup, Button, Grid, Row, Col, Modal} from 'react-bootstrap';
import {isWebUri} from 'valid-url';

class RoutingManager extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.handleChange = this.handleChange.bind(this);
    this.validate = this.validate.bind(this);
    this.updateRoute = this.updateRoute.bind(this);
    this.deleteRoute = this.deleteRoute.bind(this);
    this.manageStubs = this.manageStubs.bind(this);

    this.state = Object.assign(
                  {formValid: false, old_route: this.props.route},
                  this.props, {handle: this.props.newRoute ? "proxy" : this.props.handle}
                );
  };
  componentWillReceiveProps(nextProps){
    this.setState({newRoute: nextProps.newRoute, old_route: nextProps.route});
  }
  validate(state){
    let validity = state.route && state.route.charAt(0) == '/' && state.route.charAt(state.route.length - 1) == '/'
                  && state.route.length > 2 &&
                  ((state.handle == "proxy" && state.proxy && isWebUri(state.proxy) && state.proxy.charAt(state.proxy.length - 1) != '/')
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
    if (confirm("Are you sure you want to delete the route : "+ (this.props.route || "new route") + " ? All the stubs related to this route will be deleted.")) {
      this.props.delete();
      if (!this.props.newRoute) {
        Store.deleteRoute(this.props.route);
      }
    }
  }
  manageStubs(page, type) {
    Store.routeOfInterest = this.state.route;
    Store.updatePage(page);
  }
  render(){
    let routeInput,
        stublist;
    if (this.state.handle == "proxy") {
      routeInput = <Input type="text" label="Proxy to" help="Should not end with a '/'" value={this.state.proxy} placeholder="http://someaddress.com/" onChange={this.handleChange.bind(this, "proxy")} onBlur={this.handleChange.bind(this, "proxy")}/>;
    } else if (this.state.handle == "stub") {
      let options = this.state.stubs.map((stub, i) => <option key={i} value={stub.name}>{stub.name}</option>);
      routeInput = (
        <div>
        <Input type="select" label="Select Stub" value={this.state.stub} placeholder="select" onChange={this.handleChange.bind(this, "stub")} onBlur={this.handleChange.bind(this, "stub")}>
          <option value="">select</option>
          {options}
        </Input>
        <a href="javscript:;" onClick={this.manageStubs.bind(this, 2, "stubs")}>Manage stubs</a>
        </div>
      );
    } else if (this.state.handle == "dynamicStub") {
      let options = this.state.dynamicStubs.map((stub, i) => <option key={i} value={stub.name}>{stub.name}</option>);
      routeInput = (
        <div>
        <Input type="select" label="Select Dynamic Stub" value={this.state.dynamicStub} placeholder="select" onChange={this.handleChange.bind(this, "dynamicStub")} onBlur={this.handleChange.bind(this, "dynamicStub")}>
          <option value="">select</option>
          {options}
        </Input>
        <a href="javscript:;" onClick={this.manageStubs.bind(this, 3, "dynamic")}>Manage dynamic stubs</a>
        </div>
      );
    }
    return (
      <Grid>
        <Row>
          <Col xs={6} md={6}>
            <Input type="text" help="Starts and ends with a '/'" value={this.state.route} label={<label>Route <a href={this.state.route} className="link" target="_blank">link</a></label>} placeholder="/route/" onChange={this.handleChange.bind(this, "route")} onBlur={this.handleChange.bind(this, "route")} />
            <div style={{"marginTop": "25px"}}>
              {routeInput}
            </div>
          </Col>
          <Col xs={6} md={6} pullRight={true}>
            <div style={{'paddingLeft': '75px', 'visibility': this.props.newRoute ? "hidden" : "inherit"}}>
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
    )
  }
}

module.exports = RoutingManager;
