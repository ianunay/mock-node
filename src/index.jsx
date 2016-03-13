import React from 'react';
import {render} from 'react-dom';
import Store from 'store';
import {Tabs, Tab} from 'react-bootstrap';
import Header from './header.jsx';
import Routing from './routing.jsx';
import Stubs from './stubs.jsx';


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

render(<App />, document.getElementById('app'));