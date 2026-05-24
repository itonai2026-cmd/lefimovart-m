import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

if (!localStorage.getItem('theme')) {
  localStorage.setItem('theme', 'dark');
}

if (localStorage.getItem('theme') !== 'light') {
  document.documentElement.classList.add('dark');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
