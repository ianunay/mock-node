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
      let header = <p className="route-panel"><Label bsStyle={route.newRoute ? "danger" : route.proxy ? "warning" : "info"}>{route.newRoute ? "new" : route.proxy ? "proxy" : "stub"}</Label>&nbsp;<span className="route">{route.route || 'New Route'}</span></p>;
      PanelArray.push(
        <Panel bsStyle="success" header={header} key={i + 1} eventKey={i + 1}>
          <RoutingManager activeInput={route.proxy ? "proxy" : "stub"} formValid={!route.newRoute} route={route.route} proxy={route.proxy} stub={route.stub} delete={this.deleteRoute.bind(this, i)}/>
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
      </div>
    )
  }
}

module.exports = Routing;
