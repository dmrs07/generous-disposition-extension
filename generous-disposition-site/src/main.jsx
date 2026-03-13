import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import GenerousDisposition from './pages/GenerousDisposition'
import GDLinter from './pages/GDLinter'
import ContextGD from './pages/ContextGD'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/framework" element={<GenerousDisposition />} />
        <Route path="/linter" element={<GDLinter />} />
        <Route path="/context" element={<ContextGD />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
