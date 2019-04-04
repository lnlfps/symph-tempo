import React from 'react'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'
import { shallowEqual } from './utils'

/**
 * 将react 组件封装为controller组件
 * @param mapStateToProps
 * @param enhance 对Controller进行再次封装，默认有redux connect。 @symph/joy默认提供：with-router, react-hot-loader
 * @returns connect Redux后的HOC
 */
function controller (mapStateToProps, { enhance } = {}) {
  return Comp => {
    let modelFields = Comp.elements.filter(el => el.descriptor.get && el.descriptor.get.__ModelType)

    Comp.finisher = function (_constructor) {

      class ControllerWrapper extends _constructor {
        static contextTypes = {
          tempo: PropTypes.object,
          ..._constructor.contextTypes
        }

        constructor (...args) {
          super(...args)
          let context = args[1]
          const { tempo } = context

          if (typeof window === 'undefined' && this.componentPrepare) {
            // on server
            const { _componentHasPrepared } = this.props
            if (!_componentHasPrepared) {
              tempo.prepareManager.prepareComponent(this)
            }
          } else {
            // on browser, call componentPrepare on componentDidMount event. why?
            // 1. hmr will recreate the component, constructor will call many times.
            // 2. up loading speed
          }
        }

        componentDidMount () {
          if(super.componentDidMount){
            super.componentDidMount()
          }
          if (typeof window !== 'undefined' && this.componentPrepare) {
            const { _componentHasPrepared } = this.props
            const { tempo } = this.context
            if (!_componentHasPrepared) {
              tempo.prepareManager.prepareComponent(this)
            }
          }
        }

        // 服务端渲染时，不可调用setState方法，设置不会生效，会导致服务端和浏览器上渲染的结果不一致
        setState (...args) {
          if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
            let displayName = _constructor.displayName || _constructor.name || 'Component'
            throw new Error(`Controller(${displayName}): can't call setState during componentPrepare, this will not work on ssr`)
          }
          super.setState(...args)
        }
      }

      // default enhancer
      let enhancers = []
      enhancers.push(connect(mapStateToProps, dispatch => ({ dispatch })))
      // custom enhancers
      if (enhance && typeof enhance === 'function') {
        enhancers = enhance(enhancers) || enhancers
      }

      let EnhancedComp = ControllerWrapper

      if (enhancers && enhancers.length > 0) {
        let hasConnectHOC = false
        enhancers.forEach((enhancer) => {
          EnhancedComp = enhancer(EnhancedComp)
          if ((typeof EnhancedComp === 'undefined') || EnhancedComp === null || !EnhancedComp.prototype.isReactComponent) {
            throw 'the enhance must return a React.Component or React.PureComponent'
          }
          if (EnhancedComp.displayName && /Connect\(/.test(EnhancedComp.displayName)) {
            hasConnectHOC = true
          }
        })
        // check
        if (process.env.NODE_ENV === 'development') {
          if (!hasConnectHOC && console.warn) {
            console.warn(`controller(${getCompDisplayName(_constructor) || ''}) redux connect hoc has been removed,`)
          }
        }
      } else {
        if (process.env.NODE_ENV === 'development' && console.warn) {
          console.warn(`controller(${getCompDisplayName(_constructor) || ''}) enhancers is empty, you should not remove all enhancers`)
        }
      }

      return injectModelsToProps(EnhancedComp, modelFields)
    }
  }
}

function injectModelsToProps (Comp, modelFieldDescriptors) {

  // get joy state from store
  const joyWrapMapStateToProps = (store, ownProps) => {
    const joyProps = {
      _joyStoreState: store
    }
    return joyProps
  }

  class ModelWrapper extends React.Component {
    static contextTypes = {
      tempo: PropTypes.object,
    }

    constructor (props, context) {
      super(...arguments)
      const { _joyStoreState } = props
      const { tempo } = context

      // register bind models
      if (modelFieldDescriptors && modelFieldDescriptors.length > 0) {
        modelFieldDescriptors.forEach((modelField) => {
          let modelClass = modelField.descriptor.get.__ModelType
          tempo.model(modelClass)
        })
        const newStoreState = tempo.getState()
        // WARNING react-rudex默认并不会立即更新mapStateToProps中的storeState入参，
        // 导致在子组件树中使用刚注册的model的state会出错，所以在这里主动将新状态更新到当前渲染的状态上。
        Object.assign(_joyStoreState, newStoreState)
      }
    }

    shouldComponentUpdate (nextProps, nextState, nextContext) {
      if(!shallowEqual(this.props._joyStoreState, nextProps._joyStoreState)){
        return !shallowEqual(this.props, nextProps, {exclude: ['_joyStoreState']})
      }
      return true
    }

    render () {
      const { _joyStoreState } = this.props
      const isPrepared = _joyStoreState['@@joy'].isPrepared

      let childProps = {
        ...this.props,
        _componentHasPrepared: isPrepared,
        _joyStoreState: undefined
      }
      return <Comp {...childProps} tempo={this.context.tempo}/>
    }
  }

  return connect(joyWrapMapStateToProps)(ModelWrapper)
}

/***
 * 注册依赖的Model
 * 建议在controller中使用autowire申明依赖的model
 * @param models array
 * @returns {function(*)}
 */
function requireModel (...models) {
  return Comp => {
    if (!models || models.length === 0) {
      return
    }

    Comp.finisher = function (_constructor) {
      class Wrapper extends _constructor {

        static contextTypes = {
          tempo: PropTypes.object,
          ..._constructor.contextTypes
        }

        constructor (props, context) {
          super(...arguments)
          const { storeState } = props
          const { tempo } = context

          models.forEach((model) => {
            tempo.model(model)
          })
          const newStoreState = tempo.getState()
          // WARNING react-rudex默认并不会立即更新mapStateToProps中的storeState入参，
          // 导致在子组件树中使用刚注册的model的state会出错，所以在这里主动将新状态更新到当前渲染的状态上。
          Object.assign(storeState, newStoreState)
        }
      }

      let EnhancedComp = connect((storeState, ownProps) => {
        return { storeState }
      }, dispatch => ({ dispatch }))(Wrapper)

      return EnhancedComp
    }
  }
}

function getCompDisplayName (Comp) {
  return Comp.displayName || Comp.name
}

export default controller
export { controller, requireModel, connect }
