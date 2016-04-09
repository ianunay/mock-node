import React from 'react';
import Store from 'store';
import {PageHeader, Accordion, Grid, Row, Col, Button, Label, Panel, Modal} from 'react-bootstrap';
import RoutingManager from './routingManager.jsx';

class Routing extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.updateState = this.updateState.bind(this);
    this.addRoute = this.addRoute.bind(this);
    this.deleteRoute = this.deleteRoute.bind(this);
    this.manageStubs = this.manageStubs.bind(this);
    this.updateStubs = this.updateStubs.bind(this);
    Store.Routing = this;

    this.state = {
      routes: []
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
    this.setState({stublist: Store.stubConfig.stubs});
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
  manageStubs(){
    this.setState({manageStubsShow: true});
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
          <RoutingManager {...route} formValid={!route.newRoute} manageStubs={this.manageStubs} delete={this.deleteRoute.bind(this, i)}/>
        </Panel>
      )
    }.bind(this));
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
        <Modal show={this.state.manageStubsShow} bsSize="small" aria-labelledby="contained-modal-title-sm">
          <Modal.Header>
            <Modal.Title id="contained-modal-title-sm">Manage stubs</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <h4>All Stubs</h4>
          </Modal.Body>
          <Modal.Footer>
            <Button bsStyle="primary">Add</Button>
            <Button onClick={() => this.setState({manageStubsShow: false})}>Close</Button>
          </Modal.Footer>
        </Modal>
      </div>
    )
  }
}

module.exports = Routing;
