import { useEffect, useState } from 'react'
import {
  getAdditionalUserInfo,
  GithubAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
} from 'firebase/auth'
import { Link, useNavigate } from 'react-router-dom'
import { auth, githubProvider } from './firebase'
import './App.css'

function getAuthErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return 'Sign-in failed. Please try again.'
  }

  const code = String(error.code)

  if (code === 'auth/unauthorized-domain') {
    return 'This domain is not authorized in Firebase Auth. Add localhost to Authorized domains.'
  }

  if (code === 'auth/operation-not-allowed') {
    return 'GitHub sign-in is not enabled in Firebase Authentication providers.'
  }

  if (code === 'auth/account-exists-with-different-credential') {
    return 'An account with this email already exists under another sign-in method.'
  }

  if (code === 'auth/popup-blocked') {
    return 'Popup was blocked by the browser. Allow popups for this site and try again.'
  }

  if (code === 'auth/popup-closed-by-user') {
    return 'GitHub sign-in popup was closed before finishing.'
  }

  if (code === 'auth/missing-initial-state') {
    return 'Browser storage blocked redirect auth state. Use popup sign-in instead.'
  }

  if (code === 'auth/invalid-credential' || code === 'auth/invalid-oauth-client-id') {
    return 'GitHub OAuth is misconfigured in Firebase. Check the GitHub client ID and secret.'
  }

  return `Sign-in failed (${code}).`
}

function SignIn() {
  const [authError, setAuthError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return
      const role = localStorage.getItem('gitty.auth.role')
      if (role === 'company') {
        navigate('/company/dashboard')
        return
      }
      const onboardingComplete =
        localStorage.getItem('gitty.user.onboardingComplete') === 'true'
      navigate(onboardingComplete ? '/dashboard' : '/onboarding')
    })

    return () => unsub()
  }, [navigate])

  const handleGithubSignIn = async () => {
    setAuthError(null)
    try {
      const result = await signInWithPopup(auth, githubProvider)
      const credential = GithubAuthProvider.credentialFromResult(result)
      const additional = getAdditionalUserInfo(result)

      if (credential?.accessToken) {
        localStorage.setItem('gitty.github.token', credential.accessToken)
      }
      if (additional?.username) {
        localStorage.setItem('gitty.github.username', additional.username)
      }
      localStorage.setItem('gitty.auth.role', 'user')

      const onboardingComplete =
        localStorage.getItem('gitty.user.onboardingComplete') === 'true'
      navigate(onboardingComplete ? '/dashboard' : '/onboarding')
    } catch (error) {
      setAuthError(getAuthErrorMessage(error))
      console.error('Starting GitHub popup sign-in failed:', error)
    }
  }

  return (
    <div className="page sign-in-page">
      <div className="bg">
        <div className="bg-grid bg-grid-1" />
        <div className="bg-grid bg-grid-2" />
        <div className="bg-grid bg-grid-3" />
      </div>

      <main className="sign-in-main">
        <section className="sign-in-card">
          <div className="sign-in-wordmark">
            <span className="sign-in-wordmark-name">gitty</span>
            <span className="sign-in-wordmark-sub">for engineers</span>
          </div>

          <h1 className="sign-in-heading">Sign in to continue</h1>
          <p className="sign-in-copy">
            GitHub OAuth grants read access to your public profile and repositories. No write permissions are requested.
          </p>

          {authError && (
            <p className="auth-error" role="alert">
              {authError}
            </p>
          )}

          <button className="sign-in-oauth-btn" onClick={handleGithubSignIn}>
            <svg className="sign-in-oauth-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.113.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
            Continue with GitHub
          </button>

          <Link className="sign-in-back" to="/get-started">
            ← Back to gitty.app
          </Link>
        </section>
      </main>
    </div>
  )
}

export default SignIn
