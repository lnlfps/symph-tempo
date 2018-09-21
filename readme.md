
# @symph/tempo

`@symph/tempo`是一个React应用的轻量框架，基于redux，简化了redux的使用及其复杂的概念，采用MVC的思想使代码和应用结构更加清晰，从而可以轻松高效的开发。

该框架只提供MVC组件支持，并不包含路由和构建相关的模块，这样可以更方便的集成到其它框架中（[create-react-app](https://github.com/facebook/create-react-app)、react-native等）。如果你想要一个全栈的高可用框架，来帮你解决各种技术细节，快速的进入业务开发，请关注 [`@symph/joy`](https://github.com/lnlfps/symph-joy) 项目，它基于本项目，为开发提供更全面的项目能力。

## 安装

```bash
yarn add @symph/tempo 
```

或者

```bash
npm install --save @symph/tempo 
```

## 例子

> [with-create-react-app](https://github.com/lnlfps/symph-tempo/tree/master/examples/with-create-react-app) 使用[create-react-app](https://github.com/facebook/create-react-app)创建空白工程，并集成`@symph/tempo`

## 初始化框架

```javascript
import React, {Component} from 'react';
import {create} from '@symph/tempo'
import {Provider} from '@symph/tempo/provider'

// 创建框架实例，然后就可以使用Controller和Model组件了
const app = create({
  initialState: {}
}, {
  initialReducer: {},
  setupMiddlewares: (middlewares) => {
    return middlewares
  }
})
// 启动框架
app.start()

// 在React绑定
class App extends Component {
  render() {
    return (
      <Provider app={app}>
        <div> you app content </div>
      </Provider>
    );
  }
}

export default App;
```

## 创建MVC组件

- Model: 管理应用的行为和数据，普通class类，有初始状态，业务运行中更新model状态
- View: 展示数据，继承React.Component
- Controller: 控制View的展示，绑定Model数据到View，响应用户的操作，调用Model中的业务, 继承于React.Component
  
组件间工作流程图

![app work flow](https://github.com/lnlfps/static/blob/master/symphony-joy/images/app-work-flow.jpeg?raw=true)

图中蓝色的箭头表示数据流的方向，红色箭头表示控制流的方向，他们都是单向流，store中的`state`对象是不可修改其内部值的，状态发生改变后，都会生成一个新的state对象，且只将有变化的部分更新到界面上，这和[redux](https://redux.js.org/)的工作流程是一致的。

> 这里只是对redux进行MVC层面的封装，并未添加新的技术，依然可以使用redux的原生接口，如果想深入了解redux，请阅读其详细文档：[redux](https://redux.js.org/)

### 创建Model

Model管理应用的行为和数据，Model拥有初始状态`initState`和更新状态的方法`setState(nextState)`，这和Component的state概念类似，业务在执行的过程中，不断更新`state`，当`state`发生改变时，和`state`绑定的View也会动态的更新。这里并没有什么魔法和创造新的东西，只是将redux的`action`、`actionCreator`、`reducer`、`thunk`、`saga`等复杂概念简化为业务方法和业务数据两个概念，让我们更专注于业务实现，代码也更简洁.

创建一个计数器Model，计数器默认数值为0，还有一个增加计数的方法。

```javascript
// models/CalculateModel.js
import model from '@symph/tempo/model'

@model()
export default class CalculateModel {
  //model的唯一标识，通过该名称来访问model中的状态数据
  namespace = 'calculate'

  //初始状态数据
  initState = {
    counter: 0,
  }

  async add({number}) {
    let {counter} = this.getState()
    counter += number
    // 更新model中的状态
    this.setState({ 
      counter
    })
  }
}
```


我们使用`@model()`将一个类声明为Model类，Model类在实例化的时候会添加`getState`、`setState`，`dispatch`等快捷方法。

#### Model API

##### namespace

model将会被注册到redux store中，由store统一管理model的状态，使用`store.getState()[namespace]`来访问对应model的state, store中不能存在两个相同的`namespace`的model。

##### initState

设置model的初始化状态，由于`model.state`可能会被多个`async`业务方法同时操作，所以为了保证state的有效性，请在需要使用state时使用`getState()`来获取当前state的最新值，并使用`setState(nextState)`方法更新当前的state。

##### setState(nextState)

`setState(nextState)`更新model的状态，`nextState`是当前state的一个子集，系统将使用浅拷贝的方式合并当前的状态。

##### getState()

`getState()`获取当前model的状态。

##### getStoreState()

`getStoreState(）`获取当前整个store的状态。

##### dispatch(action)

返回值：Promise，被调用业务的返回值。

在model中使用`await this.dispatch(action)`调用其它业务方法，这和redux的`store.dispatch(action)`的使用一样，由系统分发`action`到指定的model业务方法中, `action.type`的格式为`modelNamespace/serviceFunction`。

如果是调用model自身的业务方法，可以使用`await this.otherService({option})`的方式，`this`指的是model本身。

#### 业务方法

`async service(action)` 业务方法是`async`函数，内部支持`await`指令调用其它异步方法。在controller或者其他model中通过`dispatch(action)`方法调用业务方法并获得其返回值。

#### Dva Model

兼容dva风格的model对象，使用方法：[Dva Concepts](https://github.com/dvajs/dva/blob/master/docs/Concepts_zh-CN.md) ;


### 创建Controller

Controller需要申明其依赖哪些Model，以及绑定Model的中的数据，和调用Model中的业务方法。它是一个React组件，可以像其它React组件一样创建和使用。

下面创建一个计数器Controller，展示Model中存储的统计值，以及调用Model中的方法来修改统计值。

```javascript
// models/CalculateController.js
import React, {Component} from 'react'
import {controller, requireModel} from '@symph/tempo/controller'
import CalculateModel from '../models/CalculateModel'

@requireModel(CalculateModel)
@controller((state) => {
  // 绑定calculateModel中的状态到当前组件
  return {
    counter: state.calculate.counter,  // bind model's state to props
  }
})
export default class CalculateController extends Component {
  add = async () => {
    let {dispatch} = this.props
    // 调用calculateModel中的业务方法
    await dispatch({
      type: 'calculate/add',
      number: 1
    })
  }

  render() {
    let {counter} = this.props
    return (
      <div>
        <div>counter: {counter}</div>
        <button onClick={this.add}>add 1</button>
      </div>
    )
  }
}
```

创建和使用Controller的步骤：

- 使用`@controller(mapStateToProps)`装饰器将一个普通的Component声明为一个Controller，参数`mapStateToProps`实现model状态和组件props属性绑定，当model的state发生改变时，会触发组件使用新数据重新渲染界面。

- 使用`@requireModel(ModelClass)`注册controller需要依赖的model，这样可以将controller依赖的model打包到一个thunk中，只有在controller运行时，才会去加载依赖的model，通常只需要在第一次使用到model的时候加载一次即可，无需重复注册。

- 每个controller的`props`都会被注入一个redux的`dispatch`方法，`dispatch`方法是controller调用model的唯一途径，该方法的返回值是业务方法的返回值(Promise对象)，这和redux的dispatch方法有差别。


如果项目的babel配置还不支持`@`装饰器语法，请使用函数调用的方式来声明Controller，例如：

```javascript
// models/CalculateController.js
import React, {Component} from 'react'
import {controller, requireModel} from '@symph/tempo/controller'
import CalculateModel from '../models/CalculateModel'

class CalculateController extends Component {
  add = async () => {
    let {dispatch} = this.props
    // 调用calculateModel中的业务方法
    await dispatch({
      type: 'calculate/add',
      number: 1
    })
  }

  render() {
    let {counter} = this.props
    return (
      <div>
        <div>counter: {counter}</div>
        <button onClick={this.add}>add 1</button>
      </div>
    )
  }
}

const Controller = controller((state) => {
 // 绑定calculateModel中的状态到当前组件
  return {
    counter: state.calculate.counter,  // bind model's state to props
  }
})(CalculateController)
const ModelBound = requireModel(CalculateModel)(Controller)
export default ModelBound
```

### 创建View

View是一个普通的React组件，其只负责界面展示，展示的数据来自父组件，通过`this.props`属性读取。 

```javascript
import React, {Component} from 'react'

class TextView extends Component {
  render() {
    let {message} = this.props
    return (
      <div>
        {message}
      </div>
    )
  }
}
```











