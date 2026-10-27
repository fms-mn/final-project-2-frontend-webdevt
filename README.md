# FILME frontend

The React website of **FILME**, a cinema booking system (MERN): browsing movies and showtimes, seat selection, booking and test payment, customer tickets and profile, and the administrator dashboard.

- Frontend repository: this one
- Backend repository: https://github.com/fms-mn/final-project-2-backend-webdevt
- Live backend (Render): https://filme-eqd4.onrender.com

Group 2, Section C3A.

## Tech

React 19, React Router 6, Vite 6. The site talks to the backend API under `/api`.

## Run it locally

```bash
npm ci
npm run dev        # http://localhost:3000
```

In development Vite forwards `/api` to a backend. By default that is `http://localhost:5000` (run the backend repository there). To use the deployed backend instead, with no database needed:

```powershell
$env:VITE_API_PROXY = 'https://filme-eqd4.onrender.com'
npm.cmd run dev
```

(macOS/Linux: `VITE_API_PROXY=https://filme-eqd4.onrender.com npm run dev`.)

```bash
npm test           # automated tests for the website's logic
npm run build      # production build in dist/
```

## Deploy on Vercel

1. On vercel.com choose **Add New, Project** and import this repository. Vercel detects Vite; leave the defaults (**Build Command** `npm run build`, **Output Directory** `dist`).
2. Deploy. Your site gets an address like `https://filme-frontend.vercel.app`.
3. In the backend's Render settings add that address to `ALLOWED_ORIGINS` and `APP_URL`, then let Render restart.

`vercel.json` makes two things work:

- `/api/*` is forwarded to the backend on Render, so the browser only talks to one address. That keeps the HttpOnly login cookie first-party and needs no cross-site cookie settings.
- Every other path serves `index.html`, so refreshing on a page like `/movies` works.

If the backend address ever changes, edit the `destination` in `vercel.json`.
