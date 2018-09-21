import React, {Component} from 'react'
import {controller, requireModel} from '@symph/tempo/controller'
import CalculateModel from '../models/CalculateModel'
import './CalculateController.css'

class CalculateController extends Component {
  add = async () => {
    let {dispatch} = this.props
    // call model's method
    await dispatch({
      type: 'calculate/add',
      number: 1
    })
  }

  render() {
    let {counter} = this.props
    return (
      <div className='counter'>
        <div>counter: {counter}</div>
        <button onClick={this.add}>add 1</button>
      </div>
    )
  }
}

const Controller = controller((state) => {
  // state is store's state
  return {
    counter: state.calculate.counter,  // bind model's state to props
  }
})(CalculateController)

const ModelBound = requireModel(CalculateModel)(Controller)

export default ModelBound
