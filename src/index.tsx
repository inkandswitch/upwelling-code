import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import './styles.css'
import { nanoid } from 'nanoid'

const id = window.location.pathname === '/' ?
  window.location.href = '/' + nanoid() :
  window.location.pathname.replace('/', '')

ReactDOM.render(
  <React.StrictMode>
    <App id={id} />
  </React.StrictMode>,
  document.getElementById('root')
)
