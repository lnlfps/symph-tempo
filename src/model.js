/**
 * @ModelInstance 将一个Model class封装为单例模式，import 的时候，直接得到该单实例，不用再次实例化
 * @returns {function(*)}
 * @constructor
 */
function model() {
  return Mod => {
    return class ExMod extends Mod {
      static _type = '__MODEL';

      constructor(app) {
        super(...arguments)

        this.store = app._store
        this.dispatch = this.store.dispatch
      }

      setState(nextState) {
        this._checkInit()

        const action = {
          type: this.namespace + '/__SET_STATE',
          nextState
        }

        return this.dispatch(action)
      }

      getState() {
        this._checkInit()
        return this.store.getState()[this.namespace]
      }


      getStoreState() {
        this._checkInit()

        return this.store.getState()
      }

      selectState() {
        if(process.env.NODE_ENV === 'development'){
          console.warn('mode selectState is deprecated, user getStoreState instead')
        }
        return this.getStoreState();
      }

      _checkInit() {
        if (!this.dispatch) {
          throw new Error(`you must requireModel(${Mod}), before use it`)
        }
      }
    }
  }
}

export default model;
export {model}
