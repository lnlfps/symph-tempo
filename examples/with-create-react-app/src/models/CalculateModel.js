import model from '@symph/tempo/model'

class CalculateModel {

  //the mount point of store state tree, must unique in the app.
  namespace = 'calculate'

  //this is the initial state of model
  initState = {
    counter: 0,
  }

  async add({number}) {
    let {counter} = this.getState()

    counter += number
    this.setState({
      counter
    })
  }

}

export default model()(CalculateModel)
