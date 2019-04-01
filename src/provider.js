import React, {Component, createContext} from 'react'
import PropTypes from 'prop-types'
import {Provider as _Provider} from 'react-redux'

const TempoContext = createContext(null);

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
      <TempoContext.Provider value={app}>
        <_Provider store={app._store}>
          {children}
        </_Provider>
      </TempoContext.Provider>
    )
  }
}

export default Provider
export {Provider, TempoContext}



