import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import './styles.css'
import init from 'automerge-wasm'

init().then( _ => {
  ReactDOM.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    document.getElementById('root')
  )
})