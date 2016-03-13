import React from 'react';
import Store from 'store';
import {Input, Button} from 'react-bootstrap';

class StubForm extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.updateState = this.updateState.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.validate = this.validate.bind(this);
    this.postData = this.postData.bind(this);
    this.deleteStub = this.deleteStub.bind(this);

    this.state = Object.assign({json: "", oldName: this.props.name}, this.props);
  };
  componentWillMount(){
    Store.getstubAction.addListner(this.updateState);
    if (this.props.name)
      Store.getStub(this.props.name);
  }
  updateState(){
    this.setState({json: JSON.stringify(Store.stubs[this.props.name], null, 2)});
  }
  handleChange(elem, event){
    let partialState = {};
    partialState[elem] = event ? event.target.value : window.event.target.value;
    this.setState(partialState);
    this.validate(Object.assign(this.state, partialState));
  }
  validate(state){
    this.setState({formValid: state.name && state.json})
  }
  postData(){
    Store.postStubData(this.state);
  }
  deleteStub(){
    if (confirm("Are you sure you want to delete the stub : "+ this.props.name + " ?"))
      Store.deleteStub(this.props.name);
  }
  render(){
    let actions = this.state.new
                ? <div><Button bsStyle="primary" className="pull-right" onClick={this.postData} disabled={!this.state.formValid}>Create</Button></div>
                : ( <div><Button bsStyle="primary" className="pull-right" onClick={this.postData} disabled={!this.state.formValid}>Update</Button>
                    <Button bsStyle="danger" onClick={this.deleteStub}>Delete</Button></div>);
    return (
      <form style={{"marginBottom": "10px"}} className="clearfix">
        <Input type="text" label="Name" placeholder="Enter name of the stub" value={this.state.name}
         onChange={this.handleChange.bind(this, "name")} onBlur={this.handleChange.bind(this, "name")}/>
        <Input type="textarea" label="Description" placeholder="textarea" value={this.state.description}
         onChange={this.handleChange.bind(this, "description")} onBlur={this.handleChange.bind(this, "description")}/>
        <Input type="textarea" rows="20" label="JSON" value={this.state.json}
         onChange={this.handleChange.bind(this, "json")} onBlur={this.handleChange.bind(this, "json")}/>
        {actions}
      </form>
    )
  }
}

module.exports = StubForm;
