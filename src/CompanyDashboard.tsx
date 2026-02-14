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

type CompanyApplicationSubmissionPullRequest = {
  id: string
  title: string
  htmlUrl: string
  repoFullName: string
  ownerLogin: string
  ownerLogoUrl: string
  createdAt: string
}

type CompanyApplicationSubmission = {
  id: string
  submittedAt: string
  companyId: string
  companyName: string
  companyWebsite: string
  companyLogoUrl: string
  applicationId: string | null
  roleTitle: string
  interviewTrack: string
  userLogin: string
  userName: string
  userAvatarUrl: string
  userGithubUrl: string
  linkedInUrl: string
  resumeFileName: string
  resumeFileDataUrl: string
  introNote: string
  practicePoints: number
  bountiesSolved: number
  bountyPrizesWon: number
  moneyMadeUsd: number
  skills: string[]
  pullRequests: CompanyApplicationSubmissionPullRequest[]
}

type BountyPosting = {
  id: string
  companyName: string
  companyWebsite: string
  companyLogoUrl: string
  postedByEmail?: string
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

const CANDIDATE_FIELD_OPTIONS = [
  'LinkedIn URL',
  'Resume',
  'Practice Points',
  'Bounties Solved',
  'Money From Bounties',
  'Skills',
  'Past PRs',
] as const

const GITTY_DEMO_EMAIL = 'reachgittyhere@gmail.com'
const GITTY_DEMO_COMPANY = 'gitty'
const GITTY_FRONTEND_APPLICATION_ID = 'gitty-frontend-application'
const GITTY_FRONTEND_ROLE_TITLE = 'Frontend Engineer @ Gitty'
const GITTY_QUESTION_ISSUES = [
  {
    id: 'gitty-q1',
    issueNumber: 1,
    issueTitle: 'Improve dashboard state transitions and reduce UI flicker',
  },
  {
    id: 'gitty-q2',
    issueNumber: 2,
    issueTitle: 'Fix candidate field picker interactions and keyboard focus',
  },
  {
    id: 'gitty-q3',
    issueNumber: 3,
    issueTitle: 'Refine company track cards layout and data hierarchy',
  },
] as const

const PAST_PR_REPO_POOL = [
  'openai/openai-node',
  'cloudflare/workers-sdk',
  'google/go-containerregistry',
  'google/gvisor',
  'vercel/next.js',
  'stripe/stripe-node',
  'elastic/elasticsearch',
  'facebook/react',
  'modal-labs/modal-client',
] as const

const GITTY_HARDCODED_APPLICATION: CompanyApplication = {
  id: GITTY_FRONTEND_APPLICATION_ID,
  companyName: 'Gitty',
  companyWebsite: 'https://gitty.app',
  companyType: 'B2B',
  companyLogoUrl: '',
  roleTitle: GITTY_FRONTEND_ROLE_TITLE,
  roleDescription: 'Frontend engineer focused on polished product UX and fast iteration.',
  candidateFields: ['LinkedIn URL', 'Resume', 'Practice Points', 'Skills', 'Past PRs'],
  customQuestions: ['Share 3 PRs that best represent your frontend decision-making.'],
  issues: [
    {
      id: 'gitty-frontend-issue-1',
      repo: 'ethanjoby/my-gitty',
      issueUrl: 'https://github.com/ethanjoby/my-gitty/issues/1',
      issueTitle: 'Improve dashboard state transitions and reduce UI flicker',
    },
  ],
  timeLimitMinutes: 90,
  createdAt: '2026-02-01T00:00:00.000Z',
  responses: 6,
  status: 'open',
}

const GITTY_HARDCODED_BOUNTIES: BountyPosting[] = [
  {
    id: 'gitty-demo-bounty-1',
    companyName: 'Gitty',
    companyWebsite: 'https://gitty.app',
    companyLogoUrl: '',
    postedByEmail: GITTY_DEMO_EMAIL,
    issueTitle: 'Polish profile layout spacing and stat hierarchy',
    repo: 'ethanjoby/my-gitty',
    issueUrl: 'https://github.com/ethanjoby/my-gitty/issues/11',
    priority: 'high',
    payoutUsd: 75,
    createdAt: '2026-02-05T12:00:00.000Z',
    winnerLogin: null,
    winnerPrUrl: null,
  },
  {
    id: 'gitty-demo-bounty-2',
    companyName: 'Gitty',
    companyWebsite: 'https://gitty.app',
    companyLogoUrl: '',
    postedByEmail: GITTY_DEMO_EMAIL,
    issueTitle: 'Improve company applicant cards for faster review',
    repo: 'ethanjoby/my-gitty',
    issueUrl: 'https://github.com/ethanjoby/my-gitty/issues/12',
    priority: 'critical',
    payoutUsd: 125,
    createdAt: '2026-02-06T09:20:00.000Z',
    winnerLogin: 'ethanjoby',
    winnerPrUrl: 'https://github.com/ethanjoby/my-gitty/pull/6228',
  },
  {
    id: 'gitty-demo-bounty-3',
    companyName: 'Gitty',
    companyWebsite: 'https://gitty.app',
    companyLogoUrl: '',
    postedByEmail: GITTY_DEMO_EMAIL,
    issueTitle: 'Refine interview flow timer and score transitions',
    repo: 'ethanjoby/my-gitty',
    issueUrl: 'https://github.com/ethanjoby/my-gitty/issues/13',
    priority: 'medium',
    payoutUsd: 50,
    createdAt: '2026-02-07T14:45:00.000Z',
    winnerLogin: null,
    winnerPrUrl: null,
  },
]

const GITTY_HARDCODED_SUBMISSIONS: CompanyApplicationSubmission[] = [
  {
    id: 'gitty-hardcoded-ethan',
    submittedAt: '2026-02-10T16:30:00.000Z',
    companyId: 'gitty-hardcoded',
    companyName: 'Gitty',
    companyWebsite: 'https://gitty.app',
    companyLogoUrl: '',
    applicationId: GITTY_FRONTEND_APPLICATION_ID,
    roleTitle: GITTY_FRONTEND_ROLE_TITLE,
    interviewTrack: 'Frontend Engineer',
    userLogin: 'ethanjoby',
    userName: 'Ethan Varghese',
    userAvatarUrl: 'https://github.com/ethanjoby.png',
    userGithubUrl: 'https://github.com/ethanjoby',
    linkedInUrl: 'https://www.linkedin.com/in/ethanvarghese/',
    resumeFileName: 'Ethan-Varghese-Resume.pdf',
    resumeFileDataUrl: '',
    introNote: 'I build fast product loops with production-grade reliability.',
    practicePoints: 12000,
    bountiesSolved: 57,
    bountyPrizesWon: 18,
    moneyMadeUsd: 248500,
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'System Design'],
    pullRequests: [
      {
        id: 'gitty-pr-ethan-1',
        title: 'Fix streaming delta merge edge case',
        htmlUrl: 'https://github.com/ethanjoby/my-gitty/pull/6201',
        repoFullName: 'ethanjoby/my-gitty',
        ownerLogin: 'ethanjoby',
        ownerLogoUrl: 'https://github.com/ethanjoby.png',
        createdAt: '2026-01-24T11:15:00.000Z',
      },
      {
        id: 'gitty-pr-ethan-2',
        title: 'Improve worker retry backoff determinism',
        htmlUrl: 'https://github.com/ethanjoby/my-gitty/pull/6202',
        repoFullName: 'ethanjoby/my-gitty',
        ownerLogin: 'ethanjoby',
        ownerLogoUrl: 'https://github.com/ethanjoby.png',
        createdAt: '2026-01-30T09:10:00.000Z',
      },
      {
        id: 'gitty-pr-ethan-3',
        title: 'Fix container manifest selection in tarball exports',
        htmlUrl: 'https://github.com/ethanjoby/my-gitty/pull/6203',
        repoFullName: 'ethanjoby/my-gitty',
        ownerLogin: 'ethanjoby',
        ownerLogoUrl: 'https://github.com/ethanjoby.png',
        createdAt: '2026-02-02T12:35:00.000Z',
      },
      {
        id: 'gitty-pr-ethan-4',
        title: 'Harden DNS bootstrap path on runsc network init',
        htmlUrl: 'https://github.com/ethanjoby/my-gitty/pull/6204',
        repoFullName: 'ethanjoby/my-gitty',
        ownerLogin: 'ethanjoby',
        ownerLogoUrl: 'https://github.com/ethanjoby.png',
        createdAt: '2026-01-19T08:20:00.000Z',
      },
      {
        id: 'gitty-pr-ethan-5',
        title: 'Reduce idle worker memory spikes in edge runtime',
        htmlUrl: 'https://github.com/ethanjoby/my-gitty/pull/6205',
        repoFullName: 'ethanjoby/my-gitty',
        ownerLogin: 'ethanjoby',
        ownerLogoUrl: 'https://github.com/ethanjoby.png',
        createdAt: '2026-01-12T18:05:00.000Z',
      },
      {
        id: 'gitty-pr-ethan-6',
        title: 'Improve partial failure handling in batch API client',
        htmlUrl: 'https://github.com/ethanjoby/my-gitty/pull/6206',
        repoFullName: 'ethanjoby/my-gitty',
        ownerLogin: 'ethanjoby',
        ownerLogoUrl: 'https://github.com/ethanjoby.png',
        createdAt: '2026-01-07T14:42:00.000Z',
      },
    ],
  },
  {
    id: 'gitty-hardcoded-sarah',
    submittedAt: '2026-02-09T14:20:00.000Z',
    companyId: 'gitty-hardcoded',
    companyName: 'Gitty',
    companyWebsite: 'https://gitty.app',
    companyLogoUrl: '',
    applicationId: GITTY_FRONTEND_APPLICATION_ID,
    roleTitle: GITTY_FRONTEND_ROLE_TITLE,
    interviewTrack: 'Frontend Engineer',
    userLogin: 'sarahcodes',
    userName: 'Sarah Kim',
    userAvatarUrl: logo,
    userGithubUrl: 'https://github.com/sarahdrasner',
    linkedInUrl: 'https://www.linkedin.com/in/sarah-kim-dev/',
    resumeFileName: 'Sarah-Kim-Resume.pdf',
    resumeFileDataUrl: '',
    introNote: 'Backend-focused engineer with heavy CI and API reliability ownership.',
    practicePoints: 9420,
    bountiesSolved: 33,
    bountyPrizesWon: 11,
    moneyMadeUsd: 78250,
    skills: ['Go', 'Node.js', 'Redis', 'Kubernetes', 'Observability'],
    pullRequests: [
      {
        id: 'gitty-pr-sarah-1',
        title: 'Stabilize integration tests in CI matrix',
        htmlUrl: 'https://github.com/ethanjoby/my-gitty/pull/6207',
        repoFullName: 'ethanjoby/my-gitty',
        ownerLogin: 'ethanjoby',
        ownerLogoUrl: 'https://github.com/ethanjoby.png',
        createdAt: '2026-02-01T10:00:00.000Z',
      },
      {
        id: 'gitty-pr-sarah-2',
        title: 'Patch retry idempotency race condition',
        htmlUrl: 'https://github.com/ethanjoby/my-gitty/pull/6208',
        repoFullName: 'ethanjoby/my-gitty',
        ownerLogin: 'ethanjoby',
        ownerLogoUrl: 'https://github.com/ethanjoby.png',
        createdAt: '2026-01-22T13:30:00.000Z',
      },
      {
        id: 'gitty-pr-sarah-3',
        title: 'Add deterministic fixtures for flaky auth integration tests',
        htmlUrl: 'https://github.com/ethanjoby/my-gitty/pull/6209',
        repoFullName: 'ethanjoby/my-gitty',
        ownerLogin: 'ethanjoby',
        ownerLogoUrl: 'https://github.com/ethanjoby.png',
        createdAt: '2026-02-03T16:18:00.000Z',
      },
      {
        id: 'gitty-pr-sarah-4',
        title: 'Stabilize webhook retries under duplicate delivery conditions',
        htmlUrl: 'https://github.com/ethanjoby/my-gitty/pull/6210',
        repoFullName: 'ethanjoby/my-gitty',
        ownerLogin: 'ethanjoby',
        ownerLogoUrl: 'https://github.com/ethanjoby.png',
        createdAt: '2026-01-28T10:42:00.000Z',
      },
      {
        id: 'gitty-pr-sarah-5',
        title: 'Improve CI timeout handling for parallelized suites',
        htmlUrl: 'https://github.com/ethanjoby/my-gitty/pull/6211',
        repoFullName: 'ethanjoby/my-gitty',
        ownerLogin: 'ethanjoby',
        ownerLogoUrl: 'https://github.com/ethanjoby.png',
        createdAt: '2026-01-16T11:06:00.000Z',
      },
      {
        id: 'gitty-pr-sarah-6',
        title: 'Fix edge case in metrics cardinality limiter',
        htmlUrl: 'https://github.com/ethanjoby/my-gitty/pull/6212',
        repoFullName: 'ethanjoby/my-gitty',
        ownerLogin: 'ethanjoby',
        ownerLogoUrl: 'https://github.com/ethanjoby.png',
        createdAt: '2026-01-09T09:55:00.000Z',
      },
    ],
  },
  {
    id: 'gitty-hardcoded-jordan',
    submittedAt: '2026-02-08T13:15:00.000Z',
    companyId: 'gitty-hardcoded',
    companyName: 'Gitty',
    companyWebsite: 'https://gitty.app',
    companyLogoUrl: '',
    applicationId: GITTY_FRONTEND_APPLICATION_ID,
    roleTitle: GITTY_FRONTEND_ROLE_TITLE,
    interviewTrack: 'Frontend Engineer',
    userLogin: 'jordandev',
    userName: 'Jordan Lee',
    userAvatarUrl: 'https://github.com/vercel.png',
    userGithubUrl: 'https://github.com/vercel',
    linkedInUrl: 'https://www.linkedin.com/in/jordan-lee-ui/',
    resumeFileName: 'Jordan-Lee-Resume.pdf',
    resumeFileDataUrl: '',
    introNote: 'Frontend systems + design performance specialist.',
    practicePoints: 8750,
    bountiesSolved: 26,
    bountyPrizesWon: 8,
    moneyMadeUsd: 42800,
    skills: ['React', 'TypeScript', 'Next.js', 'Tailwind', 'Accessibility'],
    pullRequests: [
      {
        id: 'gitty-pr-jordan-1',
        title: 'Reduce hydration mismatch in dynamic profile cards',
        htmlUrl: 'https://github.com/ethanjoby/my-gitty/pull/6213',
        repoFullName: 'ethanjoby/my-gitty',
        ownerLogin: 'ethanjoby',
        ownerLogoUrl: 'https://github.com/ethanjoby.png',
        createdAt: '2026-02-05T09:11:00.000Z',
      },
      {
        id: 'gitty-pr-jordan-2',
        title: 'Refactor modal focus traps for keyboard navigation',
        htmlUrl: 'https://github.com/ethanjoby/my-gitty/pull/6214',
        repoFullName: 'ethanjoby/my-gitty',
        ownerLogin: 'ethanjoby',
        ownerLogoUrl: 'https://github.com/ethanjoby.png',
        createdAt: '2026-01-27T12:09:00.000Z',
      },
      {
        id: 'gitty-pr-jordan-3',
        title: 'Improve chart render batching for large datasets',
        htmlUrl: 'https://github.com/ethanjoby/my-gitty/pull/6215',
        repoFullName: 'ethanjoby/my-gitty',
        ownerLogin: 'ethanjoby',
        ownerLogoUrl: 'https://github.com/ethanjoby.png',
        createdAt: '2026-01-18T08:45:00.000Z',
      },
    ],
  },
  {
    id: 'gitty-hardcoded-alex',
    submittedAt: '2026-02-07T18:45:00.000Z',
    companyId: 'gitty-hardcoded',
    companyName: 'Gitty',
    companyWebsite: 'https://gitty.app',
    companyLogoUrl: '',
    applicationId: GITTY_FRONTEND_APPLICATION_ID,
    roleTitle: GITTY_FRONTEND_ROLE_TITLE,
    interviewTrack: 'Frontend Engineer',
    userLogin: 'alexbuilds',
    userName: 'Alex Patel',
    userAvatarUrl: 'https://github.com/cloudflare.png',
    userGithubUrl: 'https://github.com/cloudflare',
    linkedInUrl: 'https://www.linkedin.com/in/alex-patel-fe/',
    resumeFileName: 'Alex-Patel-Resume.pdf',
    resumeFileDataUrl: '',
    introNote: 'UI performance and design-system consistency engineer.',
    practicePoints: 10140,
    bountiesSolved: 31,
    bountyPrizesWon: 12,
    moneyMadeUsd: 68900,
    skills: ['React', 'Design Systems', 'Motion', 'Testing', 'Performance'],
    pullRequests: [
      {
        id: 'gitty-pr-alex-1',
        title: 'Fix tab routing edge-cases with deep links',
        htmlUrl: 'https://github.com/ethanjoby/my-gitty/pull/6216',
        repoFullName: 'ethanjoby/my-gitty',
        ownerLogin: 'ethanjoby',
        ownerLogoUrl: 'https://github.com/ethanjoby.png',
        createdAt: '2026-02-04T16:22:00.000Z',
      },
      {
        id: 'gitty-pr-alex-2',
        title: 'Improve optimistic state updates in list views',
        htmlUrl: 'https://github.com/ethanjoby/my-gitty/pull/6217',
        repoFullName: 'ethanjoby/my-gitty',
        ownerLogin: 'ethanjoby',
        ownerLogoUrl: 'https://github.com/ethanjoby.png',
        createdAt: '2026-01-25T07:54:00.000Z',
      },
      {
        id: 'gitty-pr-alex-3',
        title: 'Unify typography scale tokens across dashboard',
        htmlUrl: 'https://github.com/ethanjoby/my-gitty/pull/6218',
        repoFullName: 'ethanjoby/my-gitty',
        ownerLogin: 'ethanjoby',
        ownerLogoUrl: 'https://github.com/ethanjoby.png',
        createdAt: '2026-01-13T14:38:00.000Z',
      },
    ],
  },
  {
    id: 'gitty-hardcoded-maya',
    submittedAt: '2026-02-06T11:05:00.000Z',
    companyId: 'gitty-hardcoded',
    companyName: 'Gitty',
    companyWebsite: 'https://gitty.app',
    companyLogoUrl: '',
    applicationId: GITTY_FRONTEND_APPLICATION_ID,
    roleTitle: GITTY_FRONTEND_ROLE_TITLE,
    interviewTrack: 'Frontend Engineer',
    userLogin: 'mayaux',
    userName: 'Maya Chen',
    userAvatarUrl: 'https://github.com/openai.png',
    userGithubUrl: 'https://github.com/openai',
    linkedInUrl: 'https://www.linkedin.com/in/maya-chen-ui/',
    resumeFileName: 'Maya-Chen-Resume.pdf',
    resumeFileDataUrl: '',
    introNote: 'Product-minded frontend engineer with strong UX delivery.',
    practicePoints: 9320,
    bountiesSolved: 24,
    bountyPrizesWon: 7,
    moneyMadeUsd: 35100,
    skills: ['React', 'TypeScript', 'UX', 'Animation', 'Storybook'],
    pullRequests: [
      {
        id: 'gitty-pr-maya-1',
        title: 'Smooth contribution graph animation timing',
        htmlUrl: 'https://github.com/ethanjoby/my-gitty/pull/6219',
        repoFullName: 'ethanjoby/my-gitty',
        ownerLogin: 'ethanjoby',
        ownerLogoUrl: 'https://github.com/ethanjoby.png',
        createdAt: '2026-02-02T15:17:00.000Z',
      },
      {
        id: 'gitty-pr-maya-2',
        title: 'Improve focus states for form field picker controls',
        htmlUrl: 'https://github.com/ethanjoby/my-gitty/pull/6220',
        repoFullName: 'ethanjoby/my-gitty',
        ownerLogin: 'ethanjoby',
        ownerLogoUrl: 'https://github.com/ethanjoby.png',
        createdAt: '2026-01-29T10:23:00.000Z',
      },
      {
        id: 'gitty-pr-maya-3',
        title: 'Fix mobile spacing regressions in profile cards',
        htmlUrl: 'https://github.com/ethanjoby/my-gitty/pull/6221',
        repoFullName: 'ethanjoby/my-gitty',
        ownerLogin: 'ethanjoby',
        ownerLogoUrl: 'https://github.com/ethanjoby.png',
        createdAt: '2026-01-14T12:40:00.000Z',
      },
    ],
  },
]

function readStoredBounties(): BountyPosting[] {
  const raw = localStorage.getItem('gitty.company.bounties')
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as BountyPosting[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function bountyBelongsToCompany(
  bounty: BountyPosting,
  profile: CompanyProfile | null,
  account: CompanyAccount,
) {
  const email = account.email.trim().toLowerCase()
  const companyName = profile?.companyName.trim().toLowerCase() ?? ''
  if (email && bounty.postedByEmail?.trim().toLowerCase() === email) return true
  if (companyName && bounty.companyName.trim().toLowerCase() === companyName) return true
  return false
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
      typeof item.timeLimitMinutes === 'number' ? item.timeLimitMinutes : 30,
    createdAt: item.createdAt,
    responses: typeof item.responses === 'number' ? item.responses : 0,
    status: item.status === 'closed' ? 'closed' : 'open',
  }
}

function normalizeApplicationSubmission(raw: unknown): CompanyApplicationSubmission | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Partial<CompanyApplicationSubmission>
  if (!item.id || !item.submittedAt || !item.userLogin || !item.companyName) return null

  const pullRequests = Array.isArray(item.pullRequests)
    ? item.pullRequests.filter(
        (pr): pr is CompanyApplicationSubmissionPullRequest =>
          !!pr &&
          typeof pr === 'object' &&
          typeof (pr as CompanyApplicationSubmissionPullRequest).id === 'string' &&
          typeof (pr as CompanyApplicationSubmissionPullRequest).htmlUrl === 'string',
      )
    : []

  return {
    id: item.id,
    submittedAt: item.submittedAt,
    companyId: item.companyId ?? '',
    companyName: item.companyName,
    companyWebsite: item.companyWebsite ?? '',
    companyLogoUrl: item.companyLogoUrl ?? '',
    applicationId: item.applicationId ?? null,
    roleTitle: item.roleTitle ?? item.interviewTrack ?? 'Interview Candidate',
    interviewTrack: item.interviewTrack ?? '',
    userLogin: item.userLogin,
    userName: item.userName ?? item.userLogin,
    userAvatarUrl: item.userAvatarUrl ?? '',
    userGithubUrl: item.userGithubUrl ?? '',
    linkedInUrl: item.linkedInUrl ?? '',
    resumeFileName: item.resumeFileName ?? '',
    resumeFileDataUrl: item.resumeFileDataUrl ?? '',
    introNote: item.introNote ?? '',
    practicePoints: typeof item.practicePoints === 'number' ? item.practicePoints : 0,
    bountiesSolved: typeof item.bountiesSolved === 'number' ? item.bountiesSolved : 0,
    bountyPrizesWon: typeof item.bountyPrizesWon === 'number' ? item.bountyPrizesWon : 0,
    moneyMadeUsd: typeof item.moneyMadeUsd === 'number' ? item.moneyMadeUsd : 0,
    skills: Array.isArray(item.skills)
      ? item.skills.filter((skill): skill is string => typeof skill === 'string')
      : [],
    pullRequests,
  }
}

function CompanyDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<CompanyTab>('applications')
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [applications, setApplications] = useState<CompanyApplication[]>([])
  const [applicationSubmissions, setApplicationSubmissions] = useState<
    CompanyApplicationSubmission[]
  >([])
  const [bounties, setBounties] = useState<BountyPosting[]>([])
  const [bountySubmissions, setBountySubmissions] = useState<BountySubmission[]>([])

  const [appDraft, setAppDraft] = useState({
    roleTitle: '',
    roleDescription: '',
    timeLimitMinutes: '30',
  })
  const [candidateFields, setCandidateFields] = useState<string[]>([
    'LinkedIn URL',
    'Resume',
  ])
  const [customQuestions, setCustomQuestions] = useState<string[]>([])
  const [issueDraft, setIssueDraft] = useState({
    repo: '',
    issueUrl: '',
    issueTitle: '',
  })
  const [issues, setIssues] = useState<ApplicationIssue[]>([])
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
    const appSubmissionsRaw = localStorage.getItem('gitty.company.application.submissions')
    let loadedProfile: CompanyProfile | null = null

    if (!profileRaw) {
      navigate('/company/onboarding')
      return
    }

    try {
      const parsedProfile = JSON.parse(profileRaw) as CompanyProfile
      setProfile(parsedProfile)
      loadedProfile = parsedProfile
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
        if (Array.isArray(parsed)) {
          const visible = parsed.filter((bounty) =>
            bountyBelongsToCompany(bounty, loadedProfile, companyAccount),
          )
          setBounties(visible)
        }
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
    if (appSubmissionsRaw) {
      try {
        const parsed = JSON.parse(appSubmissionsRaw) as unknown[]
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .map((item) => normalizeApplicationSubmission(item))
            .filter((item): item is CompanyApplicationSubmission => item !== null)
          setApplicationSubmissions(normalized)
          localStorage.setItem(
            'gitty.company.application.submissions',
            JSON.stringify(normalized),
          )
        }
      } catch {
        localStorage.removeItem('gitty.company.application.submissions')
      }
    }
  }, [navigate, companyAccount])

  const totalResponses = useMemo(
    () => applications.reduce((sum, item) => sum + item.responses, 0),
    [applications],
  )
  const scopedApplicationSubmissions = useMemo(() => {
    if (!profile) return []
    const companyName = profile.companyName.trim().toLowerCase()
    return applicationSubmissions.filter((submission) => {
      const byName = submission.companyName.trim().toLowerCase() === companyName
      const byApplication = !!submission.applicationId
        ? applications.some((app) => app.id === submission.applicationId)
        : false
      return byName || byApplication
    })
  }, [applicationSubmissions, profile, applications])
  const isGittyHardcodedCompany = useMemo(() => {
    const emailMatches = companyAccount.email.trim().toLowerCase() === GITTY_DEMO_EMAIL
    const nameMatches = profile?.companyName.trim().toLowerCase() === GITTY_DEMO_COMPANY
    return emailMatches && nameMatches
  }, [companyAccount.email, profile])
  const visibleApplicationSubmissions = useMemo(() => {
    if (!isGittyHardcodedCompany) return scopedApplicationSubmissions
    const merged = [...GITTY_HARDCODED_SUBMISSIONS, ...scopedApplicationSubmissions]
    return merged.filter(
      (submission, index, list) =>
        list.findIndex((item) => item.id === submission.id) === index,
    )
  }, [isGittyHardcodedCompany, scopedApplicationSubmissions])
  const getDisplayPastPullRequests = (submission: CompanyApplicationSubmission) => {
    const seed = submission.id
      .split('')
      .reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0)
    return submission.pullRequests.map((pr, index) => {
      const repo = PAST_PR_REPO_POOL[(seed + index) % PAST_PR_REPO_POOL.length]
      const owner = repo.split('/')[0] ?? 'github'
      return {
        ...pr,
        repoFullName: repo,
        ownerLogin: owner,
        ownerLogoUrl: `https://github.com/${owner}.png`,
        htmlUrl: `https://github.com/${repo}/pull/${6400 + ((seed + index) % 800)}`,
      }
    })
  }
  const visibleApplications = useMemo(() => {
    if (!isGittyHardcodedCompany) return applications
    const merged = [GITTY_HARDCODED_APPLICATION, ...applications]
    return merged.filter(
      (application, index, list) =>
        list.findIndex((item) => item.id === application.id) === index,
    )
  }, [applications, isGittyHardcodedCompany])
  const visibleBounties = useMemo(() => {
    if (!isGittyHardcodedCompany) return bounties
    const merged = [...GITTY_HARDCODED_BOUNTIES, ...bounties]
    return merged.filter(
      (bounty, index, list) => list.findIndex((item) => item.id === bounty.id) === index,
    )
  }, [bounties, isGittyHardcodedCompany])

  const handleToggleCandidateField = (field: string) => {
    if (!CANDIDATE_FIELD_OPTIONS.includes(field as (typeof CANDIDATE_FIELD_OPTIONS)[number])) {
      return
    }
    setCandidateFields((prev) => {
      if (prev.includes(field)) {
        const next = prev.filter((item) => item !== field)
        return next.length > 0 ? next : ['LinkedIn URL', 'Resume']
      }
      return [...prev, field]
    })
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
      timeLimitMinutes: Number(appDraft.timeLimitMinutes) || 30,
      createdAt: new Date().toISOString(),
      responses: 0,
      status: 'open',
    }
    const updated = [next, ...applications]
    setApplications(updated)
    localStorage.setItem('gitty.company.applications', JSON.stringify(updated))

    setAppDraft({ roleTitle: '', roleDescription: '', timeLimitMinutes: '30' })
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
      postedByEmail: companyAccount.email.trim().toLowerCase(),
      issueTitle: bountyDraft.issueTitle,
      repo: bountyDraft.repo,
      issueUrl: bountyDraft.issueUrl,
      priority: bountyDraft.priority,
      payoutUsd: Number(bountyDraft.payoutUsd) || 0,
      createdAt: new Date().toISOString(),
      winnerLogin: null,
      winnerPrUrl: null,
    }
    const allBounties = readStoredBounties()
    const updatedAll = [next, ...allBounties]
    localStorage.setItem('gitty.company.bounties', JSON.stringify(updatedAll))
    setBounties(
      updatedAll.filter((bounty) => bountyBelongsToCompany(bounty, profile, companyAccount)),
    )
  }

  const handlePickBountyWinner = (bountyId: string, submissionId: string) => {
    const winnerSubmission = bountySubmissions.find((s) => s.id === submissionId)
    if (!winnerSubmission) return

    const allBounties = readStoredBounties()
    const updatedBounties = allBounties.map((b) =>
      b.id === bountyId
        ? {
            ...b,
            winnerLogin: winnerSubmission.userLogin,
            winnerPrUrl: winnerSubmission.prUrl,
          }
        : b,
    )
    localStorage.setItem('gitty.company.bounties', JSON.stringify(updatedBounties))
    setBounties(
      updatedBounties.filter((bounty) =>
        bountyBelongsToCompany(bounty, profile, companyAccount),
      ),
    )

    const updatedSubmissions = bountySubmissions.map((s) => {
      if (s.bountyId !== bountyId) return s
      if (s.id === submissionId) return { ...s, status: 'winner' as const }
      return { ...s, status: 'rejected' as const }
    })
    setBountySubmissions(updatedSubmissions)
    localStorage.setItem('gitty.bounty.submissions', JSON.stringify(updatedSubmissions))
  }

  const handleDeleteBounty = (bountyId: string) => {
    const updatedAllBounties = readStoredBounties().filter((bounty) => bounty.id !== bountyId)
    localStorage.setItem('gitty.company.bounties', JSON.stringify(updatedAllBounties))
    setBounties(
      updatedAllBounties.filter((bounty) => bountyBelongsToCompany(bounty, profile, companyAccount)),
    )

    const storedSubmissionsRaw = localStorage.getItem('gitty.bounty.submissions')
    if (!storedSubmissionsRaw) {
      setBountySubmissions((prev) => prev.filter((submission) => submission.bountyId !== bountyId))
      return
    }
    try {
      const parsed = JSON.parse(storedSubmissionsRaw) as BountySubmission[]
      if (!Array.isArray(parsed)) return
      const updatedSubmissions = parsed.filter((submission) => submission.bountyId !== bountyId)
      localStorage.setItem('gitty.bounty.submissions', JSON.stringify(updatedSubmissions))
      setBountySubmissions(updatedSubmissions)
    } catch {
      setBountySubmissions((prev) => prev.filter((submission) => submission.bountyId !== bountyId))
    }
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
                      <div className="company-field-picker">
                        {CANDIDATE_FIELD_OPTIONS.map((field) => (
                          <button
                            key={field}
                            type="button"
                            className={
                              candidateFields.includes(field)
                                ? 'company-field-pill active'
                                : 'company-field-pill'
                            }
                            onClick={() => handleToggleCandidateField(field)}
                          >
                            <span>{candidateFields.includes(field) ? '✓' : '+'}</span>
                            {field}
                          </button>
                        ))}
                      </div>
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
                    <strong>{visibleApplications.length}</strong>
                  </article>
                  <article>
                    <span>Total responses</span>
                    <strong>{Math.max(totalResponses, visibleApplicationSubmissions.length)}</strong>
                  </article>
                  <article>
                    <span>Open bounties</span>
                    <strong>{visibleBounties.length}</strong>
                  </article>
                  <article>
                    <span>Company</span>
                    <strong>{profile.companyName}</strong>
                  </article>
                </div>
              </section>

              <section className="dash-panel">
                <h2 className="company-responses-title">Responses for Frontend Engineer @ Gitty</h2>
                <div className="company-submission-list">
                  {visibleApplicationSubmissions.map((submission) => (
                    <article className="company-submission-card" key={submission.id}>
                      <div className="company-submission-head">
                        <div className="company-submission-user">
                          {(submission.userLogin === 'ethanjoby' && submission.userAvatarUrl) ? (
                            <img
                              src={submission.userAvatarUrl}
                              alt={submission.userLogin}
                              className="company-submission-avatar"
                            />
                          ) : (
                            <img
                              src={logo}
                              alt="Gitty logo"
                              className="company-submission-avatar"
                            />
                          )}
                          <div>
                            <strong>{submission.userName}</strong>
                            <span>
                              @{submission.userLogin} •{' '}
                              {new Date(submission.submittedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <span className="repo-stats">{submission.interviewTrack || submission.roleTitle}</span>
                      </div>

                      <div className="company-submission-stats">
                        <span>Practice: {submission.practicePoints.toLocaleString()}</span>
                        <span>Bounties: {submission.bountiesSolved.toLocaleString()}</span>
                        <span>Wins: {submission.bountyPrizesWon.toLocaleString()}</span>
                        <span>Earned: ${submission.moneyMadeUsd.toLocaleString()}</span>
                      </div>

                      {submission.skills.length > 0 && (
                        <div className="company-submission-skills">
                          {submission.skills.map((skill) => (
                            <span key={`${submission.id}-${skill}`}>{skill}</span>
                          ))}
                        </div>
                      )}

                      <div className="company-submission-links">
                        {submission.userGithubUrl && (
                          <a href={submission.userGithubUrl} target="_blank" rel="noreferrer">
                            GitHub Profile
                          </a>
                        )}
                        {submission.linkedInUrl && (
                          <a href={submission.linkedInUrl} target="_blank" rel="noreferrer">
                            LinkedIn
                          </a>
                        )}
                        {submission.resumeFileName && <span>{submission.resumeFileName}</span>}
                      </div>

                      {submission.introNote && (
                        <p className="dash-muted">{submission.introNote}</p>
                      )}
                      {GITTY_QUESTION_ISSUES.length > 0 && (
                        <div className="company-submission-qa">
                          <strong>Question Responses (Gitty Issue Links)</strong>
                          {GITTY_QUESTION_ISSUES.map((issue, index) => (
                            <a
                              key={`${submission.id}-qa-issue-${issue.id}`}
                              href={`https://github.com/${submission.userLogin || 'ethanjoby'}/my-gitty/issues/${issue.issueNumber}`}
                              target="_blank"
                              rel="noreferrer"
                              className="company-submission-qa-link"
                            >
                              <span>Q{index + 1}</span>
                              <p>
                                {`${submission.userLogin || 'ethanjoby'}/my-gitty`} • {issue.issueTitle}
                              </p>
                            </a>
                          ))}
                        </div>
                      )}

                      <div className="company-submission-pr-list">
                        {getDisplayPastPullRequests(submission).map((pr) => (
                          <a
                            key={`${submission.id}-${pr.id}`}
                            href={pr.htmlUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="company-submission-pr"
                          >
                            <img src={pr.ownerLogoUrl} alt={`${pr.ownerLogin} logo`} />
                            <div>
                              <strong>{pr.repoFullName}</strong>
                              <span>{pr.title}</span>
                            </div>
                          </a>
                        ))}
                      </div>
                    </article>
                  ))}
                  {visibleApplicationSubmissions.length === 0 && (
                    <div className="dashboard-list-item dashboard-list-static">
                      <div>
                        <strong>No candidate submissions yet</strong>
                        <span>Submitted application profiles from Get Hired will appear here.</span>
                      </div>
                    </div>
                  )}
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
                <h2>Your Company Bounties</h2>
                <div className="dashboard-list">
                  {visibleBounties.map((bounty) => (
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
                      <div className="company-list-actions">
                        <a
                          href={bounty.issueUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="repo-stats"
                        >
                          View issue
                        </a>
                        <button
                          className="btn btn-outline"
                          onClick={() => handleDeleteBounty(bounty.id)}
                          disabled={bounty.id.startsWith('gitty-demo-bounty-')}
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
        </main>
      </div>
    </div>
  )
}

export default CompanyDashboard
