import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from './gitty.png'
import './App.css'

function App() {
  const terminalScript = [
    '$ gitty init --repo stripe/stripe-node',
    'Cloning repository at commit a3f2b1c...',
    'Analyzing codebase structure...',
    'Found 3 matching issues:',
    '#1842 Add retry logic for idempotent requests',
    'Difficulty: Medium | Bounty: $150',
    '#1856 Implement webhook signature verification',
    'Difficulty: Hard | Bounty: $300',
    '#1901 Fix TypeScript types for PaymentIntent',
    'Difficulty: Easy | Bounty: $75',
    '$ gitty start 1842',
    'Starting session... Timer begins now.',
  ]
  const [typedLines, setTypedLines] = useState<string[]>([])
  const [currentLine, setCurrentLine] = useState('')
  const [isDone, setIsDone] = useState(false)
  const terminalRef = useRef<HTMLDivElement | null>(null)
  const [interviewText, setInterviewText] = useState('')
  const [howMode, setHowMode] = useState<'engineers' | 'companies'>('engineers')
  const navigate = useNavigate()

  useEffect(() => {
    const items = Array.from(
      document.querySelectorAll<HTMLElement>('[data-animate]'),
    )
    if (!('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('in-view'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.2 },
    )

    items.forEach((item) => observer.observe(item))

    return () => observer.disconnect()
  }, [])

  const handleGetStarted = () => navigate('/get-started')

  useEffect(() => {
    const terminal = terminalRef.current
    if (!terminal) return
    terminal.scrollTop = terminal.scrollHeight
  }, [typedLines, currentLine])

  useEffect(() => {
    let timeoutId: number | undefined
    let cancelled = false

    const startTyping = () => {
      if (cancelled) return
      setTypedLines([])
      setCurrentLine('')
      setIsDone(false)

      let lineIndex = 0
      let charIndex = 0

      const typeNext = () => {
        if (cancelled) return
        if (lineIndex >= terminalScript.length) {
          setIsDone(true)
          timeoutId = window.setTimeout(startTyping, 2000)
          return
        }

        const line = terminalScript[lineIndex]

        if (charIndex <= line.length) {
          setCurrentLine(line.slice(0, charIndex))
          charIndex += 1
          const delay = line.startsWith('$') ? 45 : 28
          timeoutId = window.setTimeout(typeNext, delay)
        } else {
          setTypedLines((prev) => [...prev, line])
          setCurrentLine('')
          charIndex = 0
          lineIndex += 1
          timeoutId = window.setTimeout(typeNext, 420)
        }
      }

      typeNext()
    }

    startTyping()

    return () => {
      cancelled = true
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [])

  useEffect(() => {
    let timeoutId: number | undefined
    let cancelled = false
    const word = 'Interview'

    const startTyping = () => {
      if (cancelled) return
      setInterviewText('')
      let index = 0

      const typeNext = () => {
        if (cancelled) return
        if (index <= word.length) {
          setInterviewText(word.slice(0, index))
          index += 1
          timeoutId = window.setTimeout(typeNext, 80)
        } else {
          timeoutId = window.setTimeout(startTyping, 1400)
        }
      }

      typeNext()
    }

    startTyping()

    return () => {
      cancelled = true
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [])

  return (
    <div className="page dark">
      <div className="bg">
        <div className="bg-grid bg-grid-1" />
        <div className="bg-grid bg-grid-2" />
        <div className="bg-grid bg-grid-3" />
      </div>

      <header className="nav">
        <div className="nav-inner nav-slab">
          <div className="logo">
            <span className="logo-mark logo-mark-dark">
              <img src={logo} alt="Gitty logo" />
            </span>
            Gitty
          </div>
          <nav className="nav-links">
            <a href="#how">How it works</a>
            <a href="#compare">Compare</a>
            <a href="#trust">Trust</a>
          </nav>
          <div className="nav-actions">
            <button className="btn btn-outline" onClick={handleGetStarted}>
              Sign In
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero hero-split hero-center" id="hero">
          <div className="hero-left" data-animate>
            <p className="eyebrow">Modern hiring, real work.</p>
            <h1>
              Your Work is Your
              <span className="hero-highlight-wrap">
                <span className="hero-highlight">{interviewText}</span>
                <span className="cursor cursor-hero" aria-hidden="true" />
              </span>
            </h1>
            <p className="hero-subtitle">
              Get paid to practice on real codebases. Get hired by shipping
              real PRs and building a verified profile.
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary">Request Early Access</button>
              <button className="btn btn-ghost">See Demo</button>
            </div>
          </div>

          <div className="hero-right" data-animate>
            <div className="code-panel">
              <div className="terminal-header terminal-header-dark">
                <div className="terminal-dots">
                  <span />
                  <span />
                  <span />
                </div>
                <span>gitty</span>
                <span className="terminal-logo">
                  <img src={logo} alt="Gitty logo" />
                </span>
              </div>
              <div className="terminal-body terminal-body-dark" ref={terminalRef}>
                {typedLines.map((line, index) => (
                  <p
                    key={`${line}-${index}`}
                    className={
                      line.startsWith('$')
                        ? 'prompt'
                        : line.startsWith('Found 3') || line.startsWith('Starting')
                          ? 'success'
                          : line.startsWith('Cloning') ||
                              line.startsWith('Analyzing') ||
                              line.startsWith('Difficulty')
                            ? 'muted'
                            : line.startsWith('#')
                              ? 'issue'
                              : 'muted'
                    }
                  >
                    {line}
                  </p>
                ))}
                {!isDone && (
                  <p className="prompt">
                    {currentLine}
                    <span className="cursor" aria-hidden="true" />
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="section how" id="how">
          <div className="section-title how-title" data-animate>
            <h2 className="glitch glitch-spacing" data-text="LeetCode is dead.">
              LeetCode is dead.
            </h2>
            <p>Two sides of the same platform. Real signal for everyone.</p>
          </div>
          <div className="pill-toggle-wrapper" data-animate>
            <div className="pill-toggle">
              <button
                className={howMode === 'engineers' ? 'active' : ''}
                onClick={() => setHowMode('engineers')}
              >
                For Engineers
              </button>
              <button
                className={howMode === 'companies' ? 'active' : ''}
                onClick={() => setHowMode('companies')}
              >
                For Companies
              </button>
            </div>
          </div>
          <div className="cards how-cards" data-animate>
            {(
              howMode === 'engineers'
                ? [
                    {
                      title: 'Pull in a real codebase',
                      body: 'Work on production repos from real companies. Open source codebases with real issues, real complexity, real context.',
                    },
                    {
                      title: 'Pick an issue',
                      body: "Choose from real GitHub issues tied to that commit. Bugs, features, actual tasks. The kind of work you'd do on the job.",
                    },
                    {
                      title: 'Submit your PR',
                      body: 'Ship your solution as a pull request. Your work gets reviewed and scored on code quality, architecture, and test coverage. Every PR builds your verified profile.',
                    },
                    {
                      title: 'Get paid',
                      body: "Bounties pay out instantly when your PR is submitted, with the rest paid once it's merged. Build your reputation and your bank account at the same time.",
                    },
                  ]
                : [
                    {
                      title: 'Submit your codebase',
                      body: 'Connect your GitHub repo and pick a commit hash. Aryn automatically flattens it into a clean snapshot with no history, no blame, no way for candidates to see how you built it. Your IP stays protected.',
                    },
                    {
                      title: 'Watch candidates work',
                      body: 'Candidates get dropped into your codebase cold inside a sandboxed environment. No copy-paste out, no cloning. Your code never leaves the platform.',
                    },
                    {
                      title: 'Compare approaches',
                      body: 'Did they follow the same path you took? Or find a better approach you never considered? The signal is in the work, not the answer.',
                    },
                    {
                      title: 'Hire with confidence',
                      body: 'Access a ranked database of engineers with verified project history. Filter by skills, challenge performance, and real contributions. Hire people who can ship.',
                    },
                  ]
            ).map((step, index) => (
              <article key={step.title} className="card">
                <span className="card-index">{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section proof" id="compare">
          <div className="section-title" data-animate>
            <h2>Real Engineering vs Pattern Memorization</h2>
          </div>
          <div className="compare-table compare-table-dark" data-animate>
            <div className="compare-head compare-head-dark">
              <span />
              <span className="compare-gitty">Gitty</span>
              <span>LeetCode</span>
            </div>
            {[
              {
                label: 'What you practice on',
                good: 'Real codebases with history',
                bad: 'Toy problems in isolation',
              },
              {
                label: 'Evaluation signal',
                good: 'Actual engineering ability',
                bad: 'Pattern memorization',
              },
              {
                label: 'Your output',
                good: 'Production-ready code',
                bad: 'A correct answer',
              },
              {
                label: 'Signal for hiring',
                good: 'Can ship in a real repo',
                bad: 'Can recite algorithms',
              },
              {
                label: 'AI-resistant',
                good: 'Yes. Real work can’t be faked.',
                bad: 'No. AI passes patterns fast.',
              },
            ].map((row) => (
              <div key={row.label} className="compare-row compare-row-dark">
                <span>{row.label}</span>
                <span className="good compare-gitty">
                  <span className="check">✓</span>
                  {row.good}
                </span>
                <span className="bad">{row.bad}</span>
              </div>
            ))}
          </div>
        </section>

        <footer className="footer">
          <div className="footer-inner">
            <span className="footer-copy">© 2026 Gitty. All rights reserved.</span>
            <button className="btn btn-primary btn-join">Join now</button>
          </div>
        </footer>

      </main>
    </div>
  )
}

export default App
