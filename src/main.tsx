import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import Dashboard from './Dashboard.tsx'
import SignIn from './SignIn.tsx'
import GetStarted from './GetStarted.tsx'
import CompanySignIn from './CompanySignIn.tsx'
import CompanyDashboard from './CompanyDashboard.tsx'
import CompanyOnboarding from './CompanyOnboarding.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/get-started" element={<GetStarted />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/company/signin" element={<CompanySignIn />} />
        <Route path="/company/onboarding" element={<CompanyOnboarding />} />
        <Route path="/company/dashboard" element={<CompanyDashboard />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
