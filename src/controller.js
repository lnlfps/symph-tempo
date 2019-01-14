import React, {PureComponent} from 'react'
import {connect} from 'react-redux'
import PropTypes from 'prop-types'

const enhancers = []

/**
 * 将react 组件封装为controller，提供componentPrepare方法。
 * @param mapStateToProps
 * @returns connect Redux后的HOC
 */
function controller(mapStateToProps) {
  return Comp => {

    let componentPrepare = Comp.elements.find(el => el.key === 'componentPrepare')

    Comp.finisher = function (_constructor) {

      // inject joy props
      const wrapMapStateToProps = (store, ownProps) => {
        // console.trace("Here I am!")
        let isPrepared = store['@@joy'].isPrepared
        const joyProps = {__componentHasPrepared: isPrepared}

        if (typeof mapStateToProps === 'function') {
          let props = mapStateToProps(store, ownProps)
          return {
            ...props,
            ...joyProps
          }
        } else {
          return joyProps
        }
      }

      class Wrapper extends _constructor {

        static contextTypes = {
          tempo: PropTypes.object,
          ..._constructor.contextTypes
        }

        constructor(...args) {
          super(...args)
          this._isMounted = false
          let context = args[1]
          const {tempo} = context
          // try to p
          if (componentPrepare) {

            const {__componentHasPrepared} = this.props
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

        componentDidMount(...args){
          this._isMounted = true
          if(super.componentDidMount){
            super.componentDidMount(...args);
          }
        }

        componentWillUnmount(...args) {
          this._isMounted = false
          if(super.componentWillUnmount){
            super.componentWillUnmount(...args);
          }
        }

        setState(...args){
          // 服务端渲染时，不可调用setState方法，设置不会生效，
          // 会导致服务端和浏览器上渲染的结果不一致
          if(typeof window === 'undefined' && process.env.NODE_ENV !== 'production'){
            let dispalyName =  _constructor.displayName || _constructor.name || 'Component'
            throw new Error(`Controller(${dispalyName}) can't setState during componentPrepare, this will not work on ssr`);
          }

          let stateChange = args[0]
          let callback = null
          if(args.length >= 2){
            callback = args[1]
          }
          if(this._isMounted){
            super.setState(...args)
          } else {
            // may be a updater function
            if(typeof stateChange === 'function'){
              stateChange = stateChange(this.state, this.props)
            }
            this.state = Object.assign(this.state, stateChange)
            if(callback){
              callback()
            }
          }
        }
      }

      let EnhancedComp = connect(wrapMapStateToProps, dispatch => ({dispatch}))(Wrapper)

      if (enhancers.length > 0) {
        enhancers.forEach((enhancer) => {
          EnhancedComp = enhancer(EnhancedComp)
          if ((typeof EnhancedComp === 'undefined') || EnhancedComp === null || !EnhancedComp.prototype.isReactComponent) {
            throw 'the enhance must return a React.Component or React.PureComponent'
          }
        })
      }
      return EnhancedComp
    }
  }
}

/***
 * 注册依赖的Model
 * 只需要在第一个依赖Model的Controller上注册，多次注册只有第一次注册有效。
 * @param models array
 * @returns {function(*)}
 */
function requireModel(...models) {
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

/**
 * 添加对Controller组件进行高阶封装， 这个方法会对所有的Controller组件生效
 * @param enhancer (Component) => {return Component}
 */
function addEnhancer(enhancer) {
  if (typeof enhancer !== 'function') {
    throw 'the controller enhancer must is a function'
  }

  enhancers.push(enhancer)
}

/**
 * 对移除对Controller组件进行高阶封装
 * @param enhancer (Component) => {return Component}
 */
function removeEnhancer(enhancer) {
  if (typeof enhancer !== 'function') {
    throw 'the controller enhancer must is a function'
  }

  for (let i = 0; i < enhancers.length; i++) {
    if (enhancers[i] === enhancer) {
      enhancers.splice(i, 1)
      break
    }
  }
}


export default controller
export {controller, requireModel, connect, addEnhancer, removeEnhancer}
