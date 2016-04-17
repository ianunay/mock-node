import React from 'react';
import Store from 'store';
import {Navbar, Nav, NavItem} from 'react-bootstrap';

class Header extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.handleSelect = this.handleSelect.bind(this);

    this.state = {
      activeKey: 1
    };
  };
  handleSelect(activeKey) {
    this.setState({activeKey});
    Store.updatePage(activeKey);
  }
  render(){
    return (
      <Navbar inverse>
        <Navbar.Header>
          <Navbar.Brand>
            <a href="#">Mock Node</a>
          </Navbar.Brand>
        </Navbar.Header>
        <Nav activeKey={this.state.activeKey} onSelect={this.handleSelect}>
          <NavItem eventKey={1} href="#">Routing</NavItem>
          <NavItem eventKey={2} href="#">Stubs</NavItem>
          <NavItem eventKey={3} href="#">Dynamic Stubs</NavItem>
        </Nav>
      </Navbar>
    );
  }
}

module.exports = Header;
