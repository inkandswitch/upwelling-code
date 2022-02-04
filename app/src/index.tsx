import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import './styles.css'
import { loadForTheFirstTimeLoL }  from 'upwell'

loadForTheFirstTimeLoL().then(() => {
  ReactDOM.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    document.getElementById('root')
  )
})