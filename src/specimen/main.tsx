import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './specimen.css'
import { FontSpecimen } from './FontSpecimen'

// Temporary font specimen (font-specimen.html, dev only) — not part of the portfolio app.
const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found')

createRoot(rootElement).render(
  <StrictMode>
    <FontSpecimen />
  </StrictMode>,
)
