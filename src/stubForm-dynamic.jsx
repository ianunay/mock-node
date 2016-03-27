import React from 'react';
import Store from 'store';
import {Input, Badge, Button, Grid, Row, Col, Modal} from 'react-bootstrap';

class StubForm extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.handleChange = this.handleChange.bind(this);
    this.handleConditionChange = this.handleConditionChange.bind(this);
    this.validate = this.validate.bind(this);
    this.postData = this.postData.bind(this);
    this.deleteStub = this.deleteStub.bind(this);
    this.updateStubs = this.updateStubs.bind(this);
    this.addConditions = this.addConditions.bind(this);
    this.removeCondition = this.removeCondition.bind(this);

    this.state = Object.assign({oldName: this.props.name, stublist: [], conditions: []}, this.props);
  };
  componentWillMount(){
    Store.stubUpdate.addListner(this.updateStubs);
  }
  updateStubs(){
    this.setState({stublist: Store.stubConfig.stubs});
  }
  handleChange(elem, event){
    let partialState = {};
    partialState[elem] = event ? event.target.value : window.event.target.value;
    this.setState(partialState);
    this.validate(Object.assign(this.state, partialState));
  }
  handleConditionChange(elem, index, event){
    let newConditions = this.state.conditions.slice();
    let partialCondition = newConditions[index];

    partialCondition[elem] = event ? event.target.value : window.event.target.value;
    this.setState({conditions: newConditions});
    this.validate(Object.assign(this.state, {conditions: newConditions}));
  }
  postData(){
    Store.postDynamicStubData(this.state);
  }
  validate(state){
    let valid = state.name && state.default;
    state.conditions.map(function(condition) {
      if (!condition.eval || !condition.stub)
        valid = false;
    });
    this.setState({formValid: valid});
  }
  deleteStub(){
    if (confirm("Are you sure you want to delete the stub : "+ this.props.name + " ?"))
      Store.deleteDynamicStub(this.props.name);
  }
  addConditions(){
    let newState = Object.assign({}, this.state);
    newState.conditions.push({});
    this.setState(newState);
    this.validate(newState);
  }
  removeCondition(index){
    let newConditions = this.state.conditions.slice();
    newConditions.splice(index, 1);
    this.setState({conditions: newConditions});
    this.validate(Object.assign({}, this.state, {conditions: newConditions}));
  }
  render(){
    let actions = this.state.new
                ? <div><Button bsStyle="primary" className="pull-right" onClick={this.postData} disabled={!this.state.formValid}>Create</Button></div>
                : ( <div style={{"marginTop": "30px"}}><Button bsStyle="primary" className="pull-right" onClick={this.postData} disabled={!this.state.formValid}>Update</Button>
                    <Button bsStyle="danger" onClick={this.deleteStub}>Delete</Button></div>);

    let options = this.state.stublist.map((stub, i) => <option key={i} value={stub.name}>{stub.name}</option>);

    let conditions = this.state.conditions.map((condition, i) => (
                      <Row key={i} style={{"marginBottom": "30px"}}>
                        <Col xs={1} md={1} style={{"paddingTop": "5px"}}><Badge>{i+1}</Badge></Col>
                        <Col xs={11} md={11}>
                          <Input style={{"marignBottom": "5px"}} type="text" placeholder="Enter the condition" value={this.state.conditions[i].eval}
                           onChange={this.handleConditionChange.bind(this, "eval", i)} onBlur={this.handleConditionChange.bind(this, "eval", i)}
                           help={<p style={{"fontSize": "11px"}}>use <code>req</code> to form a javascript expression <a className="pull-right" href="javascript:;" onClick={()=>this.setState({helpModal: true})}>help</a></p>}/>
                          <Input type="select" label="Stub" value={this.state.conditions[i].stub} placeholder="select" onChange={this.handleConditionChange.bind(this, "stub", i)} onBlur={this.handleConditionChange.bind(this, "stub", i)}>
                            <option value="">select</option>
                            {options}
                          </Input>
                          <a href="javascript:;" className="pull-right" style={{"fontSize": "12px"}} onClick={this.removeCondition.bind(this, i)}>Remove Condition</a>
                        </Col>
                      </Row>
                    )
                   );

    return (
      <div>
        <form style={{"marginBottom": "10px"}} className="clearfix">
          <Input type="text" label="Name" placeholder="Enter name of the stub" value={this.state.name}
           onChange={this.handleChange.bind(this, "name")} onBlur={this.handleChange.bind(this, "name")}/>
          <Input type="textarea" label="Description" placeholder="textarea" value={this.state.description}
           onChange={this.handleChange.bind(this, "description")} onBlur={this.handleChange.bind(this, "description")}/>
          <Input type="select" label="Default Stub" value={this.state.default} placeholder="select" onChange={this.handleChange.bind(this, "default")} onBlur={this.handleChange.bind(this, "default")}>
            <option value="">select</option>
            {options}
          </Input>
          <label>Conditions</label>
          <Grid>
            {conditions}
          </Grid>
          <a href="javascript:;" onClick={this.addConditions}>Add Conditions</a>
          {actions}
        </form>
        <Modal show={this.state.helpModal} bsSize="small" aria-labelledby="contained-modal-title-sm">
          <Modal.Header>
            <Modal.Title id="contained-modal-title-sm">Modal heading</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <h4>Wrapped Text</h4>
            <p>Cras mattis consectetur purus sit amet fermentum. Cras justo odio, dapibus ac facilisis in, egestas eget quam. Morbi leo risus, porta ac consectetur ac, vestibulum at eros.</p>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={() => this.setState({helpModal: false})}>Close</Button>
          </Modal.Footer>
        </Modal>
      </div>
    )
  }
}

module.exports = StubForm;
