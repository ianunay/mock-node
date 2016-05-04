import React from 'react';
import Store from 'store';
import {Input, Button} from 'react-bootstrap';

const stub_get_event = 'STUB_GET_COMPLETE_EVENT';

class StubForm extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.updateState = this.updateState.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.validate = this.validate.bind(this);
    this.postData = this.postData.bind(this);
    this.format = this.format.bind(this);
    this.deleteStub = this.deleteStub.bind(this);

    this.state = Object.assign({content: "", oldName: this.props.name}, this.props);
  };
  componentWillMount(){
    Store.on(stub_get_event, this.updateState);
    if (this.props.name)
      Store.getStub(this.props.name);
  }
  componentWillUnmount() {
    Store.removeListener(stub_get_event, this.updateState);
  }
  updateState(){
    this.setState({content: Store.stubs[this.props.name]});
  }
  handleChange(elem, event){
    let partialState = {};
    partialState[elem] = event ? event.target.value : window.event.target.value;
    this.setState(partialState);
    this.validate(Object.assign(this.state, partialState));
  }
  validate(state){
    this.setState({formValid: state.name && state.content})
  }
  postData(){
    Store.postStubData(this.state);
  }
  format(){
    let content;
    try {
      content = JSON.stringify(JSON.parse(this.state.content), null, 2);
    } catch (e) {}
    if (content)
      this.setState({content: content})
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
        <Input type="text" label="Name" help="end with a valid file type to get a proper response header" placeholder="Enter name of the stub" value={this.state.name}
         onChange={this.handleChange.bind(this, "name")} onBlur={this.handleChange.bind(this, "name")}/>
        <Input type="textarea" label="Description" placeholder="textarea" value={this.state.description}
         onChange={this.handleChange.bind(this, "description")} onBlur={this.handleChange.bind(this, "description")}/>
        <div className="contentInput">
          <Input type="textarea" rows="20" label={<label>Content <a href="javascript:;" onClick={this.format} className="link">Format</a></label>} value={this.state.content}
           onChange={this.handleChange.bind(this, "content")} onBlur={this.handleChange.bind(this, "content")}/>
        </div>
        {actions}
      </form>
    )
  }
}

module.exports = StubForm;
