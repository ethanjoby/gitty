import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from './gitty.png'
import './App.css'

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

function termLineClass(line: string): string {
  if (line.startsWith('$')) return 'term-prompt'
  if (line.startsWith('Found 3') || line.startsWith('Starting')) return 'term-success'
  if (line.startsWith('#')) return 'term-issue'
  return 'term-muted'
}

function App() {
  const [typedLines, setTypedLines] = useState<string[]>([])
  const [currentLine, setCurrentLine] = useState('')
  const [isDone, setIsDone] = useState(false)
  const terminalRef = useRef<HTMLDivElement | null>(null)
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

  return (
    <div className="page">
      <div className="bg" aria-hidden="true">
        <div className="bg-grid" />
        <div className="bg-vignette" />
      </div>

      <header className="nav" role="banner">
        <div className="nav-inner">
          <a className="nav-logo" href="/" aria-label="Gitty home">
            <span className="nav-logo-mark">
              <img src={logo} alt="" />
            </span>
            Gitty
          </a>
          <nav className="nav-links" aria-label="Primary navigation">
            <a href="#how">How it works</a>
            <a href="#compare">Compare</a>
            <a href="#trust">Trust</a>
          </nav>
          <div className="nav-actions">
            <button className="btn-cta" onClick={handleGetStarted}>
              Sign In
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero" id="hero" aria-labelledby="hero-headline">
          <div className="hero-content" data-animate>
            <p className="eyebrow">Modern hiring, real work.</p>
            <h1 id="hero-headline" className="hero-headline">
              <span className="hero-title-lite">Your Work is Your</span>
              <br />
              <span className="hero-highlight-wrap">
                <span className="hero-highlight">Interview</span>
                <span className="cursor cursor-hero" aria-hidden="true" />
              </span>
            </h1>
            <p className="hero-subtitle">
              Get paid to practice on real codebases. Get hired by shipping
              real PRs and building a verified profile.
            </p>
            <div className="hero-actions">
              <button className="btn-cta" onClick={handleGetStarted}>
                Get Started
              </button>
              <button className="btn-ghost" onClick={handleGetStarted}>
                See how it works
              </button>
            </div>
          </div>

          <div className="hero-terminal" data-animate>
            <div className="terminal-card-wrap">
              <div className="terminal-titlebar">
                <div className="terminal-dots">
                  <span className="dot-red" />
                  <span className="dot-yellow" />
                  <span className="dot-green" />
                </div>
                <span className="terminal-label">gitty</span>
                <span className="terminal-logo-mark">
                  <img src={logo} alt="" />
                </span>
              </div>
              <div className="terminal-body" ref={terminalRef}>
                {typedLines.map((line, index) => (
                  <p key={`${line}-${index}`} className={termLineClass(line)}>
                    {line}
                  </p>
                ))}
                {!isDone && (
                  <p className="term-prompt">
                    {currentLine}
                    <span className="cursor" aria-hidden="true" />
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="section-features" id="how" aria-labelledby="features-heading">
          <div className="section-features-inner">
            <div className="section-label">How it works</div>
            <h2 id="features-heading" className="section-heading">
              Real work.<br /><span className="section-heading-accent">Real results.</span>
            </h2>
            <div className="feature-grid">
              <div className="feature-card" data-animate>
                <div className="feature-icon" aria-hidden="true">⌥</div>
                <h3 className="feature-title">Pick a bounty</h3>
                <p className="feature-desc">Browse real open-source issues with posted bounties. No toy problems — actual production codebases.</p>
              </div>
              <div className="feature-card" data-animate>
                <div className="feature-icon" aria-hidden="true">⚡</div>
                <h3 className="feature-title">Ship a PR</h3>
                <p className="feature-desc">Write the code, open the PR, get it merged. Your GitHub profile becomes your verified track record.</p>
              </div>
              <div className="feature-card" data-animate>
                <div className="feature-icon" aria-hidden="true">◈</div>
                <h3 className="feature-title">Get hired</h3>
                <p className="feature-desc">Companies see exactly what you can do. Interviews become a formality when your work speaks first.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section-cta" aria-labelledby="cta-heading">
          <div className="cta-inner">
            <h2 id="cta-heading" className="cta-heading">
              Stop interviewing.<br />
              <span className="cta-heading-accent">Start shipping.</span>
            </h2>
            <p className="cta-sub">Join engineers who let their commits do the talking.</p>
            <button className="btn-cta btn-cta-lg" onClick={handleGetStarted}>
              Get started — it's free
            </button>
          </div>
        </section>

        <footer className="footer" role="contentinfo">
          <div className="footer-inner">
            <span className="footer-copy">© 2026 Gitty. All rights reserved.</span>
            <div className="footer-links">
              <a href="#how">How it works</a>
              <a href="#compare">Compare</a>
              <a href="#trust">Trust</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}

export default App
