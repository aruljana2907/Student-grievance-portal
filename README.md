# Secure Student Grievance & Feedback Portal

A live, click-through prototype of the project described in the internship
report *"Concepts of Web Development – Secure Student Grievance & Feedback
Portal"* (Janani A, Layercodes Technologies Pvt Ltd, June 2026). It recreates
the four modules from the report — **authentication, feedback/grievance
submission, an admin dashboard, and input security** — as a static site you
can host directly on **GitHub Pages**.

**➡ Live demo:** enable Pages for this repo (see below) and it runs at
`https://<your-username>.github.io/<repo-name>/`

---

## Why this isn't the original PHP/MySQL stack

GitHub Pages only serves static files — it cannot run PHP or host a MySQL
database. So the backend described in the report has been re-built with the
same *behaviour* using only the browser:

| Original report | This prototype |
|---|---|
| PHP + MySQL (XAMPP) | Browser `localStorage` acting as the "database" |
| Server-side bcrypt hashing | Client-side **SHA‑256** hashing (Web Crypto `SubtleCrypto`) before anything is stored |
| PHP session handling | `sessionStorage`-based session, cleared on sign-out |
| Server-side input sanitization / prepared statements | Every field is HTML-escaped before storage and before render, to demonstrate the same defensive habit against injection |

This keeps the demo honest about what changed: it's a **front-end
prototype for a portfolio, not a production auth system.** Anyone with
browser dev tools can read the local data — don't reuse this login code for
a real deployment without a real server-side backend.

## What's included

- **Student flow** — register, sign in, submit a Feedback or Grievance
  ticket (category, subject, description), and track its status
  (`Pending → In review → Resolved`) with the admin's response.
- **Admin flow** — sign in, see live counts, filter by status/category,
  search, and respond to / update the status of any ticket.
- Seeded demo data so both dashboards have something to look at on first
  load (see credentials below).

## Demo credentials

| Role | Login | Password |
|---|---|---|
| Student | Register no. `110725105034` | `Student@123` |
| Admin | Username `admin` | `Admin@123` |

(Also shown on the sign-in screen itself.) You can also register a new
student account from the **Register** link.

## Project structure

```
.
├── index.html          # Sign-in (student / admin toggle)
├── register.html        # Student sign-up
├── portal.html           # Student dashboard — submit + track tickets
├── admin.html             # Admin dashboard — filter, respond, resolve
├── css/style.css          # All styling (design tokens at the top)
├── js/
│   ├── data.js            # Mock "database": users, tickets, sessions, hashing, sanitizing
│   ├── auth.js             # Sign-in page logic
│   ├── portal.js            # Student dashboard logic
│   └── admin.js              # Admin dashboard logic
└── assets/favicon.svg
```

No build step, no dependencies, no `npm install` — it's plain HTML/CSS/JS.

## Run it locally

Just open `index.html` in a browser, or serve the folder so relative paths
and the Web Crypto API behave exactly like they will on GitHub Pages:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Deploy to GitHub Pages

1. Create a new GitHub repository and push this folder's contents to it
   (the repo root should contain `index.html` directly — not inside a
   subfolder — unless you configure Pages to build from `/docs`).

   ```bash
   git init
   git add .
   git commit -m "Secure Student Grievance & Feedback Portal"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```

2. On GitHub: **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a
   branch**.
4. Branch: **main**, folder: **/(root)** → **Save**.
5. Wait a minute, then open the URL GitHub shows at the top of that page
   (`https://<your-username>.github.io/<repo-name>/`).

That's it — no server, database, or config to manage.

## Notes on the data

- All data lives in **your browser's** `localStorage`/`sessionStorage`,
  scoped to the deployed site's origin. Nothing is sent to a server.
- Clearing your browser storage (or opening the site in a private window)
  resets it back to the two seeded demo accounts and three seeded tickets.
- Because there's no shared server, an admin and a student won't see each
  other's live updates unless they're using the **same browser** — this is
  a UX/demo trade-off of running entirely client-side on static hosting.

## Credits

Based on the internship report for *Secure Student Grievance & Feedback
Portal*, completed at Layercodes Technologies (P) Ltd, Viluppuram, under
the guidance of Mr. Shagul S (Founder & CEO), June 2026.
