import React from 'react';
import {render} from 'react-dom';
import Header from './header.jsx';
import Routing from './routing.jsx';
import Stubs from './stubs.jsx';
import DynamicStubs from './stubs-dynamic.jsx';
import Pages from './Pages.jsx';


class App extends React.Component {
  constructor(props, context) {
    super(props, context);
  };
  render(){
    return (
      <div>
        <Header />
        <div className="container">
          <Pages>
            <Routing />
            <Stubs />
            <DynamicStubs />
          </Pages>
        </div>
      </div>
    )
  }
}

render(<App />, document.getElementById('app'));