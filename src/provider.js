import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {Provider as _Provider} from 'react-redux'

class Provider extends Component {

  static propTypes = {
    app: PropTypes.object.isRequired
  }

  static childContextTypes = {
    tempo: PropTypes.object
  }

  getChildContext() {
    const {app} = this.props
    return {
      tempo: this.props.app
    }
  }

  render() {
    const {app, children} = this.props
    return (
      <_Provider store={app._store}>
        {children}
      </_Provider>
    )
  }
}

export default Provider
export {Provider}



