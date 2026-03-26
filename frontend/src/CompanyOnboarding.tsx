import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from './firebase'
import logo from './gitty.png'
import './App.css'

const STEPS = [
  { key: 'companyName', label: 'Company Name', title: "What's your company called?", sub: 'The name engineers will see on your profile.' },
  { key: 'companyWebsite', label: 'Company Website', title: 'Where can engineers learn more?', sub: 'Your public website or careers page.' },
  { key: 'companyType', label: 'Company Type', title: 'What kind of company is this?', sub: 'E.g. Startup, Scale-up, Enterprise, Agency.' },
  { key: 'teamSize', label: 'Team Size', title: 'How big is your team?', sub: 'Approximate headcount is fine.' },
  { key: 'hiringContact', label: 'Hiring Contact', title: "Who's leading hiring?", sub: 'Email or name of the primary hiring contact.' },
  { key: 'hiringGoal', label: 'Hiring Goal', title: 'What are you hiring for?', sub: 'Describe the roles or goals for this cycle.' },
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
    <div className="ob-shell">
      <div className="ob-bg" aria-hidden="true" />

      <header className="ob-topbar">
        <div className="dash-brand">
          <span className="logo-mark logo-mark-dark">
            <img src={logo} alt="Gitty logo" />
          </span>
          <span>Gitty</span>
        </div>
      </header>

      <main className="ob-main">
        <div className="ob-card">
          <div className="ob-dots" aria-label={`Step ${stepIndex + 1} of ${STEPS.length}`}>
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={
                  i === stepIndex
                    ? 'ob-dot ob-dot-active'
                    : i < stepIndex
                    ? 'ob-dot ob-dot-done'
                    : 'ob-dot ob-dot-upcoming'
                }
              />
            ))}
          </div>

          <div className="ob-head">
            <p className="ob-eyebrow">Company Setup</p>
            <h1 className="ob-title">{currentStep.title}</h1>
            <p className="ob-sub">{currentStep.sub}</p>
          </div>

          <div className="ob-field-wrap">
            <label className="ob-label" htmlFor="ob-input">{currentStep.label}</label>
            <input
              id="ob-input"
              className="ob-input"
              value={form[currentStep.key]}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, [currentStep.key]: event.target.value }))
              }
              onKeyDown={(e) => { if (e.key === 'Enter') handleNext() }}
              placeholder={`Enter ${currentStep.label.toLowerCase()}...`}
              autoFocus
            />
          </div>

          <p className="ob-progress-text">{completedCount} of {STEPS.length} completed</p>

          <div className="ob-actions">
            <button className="btn btn-ghost" onClick={handleBack} disabled={stepIndex === 0}>
              Back
            </button>
            <button className="btn btn-cta" onClick={handleNext} disabled={!canContinue}>
              {isLastStep ? 'Finish setup' : 'Continue'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default CompanyOnboarding
