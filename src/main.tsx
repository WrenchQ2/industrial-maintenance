import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AppDataProvider } from './context/AppDataContext'
import { ToastProvider } from './components/ui/Toast'
import './index.css'

const root = document.getElementById('root')

if (!root) {
  throw new Error('No se encontró el elemento #root para iniciar la aplicación.')
}

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AppDataProvider>
          <App />
        </AppDataProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
