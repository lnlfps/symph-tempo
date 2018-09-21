import React, {PureComponent} from 'react'
import {connect} from 'react-redux'
import PropTypes from 'prop-types'

const enhancers = []

/**
 * 将react 组件封装为controller，提供componentPrepare方法支持，确保该方法在服务端和客户端只执行一次。
 * @param mapStateToProps
 * @returns {function(*)}
 */
function controller(mapStateToProps) {
  return Comp => {
    Comp.contextTypes = {
      tempo: PropTypes.object,
      store: PropTypes.object,
      isComponentDidPrepare: PropTypes.bool,
      ...Comp.contextTypes
    }

    // call componentPrepare function if need
    const _componentWillMount = Comp.prototype.componentWillMount
    Comp.prototype.componentWillMount = function () {
      if (_componentWillMount) {
        _componentWillMount.apply(this, arguments)
      }

      const {tempo} = this.context
      const {__componentHasPrepared} = this.props
      let isNeedCallPrepare = false
      if (typeof window === 'undefined') {
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

    // inject joy props
    const wrapMapStateToProps = (store, ownProps) => {
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

    let enhancedComp = connect(wrapMapStateToProps, dispatch => ({dispatch}))(Comp)


    if(enhancers.length > 0){
      enhancers.map((enhancer) => {
        enhancedComp = enhancer(enhancedComp)
        if((typeof enhancedComp === 'undefined')|| enhancedComp === null) {
          throw 'the enhance must return a Component'
        }
      })
    }

    return enhancedComp
  }
}

/***
 * 注册model， 建议在@controller的下面注册model
 * 只需要在入口Controller中注册依赖的model即可，如果多次注册，只有第一次注册有效。
 * @param models array
 * @returns {function(*)}
 */
function requireModel(...models) {
  return Comp => {
    if (!models || models.length === 0) {
      return Comp
    }

    return class RequireModel extends PureComponent {
      static contextTypes = {
        tempo: PropTypes.object,
        isComponentDidPrepare: PropTypes.bool,
        ...Comp.contextTypes
      }

      constructor(props, context) {
        super(props, context)

        models.forEach((model) => {
          context.tempo.model(model)
        })
      }

      render() {
        return <Comp {...this.props} />
      }
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
    if (enhancers[i] === enhancer){
      enhancers.splice(i, 1)
      break
    }
  }
}


export default controller
export {controller, requireModel, connect, addEnhancer, removeEnhancer}
