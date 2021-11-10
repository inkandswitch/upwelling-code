import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import './styles.css'

const id = window.location.hash.replace('#', '') || 'default'

ReactDOM.render(
  <React.StrictMode>
    <App id={id} />
  </React.StrictMode>,
  document.getElementById('root')
)
