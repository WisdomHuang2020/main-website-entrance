import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const container = document.getElementById('root')
if (!container) throw new Error('找不到 #root 容器，index.html 是否被改动？')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
