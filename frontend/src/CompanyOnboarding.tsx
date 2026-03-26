import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from './firebase'
import logo from './gitty.png'
import './App.css'

const STEPS = [
  { key: 'companyName', label: 'Company Name' },
  { key: 'companyWebsite', label: 'Company Website' },
  { key: 'companyType', label: 'Company Type' },
  { key: 'teamSize', label: 'Team Size' },
  { key: 'hiringContact', label: 'Hiring Contact' },
  { key: 'hiringGoal', label: 'Hiring Goal' },
] as const

function CompanyOnboarding() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    companyName: '',
    companyWebsite: '',
    companyType: '',
    teamSize: '',
    hiringContact: '',
    hiringGoal: '',
  })
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/company/signin')
        return
      }
      const isGoogleUser = user.providerData.some((p) => p.providerId === 'google.com')
      if (!isGoogleUser) {
        navigate('/company/signin')
      }
    })
    return () => unsub()
  }, [navigate])

  const completedCount = useMemo(
    () =>
      STEPS.reduce((count, step) => (form[step.key].trim() ? count + 1 : count), 0),
    [form],
  )

  const currentStep = STEPS[stepIndex]
  const isLastStep = stepIndex === STEPS.length - 1
  const canContinue = form[currentStep.key].trim().length > 0

  const handleSave = () => {
    const requiredMissing = STEPS.some((step) => !form[step.key].trim())
    if (requiredMissing) return
    localStorage.setItem('gitty.company.profile', JSON.stringify(form))
    localStorage.setItem('gitty.company.onboardingComplete', 'true')
    localStorage.setItem('gitty.auth.role', 'company')
    navigate('/company/dashboard')
  }

  const handleNext = () => {
    if (!canContinue) return
    if (isLastStep) {
      handleSave()
      return
    }
    setStepIndex((prev) => prev + 1)
  }

  const handleBack = () => {
    if (stepIndex === 0) return
    setStepIndex((prev) => prev - 1)
  }

  return (
    <div className="dash-shell company-shell">
      <div className="dash-bg" aria-hidden="true">
        <div className="dash-bg-grid dash-bg-grid-1" />
        <div className="dash-bg-grid dash-bg-grid-2" />
        <div className="dash-bg-vignette" />
      </div>

      <header className="dash-topbar">
        <div className="dash-brand">
          <span className="logo-mark logo-mark-dark">
            <img src={logo} alt="Gitty logo" />
          </span>
          <span>Gitty</span>
        </div>
      </header>

      <main className="company-onboarding-main company-onboarding-single">
        <section className="company-onboarding-left company-step-card">
          <p className="company-eyebrow">Company Setup</p>
          <div className="company-step-head">
            <h1>Let’s build your company profile</h1>
            <span>
              Part {stepIndex + 1} / {STEPS.length}
            </span>
          </div>
          <p className="dash-muted">
            Answer a few quick questions before accessing your dashboard.
          </p>

          <div className="company-step-question">
            <label>{currentStep.label}</label>
            <input
              value={form[currentStep.key]}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, [currentStep.key]: event.target.value }))
              }
              placeholder={`Enter ${currentStep.label.toLowerCase()}...`}
            />
            <p className="dash-muted">
              {completedCount} of {STEPS.length} completed
            </p>
          </div>

          <div className="practice-actions company-step-actions">
            <button className="btn btn-outline" onClick={handleBack} disabled={stepIndex === 0}>
              Back
            </button>
            <button className="btn btn-primary" onClick={handleNext} disabled={!canContinue}>
              {isLastStep ? 'Finish setup' : 'Next'}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

export default CompanyOnboarding
