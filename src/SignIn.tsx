import { useEffect, useState } from 'react'
import {
  getAdditionalUserInfo,
  GithubAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
} from 'firebase/auth'
import { Link, useNavigate } from 'react-router-dom'
import { auth, githubProvider } from './firebase'
import logo from './gitty.png'
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
          <span className="logo-mark logo-mark-dark sign-in-logo">
            <img src={logo} alt="Gitty logo" />
          </span>
          <h1>Sign in with GitHub</h1>
          <p>
            Continue with your GitHub account to access your Gitty dashboard.
          </p>
          {authError && (
            <p className="auth-error" role="alert">
              {authError}
            </p>
          )}
          <button className="btn btn-primary sign-in-btn" onClick={handleGithubSignIn}>
            Continue with GitHub
          </button>
          <Link className="sign-in-back" to="/get-started">
            Back to get started
          </Link>
        </section>
      </main>
    </div>
  )
}

export default SignIn
