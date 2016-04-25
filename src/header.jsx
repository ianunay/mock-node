import React from 'react';
import {Navbar} from 'react-bootstrap';

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
      </Navbar>
    );
  }
}

module.exports = Header;
