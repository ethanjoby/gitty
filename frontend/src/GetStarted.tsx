import { Link } from 'react-router-dom'
import './App.css'

function GetStarted() {
  return (
    <div className="page sign-in-page">
      <div className="bg">
        <div className="bg-grid bg-grid-1" />
        <div className="bg-grid bg-grid-2" />
        <div className="bg-grid bg-grid-3" />
      </div>

      <main className="sign-in-main">
        <div className="gs-container">
          <div className="gs-header">
            <span className="sign-in-wordmark-name">gitty</span>
            <h1 className="gs-heading">How are you using Gitty?</h1>
            <p className="gs-sub">Choose your path to get started.</p>
          </div>

          <div className="gs-options">
            <Link className="gs-card" to="/signin">
              <div className="gs-card-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              </div>
              <h2 className="gs-card-title">Engineer</h2>
              <p className="gs-card-desc">Practice real GitHub issues, sharpen your skills, and get matched to engineering roles.</p>
              <span className="gs-card-cta">Continue as Engineer</span>
            </Link>

            <Link className="gs-card" to="/company/signin">
              <div className="gs-card-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                </svg>
              </div>
              <h2 className="gs-card-title">Company</h2>
              <p className="gs-card-desc">Post bounties, create roles, and evaluate applicants through real-world code challenges.</p>
              <span className="gs-card-cta">Continue as Company</span>
            </Link>
          </div>

          <Link className="sign-in-back" to="/">
            ← Back to homepage
          </Link>
        </div>
      </main>
    </div>
  )
}

export default GetStarted
