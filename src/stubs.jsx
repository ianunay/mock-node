import React from 'react';
import Store from 'store';
import {PageHeader, Tabs, Tab} from 'react-bootstrap';
import StubForm from './stubForm.jsx';

const config_get_event   = 'CONFIG_FETCH_COMPLETE_EVENT',
      activate_tab_event = 'STUBS_ACTIVATE_TAB_EVENT';

class Stubs extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.updateState = this.updateState.bind(this);
    this.activateTab = this.activateTab.bind(this);

    this.state = {
      stubs: [],
      activeTab: 1
    };
  };
  componentWillMount(){
    Store.on(config_get_event, this.updateState);
    Store.on(activate_tab_event, this.activateTab);
  }
  componentDidMount(){
    this.updateState();
  }
  componentWillUnmount(){
    Store.removeListener(config_get_event, this.updateState);
    Store.removeListener(activate_tab_event, this.activateTab);
  }
  updateState(){
    let stubs;
    for (var i = 0; i < Store.config.routes.length; i++) {
      if (Store.config.routes[i].route == Store.routeOfInterest) {
        stubs = Store.config.routes[i].stubs;
        break;
      }
    };

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
