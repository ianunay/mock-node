import React from 'react';
import {Navbar, Nav, NavDropdown, MenuItem} from 'react-bootstrap';

class Header extends React.Component {
  constructor(props, context) {
    super(props, context);
  };
  render(){
    return (
      <Navbar inverse>
        <Navbar.Header>
          <Navbar.Brand>
            <a href="#">Mock Node</a>
          </Navbar.Brand>
        </Navbar.Header>
        <Nav>
          <NavDropdown eventKey={2} title="Logs" id="basic-nav-dropdown">
            <MenuItem href="/mocknode/api/logs/?name=access.log" target="blank" eventKey={2.1}>Access log</MenuItem>
            <MenuItem href="/mocknode/api/logs/?name=change.log" target="blank" eventKey={2.2}>Change log</MenuItem>
          </NavDropdown>
        </Nav>
      </Navbar>
    );
  }
}

module.exports = Header;
