import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { loadTheme, applyTheme } from './components/SettingsView'

// Apply persisted theme before first render
applyTheme(loadTheme())

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
)
