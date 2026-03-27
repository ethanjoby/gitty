import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from './firebase'
import logo from './gitty.png'
import './App.css'

const STEPS = [
  { key: 'fullName', title: 'What should we call you?', sub: 'Your name as it appears on your profile.' },
  { key: 'intent', title: 'What brings you to Gitty?', sub: 'We\'ll tailor your experience.' },
  { key: 'skills', title: 'What do you work with?', sub: 'Pick at least one. You can always change these later.' },
  { key: 'optional', title: 'Almost there!', sub: 'Add your LinkedIn and resume so companies can find you.' },
] as const

const INTENT_OPTIONS = [
  { value: 'learn', label: 'Learn open source', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )},
  { value: 'hired', label: 'Get hired', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  )},
  { value: 'both', label: 'Both', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  )},
] as const

const SKILL_OPTIONS = [
  'React','TypeScript','JavaScript','Node.js','Python','Go','Rust','Java','C++','C#',
  'Ruby','PHP','Swift','Kotlin','Scala','Elixir','Haskell','R','Julia','Dart',
  'HTML/CSS','SQL','GraphQL','REST APIs','Docker','Kubernetes','AWS','GCP','Azure',
  'Terraform','Linux','Git','MongoDB','PostgreSQL','Redis','Firebase','Electron',
  'React Native','Flutter','TensorFlow','PyTorch',
]

function UserOnboarding() {
  const navigate = useNavigate()
  const [stepIndex, setStepIndex] = useState(0)
  const [fullName, setFullName] = useState(localStorage.getItem('gitty.settings.name') ?? '')
  const [intent, setIntent] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [linkedInUrl, setLinkedInUrl] = useState(localStorage.getItem('gitty.profile.linkedin') ?? '')
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
        setFullName((prev) => prev.trim() ? prev : user.displayName ?? '')
      }
    })
    return () => unsub()
  }, [navigate])

  const currentStep = STEPS[stepIndex]
  const isLastStep = stepIndex === STEPS.length - 1

  const completedCount = useMemo(() => {
    let count = 0
    if (fullName.trim()) count += 1
    if (intent) count += 1
    if (skills.length > 0) count += 1
    return count
  }, [fullName, intent, skills])

  const canContinue = useMemo(() => {
    if (currentStep.key === 'fullName') return fullName.trim().length > 0
    if (currentStep.key === 'intent') return intent.length > 0
    if (currentStep.key === 'skills') return skills.length > 0
    return currentStep.key === 'optional'
  }, [currentStep.key, fullName, intent, skills])

  const handleSave = () => {
    if (!fullName.trim() || !intent || skills.length === 0) return

    localStorage.setItem('gitty.settings.name', fullName.trim())
    localStorage.setItem('gitty.user.intent', intent)
    localStorage.setItem('gitty.user.skills', JSON.stringify(skills))

    if (linkedInUrl.trim()) {
      localStorage.setItem('gitty.profile.linkedin', linkedInUrl.trim())
    }
    if (resumeFileDataUrl) {
      localStorage.setItem(
        'gitty.profile.resume.file',
        JSON.stringify({ name: resumeFileName || 'resume', dataUrl: resumeFileDataUrl }),
      )
    }

    localStorage.setItem('gitty.user.profile', JSON.stringify({
      fullName: fullName.trim(),
      linkedInUrl: linkedInUrl.trim(),
      resumeFileName: resumeFileName || '',
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

  const toggleSkill = (skill: string) => {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    )
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

          {currentStep.key === 'fullName' && (
            <div className="ob-field-wrap">
              <label className="ob-label" htmlFor="ob-input">Full Name</label>
              <input
                id="ob-input"
                className="ob-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleNext() }}
                placeholder="Ada Lovelace"
                autoFocus
              />
            </div>
          )}

          {currentStep.key === 'intent' && (
            <div className="ob-intent-cards">
              {INTENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`ob-intent-card${intent === opt.value ? ' active' : ''}`}
                  onClick={() => setIntent(opt.value)}
                  type="button"
                >
                  <div className="ob-intent-icon" aria-hidden="true">{opt.icon}</div>
                  <span className="ob-intent-label">{opt.label}</span>
                </button>
              ))}
            </div>
          )}

          {currentStep.key === 'skills' && (
            <div className="ob-chip-grid">
              {SKILL_OPTIONS.map((skill) => (
                <button
                  key={skill}
                  className={`ob-chip${skills.includes(skill) ? ' active' : ''}`}
                  onClick={() => toggleSkill(skill)}
                  type="button"
                >
                  {skill}
                </button>
              ))}
            </div>
          )}

          {currentStep.key === 'optional' && (
            <div className="ob-optional-wrap">
              {intent === 'hired' && (
                <p className="ob-optional-note">Companies will ask for these when you apply.</p>
              )}

              <div className="ob-field-wrap">
                <label className="ob-label" htmlFor="ob-linkedin">LinkedIn URL</label>
                <input
                  id="ob-linkedin"
                  className="ob-input"
                  value={linkedInUrl}
                  onChange={(e) => setLinkedInUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  autoFocus
                />
              </div>

              <div className="ob-field-wrap">
                <label className="ob-label" htmlFor="ob-resume">Resume</label>
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
                    id="ob-resume"
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
              </div>
            </div>
          )}

          <p className="ob-progress-text">{completedCount} of 3 completed</p>

          <div className="ob-actions">
            <button className="btn btn-ghost" onClick={handleBack} disabled={stepIndex === 0}>
              Back
            </button>
            <button className="btn btn-cta" onClick={handleNext} disabled={!canContinue}>
              {isLastStep
                ? (linkedInUrl.trim() || resumeFileDataUrl ? 'Finish setup' : 'Skip for now')
                : 'Continue'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default UserOnboarding
