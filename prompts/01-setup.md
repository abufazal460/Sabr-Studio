# 01-setup.md — Sabr Studio Project Setup

Companion to `00-master-context.md` (read first — it holds the full source hierarchy and conflict-resolution table). This file is the **project bootstrap prompt only**: repository shape, environment/tooling, and external-service prerequisites needed before any feature work begins. It does not cover frontend implementation (`02-frontend.md`) or backend implementation (`03-backend.md`) — do not duplicate either here, and do not pull this file's content forward into them.

---

## 1. Role & Objective

You are preparing the Sabr Studio repository so that frontend (`02-frontend.md`) and backend (`03-backend.md`) implementation can begin without any project-scaffolding ambiguity. This is infrastructure/tooling setup only — no product features, routes, schemas, or UI are built here. Before making any change, inspect the current repo state; if scaffolding already exists, adjust only what's missing or inconsistent with `00-master-context.md` rather than rebuilding it.

---

## 2. Source of Truth

`00-master-context.md` is authoritative for this task, per its own hierarchy (§3): `PRD.md` → `TRD.md` → `ARCHITECTURE.md` → `UI-UX.md`/`ANIMATION.md` → `DATABASE.md` → `API.md` → `SECURITY.md` → `DEPLOYMENT.md` → `CODING-RULES.md`/`AI-RULES.md` → `QA-CHECKLIST.md` → `FOLDER-STRUCTURES.md` → existing repo → current task. Where this task needs exact detail this file doesn't restate (full dependency versions, precise repo tree, CSP/rate-limit constants, build/deploy steps), go to the source document `00-master-context.md` names for it — do not invent the gap.

---

## 3. Repository Shape (top level only — feature-internal structure belongs to `02-frontend.md`/`03-backend.md`)

```text
sabr-studio/
├── frontend/          # React/Vite app — internal structure defined in 02-frontend.md
├── backend/           # Node/Express app — internal structure defined in 03-backend.md
├── docs/              # PRD.md, TRD.md, ARCHITECTURE.md, UI-UX.md, ANIMATION.md, DATABASE.md, API.md, SECURITY.md, DEPLOYMENT.md, CODING-RULES.md, AI-RULES.md, QA-CHECKLIST.md, FOLDER-STRUCTURES.md
├── prompts/           # 00-master-context.md, 01-setup.md, 02-frontend.md, 03-backend.md
├── .gitignore
└── README.md
```

Single repository, two applications, one deployment artifact (Master Context §6.11: `frontend/dist/` is built and copied into `backend/public/`; the backend serves both `/api/*` and the built frontend as one Node process). Do not scaffold this as two separate deployable services.

---

## 4. Prerequisites

- Node.js + a package manager consistent across `frontend/` and `backend/` (pick one lockfile type and use it project-wide — do not mix lockfiles).
- Git, with a remote already agreed with the client/team.
- MongoDB Atlas account/cluster access (Master Context §6.1 — Atlas only, no local Mongo dependency past initial setup).
- Accounts/credentials for the three external services the app integrates with, obtained before backend work starts (§6 below): Cloudinary, Razorpay, EmailJS.
- Exact Node/package-manager version pins, if mandated, live in `TRD.md`/`DEPLOYMENT.md` — apply them if specified there; do not guess a version.

---

## 5. Environment Variables & Secret Boundary

Two separate env files, one per app — never a shared root `.env`:

| File | Scope | Rule |
|---|---|---|
| `backend/.env` (from `backend/.env.example`) | JWT signing key, MongoDB Atlas URI, Cloudinary secret, Razorpay secret, EmailJS private credential, any other backend-only value named in `TRD.md`/`SECURITY.md`/`DEPLOYMENT.md` | Never committed; never sent to the frontend in any form |
| `frontend/.env` (from `frontend/.env.example`) | `VITE_API_BASE_URL` and any other value explicitly designated public in `TRD.md` | **No secret ever gets a `VITE_` prefix** (Master Context §7) — if a value must stay private, it does not belong in this file, period |

Commit only the two `.env.example` files (keys, no real values). Real `.env` files are `.gitignore`d in both apps. Do not invent an environment variable not named in `TRD.md`/`API.md`/`SECURITY.md`/`DEPLOYMENT.md`.

---

## 6. External Service Prerequisites (accounts only — integration logic belongs to `03-backend.md`)

| Service | What's needed at setup time | Source |
|---|---|---|
| MongoDB Atlas | Cluster created, connection string obtained, IP/network access configured for the deployment target | Master Context §6.1, §6.4 |
| Cloudinary | Account + API credentials for image upload/storage (`{url, publicId}` is all Mongo ever stores — Master Context §6.8) | Master Context §6.8 |
| Razorpay | Account + API keys for server-side checkout verification (never trust client-supplied amounts — Master Context §6.6) | Master Context §6.6 |
| EmailJS | Account + credential for enquiry-notification email, independent of the MongoDB write path (Master Context §6.7) | Master Context §6.7 |

Setup here means obtaining and storing credentials per §5 — wiring the actual calls (Multer→Cloudinary, checkout→Razorpay, enquiry→EmailJS) is backend implementation work, out of scope for this file.

---

## 7. Initial Scaffolding Steps

1. Initialize the repo shape in §3 if not already present; do not restructure an existing repo that already matches it.
2. Scaffold `frontend/` as a Vite + React project using only the approved frontend stack (Master Context §6.1: React `.jsx` only — no TypeScript — Vite, Tailwind CSS, Framer Motion, GSAP + ScrollTrigger, Lenis, `react-icons`, `react-intersection-observer`, `react-router-dom`, `axios`). Internal `src/` structure is defined by `02-frontend.md` — do not pre-build feature folders here beyond what a default Vite scaffold produces.
3. Scaffold `backend/` as a Node.js + Express project using only the approved backend stack (Master Context §6.1: `mongoose`, `bcrypt`, `jsonwebtoken`, `cookie-parser`, `express-validator`, `multer`, `cloudinary`, `razorpay`, `cors`, `helmet`, `express-rate-limit`, `dotenv`, `nodemon` dev-only, `compression` only if the platform doesn't already handle response compression). Internal layering (`routes/controllers/services/models`) is defined by `03-backend.md`.
4. Add both `.env.example` files per §5.
5. Add a root `.gitignore` covering `node_modules/`, both apps' real `.env` files, `backend/public/` (generated build output — never hand-edited, Master Context §6.2), and standard OS/editor artifacts.
6. Confirm no package outside the approved lists in §4 is present in either `package.json` — remove anything unapproved before proceeding to feature work.
7. Do not add TypeScript configuration, a UI kit, a second icon or animation library, Redis, GraphQL, or a state-management library beyond the two Contexts named in `02-frontend.md` — none of these are part of setup regardless of what's convenient to scaffold by default (Master Context §7).

---

## 8. Dev & Build Workflow

- Frontend dev server and backend dev server (`nodemon`) run independently in local development.
- Production build order is fixed (Master Context §6.11): install + `vite build` the frontend → copy `frontend/dist/` into `backend/public/` → install backend production dependencies → `node server.js`. Full checklist: `DEPLOYMENT.md` §11.
- The backend's SPA catch-all (serving `index.html` for any non-`/api/*` GET) is a backend-implementation concern (`03-backend.md`) — setup only needs to ensure `backend/public/` exists as the copy target and is `.gitignore`d.
- Vercel may host a frontend preview only, never production (Master Context §6.11) — do not configure it as a production target.

---

## 9. Constraints

- No package, environment variable, service account, or top-level folder beyond what §3–§7 name, without a cited requirement from `TRD.md`/`DEPLOYMENT.md`/`SECURITY.md` that nothing already listed satisfies.
- No secret is ever placed where the frontend bundle can read it (no `VITE_` prefix on anything sensitive).
- Do not pre-build frontend feature folders or backend layering beyond a default scaffold — that structure is `02-frontend.md`'s and `03-backend.md`'s responsibility, not this file's.
- Do not stand up two separately deployed services (frontend host + backend host) — the deployment topology is one Node process serving both.
- Do not silently resolve any Section 4 conflict from `00-master-context.md` if this task touches one — none of §3–§8 above currently do, but flag it if a repo-state inspection surfaces one.

---

## 10. Verification

Before considering setup complete, verify (report as **Verified / Not Verified / Unable to Verify**):

1. Repo matches the §3 shape; no stray top-level folders.
2. `frontend/package.json` and `backend/package.json` each contain only packages from their approved list (§7.2–7.3) — no extras.
3. Both `.env.example` files exist, contain only keys (no real secret values), and no secret-bearing key uses a `VITE_` prefix.
4. Real `.env` files, `node_modules/`, and `backend/public/` are excluded via `.gitignore` and not committed.
5. MongoDB Atlas connection string, Cloudinary, Razorpay, and EmailJS credentials are obtained and placed only in `backend/.env` (never in frontend files, never committed).
6. No TypeScript artifact (`tsconfig.json`, `.ts`/`.tsx`, `@types/*`) exists anywhere in the repo.
7. A local frontend dev server and backend dev server (`nodemon`) both start without error against the scaffolded structure.

---

## 11. Completion Criteria

Setup is complete only when:
1. The repository shape, environment files, and approved dependencies are in place exactly per §3–§7 — nothing more, nothing less.
2. No secret is exposed to the frontend bundle.
3. No feature-level frontend or backend structure was pre-built beyond a default scaffold.
4. All checks in §10 pass or are explicitly reported as Not Verified / Unable to Verify.
5. The repo is ready for `02-frontend.md` and `03-backend.md` to proceed without any further scaffolding decisions.
