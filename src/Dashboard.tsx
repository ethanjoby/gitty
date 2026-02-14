import { useEffect, useMemo, useState } from 'react'
import { signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { Link } from 'react-router-dom'
import { auth } from './firebase'
import logo from './gitty.png'
import './App.css'

type GitHubProfile = {
  login: string
  name: string | null
  avatar_url: string
  html_url: string
  followers: number
  following: number
  public_repos: number
  public_gists: number
  created_at: string
}

type GitHubRepo = {
  id: number
  full_name: string
  html_url: string
  language: string | null
  stargazers_count: number
  forks_count: number
  updated_at: string
}

type GitHubEvent = {
  id: string
  type: string
  created_at: string
  repo: { name: string }
  payload?: {
    action?: string
    commits?: Array<{ sha: string }>
  }
}

type DashboardData = {
  profile: GitHubProfile
  repos: GitHubRepo[]
  events: GitHubEvent[]
  pullRequests: GitHubPullRequest[]
  commitTotalLastYear: number | null
  totalContributionsLastYear: number | null
}

type Tab = 'profile' | 'practice' | 'interview' | 'hired' | 'bounties' | 'settings'
type WorkType = 'any' | 'bug' | 'feature' | 'docs' | 'testing' | 'refactor'

type GitHubIssue = {
  id: number
  number: number
  title: string
  html_url: string
  comments: number
  created_at: string
  repository_url: string
  labels: Array<{ name: string }>
  user: { login: string }
}

type GitHubPullRequest = {
  id: number
  number: number
  title: string
  html_url: string
  repository_url: string
  created_at: string
}

type InterviewRole = 'frontend' | 'backend' | 'fullstack' | 'devops' | 'mobile'
type CompanyApplicationListing = {
  id: string
  companyName: string
  companyWebsite: string
  companyType: string
  companyLogoUrl: string
  roleTitle: string
  roleDescription: string
  candidateFields: string[]
  customQuestions: string[]
  issues: Array<{ id: string; repo: string; issueUrl: string; issueTitle: string }>
  timeLimitMinutes: number
  createdAt: string
  responses: number
  status: 'open' | 'closed'
}

type CompanyBountyListing = {
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

type PracticeIssueTab = 'suggested' | 'bookmarked'

const PRACTICE_PAGE_SIZE = 40

const SKILLS = [
  'React',
  'Next.js',
  'TypeScript',
  'JavaScript',
  'Node.js',
  'Express',
  'NestJS',
  'Python',
  'Django',
  'FastAPI',
  'Flask',
  'Go',
  'Rust',
  'Java',
  'Spring',
  'Kotlin',
  'Swift',
  'C#',
  '.NET',
  'PostgreSQL',
  'MySQL',
  'MongoDB',
  'Redis',
  'GraphQL',
  'REST API',
  'Docker',
  'Kubernetes',
  'AWS',
  'GCP',
  'Terraform',
  'Tailwind',
  'Vue',
  'Angular',
  'Svelte',
  'React Native',
  'Flutter',
  'Testing',
  'Cypress',
  'Playwright',
  'Jest',
]

const ROLE_SKILLS: Record<InterviewRole, string[]> = {
  frontend: ['React', 'TypeScript', 'CSS', 'UI', 'frontend'],
  backend: ['Node.js', 'API', 'database', 'backend', 'auth'],
  fullstack: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'fullstack'],
  devops: ['Docker', 'Kubernetes', 'CI', 'Terraform', 'AWS'],
  mobile: ['React Native', 'Flutter', 'Swift', 'Kotlin', 'mobile'],
}

function pickRandomIssues(items: GitHubIssue[], count: number): GitHubIssue[] {
  const pool = [...items]
  const picked: GitHubIssue[] = []
  while (pool.length > 0 && picked.length < count) {
    const index = Math.floor(Math.random() * pool.length)
    picked.push(pool[index])
    pool.splice(index, 1)
  }
  return picked
}

function parsePullRequestUrl(url: string) {
  const trimmed = url.trim()
  const match = trimmed.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\/.*)?$/i,
  )
  if (!match) return null
  return { owner: match[1], repo: match[2], pullNumber: Number(match[3]) }
}

function Dashboard() {
  const [user, setUser] = useState<User | null>(auth.currentUser)
  const [activeTab, setActiveTab] = useState<Tab>('practice')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)

  const [practiceKeyword, setPracticeKeyword] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['React'])
  const [workType, setWorkType] = useState<WorkType>('any')
  const [issues, setIssues] = useState<GitHubIssue[]>([])
  const [issueLoading, setIssueLoading] = useState(false)
  const [issueError, setIssueError] = useState<string | null>(null)
  const [bookmarkedIssueIds, setBookmarkedIssueIds] = useState<number[]>([])
  const [bookmarkedIssues, setBookmarkedIssues] = useState<GitHubIssue[]>([])
  const [linkedInUrl, setLinkedInUrl] = useState('')
  const [resumeFileName, setResumeFileName] = useState('')
  const [resumeFileDataUrl, setResumeFileDataUrl] = useState('')
  const [settingsName, setSettingsName] = useState('')
  const [practiceIssueTab, setPracticeIssueTab] = useState<PracticeIssueTab>('suggested')
  const [suggestedPage, setSuggestedPage] = useState(1)
  const [bookmarkedPage, setBookmarkedPage] = useState(1)
  const [hiringApplications, setHiringApplications] = useState<CompanyApplicationListing[]>([])
  const [companyBounties, setCompanyBounties] = useState<CompanyBountyListing[]>([])
  const [bountySubmissions, setBountySubmissions] = useState<BountySubmission[]>([])
  const [bountyPrDrafts, setBountyPrDrafts] = useState<Record<string, string>>({})
  const [expandedBountyIds, setExpandedBountyIds] = useState<string[]>([])

  const [interviewRole, setInterviewRole] = useState<InterviewRole>('fullstack')
  const [interviewIssues, setInterviewIssues] = useState<GitHubIssue[]>([])
  const [interviewLoading, setInterviewLoading] = useState(false)
  const [interviewError, setInterviewError] = useState<string | null>(null)
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(30 * 60)
  const [prLinks, setPrLinks] = useState<Record<number, string>>({})
  const [verifiedIssueIds, setVerifiedIssueIds] = useState<number[]>([])
  const [verifyingIssueId, setVerifyingIssueId] = useState<number | null>(null)
  const sidebarAvatar = data?.profile.avatar_url ?? user?.photoURL ?? ''

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((nextUser) => setUser(nextUser))
    return () => unsub()
  }, [])

  useEffect(() => {
    const savedBookmarked =
      localStorage.getItem('gitty.practice.bookmarked') ??
      localStorage.getItem('gitty.practice.solved')
    const savedBookmarkedIssues = localStorage.getItem('gitty.practice.bookmarked.issues')
    const savedLinkedInUrl = localStorage.getItem('gitty.profile.linkedin') ?? ''
    const savedResumeFile = localStorage.getItem('gitty.profile.resume.file')
    const savedSettingsName = localStorage.getItem('gitty.settings.name') ?? ''
    setLinkedInUrl(savedLinkedInUrl)
    setSettingsName(savedSettingsName)
    if (savedResumeFile) {
      try {
        const parsed = JSON.parse(savedResumeFile) as {
          name?: string
          dataUrl?: string
        }
        if (typeof parsed.name === 'string') setResumeFileName(parsed.name)
        if (typeof parsed.dataUrl === 'string') setResumeFileDataUrl(parsed.dataUrl)
      } catch {
        /* ignore invalid local storage */
      }
    }
    if (savedBookmarked) {
      try {
        const parsed = JSON.parse(savedBookmarked) as number[]
        if (Array.isArray(parsed)) setBookmarkedIssueIds(parsed)
      } catch {
        /* ignore invalid local storage */
      }
    }
    if (savedBookmarkedIssues) {
      try {
        const parsed = JSON.parse(savedBookmarkedIssues) as GitHubIssue[]
        if (Array.isArray(parsed)) setBookmarkedIssues(parsed)
      } catch {
        /* ignore invalid local storage */
      }
    }
  }, [])

  useEffect(() => {
    if (!data) return
    if (!settingsName.trim()) setSettingsName(data.profile.name ?? data.profile.login)
  }, [data, settingsName])

  useEffect(() => {
    const raw = localStorage.getItem('gitty.company.applications')
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as CompanyApplicationListing[]
      if (Array.isArray(parsed)) {
        const profileRaw = localStorage.getItem('gitty.company.profile')
        const accountRaw = localStorage.getItem('gitty.company.account')
        let fallbackName = 'Company'
        let fallbackWebsite = ''
        let fallbackType = ''
        let fallbackLogo = ''

        if (profileRaw) {
          try {
            const p = JSON.parse(profileRaw) as {
              companyName?: string
              companyWebsite?: string
              companyType?: string
            }
            fallbackName = p.companyName ?? fallbackName
            fallbackWebsite = p.companyWebsite ?? fallbackWebsite
            fallbackType = p.companyType ?? fallbackType
          } catch {
            /* ignore */
          }
        }
        if (accountRaw) {
          try {
            const a = JSON.parse(accountRaw) as { photoURL?: string }
            fallbackLogo = a.photoURL ?? ''
          } catch {
            /* ignore */
          }
        }

        const normalized = parsed.map((app) => ({
          ...app,
          companyName: app.companyName ?? fallbackName,
          companyWebsite: app.companyWebsite ?? fallbackWebsite,
          companyType: app.companyType ?? fallbackType,
          companyLogoUrl: app.companyLogoUrl ?? fallbackLogo,
        }))
        setHiringApplications(normalized)
      }
    } catch {
      /* ignore invalid local storage */
    }
  }, [])

  useEffect(() => {
    const bountiesRaw = localStorage.getItem('gitty.company.bounties')
    const submissionsRaw = localStorage.getItem('gitty.bounty.submissions')
    if (bountiesRaw) {
      try {
        const parsed = JSON.parse(bountiesRaw) as CompanyBountyListing[]
        if (Array.isArray(parsed)) setCompanyBounties(parsed)
      } catch {
        /* ignore */
      }
    }
    if (submissionsRaw) {
      try {
        const parsed = JSON.parse(submissionsRaw) as BountySubmission[]
        if (Array.isArray(parsed)) setBountySubmissions(parsed)
      } catch {
        /* ignore */
      }
    }
  }, [activeTab])

  useEffect(() => {
    if (!sessionStartedAt) return

    const interval = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartedAt) / 1000)
      const remaining = Math.max(0, 30 * 60 - elapsed)
      setSecondsLeft(remaining)
      if (remaining === 0) {
        window.clearInterval(interval)
      }
    }, 1000)

    return () => window.clearInterval(interval)
  }, [sessionStartedAt])

  useEffect(() => {
    if (!user) return

    const token = localStorage.getItem('gitty.github.token')
    const savedUsername = localStorage.getItem('gitty.github.username')
    let cancelled = false

    const githubFetch = async <T,>(url: string): Promise<T> => {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/vnd.github+json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!response.ok) {
        throw new Error(`GitHub API request failed (${response.status})`)
      }
      return response.json() as Promise<T>
    }

    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const profile = token
          ? await githubFetch<GitHubProfile>('https://api.github.com/user')
          : savedUsername
            ? await githubFetch<GitHubProfile>(
                `https://api.github.com/users/${savedUsername}`,
              )
            : null

        if (!profile) {
          throw new Error(
            'GitHub username not found. Sign out and sign in again from /signin.',
          )
        }

        const [repos, events1, events2, pullRequestSearch] = await Promise.all([
          githubFetch<GitHubRepo[]>(
            `https://api.github.com/users/${profile.login}/repos?per_page=100&sort=updated`,
          ),
          githubFetch<GitHubEvent[]>(
            `https://api.github.com/users/${profile.login}/events/public?per_page=100&page=1`,
          ),
          githubFetch<GitHubEvent[]>(
            `https://api.github.com/users/${profile.login}/events/public?per_page=100&page=2`,
          ),
          githubFetch<{ items?: GitHubPullRequest[] }>(
            `https://api.github.com/search/issues?q=${encodeURIComponent(
              `is:pr author:${profile.login}`,
            )}&sort=updated&order=desc&per_page=100`,
          ),
        ])

        let commitTotalLastYear: number | null = null
        let totalContributionsLastYear: number | null = null
        if (token) {
          const to = new Date()
          const from = new Date()
          from.setFullYear(from.getFullYear() - 1)

          const gqlResponse = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              query: `
                query($from: DateTime!, $to: DateTime!) {
                  viewer {
                    contributionsCollection(from: $from, to: $to) {
                      totalCommitContributions
                      totalContributions
                    }
                  }
                }
              `,
              variables: {
                from: from.toISOString(),
                to: to.toISOString(),
              },
            }),
          })

          if (gqlResponse.ok) {
            const gqlData = (await gqlResponse.json()) as {
              data?: {
                viewer?: {
                  contributionsCollection?: {
                    totalCommitContributions?: number
                    totalContributions?: number
                  }
                }
              }
            }

            commitTotalLastYear =
              gqlData.data?.viewer?.contributionsCollection
                ?.totalCommitContributions ?? null
            totalContributionsLastYear =
              gqlData.data?.viewer?.contributionsCollection?.totalContributions ?? null
          }
        }

        if (!cancelled) {
          setData({
            profile,
            repos,
            events: [...events1, ...events2],
            pullRequests: pullRequestSearch.items ?? [],
            commitTotalLastYear,
            totalContributionsLastYear,
          })
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load GitHub activity.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [user])

  const formattedTime = useMemo(() => {
    const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
    const secs = String(secondsLeft % 60).padStart(2, '0')
    return `${mins}:${secs}`
  }, [secondsLeft])

  const sessionActive = sessionStartedAt !== null && secondsLeft > 0
  const suggestedTotalPages = Math.max(1, Math.ceil(issues.length / PRACTICE_PAGE_SIZE))
  const paginatedSuggestedIssues = useMemo(
    () =>
      issues.slice(
        (suggestedPage - 1) * PRACTICE_PAGE_SIZE,
        suggestedPage * PRACTICE_PAGE_SIZE,
      ),
    [issues, suggestedPage],
  )
  const bookmarkedTotalPages = Math.max(
    1,
    Math.ceil(bookmarkedIssues.length / PRACTICE_PAGE_SIZE),
  )
  const paginatedBookmarkedIssues = useMemo(
    () =>
      bookmarkedIssues.slice(
        (bookmarkedPage - 1) * PRACTICE_PAGE_SIZE,
        bookmarkedPage * PRACTICE_PAGE_SIZE,
      ),
    [bookmarkedIssues, bookmarkedPage],
  )
  const userBountySubmissions = useMemo(() => {
    if (!data) return []
    return bountySubmissions.filter((submission) => submission.userLogin === data.profile.login)
  }, [bountySubmissions, data])
  const bountiesSolvedCount = useMemo(
    () => new Set(userBountySubmissions.map((submission) => submission.bountyId)).size,
    [userBountySubmissions],
  )
  const wonBounties = useMemo(() => {
    if (!data) return []
    return companyBounties.filter((bounty) => bounty.winnerLogin === data.profile.login)
  }, [companyBounties, data])
  const bountyPrizesWonCount = wonBounties.length
  const bountyNetWorthUsd = wonBounties.reduce((sum, bounty) => sum + bounty.payoutUsd, 0)
  const pointsPerSolvedIssue = 10
  const solvedIssueCount = bookmarkedIssueIds.length
  const practicePoints = solvedIssueCount * pointsPerSolvedIssue

  const handleSignOut = async () => {
    localStorage.removeItem('gitty.github.token')
    localStorage.removeItem('gitty.github.username')
    localStorage.removeItem('gitty.auth.role')
    await signOut(auth)
  }

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((item) => item !== skill) : [...prev, skill],
    )
  }

  const runIssueSearch = async () => {
    setIssueLoading(true)
    setIssueError(null)
    const token = localStorage.getItem('gitty.github.token')
    const maxResults = 400
    const perPage = 100
    const totalPages = Math.ceil(maxResults / perPage)

    const workTypeQualifier: Record<WorkType, string> = {
      any: '',
      bug: 'label:bug',
      feature: 'label:enhancement',
      docs: 'label:documentation',
      testing: 'label:test',
      refactor: 'label:refactor',
    }

    const skillQuery =
      selectedSkills.length > 0
        ? `(${selectedSkills.map((skill) => `"${skill}"`).join(' OR ')})`
        : ''

    const queryParts = [
      'is:issue',
      'is:open',
      'archived:false',
      '-label:"good first issue"',
      '-label:invalid',
      workTypeQualifier[workType],
      companyFilter.trim() ? `org:${companyFilter.trim()}` : '',
      practiceKeyword.trim() ? `"${practiceKeyword.trim()}"` : '',
      skillQuery,
    ].filter(Boolean)

    const encodedQuery = encodeURIComponent(queryParts.join(' '))

    try {
      const headers = {
        Accept: 'application/vnd.github+json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }

      const pageResponses = await Promise.all(
        Array.from({ length: totalPages }, (_, index) => {
          const page = index + 1
          const pageUrl = `https://api.github.com/search/issues?q=${encodedQuery}&sort=updated&order=desc&per_page=${perPage}&page=${page}`
          return fetch(pageUrl, { headers })
        }),
      )

      const failed = pageResponses.find((response) => !response.ok)
      if (failed) throw new Error(`Issue search failed (${failed.status})`)

      const pagePayloads = (await Promise.all(
        pageResponses.map((response) => response.json()),
      )) as Array<{ items?: GitHubIssue[] }>

      const deduped = new Map<number, GitHubIssue>()
      for (const payload of pagePayloads) {
        for (const issue of payload.items ?? []) {
          if (issue.repository_url.includes('/pulls/')) continue
          deduped.set(issue.id, issue)
          if (deduped.size >= maxResults) break
        }
        if (deduped.size >= maxResults) break
      }

      setIssues(Array.from(deduped.values()))
      setSuggestedPage(1)
    } catch (searchError) {
      setIssueError(
        searchError instanceof Error
          ? searchError.message
          : 'Failed to search GitHub issues.',
      )
    } finally {
      setIssueLoading(false)
    }
  }

  useEffect(() => {
    if (suggestedPage > suggestedTotalPages) setSuggestedPage(suggestedTotalPages)
  }, [suggestedPage, suggestedTotalPages])

  useEffect(() => {
    if (bookmarkedPage > bookmarkedTotalPages) setBookmarkedPage(bookmarkedTotalPages)
  }, [bookmarkedPage, bookmarkedTotalPages])

  const toggleIssueBookmark = (issue: GitHubIssue) => {
    const isAlreadyBookmarked = bookmarkedIssueIds.includes(issue.id)
    const nextBookmarked = isAlreadyBookmarked
      ? bookmarkedIssueIds.filter((id) => id !== issue.id)
      : [...bookmarkedIssueIds, issue.id]
    const nextBookmarkedIssues = isAlreadyBookmarked
      ? bookmarkedIssues.filter((item) => item.id !== issue.id)
      : [issue, ...bookmarkedIssues.filter((item) => item.id !== issue.id)]
    setBookmarkedIssueIds(nextBookmarked)
    setBookmarkedIssues(nextBookmarkedIssues)
    localStorage.setItem('gitty.practice.bookmarked', JSON.stringify(nextBookmarked))
    localStorage.setItem('gitty.practice.solved', JSON.stringify(nextBookmarked))
    localStorage.setItem(
      'gitty.practice.bookmarked.issues',
      JSON.stringify(nextBookmarkedIssues),
    )
  }

  const handleSubmitBountySolution = (bountyId: string) => {
    if (!data) return
    const prUrl = (bountyPrDrafts[bountyId] ?? '').trim()
    if (!prUrl) return
    const currentUserLogin = data.profile.login

    const existingIndex = bountySubmissions.findIndex(
      (s) => s.bountyId === bountyId && s.userLogin === currentUserLogin,
    )

    let updated = [...bountySubmissions]
    if (existingIndex >= 0) {
      updated[existingIndex] = {
        ...updated[existingIndex],
        prUrl,
        submittedAt: new Date().toISOString(),
        status: 'submitted',
      }
    } else {
      updated = [
        ...updated,
        {
          id: crypto.randomUUID(),
          bountyId,
          userLogin: currentUserLogin,
          userName: data.profile.name ?? currentUserLogin,
          prUrl,
          submittedAt: new Date().toISOString(),
          status: 'submitted',
        },
      ]
    }

    setBountySubmissions(updated)
    localStorage.setItem('gitty.bounty.submissions', JSON.stringify(updated))
    setBountyPrDrafts((prev) => ({ ...prev, [bountyId]: '' }))
  }

  const startInterviewSession = async () => {
    setInterviewLoading(true)
    setInterviewError(null)
    const token = localStorage.getItem('gitty.github.token')
    const roleSkills = ROLE_SKILLS[interviewRole]
    const skillQuery = `(${roleSkills.map((skill) => `"${skill}"`).join(' OR ')})`
    const query = encodeURIComponent(
      [
        'is:issue',
        'is:open',
        'archived:false',
        '-label:"good first issue"',
        '-label:invalid',
        skillQuery,
      ].join(' '),
    )

    try {
      const response = await fetch(
        `https://api.github.com/search/issues?q=${query}&sort=comments&order=desc&per_page=60`,
        {
          headers: {
            Accept: 'application/vnd.github+json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      )
      if (!response.ok) {
        throw new Error(`Interview issue search failed (${response.status})`)
      }

      const payload = (await response.json()) as { items?: GitHubIssue[] }
      const candidates = (payload.items ?? []).filter(
        (issue) => !issue.repository_url.includes('/pulls/'),
      )
      const picked = pickRandomIssues(candidates, 3)
      if (picked.length < 3) {
        throw new Error('Not enough matching issues found for this role.')
      }

      setInterviewIssues(picked)
      setSessionStartedAt(Date.now())
      setSecondsLeft(30 * 60)
      setVerifiedIssueIds([])
      setPrLinks({})
    } catch (sessionError) {
      setInterviewError(
        sessionError instanceof Error
          ? sessionError.message
          : 'Unable to start interview session.',
      )
    } finally {
      setInterviewLoading(false)
    }
  }

  const verifyInterviewPR = async (issue: GitHubIssue) => {
    if (!data) return
    const token = localStorage.getItem('gitty.github.token')
    const rawLink = prLinks[issue.id] ?? ''
    const parsed = parsePullRequestUrl(rawLink)
    if (!parsed) {
      setInterviewError(
        `Invalid PR URL for issue #${issue.number}. Use https://github.com/owner/repo/pull/123`,
      )
      return
    }

    setVerifyingIssueId(issue.id)
    setInterviewError(null)
    try {
      const response = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/pulls/${parsed.pullNumber}`,
        {
          headers: {
            Accept: 'application/vnd.github+json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      )
      if (!response.ok) {
        throw new Error(`PR verification failed (${response.status})`)
      }

      const pr = (await response.json()) as {
        user?: { login?: string }
        title?: string
        body?: string | null
      }
      const actor = pr.user?.login?.toLowerCase() ?? ''
      const expected = data.profile.login.toLowerCase()
      if (actor !== expected) {
        throw new Error('PR author does not match signed-in GitHub user.')
      }

      const text = `${pr.title ?? ''}\n${pr.body ?? ''}`.toLowerCase()
      const referencesIssue =
        text.includes(`#${issue.number}`) || text.includes(`issue ${issue.number}`)
      if (!referencesIssue) {
        throw new Error(`PR does not reference issue #${issue.number} in title/body.`)
      }

      if (!verifiedIssueIds.includes(issue.id)) {
        const next = [...verifiedIssueIds, issue.id]
        setVerifiedIssueIds(next)
      }
    } catch (verifyError) {
      setInterviewError(
        verifyError instanceof Error ? verifyError.message : 'Unable to verify PR.',
      )
    } finally {
      setVerifyingIssueId(null)
    }
  }

  if (!user) {
    return (
      <div className="dashboard">
        <div className="dashboard-card">
          <div className="dashboard-status dashboard-status-off">Not signed in</div>
          <h1>Dashboard</h1>
          <p>You are not signed in yet. Finish GitHub sign-in to continue.</p>
          <div className="dashboard-actions">
            <Link className="btn btn-primary" to="/signin">
              Go to sign in
            </Link>
            <Link className="btn btn-outline" to="/">
              Back home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dash-shell">
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
        <button className="btn btn-outline dash-logout-btn" onClick={handleSignOut}>
          Log out
        </button>
      </header>

      <div className="dash-layout">
        <aside className="dash-sidebar">
          <button
            className={activeTab === 'profile' ? 'dash-nav-item active' : 'dash-nav-item'}
            onClick={() => setActiveTab('profile')}
          >
            {sidebarAvatar ? (
              <img
                className="dash-tab-avatar"
                src={sidebarAvatar}
                alt={data?.profile.login ?? 'Profile avatar'}
              />
            ) : (
              <span className="dash-tab-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                  <path d="M4 20a8 8 0 0 1 16 0" />
                </svg>
              </span>
            )}
            <span>Profile</span>
          </button>
          <button
            className={activeTab === 'practice' ? 'dash-nav-item active' : 'dash-nav-item'}
            onClick={() => setActiveTab('practice')}
          >
            <span className="dash-tab-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 6h14M5 12h14M5 18h9" />
              </svg>
            </span>
            <span>Practice Questions</span>
          </button>
          <button
            className={activeTab === 'interview' ? 'dash-nav-item active' : 'dash-nav-item'}
            onClick={() => setActiveTab('interview')}
          >
            <span className="dash-tab-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M4 7h16v10H4z" />
                <path d="M9 7V5h6v2M10 12h4" />
              </svg>
            </span>
            <span>Practice Interview</span>
          </button>
          <button
            className={activeTab === 'hired' ? 'dash-nav-item active' : 'dash-nav-item'}
            onClick={() => setActiveTab('hired')}
          >
            <span className="dash-tab-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 3v18M3 12h18" />
                <path d="M8 8h8v8H8z" />
              </svg>
            </span>
            <span>Get Hired</span>
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

          <div className="dash-sidebar-bottom">
            <button
              className={activeTab === 'settings' ? 'dash-nav-item active' : 'dash-nav-item'}
              onClick={() => setActiveTab('settings')}
            >
              <span className="dash-tab-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7Z" />
                  <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1 1a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2a1 1 0 0 0-.6.9V20a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.7-.9a1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1-1a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1a1 1 0 0 0-.9-.6H4a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.7a1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1-1a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2a1 1 0 0 0 .6-.9V4a1 1 0 0 1 1-1h1.5a1 1 0 0 1 1 1v.2a1 1 0 0 0 .7.9a1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1 1a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1a1 1 0 0 0 .9.6H20a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.7Z" />
                </svg>
              </span>
              <span>Settings</span>
            </button>
          </div>
        </aside>

        <main className="dash-main">
          {(loading || error) && (
            <section className="dash-panel">
              {loading && <p>Loading GitHub data...</p>}
              {error && <p className="auth-error">{error}</p>}
            </section>
          )}

          {!loading && activeTab === 'practice' && (
            <>
              <section className="dash-panel">
                <h2>Practice Questions</h2>
                <p className="dash-muted">
                  Search public GitHub issues and earn points when you solve them.
                </p>
                <div className="dash-stats-grid">
                  <article>
                    <span>Practice points</span>
                    <strong>{practicePoints}</strong>
                  </article>
                  <article>
                    <span>Issues loaded</span>
                    <strong>{issues.length}</strong>
                  </article>
                  <article>
                    <span>Bookmarked</span>
                    <strong>{bookmarkedIssueIds.length}</strong>
                  </article>
                  <article>
                    <span>Per page</span>
                    <strong>{PRACTICE_PAGE_SIZE}</strong>
                  </article>
                </div>
              </section>

              <section className="dash-panel">
                <h2>Find Practice Issues</h2>
                <div className="practice-search-grid">
                  <div className="practice-field">
                    <label htmlFor="practice-keyword">Keyword</label>
                    <input
                      id="practice-keyword"
                      value={practiceKeyword}
                      onChange={(event) => setPracticeKeyword(event.target.value)}
                      placeholder="auth, payments, websockets..."
                    />
                  </div>
                  <div className="practice-field">
                    <label htmlFor="practice-company">Company / Org</label>
                    <input
                      id="practice-company"
                      value={companyFilter}
                      onChange={(event) => setCompanyFilter(event.target.value)}
                      placeholder="vercel, stripe, supabase..."
                    />
                  </div>
                  <div className="practice-field">
                    <label htmlFor="practice-work-type">Type of Work</label>
                    <select
                      id="practice-work-type"
                      value={workType}
                      onChange={(event) => setWorkType(event.target.value as WorkType)}
                    >
                      <option value="any">Any</option>
                      <option value="bug">Bug Fixes</option>
                      <option value="feature">Features</option>
                      <option value="docs">Documentation</option>
                      <option value="testing">Testing</option>
                      <option value="refactor">Refactor</option>
                    </select>
                  </div>
                </div>

                <div className="practice-skills">
                  <p>Skills</p>
                  <div className="practice-chip-grid">
                    {SKILLS.map((skill) => (
                      <button
                        key={skill}
                        className={
                          selectedSkills.includes(skill)
                            ? 'practice-chip active'
                            : 'practice-chip'
                        }
                        onClick={() => toggleSkill(skill)}
                        type="button"
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="practice-actions">
                  <button className="btn btn-primary" onClick={runIssueSearch} type="button">
                    Search Public GitHub Issues
                  </button>
                </div>
                {issueError && <p className="auth-error">{issueError}</p>}
                {issueLoading && <p className="dash-muted">Searching issues...</p>}
              </section>

              <section className="dash-panel">
                <div className="practice-issues-head">
                  <h2>{practiceIssueTab === 'suggested' ? 'Suggested Issues' : 'Bookmarked Issues'}</h2>
                  <div className="practice-issue-tabs">
                    <button
                      className={
                        practiceIssueTab === 'suggested'
                          ? 'btn btn-outline practice-tab-btn active'
                          : 'btn btn-outline practice-tab-btn'
                      }
                      type="button"
                      onClick={() => setPracticeIssueTab('suggested')}
                    >
                      Suggested
                    </button>
                    <button
                      className={
                        practiceIssueTab === 'bookmarked'
                          ? 'btn btn-outline practice-tab-btn active'
                          : 'btn btn-outline practice-tab-btn'
                      }
                      type="button"
                      onClick={() => setPracticeIssueTab('bookmarked')}
                    >
                      Bookmarked
                    </button>
                  </div>
                </div>
                <div className="practice-bookmarked-summary">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 4h12v16l-6-4-6 4z" />
                  </svg>
                  <span>Bookmarked: {bookmarkedIssueIds.length}</span>
                </div>
                <div className="practice-grid">
                  <div className="practice-grid-head">
                    <span>Repository / Issue</span>
                    <span>Details</span>
                    <span>Labels</span>
                    <span>Actions</span>
                  </div>
                  {(practiceIssueTab === 'suggested'
                    ? paginatedSuggestedIssues
                    : paginatedBookmarkedIssues
                  ).map((issue) => {
                    const repoFullName = issue.repository_url.split('/repos/')[1] ?? ''
                    const ownerLogin = repoFullName.split('/')[0] ?? issue.user.login
                    const ownerAvatarUrl = `https://github.com/${ownerLogin}.png?size=64`
                    const bookmarked = bookmarkedIssueIds.includes(issue.id)
                    return (
                      <div key={issue.id} className="practice-grid-row">
                        <div className="practice-issue-main">
                          <div className="practice-repo-head">
                            <img
                              className="practice-owner-avatar"
                              src={ownerAvatarUrl}
                              alt={`${ownerLogin} avatar`}
                            />
                            <strong>
                              {repoFullName} #{issue.number}
                            </strong>
                          </div>
                          <span>{issue.title}</span>
                        </div>
                        <div>
                          <span>
                            Opened {new Date(issue.created_at).toLocaleDateString()} by @
                            {issue.user.login}
                          </span>
                          <span>{issue.comments} comments</span>
                        </div>
                        <div>
                          <span>
                            {issue.labels.length > 0
                              ? issue.labels.slice(0, 4).map((label) => label.name).join(', ')
                              : 'none'}
                          </span>
                        </div>
                        <div className="practice-result-actions">
                          <a
                            className="btn practice-action-btn practice-action-open"
                            href={issue.html_url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Open issue"
                            title="Open issue"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M14 4h6v6" />
                              <path d="M10 14L20 4" />
                              <path d="M20 14v6h-16v-16h6" />
                            </svg>
                          </a>
                          <button
                            className={`btn practice-action-btn practice-action-bookmark${
                              bookmarked ? ' active' : ''
                            }`}
                            type="button"
                            onClick={() => toggleIssueBookmark(issue)}
                            aria-label={bookmarked ? 'Bookmarked issue' : 'Bookmark issue'}
                            title={bookmarked ? 'Bookmarked issue' : 'Bookmark issue'}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M6 4h12v16l-6-4-6 4z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  {!issueLoading &&
                    (practiceIssueTab === 'suggested'
                      ? issues.length > 0
                      : bookmarkedIssues.length > 0) && (
                    <div className="practice-pagination">
                      <button
                        className="btn btn-outline"
                        type="button"
                        disabled={
                          practiceIssueTab === 'suggested'
                            ? suggestedPage <= 1
                            : bookmarkedPage <= 1
                        }
                        onClick={() =>
                          practiceIssueTab === 'suggested'
                            ? setSuggestedPage((prev) => Math.max(1, prev - 1))
                            : setBookmarkedPage((prev) => Math.max(1, prev - 1))
                        }
                      >
                        Prev
                      </button>
                      <span>
                        Page{' '}
                        {practiceIssueTab === 'suggested' ? suggestedPage : bookmarkedPage}{' '}
                        of{' '}
                        {practiceIssueTab === 'suggested'
                          ? suggestedTotalPages
                          : bookmarkedTotalPages}
                      </span>
                      <button
                        className="btn btn-outline"
                        type="button"
                        disabled={
                          practiceIssueTab === 'suggested'
                            ? suggestedPage >= suggestedTotalPages
                            : bookmarkedPage >= bookmarkedTotalPages
                        }
                        onClick={() =>
                          practiceIssueTab === 'suggested'
                            ? setSuggestedPage((prev) =>
                                Math.min(suggestedTotalPages, prev + 1),
                              )
                            : setBookmarkedPage((prev) =>
                                Math.min(bookmarkedTotalPages, prev + 1),
                              )
                        }
                      >
                        Next
                      </button>
                    </div>
                  )}
                  {!issueLoading &&
                    practiceIssueTab === 'suggested' &&
                    issues.length === 0 && (
                    <div className="practice-grid-empty">
                      Use filters above, then click Search Public GitHub Issues.
                    </div>
                  )}
                  {!issueLoading &&
                    practiceIssueTab === 'bookmarked' &&
                    bookmarkedIssues.length === 0 && (
                      <div className="practice-grid-empty">
                        No bookmarked issues yet. Bookmark issues from the Suggested tab.
                      </div>
                    )}
                </div>
              </section>
            </>
          )}

          {!loading && activeTab === 'interview' && (
            <>
              <section className="dash-panel">
                <h2>Practice Interview</h2>
                <p className="dash-muted">
                  Pick a role, get 3 random issues, and solve with a 30-minute timer.
                </p>
                <div className="interview-top">
                  <div className="practice-field">
                    <label htmlFor="interview-role">Role</label>
                    <select
                      id="interview-role"
                      value={interviewRole}
                      onChange={(event) =>
                        setInterviewRole(event.target.value as InterviewRole)
                      }
                    >
                      <option value="frontend">Frontend Engineer</option>
                      <option value="backend">Backend Engineer</option>
                      <option value="fullstack">Full Stack Engineer</option>
                      <option value="devops">DevOps Engineer</option>
                      <option value="mobile">Mobile Engineer</option>
                    </select>
                  </div>
                  <div className="interview-timer-wrap">
                    <span className="dash-muted">Time left</span>
                    <strong className={secondsLeft < 300 ? 'interview-timer danger' : 'interview-timer'}>
                      {formattedTime}
                    </strong>
                  </div>
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={startInterviewSession}
                    disabled={interviewLoading}
                  >
                    {interviewLoading ? 'Preparing...' : 'Start 30m Practice Interview'}
                  </button>
                </div>
                <p className="dash-muted">
                  Browser security cannot auto-open your local terminal. Use clone command below:
                </p>
                <div className="terminal-lines" role="note" aria-label="clone commands">
                  <code>$ git clone https://github.com/OWNER/REPO.git</code>
                  <code>$ cd REPO</code>
                  <code>$ git checkout &lt;commit&gt;</code>
                </div>
                <div className="interview-instructions">
                  <h3>How To Clone + Submit A PR For A Specific Issue</h3>
                  <ol>
                    <li>Open the issue link above and note the issue number (example: `#1842`).</li>
                    <li>Clone and enter the repo, then checkout the required commit:</li>
                  </ol>
                  <div className="terminal-lines" role="note" aria-label="clone and checkout">
                    <code>$ git clone https://github.com/OWNER/REPO.git</code>
                    <code>$ cd REPO</code>
                    <code>$ git checkout &lt;commit&gt;</code>
                  </div>
                  <ol start={3}>
                    <li>Create a branch for that issue:</li>
                  </ol>
                  <div className="terminal-lines" role="note" aria-label="create branch">
                    <code>$ git checkout -b fix/issue-1842</code>
                  </div>
                  <ol start={4}>
                    <li>Implement the fix, run tests, then commit with an issue reference:</li>
                  </ol>
                  <div className="terminal-lines" role="note" aria-label="commit changes">
                    <code>$ git add .</code>
                    <code>$ git commit -m "Fix retry logic for idempotent requests (fixes #1842)"</code>
                  </div>
                  <ol start={5}>
                    <li>Push and open a pull request:</li>
                  </ol>
                  <div className="terminal-lines" role="note" aria-label="push branch">
                    <code>$ git push -u origin fix/issue-1842</code>
                  </div>
                  <ol start={6}>
                    <li>
                      Open PR on GitHub, include `Fixes #1842` in title/body, then paste that PR
                      URL into the verification box.
                    </li>
                  </ol>
                </div>
                {interviewError && <p className="auth-error">{interviewError}</p>}
              </section>

              <section className="dash-panel">
                <h2>Interview Issues (3)</h2>
                <div className="practice-grid">
                  <div className="practice-grid-head">
                    <span>Issue</span>
                    <span>Status</span>
                    <span>Your PR URL</span>
                    <span>Verification</span>
                  </div>
                  {interviewIssues.map((issue) => {
                    const repoFullName = issue.repository_url.split('/repos/')[1] ?? ''
                    const verified = verifiedIssueIds.includes(issue.id)
                    return (
                      <div className="practice-grid-row" key={issue.id}>
                        <div>
                          <strong>
                            {repoFullName} #{issue.number}
                          </strong>
                          <a
                            className="issue-link"
                            href={issue.html_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {issue.title}
                          </a>
                        </div>
                        <div>
                          <span>{sessionActive ? 'In progress' : 'Session ended'}</span>
                          <span>{verified ? 'Verified (+10)' : 'Awaiting PR'}</span>
                        </div>
                        <div>
                          <input
                            className="interview-pr-input"
                            placeholder="https://github.com/org/repo/pull/123"
                            value={prLinks[issue.id] ?? ''}
                            onChange={(event) =>
                              setPrLinks((prev) => ({
                                ...prev,
                                [issue.id]: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="practice-result-actions">
                          <a
                            className="btn btn-ghost"
                            href={issue.html_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View issue
                          </a>
                          <button
                            className="btn btn-outline"
                            type="button"
                            disabled={verified || verifyingIssueId === issue.id}
                            onClick={() => verifyInterviewPR(issue)}
                          >
                            {verifyingIssueId === issue.id ? 'Verifying...' : verified ? 'Verified' : 'Verify PR'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  {interviewIssues.length === 0 && (
                    <div className="practice-grid-empty">
                      Start a session to get 3 role-matched random issues.
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {!loading && activeTab === 'hired' && (
            <>
              <section className="dash-panel">
                <h2>Get Hired</h2>
                <div className="dashboard-list">
                  {hiringApplications.map((app) => (
                    <div key={app.id} className="dashboard-list-item dashboard-list-static">
                      <div>
                        <div className="hiring-company">
                          {app.companyLogoUrl ? (
                            <img src={app.companyLogoUrl} alt={`${app.companyName} logo`} />
                          ) : (
                            <div className="hiring-company-fallback" />
                          )}
                          <div>
                            <strong>{app.companyName}</strong>
                            <span>{app.companyType || 'Company'}</span>
                            {app.companyWebsite && (
                              <a
                                href={app.companyWebsite}
                                target="_blank"
                                rel="noreferrer"
                                className="issue-link"
                              >
                                {app.companyWebsite}
                              </a>
                            )}
                          </div>
                        </div>
                        <strong>{app.roleTitle}</strong>
                        <span>
                          {app.issues.length} issue questions • {app.timeLimitMinutes} min
                        </span>
                        <span>
                          Required fields: {app.candidateFields.join(', ')}
                        </span>
                        {app.customQuestions.length > 0 && (
                          <span>Custom questions: {app.customQuestions.join(' | ')}</span>
                        )}
                        <div className="company-issue-links">
                          {app.issues.map((issue) => (
                            <a key={issue.id} href={issue.issueUrl} target="_blank" rel="noreferrer">
                              {issue.repo}: {issue.issueTitle}
                            </a>
                          ))}
                        </div>
                      </div>
                      <button className="btn btn-outline">Apply</button>
                    </div>
                  ))}
                  {hiringApplications.length === 0 && (
                    <div className="dashboard-list-item dashboard-list-static">
                      <div>
                        <strong>No applications published yet</strong>
                        <span>Company-created applications will show up here.</span>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {!loading && data && activeTab === 'bounties' && (
            <section className="dash-panel">
              <h2>Bounties</h2>
              <p className="dash-muted">
                Solve public high-priority issues and submit your PR. Company picks one winner.
              </p>
              <div className="bounty-sections">
                {(() => {
                  const currentLogin = data.profile.login
                  const wonBounties = companyBounties.filter(
                    (bounty) => bounty.winnerLogin === currentLogin,
                  )
                  const pendingBounties = companyBounties.filter((bounty) => {
                    const mySubmission = bountySubmissions.find(
                      (s) => s.bountyId === bounty.id && s.userLogin === currentLogin,
                    )
                    return !!mySubmission && !bounty.winnerLogin
                  })
                  const openBounties = companyBounties.filter((bounty) => {
                    const mySubmission = bountySubmissions.find(
                      (s) => s.bountyId === bounty.id && s.userLogin === currentLogin,
                    )
                    return !mySubmission && !bounty.winnerLogin
                  })

                  const renderBountyCard = (bounty: CompanyBountyListing) => {
                    const mySubmission = bountySubmissions.find(
                      (s) => s.bountyId === bounty.id && s.userLogin === currentLogin,
                    )
                    const isWinner = bounty.winnerLogin === currentLogin
                    const isExpanded = expandedBountyIds.includes(bounty.id)
                    return (
                      <div
                        key={bounty.id}
                        className="dashboard-list-item dashboard-list-static bounty-list-item"
                      >
                        <div className="bounty-logo-col">
                          {bounty.companyLogoUrl ? (
                            <img src={bounty.companyLogoUrl} alt={`${bounty.companyName} logo`} />
                          ) : (
                            <div className="hiring-company-fallback" />
                          )}
                        </div>
                        <div className="bounty-content">
                          <div className="bounty-company-line">
                            <strong>{bounty.companyName}</strong>
                            <span className="company-bounty-pill">
                              {bounty.priority.toUpperCase()} priority
                            </span>
                            {bounty.companyWebsite && (
                              <a
                                className="issue-link"
                                href={bounty.companyWebsite}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {bounty.companyWebsite}
                              </a>
                            )}
                          </div>
                          <strong>{bounty.issueTitle}</strong>
                          {isExpanded && (
                            <div className="bounty-details">
                              <span>
                                {bounty.repo} • Reward ${bounty.payoutUsd}
                              </span>
                              {bounty.winnerLogin ? (
                                <span>
                                  Winner picked: @{bounty.winnerLogin}
                                  {isWinner ? ' (you won)' : ''}
                                </span>
                              ) : (
                                <span>No winner selected yet</span>
                              )}
                              {mySubmission && (
                                <span>
                                  Your submission: {mySubmission.status.toUpperCase()} •{' '}
                                  {new Date(mySubmission.submittedAt).toLocaleString()}
                                </span>
                              )}
                              {!isWinner && (
                                <div className="bounty-submit">
                                  <input
                                    className="interview-pr-input"
                                    placeholder="Paste your PR URL"
                                    value={bountyPrDrafts[bounty.id] ?? ''}
                                    onChange={(event) =>
                                      setBountyPrDrafts((prev) => ({
                                        ...prev,
                                        [bounty.id]: event.target.value,
                                      }))
                                    }
                                    disabled={!!bounty.winnerLogin}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="bounty-actions">
                          <button
                            className="btn btn-outline bounty-action-btn"
                            type="button"
                            onClick={() =>
                              setExpandedBountyIds((prev) =>
                                prev.includes(bounty.id)
                                  ? prev.filter((id) => id !== bounty.id)
                                  : [...prev, bounty.id],
                              )
                            }
                          >
                            {isExpanded ? 'Collapse' : 'Expand'}
                          </button>
                          <a
                            href={bounty.issueUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline bounty-action-btn"
                          >
                            View Details
                          </a>
                          {isWinner ? (
                            <a
                              href={mySubmission?.prUrl ?? bounty.winnerPrUrl ?? bounty.issueUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-primary bounty-action-btn"
                            >
                              View Your PR
                            </a>
                          ) : (
                            <button
                              className="btn btn-primary bounty-action-btn"
                              onClick={() => handleSubmitBountySolution(bounty.id)}
                              disabled={!!bounty.winnerLogin}
                            >
                              Submit PR
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  }

                  return (
                    <>
                      <div className="bounty-section">
                        <h3>Open Bounties</h3>
                        <div className="dashboard-list">
                          {openBounties.map(renderBountyCard)}
                          {openBounties.length === 0 && (
                            <div className="dashboard-list-item dashboard-list-static">
                              <div>
                                <strong>No open bounties right now</strong>
                                <span>New bounties will appear here.</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bounty-section">
                        <h3>Pending Bounties</h3>
                        <div className="dashboard-list">
                          {pendingBounties.map(renderBountyCard)}
                          {pendingBounties.length === 0 && (
                            <div className="dashboard-list-item dashboard-list-static">
                              <div>
                                <strong>No pending bounties</strong>
                                <span>Your submitted PRs awaiting winner selection will show here.</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bounty-section">
                        <h3>Won Bounties</h3>
                        <div className="dashboard-list">
                          {wonBounties.map(renderBountyCard)}
                          {wonBounties.length === 0 && (
                            <div className="dashboard-list-item dashboard-list-static">
                              <div>
                                <strong>No won bounties yet</strong>
                                <span>Bounties you win will appear here.</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>
            </section>
          )}

          {!loading && data && activeTab === 'settings' && (
            <>
              <section className="dash-panel settings-grid">
                <article className="settings-card">
                  <h2>Basic Info</h2>
                  <div className="settings-form">
                    <label htmlFor="settings-name">Name</label>
                    <input
                      id="settings-name"
                      className="interview-pr-input"
                      value={settingsName}
                      onChange={(event) => setSettingsName(event.target.value)}
                      placeholder="Your name"
                    />
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={() => {
                        localStorage.setItem('gitty.settings.name', settingsName.trim())
                      }}
                    >
                      Save changes
                    </button>
                  </div>
                </article>
                <article className="settings-card">
                  <h2>Session</h2>
                  <div className="settings-session">
                    <span>Signed in as</span>
                    <strong>{user.email ?? `${data.profile.login}@github`}</strong>
                    <span>GitHub</span>
                    <strong>@{data.profile.login}</strong>
                  </div>
                </article>
              </section>
            </>
          )}

          {!loading && data && activeTab === 'profile' && (
            <>
              <section className="dash-panel">
                <div className="profile-head">
                  <img
                    className="profile-avatar"
                    src={data.profile.avatar_url}
                    alt={data.profile.login}
                  />
                  <div>
                    <h2>Profile</h2>
                    <p className="dash-muted">This is what will be sent to recruiters</p>
                  </div>
                </div>
                <div className="profile-stats-row">
                  <div className="profile-highlight-card profile-highlight-card-blue">
                    <span>Practice Points</span>
                    <strong>{practicePoints}</strong>
                  </div>
                  <div className="profile-highlight-card profile-highlight-card-teal">
                    <span>Bounties Solved</span>
                    <strong>{bountiesSolvedCount}</strong>
                  </div>
                  <div className="profile-highlight-card profile-highlight-card-green">
                    <span>Bounty Prizes Won</span>
                    <strong>{bountyPrizesWonCount}</strong>
                  </div>
                  <div className="profile-highlight-card profile-highlight-card-gold">
                    <span>Net Worth From Bounties</span>
                    <strong>${bountyNetWorthUsd}</strong>
                  </div>
                </div>
                <div className="dash-settings-grid">
                  <div>
                    <span>GitHub User ID</span>
                    <strong>@{data.profile.login}</strong>
                  </div>
                  <div>
                    <span>GitHub Link</span>
                    <strong>
                      <a href={data.profile.html_url} target="_blank" rel="noreferrer">
                        {data.profile.html_url}
                      </a>
                    </strong>
                  </div>
                  <div className="profile-link-field profile-linkedin-field">
                    <span>LinkedIn</span>
                    <input
                      className="interview-pr-input"
                      value={linkedInUrl}
                      onChange={(event) => setLinkedInUrl(event.target.value)}
                      placeholder="https://www.linkedin.com/in/your-handle"
                    />
                    <button
                      className="btn btn-outline"
                      type="button"
                      onClick={() =>
                        localStorage.setItem('gitty.profile.linkedin', linkedInUrl.trim())
                      }
                    >
                      Save
                    </button>
                    {linkedInUrl.trim() && (
                      <a
                        className="btn btn-outline"
                        href={linkedInUrl.trim()}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>
                    )}
                  </div>
                  <div className="profile-link-field profile-resume-field">
                    <span>Resume</span>
                    <label
                      className="btn btn-outline profile-upload-btn"
                      title="Upload resume"
                      aria-label="Upload resume"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 16V4" />
                        <path d="M7 9l5-5 5 5" />
                        <path d="M4 20h16" />
                      </svg>
                      <input
                        className="profile-upload-input"
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (!file) return
                          const reader = new FileReader()
                          reader.onload = () => {
                            const dataUrl =
                              typeof reader.result === 'string' ? reader.result : ''
                            if (!dataUrl) return
                            setResumeFileName(file.name)
                            setResumeFileDataUrl(dataUrl)
                            localStorage.setItem(
                              'gitty.profile.resume.file',
                              JSON.stringify({ name: file.name, dataUrl }),
                            )
                          }
                          reader.readAsDataURL(file)
                        }}
                      />
                    </label>
                    {resumeFileDataUrl && (
                      <a
                        className="btn btn-outline"
                        href={resumeFileDataUrl}
                        download={resumeFileName || 'resume'}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Download
                      </a>
                    )}
                    <button
                      className="btn btn-outline"
                      type="button"
                      onClick={() => {
                        setResumeFileName('')
                        setResumeFileDataUrl('')
                        localStorage.removeItem('gitty.profile.resume.file')
                      }}
                      disabled={!resumeFileDataUrl}
                    >
                      Remove
                    </button>
                    {resumeFileName && <strong className="profile-upload-name">{resumeFileName}</strong>}
                  </div>
                </div>
              </section>

              <section className="dash-panel">
                <h2>Issues You Opened PRs For</h2>
                <div className="dashboard-list">
                  {data.pullRequests.map((pr) => {
                    const repoFullName = pr.repository_url.split('/repos/')[1] ?? ''
                    return (
                      <a
                        key={pr.id}
                        className="dashboard-list-item"
                        href={pr.html_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <div>
                          <strong>{repoFullName}</strong>
                          <span>{pr.title}</span>
                        </div>
                        <span className="repo-stats">
                          PR #{pr.number} • {new Date(pr.created_at).toLocaleDateString()}
                        </span>
                      </a>
                    )
                  })}
                  {data.pullRequests.length === 0 && (
                    <div className="dashboard-list-item dashboard-list-static">
                      <div>
                        <strong>No pull requests found</strong>
                        <span>Open PRs on GitHub and they will appear here.</span>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="dash-panel">
                <h2>Contribution Activity</h2>
                <div className="contrib-wrap">
                  <img
                    className="contrib-graph"
                    src={`https://ghchart.rshah.org/39d353/${data.profile.login}`}
                    alt={`${data.profile.login} contribution graph`}
                  />
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default Dashboard
