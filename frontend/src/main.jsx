import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'

import { ThemeProvider } from "./components/theme-provider"

import './index.css'
import App from './App.jsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  console.warn("Missing Publishable Key")
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      {/* Fallback to a valid-looking dummy key to prevent full app crash while user is finding their real key */}
      <ClerkProvider publishableKey={PUBLISHABLE_KEY || "pk_test_ZHVtbXkta2V5LmNsZXJrLmFjY291bnRzLmRldiQ"}>
        <ThemeProvider defaultTheme="light" storageKey="recruit-ai-theme">
          <App />
        </ThemeProvider>
      </ClerkProvider>
    </BrowserRouter>
  </StrictMode>,
)
