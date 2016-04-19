import React from 'react';
import Store from 'store';
import {PageHeader, Accordion, Grid, Row, Col, Button, Label, Panel} from 'react-bootstrap';
import RoutingManager from './routingManager.jsx';

class Routing extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.updateState = this.updateState.bind(this);
    this.addRoute = this.addRoute.bind(this);
    this.deleteRoute = this.deleteRoute.bind(this);
    this.updateStubs = this.updateStubs.bind(this);
    Store.Routing = this;

    this.state = {
      routes: [],
      stublist: [],
      dynamiclist: []
    };
  };
  componentWillMount(){
    Store.getConfig();
    Store.stubUpdate.addListner(this.updateStubs);
  }
  componentWillUnmount() {
    Store.stubUpdate.removeListner(this.updateStubs);
  }
  updateStubs(){
    this.setState({stublist: Store.stubConfig.stubs, dynamiclist: Store.stubConfig.dynamic});
  }
  addRoute() {
    this.setState({count: this.state.routes.push({newRoute: true, stubs:[], dynamicStubs: []})});
  }
  deleteRoute(i) {
    this.state.routes.splice(i, 1);
    this.setState({count: this.state.routes.length});
  }
  updateState(){
    this.setState({routes: Store.config.routes, count: Store.config.routes.length});
  }
  render(){
    let PanelArray = [];
    this.state.routes.map(function(route, i){
      let panelStyle = route.newRoute ? "danger" :  (route.handle == "proxy") ? "warning" : (route.handle == "stub") ? "info" : "success";
      let header = (
        <p className={ panelStyle + " route-panel"}>
          <Label bsStyle={panelStyle}>
            {route.newRoute ? "new" : (route.handle == "proxy") ? "proxy" : (route.handle == "stub") ? "stub" : "dynamic"}
          </Label>
          <span className="route">{route.route || 'New Route'}</span>
        </p>
      );
      PanelArray.push(
        <Panel bsStyle="success" header={header} key={i + 1} eventKey={i + 1}>
          <RoutingManager  newRoute={false} {...route} formValid={!route.newRoute}
            delete={this.deleteRoute.bind(this, i)} stublist={this.state.stublist}
            dynamiclist={this.state.dynamiclist} />
        </Panel>
      )
    }.bind(this));
    PanelArray.push(<Button style={{"marginTop": "10px"}} key='add' onClick={this.addRoute} bsStyle="success" bsSize="small">Add Route</Button>);
    return (
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
    )
  }
}

module.exports = Routing;
