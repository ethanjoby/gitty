import { useEffect, useMemo, useRef, useState } from 'react'
import { signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { Link, useNavigate, useParams } from 'react-router-dom'
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

type HiredStep = 'browse' | 'profile' | 'questions' | 'submitted'

type HiredCompany = {
  id: string
  companyName: string
  companyWebsite: string
  companyLogoUrl: string
  githubOrg?: string
  location?: string
  batch?: string
  industry?: string
  focus?: string
  pitch?: string
}

type HiredQuestion = {
  id: string
  prompt: string
  issueFinderUrl: string
}

type ApplicationSubmissionPullRequest = {
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
  pullRequests: ApplicationSubmissionPullRequest[]
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
type InterviewView = 'session' | 'scores'
type UiToast = {
  id: string
  title?: string
  message: string
  amountUsd?: number
  companyLogoUrl?: string
}

const PRACTICE_PAGE_SIZE = 200
const INTERVIEW_DURATION_SECONDS = 30 * 60
const DEMO_TIMER_SPEED = 15
const DEMO_TIMER_TICK_MS = Math.round(1000 / DEMO_TIMER_SPEED)

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

const HIRED_ROLE_TITLES = [
  'Frontend Engineer',
  'Backend Engineer',
  'Full Stack Engineer',
  'Platform Engineer',
  'DevOps Engineer',
  'AI Engineer',
  'ML Engineer',
  'Developer Tools Engineer',
]

const TAB_ROUTE_ORDER: Tab[] = [
  'profile',
  'practice',
  'interview',
  'hired',
  'bounties',
  'settings',
]

function isTab(value: string | undefined): value is Tab {
  return typeof value === 'string' && TAB_ROUTE_ORDER.includes(value as Tab)
}

const FEATURED_HIRED_COMPANIES: HiredCompany[] = [
  { id: 'google', companyName: 'Google', companyWebsite: 'https://google.com', companyLogoUrl: '', githubOrg: 'google', industry: 'B2B' },
  { id: 'stripe', companyName: 'Stripe', companyWebsite: 'https://stripe.com', companyLogoUrl: '', githubOrg: 'stripe', industry: 'Fintech' },
  { id: 'amazon', companyName: 'Amazon', companyWebsite: 'https://aws.amazon.com', companyLogoUrl: '', githubOrg: 'aws', industry: 'Industrials' },
  { id: 'openai', companyName: 'OpenAI', companyWebsite: 'https://openai.com', companyLogoUrl: '', githubOrg: 'openai', industry: 'B2B' },
  { id: 'anthropic', companyName: 'Anthropic', companyWebsite: 'https://anthropic.com', companyLogoUrl: '', githubOrg: 'anthropics', industry: 'B2B' },
  { id: 'meta', companyName: 'Meta', companyWebsite: 'https://about.meta.com', companyLogoUrl: '', githubOrg: 'facebook', industry: 'Consumer' },
  { id: 'browserbase', companyName: 'Browserbase', companyWebsite: 'https://browserbase.com', companyLogoUrl: '', githubOrg: 'browserbase', industry: 'B2B' },
  { id: 'render', companyName: 'Render', companyWebsite: 'https://render.com', companyLogoUrl: '', githubOrg: 'render-oss', industry: 'B2B' },
  { id: 'nvidia', companyName: 'NVIDIA', companyWebsite: 'https://nvidia.com', companyLogoUrl: '', githubOrg: 'NVIDIA', industry: 'Industrials' },
  { id: 'asus', companyName: 'ASUS', companyWebsite: 'https://asus.com', companyLogoUrl: '', githubOrg: 'asus', industry: 'Industrials' },
  { id: 'zoom', companyName: 'Zoom', companyWebsite: 'https://zoom.us', companyLogoUrl: '', githubOrg: 'zoom', industry: 'B2B' },
  { id: 'logitech', companyName: 'Logitech', companyWebsite: 'https://logitech.com', companyLogoUrl: '', githubOrg: 'Logitech', industry: 'Consumer' },
  { id: 'midjourney', companyName: 'Midjourney', companyWebsite: 'https://midjourney.com', companyLogoUrl: '', githubOrg: 'midjourney', industry: 'Consumer' },
  { id: 'open-evidence', companyName: 'Open Evidence', companyWebsite: 'https://openevidence.com', companyLogoUrl: '', githubOrg: 'openevidence', industry: 'Healthcare' },
  { id: 'modal', companyName: 'Modal', companyWebsite: 'https://modal.com', companyLogoUrl: '', githubOrg: 'modal-labs', industry: 'B2B' },
  { id: 'visa', companyName: 'Visa', companyWebsite: 'https://visa.com', companyLogoUrl: '', githubOrg: 'visa', industry: 'Fintech' },
  { id: 'fetchai', companyName: 'Fetch.ai', companyWebsite: 'https://fetch.ai', companyLogoUrl: '', githubOrg: 'fetchai', industry: 'B2B' },
  { id: 'greylock', companyName: 'Greylock', companyWebsite: 'https://greylock.com', companyLogoUrl: '', githubOrg: 'greylock', industry: 'B2B' },
  { id: 'vercel', companyName: 'Vercel', companyWebsite: 'https://vercel.com', companyLogoUrl: '', githubOrg: 'vercel', industry: 'B2B' },
  { id: 'zingage', companyName: 'Zingage', companyWebsite: 'https://zingage.com', companyLogoUrl: '', githubOrg: 'zingage', industry: 'B2B' },
  { id: 'runpod', companyName: 'Runpod', companyWebsite: 'https://runpod.io', companyLogoUrl: '', githubOrg: 'runpod', industry: 'B2B' },
  { id: 'elastic', companyName: 'Elastic', companyWebsite: 'https://elastic.co', companyLogoUrl: '', githubOrg: 'elastic', industry: 'B2B' },
  { id: 'perplexity', companyName: 'Perplexity', companyWebsite: 'https://perplexity.ai', companyLogoUrl: '', githubOrg: 'perplexityai', industry: 'B2B' },
  { id: 'cloudflare', companyName: 'Cloudflare', companyWebsite: 'https://cloudflare.com', companyLogoUrl: '', githubOrg: 'cloudflare', industry: 'B2B' },
  { id: 'cursor', companyName: 'Cursor', companyWebsite: 'https://cursor.com', companyLogoUrl: '', githubOrg: 'getcursor', industry: 'B2B' },
  { id: 'neo', companyName: 'Neo', companyWebsite: 'https://neo4j.com', companyLogoUrl: '', githubOrg: 'neo4j', industry: 'B2B' },
  { id: 'heygen', companyName: 'HeyGen', companyWebsite: 'https://heygen.com', companyLogoUrl: '', githubOrg: 'HeyGen-Official', industry: 'Consumer' },
  { id: 'pardes', companyName: 'Pardes Biosciences', companyWebsite: '', companyLogoUrl: '', location: 'San Francisco, CA, USA', batch: 'Summer 2020', industry: 'Healthcare', focus: 'Drug Discovery and Delivery', pitch: 'We break viruses' },
  { id: 'moxion', companyName: 'Moxion Power Co.', companyWebsite: '', companyLogoUrl: '', location: 'Richmond, CA, USA', batch: 'Winter 2021', industry: 'Industrials', focus: 'Energy', pitch: 'Mobile Energy Storage Technology' },
  { id: 'whatnot', companyName: 'Whatnot', companyWebsite: 'https://whatnot.com', companyLogoUrl: '', location: 'Los Angeles, CA, USA', batch: 'Winter 2020', industry: 'Consumer', pitch: 'Largest livestream shopping platform in the U.S.' },
  { id: 'zepto', companyName: 'Zepto', companyWebsite: 'https://zepto.now', companyLogoUrl: '', location: 'MH, India', batch: 'Winter 2021', industry: 'Consumer', focus: 'Food and Beverage', pitch: '10-minute grocery delivery in India' },
  { id: 'cardinal', companyName: 'Cardinal', companyWebsite: '', companyLogoUrl: '', batch: 'Winter 2026', industry: 'B2B', pitch: 'AI platform for precision outbound' },
  { id: 'martini', companyName: 'Martini', companyWebsite: '', companyLogoUrl: '', location: 'San Francisco, CA, USA', batch: 'Winter 2026', industry: 'B2B', focus: 'Engineering, Product and Design', pitch: 'Collaborative AI-native filmmaking for professionals' },
  { id: 'condor-energy', companyName: 'Condor Energy', companyWebsite: '', companyLogoUrl: '', batch: 'Winter 2026', industry: 'Industrials', focus: 'Energy', pitch: 'Reliable, cheap and sustainable electricity systems' },
  { id: 'resonate', companyName: 'Resonate', companyWebsite: '', companyLogoUrl: '', batch: 'Winter 2026', industry: 'Consumer', pitch: 'AI-native messaging platform' },
  { id: 'shofo', companyName: 'Shofo', companyWebsite: '', companyLogoUrl: '', location: 'San Francisco, CA, USA', batch: 'Winter 2026', industry: 'B2B', focus: 'Infrastructure', pitch: 'Common crawl for video' },
  { id: 'wayco', companyName: 'Wayco', companyWebsite: '', companyLogoUrl: '', batch: 'Winter 2026', industry: 'B2B', focus: 'Legal', pitch: 'AI operator for legal cases' },
  { id: 'unifold', companyName: 'Unifold', companyWebsite: '', companyLogoUrl: '', location: 'New York, NY, USA', batch: 'Winter 2026', industry: 'Fintech', focus: 'Payments', pitch: 'Multi-chain deposit and payment infrastructure' },
  { id: 'canary', companyName: 'Canary', companyWebsite: '', companyLogoUrl: '', location: 'San Francisco, CA, USA', batch: 'Winter 2026', industry: 'B2B', focus: 'Engineering, Product and Design', pitch: 'AI QA engineer that understands your codebase' },
  { id: 'grade', companyName: 'Grade', companyWebsite: '', companyLogoUrl: '', location: 'San Francisco, CA, USA', batch: 'Winter 2026', industry: 'Fintech', focus: 'Payments', pitch: 'Payroll for performance' },
  { id: 'maven', companyName: 'Maven', companyWebsite: '', companyLogoUrl: '', location: 'San Francisco, CA, USA', batch: 'Winter 2026', industry: 'B2B', pitch: 'Payments for voice AI agents' },
  { id: 'beesafe', companyName: 'BeeSafe AI', companyWebsite: '', companyLogoUrl: '', location: 'San Francisco, CA, USA', batch: 'Winter 2026', industry: 'B2B', focus: 'Security', pitch: 'Stopping scams before they reach customers' },
  { id: 'corelayer', companyName: 'Corelayer', companyWebsite: '', companyLogoUrl: '', location: 'San Francisco, CA, USA', batch: 'Winter 2026', industry: 'B2B', focus: 'Engineering, Product and Design', pitch: 'AI on-call engineer for debugging with data' },
  { id: 'balance', companyName: 'Balance', companyWebsite: '', companyLogoUrl: '', batch: 'Winter 2026', industry: 'B2B', focus: 'Finance and Accounting', pitch: 'Full-stack AI accounting' },
  { id: 'ditto-bio', companyName: 'Ditto Biosciences', companyWebsite: '', companyLogoUrl: '', location: 'San Francisco, CA, USA', batch: 'Winter 2026', industry: 'Healthcare', focus: 'Drug Discovery and Delivery', pitch: 'Evolutionary therapies for autoimmune disease' },
  { id: 'byteport', companyName: 'Byteport', companyWebsite: '', companyLogoUrl: '', location: 'San Francisco, CA, USA', batch: 'Winter 2026', industry: 'B2B', pitch: 'Global upload acceleration for 1GB-100TB files' },
  { id: 'mendral', companyName: 'Mendral', companyWebsite: '', companyLogoUrl: '', location: 'San Francisco, CA, USA', batch: 'Winter 2026', industry: 'B2B', pitch: 'AI DevOps engineer' },
  { id: 'sitefire', companyName: 'sitefire', companyWebsite: '', companyLogoUrl: '', location: 'San Francisco, CA, USA', batch: 'Winter 2026', industry: 'B2B', focus: 'Marketing', pitch: 'Marketing suite for the agentic web' },
  { id: 'terminal-use', companyName: 'Terminal Use', companyWebsite: '', companyLogoUrl: '', location: 'San Francisco, CA, USA', batch: 'Winter 2026', industry: 'B2B', focus: 'Infrastructure', pitch: 'Vercel for background agents' },
  { id: 'drone-tector', companyName: 'DroneTector', companyWebsite: '', companyLogoUrl: '', batch: 'Winter 2026', industry: 'Industrials', focus: 'Drones', pitch: 'Detect and track hostile drones' },
  { id: 'cumulus-labs', companyName: 'Cumulus Labs', companyWebsite: '', companyLogoUrl: '', location: 'San Francisco, CA, USA', batch: 'Winter 2026', industry: 'B2B', focus: 'Infrastructure', pitch: 'Optimized GPU cloud' },
  { id: 'piris', companyName: 'Piris Labs', companyWebsite: '', companyLogoUrl: '', location: 'San Francisco, CA, USA', batch: 'Winter 2026', industry: 'B2B', focus: 'Infrastructure', pitch: 'Inference at light speed' },
  { id: 'beacon-health', companyName: 'Beacon Health', companyWebsite: '', companyLogoUrl: '', location: 'New York, NY, USA', batch: 'Winter 2026', industry: 'Healthcare', pitch: 'AI agents for primary care' },
  { id: 'legalos', companyName: 'LegalOS', companyWebsite: '', companyLogoUrl: '', location: 'San Francisco, CA, USA', batch: 'Winter 2026', industry: 'B2B', focus: 'Legal', pitch: 'AI-powered law firm for complex work visas' },
  { id: 'kita', companyName: 'Kita', companyWebsite: '', companyLogoUrl: '', location: 'San Francisco, CA, USA', batch: 'Winter 2026', industry: 'Fintech', pitch: 'Turn documents into signals for lenders' },
  { id: 'panta', companyName: 'Panta', companyWebsite: '', companyLogoUrl: '', location: 'San Francisco, CA, USA', batch: 'Winter 2026', industry: 'Fintech', focus: 'Insurance', pitch: 'Commercial insurance brokerage run by AI agents' },
  { id: 'jsx-tool', companyName: 'JSX Tool', companyWebsite: '', companyLogoUrl: '', batch: 'Fall 2025', industry: 'B2B', focus: 'Engineering, Product and Design', pitch: 'AI-first in-browser IDE for React' },
  { id: 'rivet', companyName: 'Rivet', companyWebsite: '', companyLogoUrl: '', location: 'San Francisco, CA, USA', batch: 'Fall 2025', industry: 'B2B', focus: 'Engineering, Product and Design', pitch: 'Visual editor to design in production code' },
  { id: 'fixpoint', companyName: 'Fixpoint', companyWebsite: '', companyLogoUrl: '', batch: 'Fall 2025', industry: 'B2B', focus: 'Human Resources', pitch: 'Marketplace for AI trainers and supervisors' },
  { id: 'sourcebot', companyName: 'Sourcebot', companyWebsite: '', companyLogoUrl: '', location: 'San Francisco, CA, USA', batch: 'Fall 2025', industry: 'B2B', focus: 'Engineering, Product and Design', pitch: 'Helping humans and agents understand codebases' },
  { id: 'compyle', companyName: 'Compyle', companyWebsite: '', companyLogoUrl: '', location: 'San Francisco, CA, USA', batch: 'Fall 2025', industry: 'B2B', focus: 'Engineering, Product and Design', pitch: 'Coding agent that collaborates with you' },
  { id: 'lexi', companyName: 'Lexi', companyWebsite: '', companyLogoUrl: '', location: 'San Francisco, CA, USA', batch: 'Fall 2025', industry: 'B2B', focus: 'Legal', pitch: 'AI associates for corporate law' },
  { id: 'kestrel', companyName: 'Kestrel AI', companyWebsite: '', companyLogoUrl: '', location: 'San Francisco, CA, USA', batch: 'Fall 2025', industry: 'B2B', focus: 'Security', pitch: 'AI-native cloud incident response platform' },
  { id: 'allus', companyName: 'Allus AI', companyWebsite: '', companyLogoUrl: '', location: 'Atlanta, GA, USA', batch: 'Fall 2025', industry: 'Industrials', focus: 'Manufacturing and Robotics', pitch: 'Vision foundation model for manufacturing' },
  { id: 'aspect', companyName: 'Aspect', companyWebsite: '', companyLogoUrl: '', batch: 'Fall 2025', industry: 'B2B', pitch: 'AI-native workflow automation' },
]
const YC_LOGO_URL = 'https://www.ycombinator.com/favicon.ico'

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

function getMonogramLogoDataUrl(name: string) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'><rect width='100%' height='100%' rx='16' fill='#111'/><text x='50%' y='54%' text-anchor='middle' font-family='Arial' font-size='42' fill='white'>${initials || 'C'}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function extractRepoFullName(repositoryUrl: string) {
  return repositoryUrl.split('/repos/')[1] ?? ''
}

function extractRepoOwner(repositoryUrl: string) {
  const repoFullName = extractRepoFullName(repositoryUrl)
  return repoFullName.split('/')[0] ?? 'github'
}

function extractRepoOwnerFromFullName(repoFullName: string) {
  return repoFullName.split('/')[0] ?? ''
}

function normalizeSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function getInterviewKeywordsFromTrack(track: string): string[] {
  const lower = track.toLowerCase()
  if (lower.includes('front')) return ['frontend', 'react', 'ui', 'css', 'typescript']
  if (lower.includes('back')) return ['backend', 'api', 'database', 'auth', 'server']
  if (lower.includes('full')) return ['fullstack', 'react', 'node', 'api', 'database']
  if (lower.includes('devops') || lower.includes('platform'))
    return ['devops', 'infra', 'kubernetes', 'docker', 'ci']
  if (lower.includes('mobile')) return ['mobile', 'ios', 'android', 'react native', 'flutter']
  if (lower.includes('ai') || lower.includes('ml'))
    return ['ai', 'ml', 'inference', 'model', 'llm']
  return ['typescript', 'api', 'testing']
}

function issueMatchesCompanyRepo(
  issue: GitHubIssue,
  companyName: string,
  githubOrg?: string,
) {
  const owner = extractRepoOwner(issue.repository_url).toLowerCase()
  if (githubOrg?.trim()) return owner === githubOrg.trim().toLowerCase()

  const normalizedCompany = normalizeSlug(companyName)
  const normalizedOwner = normalizeSlug(owner)
  if (
    normalizedCompany &&
    (normalizedOwner.includes(normalizedCompany) || normalizedCompany.includes(normalizedOwner))
  ) {
    return true
  }

  const tokens = companyName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4)
  return tokens.some((token) => owner.includes(token))
}

function issueMatchesInterviewArea(issue: GitHubIssue, keywords: string[]) {
  if (keywords.length === 0) return true
  const haystack = [
    issue.title,
    issue.repository_url,
    ...issue.labels.map((label) => label.name),
  ]
    .join(' ')
    .toLowerCase()
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))
}

const MOCK_REWARD_POOL = [25, 35, 45, 50, 60, 75, 85, 95, 110, 125, 140, 160, 175, 200]

function getMockReward(index: number, seed = 1) {
  return MOCK_REWARD_POOL[(Math.max(1, seed) + index * 7) % MOCK_REWARD_POOL.length]
}

function normalizeIdentity(value?: string | null) {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

const ETHAN_DEMO_GITHUB_LOGIN = 'ethanjoby'
const ETHAN_DEMO_EMAIL = 'ethanawesome07@gmail.com'

function isEthanIdentity(value?: string | null) {
  const normalized = normalizeIdentity(value)
  if (!normalized) return false
  const normalizedLogin = normalizeIdentity(ETHAN_DEMO_GITHUB_LOGIN)
  const normalizedEmail = normalizeIdentity(ETHAN_DEMO_EMAIL)
  return (
    normalized === normalizedLogin ||
    normalized === normalizedEmail ||
    normalized.includes(normalizedLogin) ||
    normalized.includes('ethanawesome07') ||
    normalized.includes('ethanvarghese') ||
    normalized.includes('ethanjobyvarghese')
  )
}

function buildMockBountyData(userLogin: string, userName: string) {
  const seed =
    userLogin.split('').reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0) ||
    1
  const rewardForIndex = (index: number) => getMockReward(index, seed)

  const items = [
    {
      companyName: 'Vercel',
      companyWebsite: 'https://vercel.com',
      companyLogoUrl: 'https://github.com/vercel.png',
      issueTitle: 'Stabilize cache invalidation under parallel deploys',
      repo: 'vercel/next.js',
      issueUrl: 'https://github.com/vercel/next.js/issues/64000',
      priority: 'critical' as const,
      payoutUsd: rewardForIndex(0),
    },
    {
      companyName: 'OpenAI',
      companyWebsite: 'https://openai.com',
      companyLogoUrl: 'https://github.com/openai.png',
      issueTitle: 'Fix streaming delta merge edge case in node SDK',
      repo: 'openai/openai-node',
      issueUrl: 'https://github.com/openai/openai-node/issues/1200',
      priority: 'high' as const,
      payoutUsd: rewardForIndex(1),
    },
    {
      companyName: 'Cloudflare',
      companyWebsite: 'https://cloudflare.com',
      companyLogoUrl: 'https://github.com/cloudflare.png',
      issueTitle: 'Reduce worker cold-start overhead in cron triggers',
      repo: 'cloudflare/workers-sdk',
      issueUrl: 'https://github.com/cloudflare/workers-sdk/issues/7300',
      priority: 'high' as const,
      payoutUsd: rewardForIndex(2),
    },
    {
      companyName: 'Stripe',
      companyWebsite: 'https://stripe.com',
      companyLogoUrl: 'https://github.com/stripe.png',
      issueTitle: 'Webhook signature verification mismatch for chunked body',
      repo: 'stripe/stripe-node',
      issueUrl: 'https://github.com/stripe/stripe-node/issues/2200',
      priority: 'critical' as const,
      payoutUsd: rewardForIndex(3),
    },
    {
      companyName: 'Render',
      companyWebsite: 'https://render.com',
      companyLogoUrl: 'https://github.com/render-oss.png',
      issueTitle: 'Fix service restart race condition after health check fail',
      repo: 'render-oss/terraform-provider-render',
      issueUrl: 'https://github.com/render-oss/terraform-provider-render/issues/980',
      priority: 'high' as const,
      payoutUsd: rewardForIndex(4),
    },
    {
      companyName: 'Elastic',
      companyWebsite: 'https://elastic.co',
      companyLogoUrl: 'https://github.com/elastic.png',
      issueTitle: 'Resolve memory spike in snapshot repository cleanup',
      repo: 'elastic/elasticsearch',
      issueUrl: 'https://github.com/elastic/elasticsearch/issues/112000',
      priority: 'critical' as const,
      payoutUsd: rewardForIndex(5),
    },
    {
      companyName: 'Perplexity',
      companyWebsite: 'https://perplexity.ai',
      companyLogoUrl: 'https://github.com/perplexityai.png',
      issueTitle: 'Improve answer reranker timeout handling',
      repo: 'perplexityai/sdk-typescript',
      issueUrl: 'https://github.com/perplexityai/sdk-typescript/issues/120',
      priority: 'medium' as const,
      payoutUsd: rewardForIndex(6),
    },
    {
      companyName: 'Runpod',
      companyWebsite: 'https://runpod.io',
      companyLogoUrl: 'https://github.com/runpod.png',
      issueTitle: 'GPU worker heartbeat fails under sustained queue load',
      repo: 'runpod/runpod-python',
      issueUrl: 'https://github.com/runpod/runpod-python/issues/910',
      priority: 'high' as const,
      payoutUsd: rewardForIndex(7),
    },
    {
      companyName: 'Browserbase',
      companyWebsite: 'https://browserbase.com',
      companyLogoUrl: 'https://github.com/browserbase.png',
      issueTitle: 'Fix websocket reconnect jitter in session inspector',
      repo: 'browserbase/stagehand',
      issueUrl: 'https://github.com/browserbase/stagehand/issues/480',
      priority: 'high' as const,
      payoutUsd: rewardForIndex(8),
    },
    {
      companyName: 'Neo4j',
      companyWebsite: 'https://neo4j.com',
      companyLogoUrl: 'https://github.com/neo4j.png',
      issueTitle: 'Retry transient transaction failures in JS driver',
      repo: 'neo4j/neo4j-javascript-driver',
      issueUrl: 'https://github.com/neo4j/neo4j-javascript-driver/issues/1450',
      priority: 'medium' as const,
      payoutUsd: rewardForIndex(9),
    },
    {
      companyName: 'NVIDIA',
      companyWebsite: 'https://nvidia.com',
      companyLogoUrl: 'https://github.com/NVIDIA.png',
      issueTitle: 'Resolve batch scheduler starvation in inference service',
      repo: 'NVIDIA/TensorRT',
      issueUrl: 'https://github.com/NVIDIA/TensorRT/issues/4200',
      priority: 'critical' as const,
      payoutUsd: rewardForIndex(10),
    },
    {
      companyName: 'Anthropic',
      companyWebsite: 'https://anthropic.com',
      companyLogoUrl: 'https://github.com/anthropics.png',
      issueTitle: 'Fix tool-call metadata loss in response serializer',
      repo: 'anthropics/anthropic-sdk-typescript',
      issueUrl: 'https://github.com/anthropics/anthropic-sdk-typescript/issues/310',
      priority: 'high' as const,
      payoutUsd: rewardForIndex(11),
    },
    {
      companyName: 'Zoom',
      companyWebsite: 'https://zoom.us',
      companyLogoUrl: 'https://github.com/zoom.png',
      issueTitle: 'Meeting SDK reconnect loops on tab sleep/wake',
      repo: 'zoom/meetingsdk-web',
      issueUrl: 'https://github.com/zoom/meetingsdk-web/issues/860',
      priority: 'medium' as const,
      payoutUsd: rewardForIndex(12),
    },
    {
      companyName: 'Logitech',
      companyWebsite: 'https://logitech.com',
      companyLogoUrl: 'https://github.com/Logitech.png',
      issueTitle: 'HID profile mismatch on multi-device switch',
      repo: 'Logitech/mx-tools',
      issueUrl: 'https://github.com/Logitech/mx-tools/issues/230',
      priority: 'medium' as const,
      payoutUsd: rewardForIndex(13),
    },
    {
      companyName: 'Amazon',
      companyWebsite: 'https://aws.amazon.com',
      companyLogoUrl: 'https://github.com/aws.png',
      issueTitle: 'Throttle control bug in S3 multipart transfer manager',
      repo: 'aws/aws-sdk-js-v3',
      issueUrl: 'https://github.com/aws/aws-sdk-js-v3/issues/6500',
      priority: 'high' as const,
      payoutUsd: rewardForIndex(14),
    },
    {
      companyName: 'Google',
      companyWebsite: 'https://google.com',
      companyLogoUrl: 'https://github.com/google.png',
      issueTitle: 'Fix edge cache stale reads in internal fetch adapter',
      repo: 'google/zx',
      issueUrl: 'https://github.com/google/zx/issues/1700',
      priority: 'medium' as const,
      payoutUsd: rewardForIndex(15),
    },
    {
      companyName: 'Meta',
      companyWebsite: 'https://about.meta.com',
      companyLogoUrl: 'https://github.com/facebook.png',
      issueTitle: 'Hermes parser regression with optional chaining emit',
      repo: 'facebook/hermes',
      issueUrl: 'https://github.com/facebook/hermes/issues/1800',
      priority: 'high' as const,
      payoutUsd: rewardForIndex(16),
    },
    {
      companyName: 'Modal',
      companyWebsite: 'https://modal.com',
      companyLogoUrl: 'https://github.com/modal-labs.png',
      issueTitle: 'Cold boot retry policy ignores backoff ceiling',
      repo: 'modal-labs/modal-client',
      issueUrl: 'https://github.com/modal-labs/modal-client/issues/540',
      priority: 'high' as const,
      payoutUsd: rewardForIndex(17),
    },
  ]

  const bounties: CompanyBountyListing[] = items.map((item, index) => {
    const createdAt = new Date(Date.now() - (index + 1) * 86400000).toISOString()
    const id = `mock-bounty-${index + 1}`
    const winnerLogin = index < 10 ? userLogin : null
    const winnerPrUrl =
      winnerLogin === userLogin ? `https://github.com/${item.repo}/pull/${2100 + index}` : null
    return {
      id,
      companyName: item.companyName,
      companyWebsite: item.companyWebsite,
      companyLogoUrl: item.companyLogoUrl,
      issueTitle: item.issueTitle,
      repo: item.repo,
      issueUrl: item.issueUrl,
      priority: item.priority,
      payoutUsd: item.payoutUsd,
      createdAt,
      winnerLogin,
      winnerPrUrl,
    }
  })

  const submissions: BountySubmission[] = []
  items.forEach((item, index) => {
    if (index >= 14) return
    const status: BountySubmission['status'] = index < 10 ? 'winner' : 'submitted'
    submissions.push({
      id: `mock-submission-${index + 1}`,
      bountyId: `mock-bounty-${index + 1}`,
      userLogin,
      userName,
      prUrl: `https://github.com/${item.repo}/pull/${2100 + index}`,
      submittedAt: new Date(Date.now() - (index + 1) * 82800000).toISOString(),
      status,
    })
  })

  return { bounties, submissions }
}

function Dashboard() {
  const navigate = useNavigate()
  const { tab: routeTab } = useParams<{ tab?: string }>()
  const [user, setUser] = useState<User | null>(auth.currentUser)
  const [activeTab, setActiveTab] = useState<Tab>('profile')
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
  const [sessionCheckedBountyIds, setSessionCheckedBountyIds] = useState<string[]>([])
  const [uiToasts, setUiToasts] = useState<UiToast[]>([])
  const bountyEntryToastsShownRef = useRef(false)
  const [hiredStep, setHiredStep] = useState<HiredStep>('browse')
  const [selectedHiredCompany, setSelectedHiredCompany] = useState<HiredCompany | null>(null)
  const [selectedInterviewTrack, setSelectedInterviewTrack] = useState('Full Stack Engineer')
  const [hiredQuestionLoading, setHiredQuestionLoading] = useState(false)
  const [hiredQuestions, setHiredQuestions] = useState<HiredQuestion[]>([])
  const [hiredQuestionVerified, setHiredQuestionVerified] = useState<Record<string, boolean>>({})
  const [hiredQuestionSessionStartedAt, setHiredQuestionSessionStartedAt] = useState<number | null>(null)
  const [hiredQuestionSecondsLeft, setHiredQuestionSecondsLeft] = useState(
    INTERVIEW_DURATION_SECONDS,
  )
  const [hiredProfileError, setHiredProfileError] = useState<string | null>(null)
  const [hiredIntroNote, setHiredIntroNote] = useState('')
  const [animatedPracticePoints, setAnimatedPracticePoints] = useState(0)
  const [animatedBountiesSolved, setAnimatedBountiesSolved] = useState(0)
  const [animatedBountyPrizesWon, setAnimatedBountyPrizesWon] = useState(0)
  const [animatedBountyNetWorthUsd, setAnimatedBountyNetWorthUsd] = useState(0)
  const [animatedIssuesSolvedCount, setAnimatedIssuesSolvedCount] = useState(0)
  const [contribVisible, setContribVisible] = useState(false)
  const [contribRevealProgress, setContribRevealProgress] = useState(0)

  const [interviewRole, setInterviewRole] = useState<InterviewRole>('fullstack')
  const [interviewCompany, setInterviewCompany] = useState('')
  const [interviewIssues, setInterviewIssues] = useState<GitHubIssue[]>([])
  const [interviewView, setInterviewView] = useState<InterviewView>('session')
  const [interviewLoading, setInterviewLoading] = useState(false)
  const [interviewError, setInterviewError] = useState<string | null>(null)
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(INTERVIEW_DURATION_SECONDS)
  const [verifiedPrLinks, setVerifiedPrLinks] = useState<Record<number, string>>({})
  const [verifiedIssueIds, setVerifiedIssueIds] = useState<number[]>([])
  const [verifyingIssueId, setVerifyingIssueId] = useState<number | null>(null)
  const contribMapRef = useRef<HTMLDivElement | null>(null)
  const sidebarAvatar = data?.profile.avatar_url ?? user?.photoURL ?? ''
  const isEthanDemoAccount = useMemo(
    () =>
      [
        data?.profile.login,
        data?.profile.name,
        user?.displayName,
        user?.email,
        settingsName,
      ].some((value) => isEthanIdentity(value)),
    [data, user, settingsName],
  )

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((nextUser) => setUser(nextUser))
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!user) return
    const role = localStorage.getItem('gitty.auth.role')
    if (role === 'company') return
    const onboardingComplete = localStorage.getItem('gitty.user.onboardingComplete') === 'true'
    if (!onboardingComplete) {
      navigate('/onboarding')
    }
  }, [user, navigate])

  useEffect(() => {
    if (isTab(routeTab)) {
      if (activeTab !== routeTab) setActiveTab(routeTab)
      return
    }
    navigate('/dashboard/profile', { replace: true })
  }, [routeTab, activeTab, navigate])

  const goToTab = (tab: Tab) => {
    setActiveTab(tab)
    if (routeTab !== tab) navigate(`/dashboard/${tab}`)
  }

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
    const mockForEthan =
      isEthanDemoAccount && data
        ? buildMockBountyData(
            data.profile.login,
            settingsName.trim() || data.profile.name || data.profile.login,
          )
        : null

    if (bountiesRaw) {
      try {
        const parsed = JSON.parse(bountiesRaw) as CompanyBountyListing[]
        if (Array.isArray(parsed)) {
          if (!isEthanDemoAccount) {
            const filtered = parsed.filter((bounty) => !bounty.id.startsWith('mock-bounty-'))
            setCompanyBounties(filtered)
            if (filtered.length !== parsed.length) {
              localStorage.setItem('gitty.company.bounties', JSON.stringify(filtered))
            }
          } else {
            const seed =
              (data?.profile.login ?? '')
                .split('')
                .reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0) || 1
            const withMockIfMissing =
              parsed.some((bounty) => bounty.id.startsWith('mock-bounty-')) || !mockForEthan
                ? parsed
                : [...mockForEthan.bounties, ...parsed]
            const normalized = withMockIfMissing.map((bounty, index) => {
              if (!bounty.id.startsWith('mock-bounty-')) return bounty
              return {
                ...bounty,
                payoutUsd: getMockReward(index, seed),
              }
            })
            setCompanyBounties(normalized)
            localStorage.setItem('gitty.company.bounties', JSON.stringify(normalized))
          }
        }
      } catch {
        /* ignore */
      }
    }
    if (submissionsRaw) {
      try {
        const parsed = JSON.parse(submissionsRaw) as BountySubmission[]
        if (Array.isArray(parsed)) {
          const nextSubmissions = isEthanDemoAccount
            ? parsed.some((submission) => submission.bountyId.startsWith('mock-bounty-')) ||
              !mockForEthan
              ? parsed
              : [...mockForEthan.submissions, ...parsed]
            : parsed.filter((submission) => !submission.bountyId.startsWith('mock-bounty-'))
          setBountySubmissions(nextSubmissions)
          if (nextSubmissions.length !== parsed.length) {
            localStorage.setItem('gitty.bounty.submissions', JSON.stringify(nextSubmissions))
          }
        }
      } catch {
        /* ignore */
      }
    }
    if (!bountiesRaw && isEthanDemoAccount && mockForEthan) {
      setCompanyBounties(mockForEthan.bounties)
      localStorage.setItem('gitty.company.bounties', JSON.stringify(mockForEthan.bounties))
    }
    if (!submissionsRaw && isEthanDemoAccount && mockForEthan) {
      setBountySubmissions(mockForEthan.submissions)
      localStorage.setItem('gitty.bounty.submissions', JSON.stringify(mockForEthan.submissions))
    }
  }, [activeTab, data, isEthanDemoAccount, settingsName])

  useEffect(() => {
    if (!isEthanDemoAccount) return
    if (!data) return
    if (companyBounties.length > 0) return
    const hasStoredBounties = localStorage.getItem('gitty.company.bounties')
    if (hasStoredBounties) return

    const mock = buildMockBountyData(
      data.profile.login,
      settingsName.trim() || data.profile.name || data.profile.login,
    )
    setCompanyBounties(mock.bounties)
    localStorage.setItem('gitty.company.bounties', JSON.stringify(mock.bounties))

    if (bountySubmissions.length === 0 && !localStorage.getItem('gitty.bounty.submissions')) {
      setBountySubmissions(mock.submissions)
      localStorage.setItem('gitty.bounty.submissions', JSON.stringify(mock.submissions))
    }
  }, [data, settingsName, companyBounties.length, bountySubmissions.length, isEthanDemoAccount])

  useEffect(() => {
    if (!isEthanDemoAccount) return
    if (activeTab !== 'bounties') {
      bountyEntryToastsShownRef.current = false
      return
    }
    if (bountyEntryToastsShownRef.current) return
    bountyEntryToastsShownRef.current = true
    const timers: number[] = []
    const pushToast = (
      delayMs: number,
      toast: Omit<UiToast, 'id'>,
      ttlMs = 3200,
    ) => {
      const showTimer = window.setTimeout(() => {
        const id = crypto.randomUUID()
        setUiToasts((prev) => [{ id, ...toast }, ...prev])
        const hideTimer = window.setTimeout(() => {
          setUiToasts((prev) => prev.filter((item) => item.id !== id))
        }, ttlMs)
        timers.push(hideTimer)
      }, delayMs)
      timers.push(showTimer)
    }

    pushToast(2000, {
      title: 'Payout Sent',
      message: 'OpenAI paid you',
      amountUsd: 75,
      companyLogoUrl: 'https://github.com/openai.png',
    })
    pushToast(3500, {
      title: 'Payout Sent',
      message: 'Cloudflare paid you',
      amountUsd: 50,
      companyLogoUrl: 'https://github.com/cloudflare.png',
    })

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [activeTab, isEthanDemoAccount])

  useEffect(() => {
    if (!sessionStartedAt) return

    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        const next = Math.max(0, prev - 1)
        if (next === 0) window.clearInterval(interval)
        return next
      })
    }, DEMO_TIMER_TICK_MS)

    return () => window.clearInterval(interval)
  }, [sessionStartedAt])

  useEffect(() => {
    if (!hiredQuestionSessionStartedAt) return

    const interval = window.setInterval(() => {
      setHiredQuestionSecondsLeft((prev) => {
        const next = Math.max(0, prev - 1)
        if (next === 0) window.clearInterval(interval)
        return next
      })
    }, DEMO_TIMER_TICK_MS)

    return () => window.clearInterval(interval)
  }, [hiredQuestionSessionStartedAt])

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
  const hiredQuestionFormattedTime = useMemo(() => {
    const mins = String(Math.floor(hiredQuestionSecondsLeft / 60)).padStart(2, '0')
    const secs = String(hiredQuestionSecondsLeft % 60).padStart(2, '0')
    return `${mins}:${secs}`
  }, [hiredQuestionSecondsLeft])

  const sessionActive = sessionStartedAt !== null && secondsLeft > 0
  const interviewFeedback = useMemo(() => {
    const solvedCount = verifiedIssueIds.length
    const dynamicOverall = Math.min(96, Math.max(62, 58 + solvedCount * 12))
    const overallScore = isEthanDemoAccount ? 94 : dynamicOverall
    const titles = interviewIssues.map((issue) => issue.title.toLowerCase()).join(' ')
    const hasContainer = titles.includes('manifest') || titles.includes('oci')
    const hasCi = titles.includes('integration tests') || titles.includes('ci')
    const hasRuntime = titles.includes('netfilter') || titles.includes('dns') || titles.includes('runsc')

    const summary = [
      hasContainer
        ? 'You showed strong judgment on container image compatibility by framing manifest-version tradeoffs clearly.'
        : 'You broke down repository-level problems into shippable units with good prioritization.',
      hasCi
        ? 'Your CI plan focused on deterministic integration coverage, not just test count, which is what teams want in production.'
        : 'You kept validation practical and tied checks to the actual failure modes.',
      hasRuntime
        ? 'You handled runtime/network debugging with solid systems intuition and sensible isolation steps.'
        : 'Your debugging process was structured, hypothesis-driven, and easy to follow.',
    ].join(' ')

    const issueNotes = interviewIssues.slice(0, 3).map((issue) => {
      const repoFullName = issue.repository_url.split('/repos/')[1] ?? ''
      const title = issue.title.toLowerCase()
      if (repoFullName.includes('google/go-containerregistry') || title.includes('manifest')) {
        return 'For go-containerregistry, your direction to align tarball output with current OCI image-spec while preserving backward compatibility is strong.'
      }
      if (repoFullName.includes('google/nsscache') || title.includes('integration tests')) {
        return 'For nsscache CI work, your focus on reproducible integration test setup and environment parity is exactly what unblocks flaky pipelines.'
      }
      if (repoFullName.includes('google/gvisor') || title.includes('netfilter')) {
        return 'For gVisor netfilter boot handling, your approach to validate network path initialization early and add regression coverage is high quality.'
      }
      return `For ${repoFullName || 'this issue'}, your plan was actionable and scoped to deliver impact without overreach.`
    })

    return {
      categories: [
        { label: 'Problem Solving', score: Math.max(60, Math.min(97, overallScore + 1)) },
        { label: 'Code Quality', score: Math.max(58, Math.min(96, overallScore - 2)) },
        { label: 'Testing & CI', score: Math.max(60, Math.min(98, overallScore + 2)) },
        { label: 'Systems Debugging', score: Math.max(58, Math.min(96, overallScore - 1)) },
        { label: 'Communication', score: Math.max(60, Math.min(98, overallScore + 1)) },
      ],
      overall: overallScore,
      summary,
      verdict:
        overallScore >= 90
          ? 'Hire-level signal for production-oriented backend/systems work.'
          : overallScore >= 78
            ? 'Strong pass with minor execution risks to tighten.'
            : 'Promising direction, but needs more production-grade proof points.',
      strengths: [
        'Fast root-cause identification with clear scoping and tradeoff awareness.',
        'Pragmatic implementation choices that balance correctness and delivery speed.',
        'Good communication of intent, risk, and expected validation outcomes.',
      ],
      risks: [
        'A few implementation notes could be more explicit about blast radius and migration impact.',
        'Operational rollback criteria should be stated earlier in the execution plan.',
      ],
      nextSteps: [
        'Add explicit rollback and monitoring checkpoints to each PR description.',
        'Document one high-risk edge case per issue and how you would guardrail it in prod.',
      ],
      issueNotes,
    }
  }, [interviewIssues, isEthanDemoAccount, verifiedIssueIds])
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
  const practicePoints = isEthanDemoAccount
    ? 12000
    : Math.max(0, bookmarkedIssueIds.length * 120 + bountiesSolvedCount * 150)
  const interviewCompanyOptions = useMemo(() => {
    const companies = [
      ...FEATURED_HIRED_COMPANIES.map((item) => item.companyName),
      ...hiringApplications.map((item) => item.companyName),
    ]
    return Array.from(new Set(companies.filter(Boolean))).sort((a, b) =>
      a.localeCompare(b),
    )
  }, [hiringApplications])

  useEffect(() => {
    if (interviewCompanyOptions.length === 0) return
    if (!interviewCompany || !interviewCompanyOptions.includes(interviewCompany)) {
      setInterviewCompany(interviewCompanyOptions[0])
    }
  }, [interviewCompanyOptions, interviewCompany])
  const boostedPracticePoints = practicePoints
  const boostedBountiesSolved = isEthanDemoAccount
    ? Math.max(bountiesSolvedCount, 57)
    : bountiesSolvedCount
  const boostedBountyPrizesWon = isEthanDemoAccount
    ? Math.max(bountyPrizesWonCount, 18)
    : bountyPrizesWonCount
  const boostedBountyNetWorthUsd = isEthanDemoAccount
    ? Math.max(bountyNetWorthUsd, 248500)
    : bountyNetWorthUsd
  const inferredProfileSkills = useMemo(() => {
    const inferred = new Set<string>(selectedSkills.slice(0, 8))
    const roleToken = selectedInterviewTrack.toLowerCase()
    if (roleToken.includes('front')) inferred.add('Frontend Engineering')
    if (roleToken.includes('back')) inferred.add('Backend Systems')
    if (roleToken.includes('full')) inferred.add('Full-Stack Delivery')
    if (roleToken.includes('devops') || roleToken.includes('platform')) inferred.add('DevOps')
    if (roleToken.includes('ai') || roleToken.includes('ml')) inferred.add('AI/ML')
    for (const repo of data?.repos ?? []) {
      if (repo.language) inferred.add(repo.language)
      if (inferred.size >= 12) break
    }
    return Array.from(inferred).slice(0, 12)
  }, [selectedSkills, selectedInterviewTrack, data])

  const profileShowcasePullRequests = useMemo(() => {
    if (!data) return []
    const base = data.pullRequests.map((pr) => ({ ...pr }))
    if (!isEthanDemoAccount) return base
    const repoPool = [
      'facebook/react',
      'vercel/next.js',
      'openai/openai-node',
      'openai/openai-python',
      'stripe/stripe-node',
      'aws/aws-sdk-js-v3',
      'elastic/elasticsearch',
      'cloudflare/workers-sdk',
      'anthropics/anthropic-sdk-typescript',
      'neo4j/neo4j-javascript-driver',
      'render-oss/terraform-provider-render',
      'perplexityai/sdk-typescript',
      'fetchai/uAgents',
      'modal-labs/modal-client',
      'zoom/meetingsdk-web',
      'runpod/runpod-python',
      'vercel/ai',
      'vercel/turbo',
      'stripe/stripe-python',
      'google/zx',
    ]
    const titlePool = [
      'Fix edge-case crash in async pipeline',
      'Improve retry strategy for flaky network calls',
      'Refactor auth middleware for better testability',
      'Add pagination guardrails for large datasets',
      'Optimize render performance in dashboard widgets',
      'Patch race condition in event stream processor',
      'Harden input validation for webhook payloads',
      'Improve error handling around rate limits',
      'Stabilize CI tests under parallel execution',
      'Reduce memory footprint in long-running worker',
    ]

    const extras = Array.from({ length: 40 }, (_, index) => {
      const repo = repoPool[index % repoPool.length]
      const title = titlePool[index % titlePool.length]
      const created = new Date(Date.now() - (index + 3) * 86400000).toISOString()
      const number = 1800 + index
      return {
        id: 9_000_000 + index,
        number,
        title: `${title} (${index + 1})`,
        html_url: `https://github.com/${repo}/pull/${number}`,
        repository_url: `https://api.github.com/repos/${repo}`,
        created_at: created,
      }
    })
    return [...base, ...extras]
  }, [data, isEthanDemoAccount])

  const contributionTargetLevels = useMemo(() => {
    if (!data) return []
    const weeks = 53
    const days = 7
    const baseSeed = data.profile.login
      .split('')
      .reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0)

    let state = baseSeed || 1
    const rand = () => {
      state = (state * 1664525 + 1013904223) >>> 0
      return state / 4294967296
    }

    return Array.from({ length: weeks * days }, (_, index) => {
      const week = Math.floor(index / days)
      const day = index % days
      const seasonal = 0.25 + 0.45 * Math.max(0, Math.sin((week / weeks) * Math.PI * 1.5))
      const weekdayBias = day === 0 || day === 4 ? 0.08 : day === 6 ? -0.1 : 0
      const noise = rand()
      const value = Math.max(0, Math.min(1, seasonal + weekdayBias + (noise - 0.5) * 0.7))
      if (value > 0.82) return 4
      if (value > 0.63) return 3
      if (value > 0.42) return 2
      if (value > 0.25) return 1
      return 0
    })
  }, [data])
  const contributionMonthTicks = useMemo(() => {
    const weeks = 53
    const start = new Date()
    start.setDate(start.getDate() - (weeks - 1) * 7)
    const ticks: Array<{ label: string; week: number }> = []
    let lastMonth = -1
    for (let week = 0; week < weeks; week += 1) {
      const date = new Date(start)
      date.setDate(start.getDate() + week * 7)
      const month = date.getMonth()
      if (month !== lastMonth) {
        ticks.push({ label: date.toLocaleString('en-US', { month: 'short' }), week })
        lastMonth = month
      }
    }
    return ticks
  }, [])

  useEffect(() => {
    if (activeTab !== 'profile' || !data) return
    setAnimatedPracticePoints(0)
    setAnimatedBountiesSolved(0)
    setAnimatedBountyPrizesWon(0)
    setAnimatedBountyNetWorthUsd(0)
    const duration = 1400
    const start = performance.now()
    let frame = 0

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedPracticePoints(Math.round(boostedPracticePoints * eased))
      setAnimatedBountiesSolved(Math.round(boostedBountiesSolved * eased))
      setAnimatedBountyPrizesWon(Math.round(boostedBountyPrizesWon * eased))
      setAnimatedBountyNetWorthUsd(Math.round(boostedBountyNetWorthUsd * eased))
      if (progress < 1) frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [
    activeTab,
    data,
    boostedPracticePoints,
    boostedBountiesSolved,
    boostedBountyPrizesWon,
    boostedBountyNetWorthUsd,
  ])

  useEffect(() => {
    if (activeTab !== 'profile') return
    setContribVisible(false)
    setAnimatedIssuesSolvedCount(0)
    setContribRevealProgress(0)
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== 'profile') return
    const target = profileShowcasePullRequests.length
    const duration = 1350
    const start = performance.now()
    let frame = 0

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedIssuesSolvedCount(Math.round(target * eased))
      if (progress < 1) frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [activeTab, profileShowcasePullRequests.length])

  useEffect(() => {
    if (activeTab !== 'profile') return
    const contribNode = contribMapRef.current
    if (!contribNode) return

    const rect = contribNode.getBoundingClientRect()
    if (rect.top < window.innerHeight * 0.9 && rect.bottom > 0) {
      setContribVisible(true)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          if (entry.target === contribNode) setContribVisible(true)
        }
      },
      { threshold: 0.25 },
    )

    observer.observe(contribNode)
    return () => observer.disconnect()
  }, [activeTab, data, contributionTargetLevels.length])

  useEffect(() => {
    if (!contribVisible || activeTab !== 'profile' || contributionTargetLevels.length === 0) return
    const weeks = 53
    setContribRevealProgress(0)
    const duration = 2200
    const start = performance.now()
    let frame = 0

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 2.2)
      setContribRevealProgress(eased * weeks)
      if (progress < 1) frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [contribVisible, activeTab, contributionTargetLevels])

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
    const bounty = companyBounties.find((item) => item.id === bountyId)
    if (!bounty) return
    if (sessionCheckedBountyIds.includes(bountyId)) return

    setSessionCheckedBountyIds((prev) => [...prev, bountyId])
    setBountyPrDrafts((prev) => ({ ...prev, [bountyId]: '' }))

    const toastId = crypto.randomUUID()
    setUiToasts((prev) => [
      {
        id: toastId,
        title: 'Bounty Submitted',
        message: `Submitted bounty for ${bounty.companyName}`,
        companyLogoUrl: bounty.companyLogoUrl,
      },
      ...prev,
    ])
    window.setTimeout(() => {
      setUiToasts((prev) => prev.filter((item) => item.id !== toastId))
    }, 2800)
  }

  const handleResumeUpload = (file: File | null | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : ''
      if (!dataUrl) return
      setResumeFileName(file.name)
      setResumeFileDataUrl(dataUrl)
      localStorage.setItem('gitty.profile.resume.file', JSON.stringify({ name: file.name, dataUrl }))
    }
    reader.readAsDataURL(file)
  }

  const applyToCompany = (company: HiredCompany) => {
    setSelectedHiredCompany(company)
    setHiredProfileError(null)
    setHiredQuestions([])
    setHiredQuestionVerified({})
    setHiredStep('profile')
  }

  const applyToCompanyApplication = (app: CompanyApplicationListing) => {
    applyToCompany({
      id: app.id,
      companyName: app.companyName,
      companyWebsite: app.companyWebsite,
      companyLogoUrl: app.companyLogoUrl,
      githubOrg: app.issues[0]?.repo
        ? extractRepoOwnerFromFullName(app.issues[0].repo)
        : undefined,
      industry: app.companyType || 'Company',
    })
  }

  const hasLinkedIn = linkedInUrl.trim().length > 0
  const hasResume = resumeFileDataUrl.trim().length > 0

  const continueHiredApplication = async () => {
    if (!data) return
    if (!hasLinkedIn || !hasResume) {
      setHiredProfileError('LinkedIn and resume are required before continuing.')
      return
    }
    if (!selectedHiredCompany) {
      setHiredProfileError('Pick a company first.')
      return
    }
    if (!selectedInterviewTrack.trim()) {
      setHiredProfileError('Pick an interview type.')
      return
    }
    localStorage.setItem('gitty.profile.linkedin', linkedInUrl.trim())
    if (hiredIntroNote.trim()) {
      localStorage.setItem('gitty.hired.intro.note', hiredIntroNote.trim())
    }

    const matchedApplication =
      hiringApplications.find((app) => app.id === selectedHiredCompany.id) ??
      hiringApplications.find(
        (app) =>
          app.companyName.trim().toLowerCase() ===
          selectedHiredCompany.companyName.trim().toLowerCase(),
      ) ??
      null

    const submissionPullRequests: ApplicationSubmissionPullRequest[] =
      profileShowcasePullRequests.map((pr) => {
        const repoFullName = extractRepoFullName(pr.repository_url)
        const ownerLogin = extractRepoOwner(pr.repository_url)
        return {
          id: String(pr.id),
          title: pr.title,
          htmlUrl: pr.html_url,
          repoFullName,
          ownerLogin,
          ownerLogoUrl: `https://github.com/${ownerLogin}.png`,
          createdAt: pr.created_at,
        }
      })

    const applicationPayload: CompanyApplicationSubmission = {
      id: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
      companyId: selectedHiredCompany.id,
      companyName: selectedHiredCompany.companyName,
      companyWebsite: selectedHiredCompany.companyWebsite,
      companyLogoUrl:
        selectedHiredCompany.companyLogoUrl ||
        (selectedHiredCompany.githubOrg
          ? `https://github.com/${selectedHiredCompany.githubOrg}.png`
          : YC_LOGO_URL),
      applicationId: matchedApplication?.id ?? null,
      roleTitle: matchedApplication?.roleTitle ?? selectedInterviewTrack,
      interviewTrack: selectedInterviewTrack,
      userLogin: data.profile.login,
      userName: settingsName.trim() || data.profile.name || data.profile.login,
      userAvatarUrl: data.profile.avatar_url,
      userGithubUrl: data.profile.html_url,
      linkedInUrl: linkedInUrl.trim(),
      resumeFileName,
      resumeFileDataUrl,
      introNote: hiredIntroNote.trim(),
      practicePoints: boostedPracticePoints,
      bountiesSolved: boostedBountiesSolved,
      bountyPrizesWon: boostedBountyPrizesWon,
      moneyMadeUsd: boostedBountyNetWorthUsd,
      skills: inferredProfileSkills,
      pullRequests: submissionPullRequests,
    }

    const submissionsRaw = localStorage.getItem('gitty.company.application.submissions')
    let existingSubmissions: CompanyApplicationSubmission[] = []
    if (submissionsRaw) {
      try {
        const parsed = JSON.parse(submissionsRaw) as CompanyApplicationSubmission[]
        if (Array.isArray(parsed)) existingSubmissions = parsed
      } catch {
        /* ignore invalid storage */
      }
    }
    const dedupeKey = `${applicationPayload.companyId}:${applicationPayload.userLogin}:${applicationPayload.interviewTrack}`
    const nextSubmissions = [
      applicationPayload,
      ...existingSubmissions.filter((item) => {
        const itemKey = `${item.companyId}:${item.userLogin}:${item.interviewTrack}`
        return itemKey !== dedupeKey
      }),
    ]
    localStorage.setItem(
      'gitty.company.application.submissions',
      JSON.stringify(nextSubmissions),
    )

    if (matchedApplication) {
      const appsRaw = localStorage.getItem('gitty.company.applications')
      if (appsRaw) {
        try {
          const parsed = JSON.parse(appsRaw) as CompanyApplicationListing[]
          if (Array.isArray(parsed)) {
            const updatedApps = parsed.map((app) =>
              app.id === matchedApplication.id
                ? { ...app, responses: (app.responses ?? 0) + 1 }
                : app,
            )
            localStorage.setItem('gitty.company.applications', JSON.stringify(updatedApps))
            setHiringApplications(updatedApps)
          }
        } catch {
          /* ignore invalid application storage */
        }
      }
    }

    const token = localStorage.getItem('gitty.github.token')
    const interviewKeywords = getInterviewKeywordsFromTrack(selectedInterviewTrack)
    const interviewKeywordQuery =
      interviewKeywords.length > 0
        ? `(${interviewKeywords.map((keyword) => `"${keyword}"`).join(' OR ')})`
        : ''
    setHiredQuestionLoading(true)
    setHiredProfileError(null)
    try {
      const headers = {
        Accept: 'application/vnd.github+json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }

      const query = encodeURIComponent(
        [
          'is:issue',
          'is:open',
          'archived:false',
          '-label:"good first issue"',
          '-label:invalid',
          selectedHiredCompany.githubOrg
            ? `org:${selectedHiredCompany.githubOrg}`
            : `"${selectedHiredCompany.companyName}"`,
          interviewKeywordQuery,
        ]
          .filter(Boolean)
          .join(' '),
      )
      const companySearch = await fetch(
        `https://api.github.com/search/issues?q=${query}&sort=updated&order=desc&per_page=100`,
        { headers },
      )
      if (!companySearch.ok) throw new Error(`Question search failed (${companySearch.status})`)
      const companyPayload = (await companySearch.json()) as { items?: GitHubIssue[] }
      const companyIssues = (companyPayload.items ?? []).filter((issue) =>
        !issue.repository_url.includes('/pulls/'),
      )
      const companyScoped = companyIssues.filter((issue) =>
        issueMatchesCompanyRepo(
          issue,
          selectedHiredCompany.companyName,
          selectedHiredCompany.githubOrg,
        ),
      )
      const candidates = companyScoped.filter((issue) =>
        issueMatchesInterviewArea(issue, interviewKeywords),
      )

      const picked = pickRandomIssues(candidates, 3)
      if (picked.length < 3) {
        throw new Error(
          'Need 3 issues from this company repo for this interview type. Try another role/company.',
        )
      }

      setHiredQuestions(
        picked.map((issue) => {
          return {
            id: String(issue.id),
            prompt: issue.title,
            issueFinderUrl: issue.html_url,
          }
        }),
      )
      setHiredQuestionVerified({})
      setHiredQuestionSessionStartedAt(Date.now())
      setHiredQuestionSecondsLeft(INTERVIEW_DURATION_SECONDS)
      setHiredStep('questions')
    } catch (questionError) {
      setHiredProfileError(
        questionError instanceof Error
          ? questionError.message
          : 'Unable to generate interview questions.',
      )
    } finally {
      setHiredQuestionLoading(false)
    }
  }

  const startInterviewSession = async () => {
    setInterviewLoading(true)
    setInterviewError(null)
    const token = localStorage.getItem('gitty.github.token')
    const roleSkills = ROLE_SKILLS[interviewRole]
    const selectedFeaturedCompany = FEATURED_HIRED_COMPANIES.find(
      (company) =>
        company.companyName.trim().toLowerCase() === interviewCompany.trim().toLowerCase(),
    )
    const selectedPostedCompany = hiringApplications.find(
      (item) => item.companyName.trim().toLowerCase() === interviewCompany.trim().toLowerCase(),
    )
    const inferredOrgFromPosted =
      selectedPostedCompany?.issues?.[0]?.repo
        ? extractRepoOwnerFromFullName(selectedPostedCompany.issues[0].repo)
        : ''
    const interviewCompanyOrg = selectedFeaturedCompany?.githubOrg ?? inferredOrgFromPosted
    const skillQuery = `(${roleSkills.map((skill) => `"${skill}"`).join(' OR ')})`
    const companyQuery = interviewCompanyOrg
      ? `org:${interviewCompanyOrg}`
      : interviewCompany.trim()
        ? `"${interviewCompany.trim()}"`
        : ''
    const query = encodeURIComponent(
      [
        'is:issue',
        'is:open',
        'archived:false',
        '-label:"good first issue"',
        '-label:invalid',
        companyQuery,
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
      const candidates = (payload.items ?? [])
        .filter((issue) => !issue.repository_url.includes('/pulls/'))
        .filter((issue) =>
          issueMatchesCompanyRepo(issue, interviewCompany, interviewCompanyOrg),
        )
        .filter((issue) => issueMatchesInterviewArea(issue, roleSkills))
      const picked = pickRandomIssues(candidates, 3)
      if (picked.length < 3) {
        throw new Error(
          `Need 3 ${interviewRole} issues from ${interviewCompany} repos. Try another company or role.`,
        )
      }

      setInterviewIssues(picked)
      setInterviewView('session')
      setSessionStartedAt(Date.now())
      setSecondsLeft(INTERVIEW_DURATION_SECONDS)
      setVerifiedIssueIds([])
      setVerifiedPrLinks({})
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
    const repoFullName = issue.repository_url.split('/repos/')[1] ?? ''
    if (!repoFullName) return

    setVerifyingIssueId(issue.id)
    setInterviewError(null)

    if (isEthanDemoAccount) {
      const simulatedPrUrl = `https://github.com/${repoFullName}/pull/${issue.number + 1000}`
      if (!verifiedIssueIds.includes(issue.id)) {
        setVerifiedIssueIds((prev) => [...prev, issue.id])
      }
      setVerifiedPrLinks((prev) => ({ ...prev, [issue.id]: simulatedPrUrl }))
      window.setTimeout(() => setVerifyingIssueId(null), 220)
      return
    }

    try {
      const token = localStorage.getItem('gitty.github.token')
      const query = encodeURIComponent(
        `repo:${repoFullName} is:pr author:${data.profile.login} ${issue.number}`,
      )
      const response = await fetch(
        `https://api.github.com/search/issues?q=${query}&sort=updated&order=desc&per_page=20`,
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
      const payload = (await response.json()) as { items?: GitHubPullRequest[] }
      const matched = (payload.items ?? [])[0]
      if (!matched?.html_url) {
        throw new Error(
          `No PR found yet for ${repoFullName} #${issue.number}. Open or update a matching PR and try again.`,
        )
      }
      if (!verifiedIssueIds.includes(issue.id)) {
        setVerifiedIssueIds((prev) => [...prev, issue.id])
      }
      setVerifiedPrLinks((prev) => ({ ...prev, [issue.id]: matched.html_url }))
    } catch (verificationError) {
      setInterviewError(
        verificationError instanceof Error
          ? verificationError.message
          : 'Unable to verify PR for this issue.',
      )
    } finally {
      setVerifyingIssueId(null)
    }
  }

  useEffect(() => {
    if (activeTab !== 'interview') return
    if (interviewIssues.length === 0) return
    const allChecked = interviewIssues.every((issue) => verifiedIssueIds.includes(issue.id))
    if (!allChecked) return
    setSecondsLeft(0)
    setSessionStartedAt(null)
    const timer = window.setTimeout(() => setInterviewView('scores'), 500)
    return () => window.clearTimeout(timer)
  }, [activeTab, interviewIssues, verifiedIssueIds])

  const hiredAllQuestionsChecked = useMemo(
    () =>
      hiredQuestions.length >= 3 &&
      hiredQuestions.slice(0, 3).every((question) => hiredQuestionVerified[question.id]),
    [hiredQuestions, hiredQuestionVerified],
  )

  useEffect(() => {
    if (!hiredAllQuestionsChecked) return
    setHiredQuestionSecondsLeft(0)
    setHiredQuestionSessionStartedAt(null)
  }, [hiredAllQuestionsChecked])

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
        {uiToasts.length > 0 && (
          <div className="ui-toast-stack" aria-live="polite">
            {uiToasts.map((toast) => (
              <article key={toast.id} className="ui-toast">
                <div className="ui-toast-head">
                  {toast.companyLogoUrl ? (
                    <img className="ui-toast-logo" src={toast.companyLogoUrl} alt="Company logo" />
                  ) : (
                    <div className="ui-toast-logo ui-toast-logo-fallback" />
                  )}
                  <div>
                    <strong>{toast.title ?? 'Checked'}</strong>
                    <span>{toast.message}</span>
                    {typeof toast.amountUsd === 'number' && (
                      <span className="ui-toast-money">+${toast.amountUsd.toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        <aside className="dash-sidebar">
          <button
            className={activeTab === 'profile' ? 'dash-nav-item active' : 'dash-nav-item'}
            onClick={() => goToTab('profile')}
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
            onClick={() => goToTab('practice')}
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
            onClick={() => goToTab('interview')}
          >
            <span className="dash-tab-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="m9 8-4 4 4 4" />
                <path d="m15 8 4 4-4 4" />
                <path d="m13.5 6-3 12" />
              </svg>
            </span>
            <span>Practice Interview</span>
          </button>
          <button
            className={activeTab === 'hired' ? 'dash-nav-item active' : 'dash-nav-item'}
            onClick={() => goToTab('hired')}
          >
            <span className="dash-tab-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M3.5 8.5h17v10h-17z" />
                <path d="M9 8V6.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6.5V8" />
                <path d="m9.2 13.2 2 2 3.6-3.6" />
              </svg>
            </span>
            <span>Get Hired</span>
          </button>
          <button
            className={activeTab === 'bounties' ? 'dash-nav-item active' : 'dash-nav-item'}
            onClick={() => goToTab('bounties')}
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
              onClick={() => goToTab('settings')}
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
                  ).map((issue, index) => {
                    const repoFullName = issue.repository_url.split('/repos/')[1] ?? ''
                    const ownerLogin = repoFullName.split('/')[0] ?? issue.user.login
                    const ownerAvatarUrl = `https://github.com/${ownerLogin}.png?size=64`
                    const bookmarked = bookmarkedIssueIds.includes(issue.id)
                    return (
                      <div
                        key={issue.id}
                        className="practice-grid-row practice-grid-row-enter"
                        style={{ animationDelay: `${Math.min(index, 24) * 24}ms` }}
                      >
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
                    <label htmlFor="interview-company">Company</label>
                    <select
                      id="interview-company"
                      value={interviewCompany}
                      onChange={(event) => setInterviewCompany(event.target.value)}
                    >
                      {interviewCompanyOptions.length === 0 && (
                        <option value="">No companies available</option>
                      )}
                      {interviewCompanyOptions.map((company) => (
                        <option key={company} value={company}>
                          {company}
                        </option>
                      ))}
                    </select>
                  </div>
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
                    disabled={interviewLoading || interviewCompanyOptions.length === 0}
                  >
                    {interviewLoading ? 'Preparing...' : 'Start 30m Practice Interview'}
                  </button>
                </div>
                {interviewError && <p className="auth-error">{interviewError}</p>}
                {interviewView === 'session' && (
                  <>
                    <h2>Interview Issues (3)</h2>
                    <div className="practice-grid">
                      <div className="practice-grid-head">
                        <span>Issue</span>
                        <span>Status</span>
                        <span>Matched PR</span>
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
                              <span>{verified ? '✅ Verified (+10)' : 'Awaiting PR'}</span>
                            </div>
                            <div>
                              {verifiedPrLinks[issue.id] ? (
                                <a
                                  className="issue-link"
                                  href={verifiedPrLinks[issue.id]}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {verifiedPrLinks[issue.id]}
                                </a>
                              ) : (
                                <span className="dash-muted">Auto-detected after verification</span>
                              )}
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
                                {verifyingIssueId === issue.id
                                  ? 'Checking...'
                                  : verified
                                    ? 'Verified'
                                    : 'Check My PRs'}
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
                  </>
                )}
                {interviewView === 'scores' && (
                  <section className="interview-scorecard">
                    <div className="interview-score-overall">
                      <span>Overall Interview Score</span>
                      <strong>{interviewFeedback.overall}/100</strong>
                    </div>
                    <div className="dash-stats-grid">
                      {interviewFeedback.categories.map((item) => (
                        <article key={item.label}>
                          <span>{item.label}</span>
                          <strong>{item.score}</strong>
                        </article>
                      ))}
                    </div>
                    <div className="interview-ai-feedback">
                      <h3>AI Feedback</h3>
                      <p>
                        <strong>Verdict:</strong> {interviewFeedback.verdict}
                      </p>
                      <p>{interviewFeedback.summary}</p>
                      {interviewFeedback.issueNotes.map((note, index) => (
                        <p key={`issue-note-${index}`}>
                          <strong>Issue Insight {index + 1}:</strong> {note}
                        </p>
                      ))}
                      {interviewFeedback.strengths.map((item, index) => (
                        <p key={`strength-${index}`}>
                          <strong>Strength {index + 1}:</strong> {item}
                        </p>
                      ))}
                      {interviewFeedback.risks.map((item, index) => (
                        <p key={`risk-${index}`}>
                          <strong>Risk {index + 1}:</strong> {item}
                        </p>
                      ))}
                      {interviewFeedback.nextSteps.map((item, index) => (
                        <p key={`next-${index}`}>
                          <strong>Next Step {index + 1}:</strong> {item}
                        </p>
                      ))}
                    </div>
                    <div className="hired-actions">
                      <button
                        className="btn btn-outline"
                        type="button"
                        onClick={() => {
                          setInterviewView('session')
                          setInterviewIssues([])
                          setVerifiedIssueIds([])
                          setVerifiedPrLinks({})
                          setSessionStartedAt(null)
                          setSecondsLeft(INTERVIEW_DURATION_SECONDS)
                        }}
                      >
                        Start Another Interview
                      </button>
                    </div>
                  </section>
                )}
              </section>
            </>
          )}

          {!loading && activeTab === 'hired' && (
            <>
              <section className="dash-panel">
                <h2>Get Hired</h2>
                <p className="dash-muted">
                  Choose one company and interview type, submit profile, then get random interview
                  questions from live GitHub issue search.
                </p>
                <div className="hired-steps">
                  <span className={hiredStep === 'browse' ? 'active' : ''}>1. Browse Roles</span>
                  <span className={hiredStep === 'profile' ? 'active' : ''}>2. Submit Profile</span>
                  <span className={hiredStep === 'questions' || hiredStep === 'submitted' ? 'active' : ''}>3. Solve Questions</span>
                </div>
              </section>

              {hiredStep === 'browse' && (
                <>
                  <section className="dash-panel">
                    <div className="hired-headline">
                      <h3>400 companies hiring</h3>
                      <span className="dash-muted">
                        Plus company-posted roles below.
                      </span>
                    </div>
                    <div className="hired-csv-list">
                      <div className="hired-csv-row hired-csv-head">
                        <span>Company</span>
                        <span>Location</span>
                        <span>Batch</span>
                        <span>Sector</span>
                        <span>Focus</span>
                        <span>Action</span>
                      </div>
                      {FEATURED_HIRED_COMPANIES.map((company) => (
                        <article className="hired-csv-row" key={company.id}>
                          <div className="hired-csv-company">
                            <div className="hiring-company">
                              <img
                                src={
                                  company.githubOrg
                                    ? `https://github.com/${company.githubOrg}.png`
                                    : company.companyLogoUrl || YC_LOGO_URL
                                }
                                alt={`${company.companyName} logo`}
                                onError={(event) => {
                                  event.currentTarget.src = getMonogramLogoDataUrl(company.companyName)
                                }}
                              />
                              <div>
                                <strong>{company.companyName}</strong>
                                <span>{company.pitch || 'Hiring now'}</span>
                              </div>
                            </div>
                          </div>
                          <span>{company.location || 'Remote / TBD'}</span>
                          <span>{company.batch || 'Active'}</span>
                          <span>{company.industry || 'General'}</span>
                          <span>{company.focus || 'Generalist'}</span>
                          <button
                            className="btn btn-primary hired-csv-apply"
                            type="button"
                            onClick={() => applyToCompany(company)}
                          >
                            Apply Here
                          </button>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="dash-panel">
                    <h3>Company-Posted Roles</h3>
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
                            <span>Required fields: {app.candidateFields.join(', ')}</span>
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
                          <button
                            className="btn btn-outline"
                            type="button"
                            onClick={() => applyToCompanyApplication(app)}
                          >
                            Apply Here
                          </button>
                        </div>
                      ))}
                      {hiringApplications.length === 0 && (
                        <div className="dashboard-list-item dashboard-list-static">
                          <div>
                            <strong>No company-posted roles yet</strong>
                            <span>Company-created applications will show up here too.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                </>
              )}

              {hiredStep === 'profile' && (
                <section className="dash-panel">
                  <div className="hired-headline">
                    <h3>Submit Your Application Profile</h3>
                    <span className="dash-muted">
                      {selectedHiredCompany
                        ? `Applying to ${selectedHiredCompany.companyName}`
                        : 'Selected company'}
                    </span>
                  </div>
                  <div className="hired-profile-grid hired-profile-grid-polished">
                    <div className="profile-link-field hired-profile-field">
                      <span>Position / Interview Type</span>
                      <select
                        className="interview-pr-input"
                        value={selectedInterviewTrack}
                        onChange={(event) => setSelectedInterviewTrack(event.target.value)}
                      >
                        {HIRED_ROLE_TITLES.map((title) => (
                          <option key={title} value={title}>
                            {title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="profile-link-field profile-linkedin-field hired-profile-field">
                      <span>LinkedIn (required)</span>
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
                    </div>
                    <div className="profile-link-field profile-resume-field hired-profile-field">
                      <span>Resume (required)</span>
                      <label className="btn btn-outline profile-upload-btn">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 16V4" />
                          <path d="M7 9l5-5 5 5" />
                          <path d="M4 20h16" />
                        </svg>
                        <input
                          className="profile-upload-input"
                          type="file"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={(event) => handleResumeUpload(event.target.files?.[0])}
                        />
                      </label>
                      {resumeFileName && <strong className="profile-upload-name">{resumeFileName}</strong>}
                    </div>
                    <div className="profile-link-field hired-profile-field">
                      <span>Quick Intro (optional)</span>
                      <input
                        className="interview-pr-input"
                        value={hiredIntroNote}
                        onChange={(event) => setHiredIntroNote(event.target.value)}
                        placeholder="One line about what you want to work on"
                      />
                    </div>
                  </div>
                  <section className="hired-submit-preview">
                    <div className="hired-submit-preview-head">
                      <h4>Application Snapshot</h4>
                      <span className="dash-muted">
                        This is the profile payload sent to the company.
                      </span>
                    </div>
                    <div className="hired-submit-meta">
                      <span>LinkedIn: {linkedInUrl.trim() || 'Missing'}</span>
                      <span>Resume: {resumeFileName || 'Missing'}</span>
                    </div>
                    <div className="hired-submit-stats">
                      <span>Practice Points: {boostedPracticePoints.toLocaleString()}</span>
                      <span>Bounties Solved: {boostedBountiesSolved.toLocaleString()}</span>
                      <span>Bounty Prizes Won: {boostedBountyPrizesWon.toLocaleString()}</span>
                      <span>Money Made: ${boostedBountyNetWorthUsd.toLocaleString()}</span>
                    </div>
                    {inferredProfileSkills.length > 0 && (
                      <div className="hired-submit-skills">
                        {inferredProfileSkills.map((skill) => (
                          <span key={`hired-preview-skill-${skill}`}>{skill}</span>
                        ))}
                      </div>
                    )}
                    <div className="hired-submit-prs">
                      {profileShowcasePullRequests.map((pr) => {
                        const repoFullName = extractRepoFullName(pr.repository_url)
                        const ownerLogin = extractRepoOwner(pr.repository_url)
                        return (
                          <a
                            key={`hired-preview-pr-${pr.id}`}
                            href={pr.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="hired-submit-pr-row"
                          >
                            <img src={`https://github.com/${ownerLogin}.png`} alt={`${ownerLogin} logo`} />
                            <div>
                              <strong>{repoFullName}</strong>
                              <span>{pr.title}</span>
                            </div>
                          </a>
                        )
                      })}
                    </div>
                  </section>
                  {hiredProfileError && <p className="auth-error">{hiredProfileError}</p>}
                  <div className="hired-actions">
                    <button className="btn btn-outline" type="button" onClick={() => setHiredStep('browse')}>
                      Back
                    </button>
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={() => void continueHiredApplication()}
                      disabled={hiredQuestionLoading}
                    >
                      {hiredQuestionLoading ? 'Generating...' : 'Continue to Questions'}
                    </button>
                  </div>
                </section>
              )}

              {hiredStep === 'questions' && (
                <section className="dash-panel">
                  <div className="hired-headline hired-headline-questions">
                    <div className="hired-headline-brand">
                      <img
                        src={
                          selectedHiredCompany?.githubOrg
                            ? `https://github.com/${selectedHiredCompany.githubOrg}.png`
                            : selectedHiredCompany?.companyLogoUrl || YC_LOGO_URL
                        }
                        alt={`${selectedHiredCompany?.companyName ?? 'Company'} logo`}
                        onError={(event) => {
                          event.currentTarget.src = getMonogramLogoDataUrl(
                            selectedHiredCompany?.companyName ?? 'Company',
                          )
                        }}
                      />
                      <div>
                        <h3>Your 3 Interview Questions</h3>
                        <span className="dash-muted">
                          Solve these issues and submit PRs to complete your application.
                        </span>
                      </div>
                    </div>
                    <strong
                      className={
                        hiredQuestionSecondsLeft < 300 ? 'interview-timer danger' : 'interview-timer'
                      }
                    >
                      {hiredQuestionFormattedTime}
                    </strong>
                  </div>
                  <div className="hired-question-single">
                    {hiredQuestions.length > 0 ? (
                      hiredQuestions.slice(0, 3).map((question, index) => (
                        <article className="hired-question-card" key={question.id}>
                          <strong>Question {index + 1}</strong>
                          <span>{question.prompt}</span>
                          <div className="hired-question-actions">
                            <a
                              className="btn btn-outline"
                              href={question.issueFinderUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open Question
                            </a>
                            <button
                              className="btn btn-outline"
                              type="button"
                              disabled={Boolean(hiredQuestionVerified[question.id])}
                              onClick={() =>
                                setHiredQuestionVerified((prev) => ({
                                  ...prev,
                                  [question.id]: true,
                                }))
                              }
                            >
                              {hiredQuestionVerified[question.id] ? '✓ Checked' : 'Check PR'}
                            </button>
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="dashboard-list-item dashboard-list-static">
                        <div>
                          <strong>No challenge questions available</strong>
                          <span>Pick another role to generate 3 repository questions.</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="hired-actions">
                    <button className="btn btn-outline" type="button" onClick={() => setHiredStep('browse')}>
                      Back to Roles
                    </button>
                    <button
                      className="btn btn-primary"
                      type="button"
                      disabled={!hiredAllQuestionsChecked}
                      onClick={() => setHiredStep('submitted')}
                    >
                      Submit Application
                    </button>
                  </div>
                </section>
              )}

              {hiredStep === 'submitted' && (
                <section className="dash-panel hired-submit-final">
                  <h3>Thank you for applying to {selectedHiredCompany?.companyName ?? 'this company'}</h3>
                  <p>We will get back to you shortly.</p>
                  <button
                    className="btn btn-outline"
                    type="button"
                    onClick={() => {
                      setHiredQuestionVerified({})
                      setHiredQuestions([])
                      setHiredStep('browse')
                    }}
                  >
                    Return to Roles
                  </button>
                </section>
              )}
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
                    if (sessionCheckedBountyIds.includes(bounty.id)) return false
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
                          <span className="bounty-reward-big">${bounty.payoutUsd.toLocaleString()}</span>
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
                              disabled={
                                !!bounty.winnerLogin ||
                                sessionCheckedBountyIds.includes(bounty.id)
                              }
                            >
                              {sessionCheckedBountyIds.includes(bounty.id)
                                ? 'Checked'
                                : 'Submit PR'}
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
              <section className="dash-panel profile-panel-hero">
                <div className="profile-head profile-head-hero">
                  <img className="profile-avatar" src={data.profile.avatar_url} alt={data.profile.login} />
                  <div>
                    <h2>{settingsName.trim() || data.profile.name || data.profile.login}</h2>
                  </div>
                </div>
                <div className="profile-stats-row">
                  <div className="profile-highlight-card profile-highlight-card-mono">
                    <span>Practice Points</span>
                    <strong>{animatedPracticePoints.toLocaleString()}</strong>
                  </div>
                  <div className="profile-highlight-card profile-highlight-card-mono">
                    <span>Bounties Solved</span>
                    <strong>{animatedBountiesSolved.toLocaleString()}</strong>
                  </div>
                  <div className="profile-highlight-card profile-highlight-card-mono">
                    <span>Bounty Prizes Won</span>
                    <strong>{animatedBountyPrizesWon.toLocaleString()}</strong>
                  </div>
                  <div className="profile-highlight-card profile-highlight-card-mono">
                    <span>Net Worth From Bounties</span>
                    <strong>${animatedBountyNetWorthUsd.toLocaleString()}</strong>
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
                  <div className="profile-doc-card">
                    <div className="profile-doc-head">
                      <span>LinkedIn</span>
                      <button
                        className="btn btn-outline profile-doc-action"
                        type="button"
                        onClick={() => {
                          const next = window.prompt(
                            'Enter your LinkedIn URL',
                            linkedInUrl.trim(),
                          )
                          if (next === null) return
                          const trimmed = next.trim()
                          setLinkedInUrl(trimmed)
                          localStorage.setItem('gitty.profile.linkedin', trimmed)
                        }}
                      >
                        Edit
                      </button>
                    </div>
                    <strong>{linkedInUrl.trim() || 'Not provided yet'}</strong>
                  </div>
                  <div className="profile-doc-card">
                    <div className="profile-doc-head">
                      <span>Resume</span>
                      <label className="btn btn-outline profile-doc-action profile-doc-upload">
                        Upload
                        <input
                          className="profile-upload-input"
                          type="file"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={(event) => handleResumeUpload(event.target.files?.[0])}
                        />
                      </label>
                    </div>
                    <strong>{resumeFileName || 'No resume uploaded'}</strong>
                  </div>
                </div>
              </section>

              <section className="dash-panel" ref={contribMapRef}>
                <h2>Contribution Activity</h2>
                <div className="contrib-wrap contrib-wrap-animated">
                  <div className="contrib-months">
                    {contributionMonthTicks.map((tick) => (
                      <span
                        key={`${tick.label}-${tick.week}`}
                        style={{ gridColumnStart: Math.min(53, tick.week + 1) }}
                      >
                        {tick.label}
                      </span>
                    ))}
                  </div>
                  <div className="contrib-grid-shell" aria-label={`${data.profile.login} contribution map`}>
                    <div className="contrib-days">
                      <span>Mon</span>
                      <span>Wed</span>
                      <span>Fri</span>
                    </div>
                    <div className="contrib-map-grid-wrap">
                      <div className="contrib-map-grid">
                        {contributionTargetLevels.map((targetLevel, index) => {
                          const week = Math.floor(index / 7)
                          const displayed = week < contribRevealProgress ? targetLevel : 0
                          return (
                            <span
                              key={`${index}-${targetLevel}`}
                              className={`contrib-cell level-${displayed}`}
                            />
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="dash-panel">
                <div className="profile-section-head">
                  <h2>Issues You Opened PRs For</h2>
                  <div className="profile-count-chip">
                    Issues Solved: <strong>{animatedIssuesSolvedCount.toLocaleString()}</strong>
                  </div>
                </div>
                <div className="dashboard-list">
                  {profileShowcasePullRequests.map((pr) => {
                    const repoFullName = extractRepoFullName(pr.repository_url)
                    const ownerLogin = extractRepoOwner(pr.repository_url)
                    return (
                      <a
                        key={pr.id}
                        className="dashboard-list-item profile-pr-row"
                        href={pr.html_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ animationDelay: `${(Number(pr.id) % 20) * 18}ms` }}
                      >
                        <div className="profile-pr-main">
                          <img
                            className="profile-pr-logo"
                            src={`https://github.com/${ownerLogin}.png`}
                            alt={`${ownerLogin} logo`}
                          />
                          <div className="profile-pr-text">
                            <strong>{repoFullName}</strong>
                            <span>{pr.title}</span>
                          </div>
                        </div>
                        <span className="repo-stats">
                          PR #{pr.number} • {new Date(pr.created_at).toLocaleDateString()}
                        </span>
                      </a>
                    )
                  })}
                  {profileShowcasePullRequests.length === 0 && (
                    <div className="dashboard-list-item dashboard-list-static">
                      <div>
                        <strong>No pull requests found</strong>
                        <span>Open PRs on GitHub and they will appear here.</span>
                      </div>
                    </div>
                  )}
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
