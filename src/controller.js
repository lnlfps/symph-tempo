import React, {PureComponent} from 'react'
import {connect} from 'react-redux'
import PropTypes from 'prop-types'

/**
 * 将react 组件封装为controller组件
 * @param mapStateToProps
 * @param enhance 对Controller进行再次封装，默认有redux connect。 @symph/joy默认提供：with-router, react-hot-loader
 * @returns connect Redux后的HOC
 */
function controller(mapStateToProps, {enhance} = {}) {
  return Comp => {
    let modelFields = Comp.elements.filter(el => el.descriptor.get && el.descriptor.get.__ModelType)

    Comp.finisher = function (_constructor) {

      class ControllerWrapper extends _constructor {
        static contextTypes = {
          tempo: PropTypes.object,
          ..._constructor.contextTypes
        }

        constructor(...args) {
          super(...args)
          let context = args[1]
          const {__componentHasPrepared} = this.props
          const {tempo} = context

          if (this.componentPrepare) {
            let isNeedCallPrepare = false
            if (typeof window === 'undefined') {
              // on node.js
              if (!__componentHasPrepared) {
                isNeedCallPrepare = true
              }
            } else {
              if (!__componentHasPrepared) {
                isNeedCallPrepare = true
              }
            }
            if (isNeedCallPrepare) {
              tempo.prepareManager.prepareComponent(this)
            }
          }
        }

        // 服务端渲染时，不可调用setState方法，设置不会生效，会导致服务端和浏览器上渲染的结果不一致
        setState(...args) {
          if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
            let displayName = _constructor.displayName || _constructor.name || 'Component'
            throw new Error(`Controller(${displayName}): can't call setState during componentPrepare, this will not work on ssr`);
          }
          super.setState(...args)
        }
      }

      // default enhancer
      let enhancers = []
      enhancers.push(connect(mapStateToProps, dispatch => ({dispatch})))
      // custom enhancers
      if (enhance && typeof enhance === "function") {
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


function injectModelsToProps(Comp, modelFieldDescriptors) {

  // get joy state from store
  const joyWrapMapStateToProps = (store, ownProps) => {
    // console.trace("Here I am!")
    let isPrepared = store['@@joy'].isPrepared
    const joyProps = {
      __componentHasPrepared: isPrepared,
      __joyStoreState: store
    }
    return joyProps
  }

  class ModelWrapper extends React.PureComponent {
    static contextTypes = {
      tempo: PropTypes.object,
    }

    constructor(props, context) {
      super(...arguments)
      const {__joyStoreState} = props
      const {tempo} = context

      // register bind models
      if (modelFieldDescriptors && modelFieldDescriptors.length > 0) {
        modelFieldDescriptors.forEach((modelField) => {
          let modelClass = modelField.descriptor.get.__ModelType
          tempo.model(modelClass)
        })
        const newStoreState = tempo.getState()
        // WARNING react-rudex默认并不会立即更新mapStateToProps中的storeState入参，
        // 导致在子组件树中使用刚注册的model的state会出错，所以在这里主动将新状态更新到当前渲染的状态上。
        Object.assign(__joyStoreState, newStoreState)
      }
    }

    render() {
      let childProps = {...this.props}
      delete childProps.__joyStoreState

      return <Comp {...childProps} tempo={this.context.tempo}/>
    }
  }

  return connect(joyWrapMapStateToProps)(ModelWrapper)
}


/***
 * 注册依赖的Model
 * 只需要在第一个依赖Model的Controller上注册，多次注册只有第一次注册有效。
 * @param models array
 * @returns {function(*)}
 */
function requireModel(...models) {
  if (process.env.NODE_ENV === 'development' && console && console.warn) {
    console.warn('@requireModel has been deprecated since 0.6.1，' +
      'use @autowire() to bind model to controller instead.' +
      ' this will be removed in the near future')
  }
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

        constructor(props, context) {
          super(...arguments)
          const {storeState} = props
          const {tempo} = context

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
        return {storeState}
      }, dispatch => ({dispatch}))(Wrapper)

      return EnhancedComp
    }
  }
}

function getCompDisplayName(Comp) {
  return Comp.displayName || Comp.name
}


export default controller
export {controller, requireModel, connect}
