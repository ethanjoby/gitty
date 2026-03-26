import { Link } from 'react-router-dom'
import logo from './gitty.png'
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
        <section className="sign-in-card">
          <span className="logo-mark logo-mark-dark sign-in-logo">
            <img src={logo} alt="Gitty logo" />
          </span>
          <h1>Get Started</h1>
          <p>Choose how you want to use Gitty.</p>

          <div className="start-options">
            <Link className="start-option" to="/signin">
              <h2>Engineer</h2>
              <p>Sign in with GitHub to practice issues and interviews.</p>
              <span>Continue as Engineer</span>
            </Link>

            <Link className="start-option" to="/company/signin">
              <h2>Company</h2>
              <p>Sign in with Google to create roles, track applicants, and post bounties.</p>
              <span>Continue as Company</span>
            </Link>
          </div>

          <Link className="sign-in-back" to="/">
            Back to homepage
          </Link>
        </section>
      </main>
    </div>
  )
}

export default GetStarted
