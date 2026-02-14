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
              <span className="hero-title-lite">Your Work is Your</span>
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
              <button className="btn btn-primary" onClick={handleGetStarted}>
                Get Started
              </button>
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
