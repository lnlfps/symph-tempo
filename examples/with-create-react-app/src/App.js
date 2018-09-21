import React, {Component} from 'react';
import logo from './logo.svg';
import './App.css';

import {create} from '@symph/tempo'
import {Provider} from '@symph/tempo/provider'
import CalculateController from "./controllers/CalculateController";

// 创建框架实例，之后就可以使用Controller和Model组件了
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

class App extends Component {
  render() {
    return (
      <Provider app={app}>
        <div className="App">
          <header className="App-header">
            <img src={logo} className="App-logo" alt="logo"/>
            <h1 className="App-title">Welcome to @symph/tempo</h1>
          </header>
          <div className="App-intro">
            <CalculateController/>
          </div>
        </div>
      </Provider>
    );
  }
}

export default App;
