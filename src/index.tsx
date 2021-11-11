import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import './styles.css'

const id = window.location.pathname === '/' ? 'default' : window.location.pathname.replace('/', '')
console.log(id)

ReactDOM.render(
  <React.StrictMode>
    <App id={id} />
  </React.StrictMode>,
  document.getElementById('root')
)
