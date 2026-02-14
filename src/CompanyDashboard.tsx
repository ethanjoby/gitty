import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from './firebase'
import logo from './gitty.png'
import './App.css'

type CompanyTab = 'applications' | 'track' | 'bounties'

type CompanyProfile = {
  companyName: string
  companyWebsite: string
  teamSize: string
  hiringContact: string
  hiringGoal: string
  companyType: string
}

type ApplicationIssue = {
  id: string
  repo: string
  issueUrl: string
  issueTitle: string
}

type CompanyApplication = {
  id: string
  companyName: string
  companyWebsite: string
  companyType: string
  companyLogoUrl: string
  roleTitle: string
  roleDescription: string
  candidateFields: string[]
  customQuestions: string[]
  issues: ApplicationIssue[]
  timeLimitMinutes: number
  createdAt: string
  responses: number
  status: 'open' | 'closed'
}

type BountyPosting = {
  id: string
  companyName: string
  companyWebsite: string
  companyLogoUrl: string
  issueTitle: string
  repo: string
  issueUrl: string
  priority: 'critical' | 'high' | 'medium'
  payoutUsd: number
  createdAt: string
  winnerLogin: string | null
  winnerPrUrl: string | null
}

type BountySubmission = {
  id: string
  bountyId: string
  userLogin: string
  userName: string
  prUrl: string
  submittedAt: string
  status: 'submitted' | 'winner' | 'rejected'
}

type CompanyAccount = {
  name: string
  email: string
  photoURL: string
}

function normalizeApplication(raw: unknown): CompanyApplication | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Partial<CompanyApplication>
  if (!item.id || !item.roleTitle || !item.createdAt) return null
  return {
    id: item.id,
    companyName: item.companyName ?? 'Company',
    companyWebsite: item.companyWebsite ?? '',
    companyType: item.companyType ?? '',
    companyLogoUrl: item.companyLogoUrl ?? '',
    roleTitle: item.roleTitle,
    roleDescription: item.roleDescription ?? '',
    candidateFields: Array.isArray(item.candidateFields) ? item.candidateFields : [],
    customQuestions: Array.isArray(item.customQuestions) ? item.customQuestions : [],
    issues: Array.isArray(item.issues) ? item.issues : [],
    timeLimitMinutes:
      typeof item.timeLimitMinutes === 'number' ? item.timeLimitMinutes : 90,
    createdAt: item.createdAt,
    responses: typeof item.responses === 'number' ? item.responses : 0,
    status: item.status === 'closed' ? 'closed' : 'open',
  }
}

function CompanyDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<CompanyTab>('applications')
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [applications, setApplications] = useState<CompanyApplication[]>([])
  const [bounties, setBounties] = useState<BountyPosting[]>([])
  const [bountySubmissions, setBountySubmissions] = useState<BountySubmission[]>([])

  const [appDraft, setAppDraft] = useState({
    roleTitle: '',
    roleDescription: '',
    timeLimitMinutes: '90',
  })
  const [candidateFields, setCandidateFields] = useState<string[]>([
    'LinkedIn URL',
    'Resume URL',
  ])
  const [customQuestions, setCustomQuestions] = useState<string[]>([])
  const [issueDraft, setIssueDraft] = useState({
    repo: '',
    issueUrl: '',
    issueTitle: '',
  })
  const [issues, setIssues] = useState<ApplicationIssue[]>([])
  const [fieldInput, setFieldInput] = useState('')
  const [questionInput, setQuestionInput] = useState('')
  const [companyAccount, setCompanyAccount] = useState<CompanyAccount>({
    name: '',
    email: '',
    photoURL: '',
  })

  const [bountyDraft, setBountyDraft] = useState({
    issueTitle: '',
    repo: '',
    issueUrl: '',
    priority: 'high' as BountyPosting['priority'],
    payoutUsd: '500',
  })

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/company/signin')
        return
      }
      const isGoogleUser = user.providerData.some((p) => p.providerId === 'google.com')
      if (!isGoogleUser) {
        navigate('/company/signin')
        return
      }

      const provider = user.providerData.find((p) => p.providerId === 'google.com')
      const nextAccount: CompanyAccount = {
        name: user.displayName ?? provider?.displayName ?? '',
        email: user.email ?? provider?.email ?? '',
        photoURL: user.photoURL ?? provider?.photoURL ?? '',
      }
      setCompanyAccount(nextAccount)
      localStorage.setItem('gitty.company.account', JSON.stringify(nextAccount))
    })
    return () => unsub()
  }, [navigate])

  useEffect(() => {
    const accountRaw = localStorage.getItem('gitty.company.account')
    if (!accountRaw) return
    try {
      const parsed = JSON.parse(accountRaw) as Partial<CompanyAccount>
      setCompanyAccount({
        name: parsed.name ?? '',
        email: parsed.email ?? '',
        photoURL: parsed.photoURL ?? '',
      })
    } catch {
      /* ignore invalid account storage */
    }
  }, [])

  useEffect(() => {
    const profileRaw = localStorage.getItem('gitty.company.profile')
    const appsRaw = localStorage.getItem('gitty.company.applications')
    const bountiesRaw = localStorage.getItem('gitty.company.bounties')
    const submissionsRaw = localStorage.getItem('gitty.bounty.submissions')

    if (!profileRaw) {
      navigate('/company/onboarding')
      return
    }

    try {
      const parsedProfile = JSON.parse(profileRaw) as CompanyProfile
      setProfile(parsedProfile)
    } catch {
      localStorage.removeItem('gitty.company.profile')
      localStorage.removeItem('gitty.company.onboardingComplete')
      navigate('/company/onboarding')
      return
    }

    if (appsRaw) {
      try {
        const parsed = JSON.parse(appsRaw) as unknown[]
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .map((item) => normalizeApplication(item))
            .filter((item): item is CompanyApplication => item !== null)
          setApplications(normalized)
          localStorage.setItem('gitty.company.applications', JSON.stringify(normalized))
        }
      } catch {
        localStorage.removeItem('gitty.company.applications')
      }
    }
    if (bountiesRaw) {
      try {
        const parsed = JSON.parse(bountiesRaw) as BountyPosting[]
        if (Array.isArray(parsed)) setBounties(parsed)
      } catch {
        localStorage.removeItem('gitty.company.bounties')
      }
    }
    if (submissionsRaw) {
      try {
        const parsed = JSON.parse(submissionsRaw) as BountySubmission[]
        if (Array.isArray(parsed)) setBountySubmissions(parsed)
      } catch {
        localStorage.removeItem('gitty.bounty.submissions')
      }
    }
  }, [navigate])

  const totalResponses = useMemo(
    () => applications.reduce((sum, item) => sum + item.responses, 0),
    [applications],
  )

  const handleAddCandidateField = () => {
    const value = fieldInput.trim()
    if (!value) return
    if (candidateFields.includes(value)) return
    setCandidateFields((prev) => [...prev, value])
    setFieldInput('')
  }

  const handleAddCustomQuestion = () => {
    const value = questionInput.trim()
    if (!value) return
    setCustomQuestions((prev) => [...prev, value])
    setQuestionInput('')
  }

  const handleAddIssue = () => {
    if (!issueDraft.repo || !issueDraft.issueUrl || !issueDraft.issueTitle) return
    const next: ApplicationIssue = { id: crypto.randomUUID(), ...issueDraft }
    setIssues((prev) => [...prev, next])
    setIssueDraft({ repo: '', issueUrl: '', issueTitle: '' })
  }

  const handleCreateApplication = () => {
    if (!appDraft.roleTitle || issues.length === 0 || !profile) return
    const next: CompanyApplication = {
      id: crypto.randomUUID(),
      companyName: profile.companyName,
      companyWebsite: profile.companyWebsite,
      companyType: profile.companyType,
      companyLogoUrl: companyAccount.photoURL,
      roleTitle: appDraft.roleTitle,
      roleDescription: appDraft.roleDescription,
      candidateFields,
      customQuestions,
      issues,
      timeLimitMinutes: Number(appDraft.timeLimitMinutes) || 90,
      createdAt: new Date().toISOString(),
      responses: Math.floor(Math.random() * 5),
      status: 'open',
    }
    const updated = [next, ...applications]
    setApplications(updated)
    localStorage.setItem('gitty.company.applications', JSON.stringify(updated))

    setAppDraft({ roleTitle: '', roleDescription: '', timeLimitMinutes: '90' })
    setCustomQuestions([])
    setIssues([])
  }

  const handleCreateBounty = () => {
    if (!bountyDraft.issueTitle || !bountyDraft.repo || !bountyDraft.issueUrl || !profile)
      return
    const next: BountyPosting = {
      id: crypto.randomUUID(),
      companyName: profile.companyName,
      companyWebsite: profile.companyWebsite,
      companyLogoUrl: companyAccount.photoURL,
      issueTitle: bountyDraft.issueTitle,
      repo: bountyDraft.repo,
      issueUrl: bountyDraft.issueUrl,
      priority: bountyDraft.priority,
      payoutUsd: Number(bountyDraft.payoutUsd) || 0,
      createdAt: new Date().toISOString(),
      winnerLogin: null,
      winnerPrUrl: null,
    }
    const updated = [next, ...bounties]
    setBounties(updated)
    localStorage.setItem('gitty.company.bounties', JSON.stringify(updated))
  }

  const handlePickBountyWinner = (bountyId: string, submissionId: string) => {
    const winnerSubmission = bountySubmissions.find((s) => s.id === submissionId)
    if (!winnerSubmission) return

    const updatedBounties = bounties.map((b) =>
      b.id === bountyId
        ? {
            ...b,
            winnerLogin: winnerSubmission.userLogin,
            winnerPrUrl: winnerSubmission.prUrl,
          }
        : b,
    )
    setBounties(updatedBounties)
    localStorage.setItem('gitty.company.bounties', JSON.stringify(updatedBounties))

    const updatedSubmissions = bountySubmissions.map((s) => {
      if (s.bountyId !== bountyId) return s
      if (s.id === submissionId) return { ...s, status: 'winner' as const }
      return { ...s, status: 'rejected' as const }
    })
    setBountySubmissions(updatedSubmissions)
    localStorage.setItem('gitty.bounty.submissions', JSON.stringify(updatedSubmissions))
  }

  const handleDeleteApplication = (applicationId: string) => {
    const updated = applications.filter((app) => app.id !== applicationId)
    setApplications(updated)
    localStorage.setItem('gitty.company.applications', JSON.stringify(updated))
  }

  const handleLogout = async () => {
    await signOut(auth)
    localStorage.removeItem('gitty.auth.role')
    navigate('/')
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
        <button className="btn btn-outline dash-logout-btn" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <div className="dash-layout">
        <aside className="dash-sidebar">
          <button
            className={activeTab === 'applications' ? 'dash-nav-item active' : 'dash-nav-item'}
            onClick={() => setActiveTab('applications')}
          >
            <span className="dash-tab-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 6h14M5 12h14M5 18h10" />
              </svg>
            </span>
            <span>Applications</span>
          </button>
          <button
            className={activeTab === 'track' ? 'dash-nav-item active' : 'dash-nav-item'}
            onClick={() => setActiveTab('track')}
          >
            <span className="dash-tab-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M4 13h4l2-6 4 10 2-4h4" />
              </svg>
            </span>
            <span>Track Applications</span>
          </button>
          <button
            className={activeTab === 'bounties' ? 'dash-nav-item active' : 'dash-nav-item'}
            onClick={() => setActiveTab('bounties')}
          >
            <span className="dash-tab-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 3v18M3 12h18" />
                <circle cx="12" cy="12" r="8" />
              </svg>
            </span>
            <span>Bounties</span>
          </button>

          {profile && (
            <div className="company-sidebar-profile">
              {companyAccount.photoURL ? (
                <img src={companyAccount.photoURL} alt="Company profile" />
              ) : (
                <div className="company-sidebar-avatar-fallback" />
              )}
              <div>
                <strong>{profile.companyName}</strong>
                <span>{companyAccount.email || profile.hiringContact}</span>
              </div>
            </div>
          )}

        </aside>

        <main className="dash-main">
          {activeTab === 'applications' && (
            <>
              <section className="dash-panel company-builder">
                <div className="company-builder-head">
                  <div>
                    <p className="company-eyebrow">Application Builder</p>
                    <h2>Create Hiring Application</h2>
                  </div>
                </div>
                <div className="company-builder-grid">
                  <section className="company-builder-section">
                    <h3>Part 1: Application Form</h3>
                    <div className="company-form-grid">
                      <div className="practice-field">
                        <label>Role title</label>
                        <input
                          value={appDraft.roleTitle}
                          onChange={(event) =>
                            setAppDraft((prev) => ({
                              ...prev,
                              roleTitle: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="practice-field">
                        <label>Time limit (minutes) for all questions</label>
                        <input
                          value={appDraft.timeLimitMinutes}
                          onChange={(event) =>
                            setAppDraft((prev) => ({
                              ...prev,
                              timeLimitMinutes: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="practice-field company-span-2">
                        <label>Role description</label>
                        <input
                          value={appDraft.roleDescription}
                          onChange={(event) =>
                            setAppDraft((prev) => ({
                              ...prev,
                              roleDescription: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="company-inline-add">
                      <input
                        placeholder="Add required candidate field (LinkedIn, Resume URL, Portfolio...)"
                        value={fieldInput}
                        onChange={(event) => setFieldInput(event.target.value)}
                      />
                      <button className="btn btn-outline" onClick={handleAddCandidateField}>
                        Add field
                      </button>
                    </div>
                    <div className="company-chip-list">
                      {candidateFields.map((field) => (
                        <span key={field} className="company-chip">
                          {field}
                        </span>
                      ))}
                    </div>
                  </section>

                  <section className="company-builder-section">
                    <h3>Part 2: Questions Section</h3>
                    <div className="company-inline-add">
                      <input
                        placeholder="Add custom question..."
                        value={questionInput}
                        onChange={(event) => setQuestionInput(event.target.value)}
                      />
                      <button className="btn btn-outline" onClick={handleAddCustomQuestion}>
                        Add question
                      </button>
                    </div>
                    <div className="company-chip-list">
                      {customQuestions.map((question, index) => (
                        <span key={`${question}-${index}`} className="company-chip">
                          {question}
                        </span>
                      ))}
                    </div>
                    <div className="company-form-grid company-issues-form">
                      <div className="practice-field">
                        <label>Repository (owner/repo)</label>
                        <input
                          value={issueDraft.repo}
                          onChange={(event) =>
                            setIssueDraft((prev) => ({ ...prev, repo: event.target.value }))
                          }
                        />
                      </div>
                      <div className="practice-field">
                        <label>Issue URL</label>
                        <input
                          value={issueDraft.issueUrl}
                          onChange={(event) =>
                            setIssueDraft((prev) => ({ ...prev, issueUrl: event.target.value }))
                          }
                        />
                      </div>
                      <div className="practice-field company-span-2">
                        <label>Issue title</label>
                        <input
                          value={issueDraft.issueTitle}
                          onChange={(event) =>
                            setIssueDraft((prev) => ({ ...prev, issueTitle: event.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="practice-actions">
                      <button className="btn btn-outline" onClick={handleAddIssue}>
                        Add issue question
                      </button>
                    </div>
                    <div className="dashboard-list company-mini-list">
                      {issues.map((item) => (
                        <div key={item.id} className="dashboard-list-item dashboard-list-static">
                          <div>
                            <strong>{item.issueTitle}</strong>
                            <span>{item.repo}</span>
                          </div>
                          <a className="repo-stats" href={item.issueUrl} target="_blank" rel="noreferrer">
                            Issue
                          </a>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
                <div className="practice-actions">
                  <button className="btn btn-primary" onClick={handleCreateApplication}>
                    Publish application
                  </button>
                </div>
              </section>

              <section className="dash-panel">
                <h2>Live Applications</h2>
                <div className="dashboard-list">
                  {applications.map((app) => (
                    <div key={app.id} className="dashboard-list-item dashboard-list-static">
                      <div>
                        <strong>{app.roleTitle}</strong>
                        <span>
                          {(app.issues?.length ?? 0)} issue questions • {app.timeLimitMinutes} min total
                        </span>
                        <span>
                          {(app.candidateFields?.length ?? 0)} required fields • {(app.customQuestions?.length ?? 0)} custom questions
                        </span>
                      </div>
                      <div className="company-list-actions">
                        <span className="repo-stats">{app.status.toUpperCase()}</span>
                        <button
                          className="btn btn-outline"
                          onClick={() => handleDeleteApplication(app.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {applications.length === 0 && (
                    <div className="dashboard-list-item dashboard-list-static">
                      <div>
                        <strong>No applications yet</strong>
                        <span>Create your first multi-part application above.</span>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {activeTab === 'track' && profile && (
            <>
              <section className="dash-panel">
                <h2>Track Applications</h2>
                <div className="dash-stats-grid">
                  <article>
                    <span>Total roles</span>
                    <strong>{applications.length}</strong>
                  </article>
                  <article>
                    <span>Total responses</span>
                    <strong>{totalResponses}</strong>
                  </article>
                  <article>
                    <span>Open bounties</span>
                    <strong>{bounties.length}</strong>
                  </article>
                  <article>
                    <span>Company</span>
                    <strong>{profile.companyName}</strong>
                  </article>
                </div>
              </section>

              <section className="dash-panel">
                <h2>Response Pipeline</h2>
                <div className="dashboard-list">
                  {applications.map((app) => (
                    <div key={app.id} className="dashboard-list-item dashboard-list-static">
                      <div>
                        <strong>{app.roleTitle}</strong>
                        <span>{app.responses} candidate responses</span>
                        <span>{(app.issues?.length ?? 0)} issue questions assigned</span>
                      </div>
                      <div className="company-list-actions">
                        <span className="repo-stats">Tracking</span>
                        <button
                          className="btn btn-outline"
                          onClick={() => handleDeleteApplication(app.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {activeTab === 'bounties' && (
            <>
              <section className="dash-panel">
                <h2>Bounties</h2>
                <p className="dash-muted">
                  Set public bounties on high-priority issues. Engineers solve, company ships faster.
                </p>
                <div className="company-form-grid">
                  <div className="practice-field">
                    <label>Issue title</label>
                    <input
                      value={bountyDraft.issueTitle}
                      onChange={(event) =>
                        setBountyDraft((prev) => ({ ...prev, issueTitle: event.target.value }))
                      }
                    />
                  </div>
                  <div className="practice-field">
                    <label>Repository (owner/repo)</label>
                    <input
                      value={bountyDraft.repo}
                      onChange={(event) =>
                        setBountyDraft((prev) => ({ ...prev, repo: event.target.value }))
                      }
                    />
                  </div>
                  <div className="practice-field">
                    <label>Issue URL</label>
                    <input
                      value={bountyDraft.issueUrl}
                      onChange={(event) =>
                        setBountyDraft((prev) => ({ ...prev, issueUrl: event.target.value }))
                      }
                    />
                  </div>
                  <div className="practice-field">
                    <label>Priority</label>
                    <select
                      value={bountyDraft.priority}
                      onChange={(event) =>
                        setBountyDraft((prev) => ({
                          ...prev,
                          priority: event.target.value as BountyPosting['priority'],
                        }))
                      }
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                    </select>
                  </div>
                  <div className="practice-field">
                    <label>Payout (USD)</label>
                    <input
                      value={bountyDraft.payoutUsd}
                      onChange={(event) =>
                        setBountyDraft((prev) => ({ ...prev, payoutUsd: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="practice-actions">
                  <button className="btn btn-primary" onClick={handleCreateBounty}>
                    Create bounty
                  </button>
                </div>
              </section>

              <section className="dash-panel">
                <h2>Public Bounties</h2>
                <div className="dashboard-list">
                  {bounties.map((bounty) => (
                    <div key={bounty.id} className="dashboard-list-item dashboard-list-static">
                      <div>
                        <strong>{bounty.issueTitle}</strong>
                        <span>
                          {bounty.repo} • {bounty.priority.toUpperCase()} • ${bounty.payoutUsd}
                        </span>
                        {bounty.winnerLogin && (
                          <span>
                            Winner: @{bounty.winnerLogin}
                          </span>
                        )}
                        {!bounty.winnerLogin && (
                          <span>
                            Submissions:{' '}
                            {bountySubmissions.filter((s) => s.bountyId === bounty.id).length}
                          </span>
                        )}
                        {!bounty.winnerLogin &&
                          bountySubmissions
                            .filter((s) => s.bountyId === bounty.id)
                            .map((submission) => (
                              <div key={submission.id} className="company-bounty-pick">
                                <span>
                                  @{submission.userLogin} • {new Date(submission.submittedAt).toLocaleDateString()}
                                </span>
                                <button
                                  className="btn btn-outline"
                                  onClick={() => handlePickBountyWinner(bounty.id, submission.id)}
                                >
                                  Pick winner
                                </button>
                              </div>
                            ))}
                      </div>
                      <a
                        href={bounty.issueUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="repo-stats"
                      >
                        View issue
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default CompanyDashboard
