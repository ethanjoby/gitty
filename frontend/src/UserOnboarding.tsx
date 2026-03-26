import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from './firebase'
import logo from './gitty.png'
import './App.css'

const STEPS = [
  { key: 'fullName', label: 'Full Name', title: 'What should we call you?', sub: 'Your name as it appears on your profile.' },
  { key: 'linkedInUrl', label: 'LinkedIn URL', title: 'Where can companies find you?', sub: 'Paste your LinkedIn profile URL.' },
  { key: 'resume', label: 'Resume', title: 'Upload your resume', sub: 'PDF preferred. Stored locally — never shared without permission.' },
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
  const [dragActive, setDragActive] = useState(false)

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

  const handleFileDrop = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : ''
      if (!dataUrl) return
      setResumeFileName(file.name)
      setResumeFileDataUrl(dataUrl)
    }
    reader.readAsDataURL(file)
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
            <p className="ob-eyebrow">Engineer Setup</p>
            <h1 className="ob-title">{currentStep.title}</h1>
            <p className="ob-sub">{currentStep.sub}</p>
          </div>

          <div className="ob-field-wrap">
            <label className="ob-label" htmlFor="ob-input">{currentStep.label}</label>
            {currentStep.key !== 'resume' ? (
              <input
                id="ob-input"
                className="ob-input"
                value={form[currentStep.key as Exclude<StepKey, 'resume'>]}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, [currentStep.key]: event.target.value }))
                }
                onKeyDown={(e) => { if (e.key === 'Enter') handleNext() }}
                placeholder={currentStep.key === 'fullName' ? 'Ada Lovelace' : 'https://linkedin.com/in/...'}
                autoFocus
              />
            ) : (
              <label
                className={`ob-upload${dragActive ? ' ob-upload-drag' : ''}${resumeFileDataUrl ? ' ob-upload-done' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragActive(false)
                  const file = e.dataTransfer.files?.[0]
                  if (file) handleFileDrop(file)
                }}
              >
                <input
                  className="ob-upload-input"
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    handleFileDrop(file)
                  }}
                />
                <svg className="ob-upload-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {resumeFileName ? (
                  <span className="ob-upload-filename">{resumeFileName}</span>
                ) : (
                  <span className="ob-upload-hint">Drop your resume here or click to upload</span>
                )}
              </label>
            )}
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

export default UserOnboarding
