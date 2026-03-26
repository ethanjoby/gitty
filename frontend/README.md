# Gitty

Gitty is a React + TypeScript web app for a hiring workflow where developers practice on real codebases, build a verified profile, and move through onboarding and dashboard flows.

## Tech Stack

- React 19
- TypeScript
- Vite
- React Router
- Firebase (Auth, Firestore, Analytics)
- TailwindCSS + custom CSS

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Vite will print the local URL (usually `http://localhost:5173`).

## Available Scripts

- `npm run dev` - start the development server
- `npm run build` - type-check and create a production build
- `npm run lint` - run ESLint
- `npm run preview` - preview the production build locally

## Route Map

- `/` - landing page
- `/get-started` - role selection / entry
- `/signin` - user sign-in
- `/onboarding` - user onboarding
- `/dashboard` and `/dashboard/:tab` - user dashboard
- `/company/signin` - company sign-in
- `/company/onboarding` - company onboarding
- `/company/dashboard` - company dashboard

## Project Structure

```text
src/
  App.tsx                  # Landing page
  main.tsx                 # App bootstrap + routes
  SignIn.tsx               # User auth page
  UserOnboarding.tsx       # User onboarding flow
  Dashboard.tsx            # User dashboard
  CompanySignIn.tsx        # Company auth page
  CompanyOnboarding.tsx    # Company onboarding flow
  CompanyDashboard.tsx     # Company dashboard
  firebase.ts              # Firebase initialization/providers
```

## Notes

- Firebase config is currently hardcoded in `src/firebase.ts`.
- If you plan to deploy or share this project, move config to environment variables.
