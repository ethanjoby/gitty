import { initializeApp } from 'firebase/app'
import { getAuth, GithubAuthProvider, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics, isSupported } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: 'AIzaSyDVByxOVYP5z-5Co9QcVEuepZP1DDpca-E',
  authDomain: 'gitty-25f64.firebaseapp.com',
  projectId: 'gitty-25f64',
  storageBucket: 'gitty-25f64.firebasestorage.app',
  messagingSenderId: '359843066194',
  appId: '1:359843066194:web:cf7746b1b8b1931e9eca8b',
  measurementId: 'G-2ZGJJ3PGVS',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const githubProvider = new GithubAuthProvider()
export const googleProvider = new GoogleAuthProvider()

if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported) getAnalytics(app)
    })
    .catch(() => {
      /* analytics is optional */
    })
}
