import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup } from 'firebase/auth'
import { Link, useNavigate } from 'react-router-dom'
import { auth, googleProvider } from './firebase'
import logo from './gitty.png'
import './App.css'

function getCompanyAuthErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return 'Sign-in failed. Please try again.'
  }

  const code = String(error.code)

  if (code === 'auth/popup-blocked') {
    return 'Popup was blocked by the browser. Allow popups for this site and try again.'
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Google sign-in popup was closed before finishing.'
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Google sign-in is not enabled in Firebase Authentication providers.'
  }
  return `Sign-in failed (${code}).`
}

function CompanySignIn() {
  const [authError, setAuthError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return
      const onboardingComplete =
        localStorage.getItem('gitty.company.onboardingComplete') === 'true'
      navigate(onboardingComplete ? '/company/dashboard' : '/company/onboarding')
    })
    return () => unsub()
  }, [navigate])

  const handleGoogleSignIn = async () => {
    setAuthError(null)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      localStorage.setItem('gitty.auth.role', 'company')
      localStorage.setItem(
        'gitty.company.account',
        JSON.stringify({
          name: result.user.displayName ?? '',
          email: result.user.email ?? '',
          photoURL:
            result.user.photoURL ??
            result.user.providerData.find((p) => p.providerId === 'google.com')?.photoURL ??
            '',
        }),
      )
      const onboardingComplete =
        localStorage.getItem('gitty.company.onboardingComplete') === 'true'
      navigate(onboardingComplete ? '/company/dashboard' : '/company/onboarding')
    } catch (error) {
      setAuthError(getCompanyAuthErrorMessage(error))
      console.error('Starting Google popup sign-in failed:', error)
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
          <h1>Company Sign In</h1>
          <p>Continue with Google to manage applications and bounties in Gitty.</p>
          {authError && (
            <p className="auth-error" role="alert">
              {authError}
            </p>
          )}
          <button className="btn btn-primary sign-in-btn" onClick={handleGoogleSignIn}>
            Continue with Google
          </button>
          <Link className="sign-in-back" to="/get-started">
            Back to get started
          </Link>
        </section>
      </main>
    </div>
  )
}

export default CompanySignIn
