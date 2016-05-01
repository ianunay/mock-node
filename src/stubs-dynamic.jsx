import React from 'react';
import Store from 'store';
import {PageHeader, Tabs, Tab} from 'react-bootstrap';
import StubFormDynamic from './stubForm-dynamic.jsx';

const config_get_event   = 'CONFIG_FETCH_COMPLETE_EVENT',
      activate_tab_event = 'DYNAMIC_STUBS_ACTIVATE_TAB_EVENT';

class Stubs extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.updateState = this.updateState.bind(this);
    this.activateTab = this.activateTab.bind(this);
    this.reRender = this.reRender.bind(this);

    this.state = {
      dynamic: [],
      stublist: [],
      activeTab: 1
    };
  };
  componentWillMount(){
    Store.on(config_get_event, this.updateState);
    Store.on(activate_tab_event, this.reRender);
  }
  componentDidMount(){
    this.updateState();
  }
  componentWillUnmount(){
    Store.removeListener(config_get_event, this.updateState);
    Store.removeListener(activate_tab_event, this.reRender);
  }
  reRender(){
    let that = this;
    setTimeout(() => {that.activateTab(1)}, 100);
  }
  updateState(){
    let dynamic,
        stublist;
    for (var i = 0; i < Store.config.routes.length; i++) {
      if (Store.config.routes[i].route == Store.routeOfInterest) {
        dynamic = Store.config.routes[i].dynamicStubs;
        stublist = Store.config.routes[i].stubs;
        break;
      }
    };
    this.setState({dynamic, stublist});
  }
  activateTab(key){
    this.setState({activeTab: key});
  }
  render(){
    var tabs = [];
    tabs.push(
      <Tab eventKey={1} key={1} title="Add a stub"><StubFormDynamic new={true} stublist={this.state.stublist}/></Tab>
    );
    this.state.dynamic.map((stub, i) => {
      tabs.push(
        <Tab eventKey={i+2} key={i+2} title={stub.name}>
          <StubFormDynamic name={stub.name} description={stub.description}
            stublist={this.state.stublist}
            defaultStub={stub.defaultStub} conditions={stub.conditions} />
        </Tab>
      )
    });
    return (
      <div>
        <a href="javascript:;" className="backButton" onClick={Store.updatePage.bind(this, 1)}>Back to Routes</a>
        <PageHeader>Manage Dynamic Stubs for {Store.routeOfInterest}</PageHeader>
        <Tabs defaultActiveKey={1} activeKey={this.state.activeTab} onSelect={this.activateTab} position="left" tabWidth={3}>
          {tabs}
        </Tabs>
      </div>
    )
  }
}

module.exports = Stubs;
