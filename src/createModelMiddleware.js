import { NAMESPACE_SEP } from './constants'

export default function createModelMiddleware (app) {
  const middleware = () => next => (action) => {
    const { type } = action
    if (type.indexOf('/') <= 0) {
      return next(action)
    }
    const [namespace, funName] = type.split(NAMESPACE_SEP)
    if (funName.indexOf('__') === 0) {
      return next(action)
    }

    const model = app.models[namespace]
    const fun = model && model[funName]

    if (fun !== undefined && fun !== null) {
      return fun.call(model, action)
    } else {
      return next(action)
    }
  }

  return middleware
}
