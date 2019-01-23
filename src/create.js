import combineReducers from './combineReducers'
import createSagaMiddleware from 'redux-saga/lib/internal/middleware'
import invariant from 'invariant'
import checkModel from './checkModel'
import prefixNamespace from './prefixNamespace'
import Plugin, { filterHooks } from './Plugin'
import createStore from './createStore'
import getSaga from './getSaga'
import getReducer from './getReducer'
import createPromiseMiddleware from './createPromiseMiddleware'
import {
  run as runSubscription,
  unlisten as unlistenSubscription
} from './subscription'
import { noop } from './utils'
import PrepareManager from './PrepareManager'
import createModelMiddleware from './createModelMiddleware'

// Internal model to update global state when do unmodel
const dvaModel = {
  namespace: '@@joy',
  state: {
    isPrepared: false
  },
  reducers: {
    updatePrepareState (state, {isPrepared}) { return {...state, isPrepared} }
  }
}

/**
 * Create dva-core instance.
 *
 * @param hooksAndOpts
 * @param createOpts
 */
export function create (hooksAndOpts = {}, createOpts = {}) {
  const {
    initialReducer,
    setupApp = noop
  } = createOpts

  const plugin = new Plugin()
  plugin.use(filterHooks(hooksAndOpts))

  const app = {
    _models: [ // dva's model.
      prefixNamespace({ ...dvaModel })
    ],
    models: {}, // tempo's model. use object to save models, the key is model's namespace
    diObjects: {}, //dependency injection objects
    _store: null,
    dispatch,
    getState,
    _plugin: plugin,
    use: plugin.use.bind(plugin),
    prepareManager: new PrepareManager(),
    model: injectDvaModel,
    start
  }
  return app

  /**
   * dispatch an action to store
   * @param action
   */
  function dispatch (action) {
    if (!app._store) {
      console.error('dva has not started, can not dispatch an action')
      return
    }
    return app._store.dispatch(action)
  }

  /**
   * get the store's state
   */
  function getState () {
    if (!app._store) {
      console.error('dva has not started, can not getState')
      return
    }
    return app._store.getState()
  }

  /**
   * Register model before app is started.
   *
   * @param m {Object} model to register
   */
  function injectDvaModel (m) {
    if (process.env.NODE_ENV !== 'production') {
      checkModel(m, app._models)
    }
    app._models.push(prefixNamespace(m))
  }

  /**
   * Inject model after app is started.
   *
   * @param createReducer
   * @param onError
   * @param unlisteners
   * @param m
   */
  function injectModel (createReducer, onError, unlisteners, m) {
    if (m._type === '__MODEL') {
      return injectModelClass(createReducer, onError, unlisteners, m)
    }

    // 如果已经存在，就不用重复添加
    for (let _m of app._models) {
      if (_m === m) {
        return _m
      }
    }

    injectDvaModel(m)

    const store = app._store
    if (m.reducers) {
      store.asyncReducers[m.namespace] = getReducer(m.reducers, m.state)
      store.replaceReducer(createReducer())
    }
    if (m.effects) {
      store.runSaga(app._getSaga(m.effects, m, onError, plugin.get('onEffect')))
    }
    if (m.subscriptions) {
      unlisteners[m.namespace] = runSubscription(m.subscriptions, m, app, onError)
    }

    return m
  }

  /**
   * 注册简化版的model
   */
  function injectModelClass (createReducer, onError, unlisteners, Model) {
    if(app.diObjects[Model]){
      // duplication of model
      return app.diObjects[Model]
    }

    const model = new Model()
    model.init(app)
    const namespace = model.namespace
    const store = app._store

    app.models[namespace] = model
    app.diObjects[Model] = model

    // set reducers
    store.asyncReducers[model.namespace] = (state = model.initState, action) => {
      const { type, nextState } = action
      if (type === model.namespace + '/__SET_STATE') {
        return {...state, ...nextState}
      } else {
        return state
      }
    }
    store.replaceReducer(createReducer())

    return model
  }

  /**
   * Unregister model.
   *
   * @param createReducer
   * @param reducers
   * @param unlisteners
   * @param namespace
   *
   * Unexpected key warn problem:
   * https://github.com/reactjs/redux/issues/1636
   */
  function unmodel (createReducer, reducers, unlisteners, namespace) {
    const store = app._store

    // Delete reducers
    delete store.asyncReducers[namespace]
    delete reducers[namespace]
    store.replaceReducer(createReducer())
    // store.dispatch({ type: '@@dva/UPDATE' })

    // Cancel effects
    store.dispatch({ type: `${namespace}/@@CANCEL_EFFECTS` })

    // Unlisten subscrioptions
    unlistenSubscription(unlisteners, namespace)

    // Delete model from app._models
    app._models = app._models.filter(model => model.namespace !== namespace)

    // if it is a tempo model, remove it
    if(app.models[namespace]){
      let model = app.models[namespace]
      let diType
      for(let key of app.diObjects){
        if(app.diObjects[key].namespace === model.namespace){
          diType = [key]
          break
        }
      }
      delete app.models[namespace]
      delete app.diObjects[diType]
    }
  }

  /**
   * Start the app.
   *
   * @returns void
   */
  function start () {
    // Global error handler
    const onError = (err) => {
      if (err) {
        if (typeof err === 'string') err = new Error(err)
        err.preventDefault = () => {
          err._dontReject = true
        }
        plugin.apply('onError', (err) => {
          throw new Error(err.stack || err)
        })(err, app._store.dispatch)
      }
    }

    const modelMiddleware = createModelMiddleware(app)
    const sagaMiddleware = createSagaMiddleware()
    const {
      middleware: promiseMiddleware,
      resolve,
      reject
    } = createPromiseMiddleware(app)
    app._getSaga = getSaga.bind(null, resolve, reject)

    const sagas = []
    const reducers = { ...initialReducer }
    for (const m of app._models) {
      reducers[m.namespace] = getReducer(m.reducers, m.state)
      if (m.effects) sagas.push(app._getSaga(m.effects, m, onError, plugin.get('onEffect')))
    }
    const reducerEnhancer = plugin.get('onReducer')
    const extraReducers = plugin.get('extraReducers')
    invariant(
      Object.keys(extraReducers).every(key => !(key in reducers)),
      `[app.start] extitraReducers is conflict with other reducers, reducers list: ${Object.keys(reducers).join(', ')}`
    )

    // Create store
    const store = app._store = createStore({ // eslint-disable-line
      reducers: createReducer(),
      initialState: hooksAndOpts.initialState || {},
      plugin,
      createOpts,
      modelMiddleware,
      sagaMiddleware,
      promiseMiddleware
    })

    // Extend store
    store.runSaga = sagaMiddleware.run
    store.asyncReducers = {}

    // Execute listeners when state is changed
    const listeners = plugin.get('onStateChange')
    for (const listener of listeners) {
      store.subscribe(() => {
        listener(store.getState())
      })
    }

    // Run sagas
    sagas.forEach(sagaMiddleware.run)

    // Setup app
    setupApp(app)

    // Run subscriptions
    const unlisteners = {}
    for (const model of this._models) {
      if (model.subscriptions) {
        unlisteners[model.namespace] = runSubscription(model.subscriptions, model, app, onError)
      }
    }

    // Setup app.model and app.unmodel
    app.model = injectModel.bind(app, createReducer, onError, unlisteners)
    app.unmodel = unmodel.bind(app, createReducer, reducers, unlisteners)

    /**
     * Create global reducer for redux.
     *
     * @returns {Object}
     */
    function createReducer () {
      return reducerEnhancer(combineReducers({
        ...reducers,
        ...extraReducers,
        ...(app._store ? app._store.asyncReducers : {})
      }))
    }
  }
}
