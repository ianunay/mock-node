import React from 'react';
import Store from 'store';
import {Input, ButtonToolbar, ButtonGroup, Button, Grid, Row, Col} from 'react-bootstrap';

class RoutingManager extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.handleChange = this.handleChange.bind(this);
    this.validate = this.validate.bind(this);
    this.updateRoute = this.updateRoute.bind(this);
    this.deleteRoute = this.deleteRoute.bind(this);
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
  deleteRoute(){
    if (confirm("Are you sure you want to delete the stub : "+ this.props.name + " ?")) {
      this.props.delete();
      if (!this.props.newRoute) {
        Store.deleteRoute(this.props.route);
      }
    }
  }
  updateStubs(){
    this.setState({stublist: Store.stubConfig.stubs});
  }
  componentWillMount() {
    Store.stubUpdate.addListner(this.updateStubs);
  }
  componentWillUnmount() {
    Store.stubUpdate.removeListner(this.updateStubs);
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
