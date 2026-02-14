import { initializeApp } from 'firebase/app'
import { getAuth, GithubAuthProvider, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyDVByxOVYP5z-5Co9QcVEuepZP1DDpca-E',
  authDomain: 'gitty-25f64.firebaseapp.com',
  projectId: 'gitty-25f64',
  storageBucket: 'gitty-25f64.firebasestorage.app',
  messagingSenderId: '359843066194',
  appId: '1:359843066194:web:cf7746b1b8b1931e9eca8b',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const githubProvider = new GithubAuthProvider()
export const googleProvider = new GoogleAuthProvider()
