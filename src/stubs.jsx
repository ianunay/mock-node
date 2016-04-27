import React from 'react';
import Store from 'store';
import {PageHeader, Tabs, Tab} from 'react-bootstrap';
import StubForm from './stubForm.jsx';

class Stubs extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.updateState = this.updateState.bind(this);
    this.activateTab = this.activateTab.bind(this);
    Store.stubContainer = this;

    this.state = {
      stubs: [],
      activeTab: 1
    };
  };
  componentWillMount(){
    Store.getStubConfig();
    Store.stubUpdate.addListner(this.updateState);
  }
  componentWillUnMount(){
    Store.stubUpdate.removeListner(this.updateState);
  }
  updateState(){
    let routeStubs;
    for (var i = 0; i < Store.config.routes.length; i++) {
      if (Store.config.routes[i].route == Store.routeOfInterest) {
        routeStubs = Store.config.routes[i].stubs;
        break;
      }
    };
    let stubs = Store.stubConfig.stubs.filter((stub) => {
      return routeStubs.indexOf(stub.name) > -1;
    });
    this.setState({stubs});
  }
  activateTab(key){
    this.setState({activeTab: key});
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
        <a href="javascript:;" onClick={Store.updatePage.bind(this, 1)}>Back to Routes</a>
        <PageHeader>Manage Stubs</PageHeader>
        <Tabs defaultActiveKey={1} activeKey={this.state.activeTab} onSelect={this.activateTab} position="left" tabWidth={3}>
          {tabs}
        </Tabs>
      </div>
    )
  }
}

module.exports = Stubs;
