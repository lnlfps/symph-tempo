/**
 * @ModelInstance 将一个Model class封装为单例模式，import 的时候，直接得到该单实例，不用再次实例化
 * @returns {function(*)}
 * @constructor
 */
function model(config) {
  return function decorator (Model) {

    const autowireFields = Model.elements.filter(el => el.descriptor.get && el.descriptor.get.__ModelType)

    Model.elements.push({
      kind:"field",
      key:"_type",
      placement:"static",
      descriptor:{"writable":false,"configurable":true,"enumerable":false},
      initializer: function () {
        return '__MODEL'
      }
    })

    Model.elements.push({
      "kind":"method",
      "key":"init",
      "placement":"prototype",
      "descriptor":{"writable":true,"configurable":true,"enumerable":false,
        value:function (app) {
          this._app = app
          this.store = app._store
          this.dispatch = this.store.dispatch

          this.tempo = app
          if(autowireFields && autowireFields.length > 0){
            autowireFields.forEach((autowireField) => {
              let modelClass = autowireField.descriptor.get.__ModelType
              app.model(modelClass)
            })
          }
        }
      }
    })



    Model.elements.push({
      "kind":"method",
      "key":"_checkInit",
      "placement":"prototype",
      "descriptor":{"writable":true,"configurable":true,"enumerable":false,
        value:function () {
          if (!this.store) {
            throw new Error(`must use @requireModel(${Model}) decorator on class, before use it`)
          }
        }
      }
    })

    Model.elements.push({
      "kind":"method",
      "key":"setState",
      "placement":"prototype",
      "descriptor":{"writable":true,"configurable":true,"enumerable":false,
        value:function (nextState) {
          this._checkInit()
          const action = {
            type: this.namespace + '/__SET_STATE',
            nextState
          }
          return this.dispatch(action)
        }
      }
    })

    Model.elements.push({
      "kind":"method",
      "key":"getState",
      "placement":"prototype",
      "descriptor":{"writable":true,"configurable":true,"enumerable":false,
        value:function (nextState) {
          this._checkInit()
          return this.store.getState()[this.namespace]
        }
      }
    })

    Model.elements.push({
      "kind":"method",
      "key":"getStoreState",
      "placement":"prototype",
      "descriptor":{"writable":true,"configurable":true,"enumerable":false,
        value:function () {
          this._checkInit()
          return this.store.getState()
        }
      }
    })

    Model.elements.push({
      "kind":"method",
      "key":"selectState",
      "placement":"prototype",
      "descriptor":{"writable":true,"configurable":true,"enumerable":false,
        value:function () {
          if(process.env.NODE_ENV === 'development' && console && console.warn){
            console.warn('mode selectState is deprecated, use getStoreState() instead')
          }
          return this.getStoreState();
        }
      }
    })

    return Model;
  }
}

export default model;
export {model}
