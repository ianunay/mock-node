import React from 'react';
import Store from './Store.js';

class Pages extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.changePage = this.changePage.bind(this);
    Store.Pages = this;

    this.state = {
      activePage: 1
    }
  };
  changePage(activePage){
    this.setState({activePage});
  }
  render(){
    return this.props.children[this.state.activePage - 1];
  }
}

module.exports = Pages;