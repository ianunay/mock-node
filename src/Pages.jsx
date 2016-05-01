import React from 'react';
import Store from './Store.js';

const CHANGE_EVENT = 'PAGE_CHANGE_EVENT';

class Pages extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.changePage = this.changePage.bind(this);
    this.state = {
      activePage: 1
    }
  };
  componentDidMount(){
    Store.on(CHANGE_EVENT, this.changePage);
  }
  changePage(activePage){
    this.setState({activePage});
  }
  render(){
    return this.props.children[this.state.activePage - 1];
  }
}

module.exports = Pages;