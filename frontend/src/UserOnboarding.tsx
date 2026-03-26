import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from './firebase'
import logo from './gitty.png'
import './App.css'

const STEPS = [
  { key: 'fullName', label: 'Full Name' },
  { key: 'linkedInUrl', label: 'LinkedIn URL' },
  { key: 'resume', label: 'Resume Upload' },
] as const

type StepKey = (typeof STEPS)[number]['key']

function UserOnboarding() {
  const navigate = useNavigate()
  const [stepIndex, setStepIndex] = useState(0)
  const [form, setForm] = useState({
    fullName: localStorage.getItem('gitty.settings.name') ?? '',
    linkedInUrl: localStorage.getItem('gitty.profile.linkedin') ?? '',
  })
  const [resumeFileName, setResumeFileName] = useState('')
  const [resumeFileDataUrl, setResumeFileDataUrl] = useState('')

  useEffect(() => {
    const savedResumeFile = localStorage.getItem('gitty.profile.resume.file')
    if (savedResumeFile) {
      try {
        const parsed = JSON.parse(savedResumeFile) as { name?: string; dataUrl?: string }
        if (typeof parsed.name === 'string') setResumeFileName(parsed.name)
        if (typeof parsed.dataUrl === 'string') setResumeFileDataUrl(parsed.dataUrl)
      } catch {
        /* ignore invalid storage */
      }
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/signin')
        return
      }
      const onboardingComplete = localStorage.getItem('gitty.user.onboardingComplete') === 'true'
      if (onboardingComplete) {
        navigate('/dashboard')
        return
      }
      const isGithubUser = user.providerData.some((p) => p.providerId === 'github.com')
      if (!isGithubUser) {
        navigate('/signin')
        return
      }
      if (user.displayName?.trim()) {
        setForm((prev) =>
          prev.fullName.trim() ? prev : { ...prev, fullName: user.displayName ?? '' },
        )
      }
    })
    return () => unsub()
  }, [navigate])

  const currentStep = STEPS[stepIndex]
  const isLastStep = stepIndex === STEPS.length - 1

  const completedCount = useMemo(() => {
    let count = 0
    if (form.fullName.trim()) count += 1
    if (form.linkedInUrl.trim()) count += 1
    if (resumeFileDataUrl.trim()) count += 1
    return count
  }, [form.fullName, form.linkedInUrl, resumeFileDataUrl])

  const canContinue = useMemo(() => {
    if (currentStep.key === 'resume') return resumeFileDataUrl.trim().length > 0
    return form[currentStep.key as Exclude<StepKey, 'resume'>].trim().length > 0
  }, [currentStep.key, form, resumeFileDataUrl])

  const handleSave = () => {
    if (!form.fullName.trim() || !form.linkedInUrl.trim() || !resumeFileDataUrl.trim()) return

    localStorage.setItem('gitty.settings.name', form.fullName.trim())
    localStorage.setItem('gitty.profile.linkedin', form.linkedInUrl.trim())
    localStorage.setItem(
      'gitty.profile.resume.file',
      JSON.stringify({
        name: resumeFileName || 'resume',
        dataUrl: resumeFileDataUrl,
      }),
    )
    localStorage.setItem('gitty.user.profile', JSON.stringify({
      fullName: form.fullName.trim(),
      linkedInUrl: form.linkedInUrl.trim(),
      resumeFileName: resumeFileName || 'resume',
    }))
    localStorage.setItem('gitty.user.onboardingComplete', 'true')
    localStorage.setItem('gitty.auth.role', 'user')
    navigate('/dashboard')
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
          <p className="company-eyebrow">Engineer Setup</p>
          <div className="company-step-head">
            <h1>Let’s build your engineer profile</h1>
            <span>
              Part {stepIndex + 1} / {STEPS.length}
            </span>
          </div>
          <p className="dash-muted">Quick setup before entering your dashboard.</p>

          <div className="company-step-question">
            <label>{currentStep.label}</label>
            {currentStep.key !== 'resume' ? (
              <input
                value={form[currentStep.key as Exclude<StepKey, 'resume'>]}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, [currentStep.key]: event.target.value }))
                }
                placeholder={`Enter ${currentStep.label.toLowerCase()}...`}
              />
            ) : (
              <div className="company-step-upload">
                <label className="btn btn-outline sign-in-upload-btn">
                  Upload Resume
                  <input
                    className="profile-upload-input"
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = () => {
                        const dataUrl = typeof reader.result === 'string' ? reader.result : ''
                        if (!dataUrl) return
                        setResumeFileName(file.name)
                        setResumeFileDataUrl(dataUrl)
                      }
                      reader.readAsDataURL(file)
                    }}
                  />
                </label>
                <strong className="sign-in-upload-name">
                  {resumeFileName || 'No file selected'}
                </strong>
              </div>
            )}
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

export default UserOnboarding
