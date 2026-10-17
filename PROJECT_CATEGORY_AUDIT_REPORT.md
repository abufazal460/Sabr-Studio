# PROJECT CATEGORY AUDIT REPORT — Sabr Studio

**Website:** https://sabrstudio.in/
**Repository:** `abufazal460/Sabr-Studio`
**Audit type:** Read-only inspection (no code, data, or config changes made)
**Issue:** All projects on the Home Page Projects section show category `Residential`.

---

## A. Executive Summary (Hinglish)

Home Page ke Projects section mein har project ki category `Residential` dikhayi de rahi hai kyunki:

- Frontend **hardcoded nahi hai** — `ProjectHomeThumb` live API se projects fetch karta hai aur `{proj.category}` render karta hai.
- Live API actually sabhi projects ke liye `"Residential"` hi return kar raha hai (production `GET /api/projects` se verify kiya).
- Wajah: **Admin Panel ka dedicated Projects form (jahan Edit/Publish/Delete hai) mein Category ka koi input field hi nahi hai.** State ka default `Residential` hai (`AdminProjectsPage.jsx:85`), payload bhi `projectForm.category || 'Residential'` bhejta hai (`:170`), aur edit kholte waqt bhi wahi fallback lagta hai (`:240`). Isliye create **aur** update — dono har baar `Residential` bhejte hain.
- Dashboard ke "Add Project" modal mein Category dropdown maujood hai (`AdminDashboardPage.jsx:588-598`) **lekin wo sirf create ke liye hai**, existing projects ke liye wahan koi edit UI nahi hai.
- Backend bhi do jagah `Residential` default karta hai (`project.service.js:115`, `project.model.js:21-25`) — ye safety net hai, root cause nahi.

Net result: category write-time par fix ho jaati hai; existing 4 projects (jisme 2 clearly showroom/retail/salon hain) DB mein bhi `Residential` stored hain.

---

## B. Root Cause

**Exact cause:** The dedicated Admin Projects create/edit form exposes **no category control**, while its state default, its save payload, and its edit-hydration all pin `category` to `'Residential'`. Consequently every `POST /api/admin/projects` **and** every `PUT /api/admin/projects/:id` from that panel sends `category: "Residential"`, which the backend persists verbatim. The Home Page faithfully renders the persisted value.

**Responsible file(s) and line number(s):**

| Layer | File | Line(s) | Evidence |
|-------|------|---------|----------|
| Frontend render | `frontend/src/features/home/components/ProjectHomeThumb.jsx` | 90 | `{proj.category}` inside the label scrim |
| Frontend fetch | `frontend/src/features/home/components/ProjectHomeThumb.jsx` | 105-117 | `useState(fallbackProjects)` then `getProjects({ limit: 4 })` overwrites state on success |
| API client | `frontend/src/features/projects/api/projects.api.js` | 3-6 | `axiosClient.get('/projects?...')`, no field renaming |
| Admin form default | `frontend/src/features/admin-projects/pages/AdminProjectsPage.jsx` | 85 | `category: 'Residential',` in `emptyProjectForm` |
| Admin save payload | `frontend/src/features/admin-projects/pages/AdminProjectsPage.jsx` | 170 | `category: projectForm.category \|\| 'Residential',` |
| Admin edit hydration | `frontend/src/features/admin-projects/pages/AdminProjectsPage.jsx` | 240 | `category: project.category \|\| 'Residential',` |
| **Missing UI** | `frontend/src/features/admin-projects/pages/AdminProjectsPage.jsx` | — | Only `id="ret-category"` (line 1335, Retail modal) exists; **no `proj-category`** and no category `<Select>`/`<TextInput>` in the project modal |
| Backend service default | `backend/services/project.service.js` | 115 | `category: String(data.category \|\| 'Residential').trim()` |
| Mongoose schema default | `backend/models/project.model.js` | 21-25 | `category: { type: String, trim: true, default: 'Residential' }` |
| Update allow-list | `backend/services/project.service.js` | 180 | `if (updateData.category !== undefined) allowedUpdates.category = String(updateData.category).trim()` — category **is** updatable when sent |

**Stage where `Residential` becomes fixed:** **Admin Panel → payload construction** (`AdminProjectsPage.jsx:170`), with the form-state default at `:85` as the source of the value. Backend/schema defaults are redundant second-line defaults that only matter if `category` is omitted entirely.

**Confidence: Confirmed** — traced end-to-end in source, verified against the deployed production chunk, the live production API, and a write-path probe against a local in-memory backend only.

---

## C. Frontend Findings

### C.1 Home Page Projects section
- `frontend/src/features/home/pages/Home.jsx` renders `<ProjectHomeThumb />` — the Projects strip.
- `frontend/src/features/home/components/ProjectHomeThumb.jsx:90` renders `<span ...>{proj.category}</span>`.

### C.2 Real data vs static fallback
- `:12-41` `fallbackProjects` — 4 curated demo objects (`The Courtyard Pavilion`, `Ash & Travertine Penthouse`, `Sanctuary Tea House`, `Lado Sarai Workshop`) with mixed categories (`Residential`, `Interior Architecture`, `Hospitality`, `Commercial & Studio`).
- `:105` initial state = `fallbackProjects`; `:107-117` `getProjects({ limit: 4 })` replaces state when `res.success && res.data.length > 0`; `.catch()` silently keeps the fallback.
- **Proof the fallback is NOT what is showing:** the live site renders `Contemporary 3 BHK Residence`, `BHAVYA Jewellery Showroom`, `KHADI Retail Store Design`, `Modern Salon Interior` — none of the fallback titles. So the Home strip is displaying genuine API data.

### C.3 Field mapping
- Frontend reads `category`. API returns `category`. No mismatch, no `type`/`projectType` confusion (`projectType` belongs to the Enquiry model, not Project).

### C.4 Where else category appears
- Home Projects strip: renders `category` — **visible symptom**.
- Projects listing page (`ProjectsListing`) and Project detail page (`ProjectDetail`): deployed chunks contain **zero** `category` references — they do not display category at all. So the wrong value is visible only on Home (plus the Admin Projects table badge, `:758`).

### C.5 Direct answers (Frontend, 8 questions)
1. **Exact file/line where `Residential` renders?** `ProjectHomeThumb.jsx:90` (`{proj.category}`). The literal string does **not** come from this file.
2. **Kya `Residential` hardcoded hai?** Rendering mein **nahin**. Hardcoding Admin form state/payload mein hai (`AdminProjectsPage.jsx:85, 170, 240`).
3. **Kya ek hi fixed category sab projects ke liye render hoti hai?** Component per-project value render karta hai; sab fixed dikhte hain kyunki API sabke liye `"Residential"` deta hai.
4. **Kaunsa field read hota hai — `category`/`type`/`projectType`?** `category`.
5. **API response field vs display field mismatch?** **Nahi**, dono `category`.
6. **Fallback/default `Residential` frontend mein?** ProjectHomeThumb ke fallback array mein mixed categories hain, `Residential` default nahi. Default sirf admin form + backend mein hai.
7. **Real API fetch ya local/static array?** Real API fetch (live titles prove it); static array sirf failure/empty case mein.
8. **Galati sirf Home par ya listing/details mein bhi?** Data sab jagah same (galat) hai, lekin **display** sirf Home strip + admin table badge par hoti hai; listing/detail pages category render hi nahi karte.

---

## D. Backend Findings

### D.1 Route registration (`backend/apiHandler.js`)
- `:277` `GET /api/projects` → `projectController.getPublicProjects`
- `:281` `GET /api/projects/:slug` → `getPublicProjectBySlug`
- `:429` `GET /api/admin/projects` → admin list
- `:433` `POST /api/admin/projects` → create
- `:441` `GET /api/admin/projects/:id`
- `:447` `PUT|PATCH /api/admin/projects/:id` → update
- `:457` `DELETE /api/admin/projects/:id`

### D.2 Controller (`backend/controllers/project.controller.js`)
- `getPublicProjects` responds `{ success: true, data: items }` — **no mapping, no renaming, no field stripping**.
- `:80` `projectService.createProject(req.body)` and `:96` `projectService.updateProject(id, req.body)` — controller never touches `category`.

### D.3 Service (`backend/services/project.service.js`)
- `:115` (create) `category: String(data.category || 'Residential').trim()` — sets `Residential` when absent/empty.
- `:180` (update) `category` is in the strict allow-list and is persisted when the client sends it — so an admin UI that sends a real value **would** work.
- `:22-45` `getPublicProjects` filters by `category` (`new RegExp('^'+category+'$','i')`) and falls back to `inMemoryProjects` **only when the DB result set is empty**.

### D.4 Model (`backend/models/project.model.js`)
- `:21-25` `category: { type: String, trim: true, default: 'Residential' }` — schema-level default.
- No `enum` — any string is a valid category.
- `:126` index `{ published: 1, category: 1, createdAt: -1 }`.
- `:137/196/226/255` in-memory demo data has Residential / Commercial / Hospitality / Residential — the schema and UI layers demonstrably support varied categories.

### D.5 Validation (`backend/validators/project.validator.js`)
- `:30` and `:68` `body('category').optional().trim().isString()` — optional, free-text string, no enum. Never coerces to `Residential`.

### D.6 Direct answers (Backend)
1. **Kya backend sabhi projects ke liye `Residential` set karta hai?** Sirf tab jab request mein `category` absent/empty ho (`service:115`, `model:24`). Admin panel hamesha bhejta hai — aur hamesha `"Residential"`.
2. **Kya backend `category` omit/rename karta hai response mein?** **Nahi** — pass-through (verified against live response JSON).
3. **Create/update par category persist hoti hai ya overwrite?** Persist hoti hai jaisi aayi; update path `category` ko accept karta hai (`service:180`).
4. **API response vs DB different hai?** **Nahi.** API ka `category` DB document ka hi field hai (`.lean()` pass-through).
5. **Response formatting/transformations?** None for projects — controller returns service items directly.

---

## E. Admin Panel Findings

### E.1 Dedicated Projects admin (`frontend/src/features/admin-projects/pages/AdminProjectsPage.jsx`)
This is the panel with **Edit / Publish-Unpublish / Delete** and the full SEO + content-blocks editor (`Add Architectural Project` modal, lines ~1200-1300).

- Fields present (verified by `id="proj-*"`): `proj-title` (934), `proj-location` (944), `proj-year` (951), `proj-area` (960), `proj-short-desc` (968), `proj-desc` (979), `proj-seo-title` (1264), `proj-seo-description` (1271), `proj-seo-og-image` (1279).
- **`proj-category` does not exist.** The only category control in this file is `ret-category` (1335) which belongs to the **Retail** product modal.
- `:85` `category: 'Residential'` in `emptyProjectForm`.
- `:170` payload `category: projectForm.category || 'Residential'` — same payload object is used for both `updateProject` (`:197`) and `createProject` (`:207`).
- `:240` edit hydration `category: project.category || 'Residential'` — value is loaded into state but there is **no control to change it**, so saving an edit re-sends `Residential` even if the DB held something else.
- `:758` the admin project table renders `<Badge>{item.category}</Badge>` — read-only display.

### E.2 Dashboard admin (`frontend/src/features/admin-dashboard/pages/AdminDashboardPage.jsx`)
- `:588-598` a real `<Select id="proj-category" label="Category">` **does** exist with options `Residential`, `Commercial`, `Hospitality`.
- `:577` `<form onSubmit={handleCreateProject}>` and `:117` `adminApi.createProject(newProject)` — **create-only**; the row actions list contains only `title="Delete project"` (`:355`), no edit modal. So this select can set the category of a **new** project but cannot fix existing ones.

### E.3 Deployed-production cross-check (read-only chunk fetch)
Fetched the live hashed chunks and counted identifiers:
- `AdminProjectsPage-DAJg47_D.js` → `proj-category`: **0**, `ret-category`: 1, `Edit project`: 1, `Delete project`: 1.
- `AdminDashboardPage-rk777HwU.js` → `proj-category`: **1**, `Edit project`: 0.
- Conclusion: what is live matches local source — the Projects admin page genuinely has no category control in production.

### E.4 Direct answers (Admin Panel, 12 questions)
1. **Project create form mein category field available hai?** Dedicated Projects page: **Nahi**. Dashboard Add-Project modal: **Haan**.
2. **Exact label?** Dashboard wala: `Category` (`AdminDashboardPage.jsx:590`). Projects page: N/A.
3. **Dropdown/select/radio/free-text?** Dashboard: `<Select>` (dropdown, 3 options). Projects page: koi control nahi.
4. **Dropdown options?** `Residential`, `Commercial`, `Hospitality` (`:594-596`). No enum on the backend, so the list is UI-limited, not DB-limited.
5. **Form default `Residential`?** Haan — `emptyProjectForm.category = 'Residential'` (`AdminProjectsPage.jsx:85`).
6. **Edit form saved category populate karta hai?** Haan, state mein (`:240`) — lekin usse dikhane/badalne ka koi field nahi hai.
7. **Selected category backend ko jaati hai?** Haan, payload mein `category` (`:170`) — lekin value hamesha default `Residential` hoti hai kyunki user badal nahi sakta.
8. **Field name backend expectation se match karta hai?** Haan — dono taraf `category`.
9. **Backend us value ko persist karta hai?** Haan — prove: local in-memory probe ne POST `category:"Commercial"` ko `"Commercial"` return kiya.
10. **Category change ke liye Admin Panel sufficient hai ya code change chahiye?** **Existing projects ke liye code change chahiye** (Projects page mein field hi nahi hai). **Naye** projects Dashboard modal se select ho sakte hain — partially.
11. **Agar field nahi hai to category kahan control hoti hai?** `AdminProjectsPage.jsx:85/170/240` (UI-imposed constant) + `project.service.js:115` + `project.model.js:24` (defaults).
12. **Existing project edit par category badal sakte hain?** **Nahi** — edit modal mein control nahi; aur edit save `Residential` dobara likh deta hai. Sirf naya create (Dashboard se) sahi category ke saath ho sakta hai.

---

## F. Database Findings

- **DB selection:** `backend/config/db.js:16` pins production DB name to `sabrstudio` (`MONGODB_DB_NAME || 'sabrstudio'`), derived from the `MONGODB_URI` path segment (`:30-37`); `:19` forbids the legacy `test` DB. **The URI itself was not read or printed.**
- **Collection:** `mongoose.model('Project', projectSchema)` (`project.model.js:128`) → default pluralized collection **`projects`**.
- **Category-related fields in the schema:** `category` (String, default `Residential`), indexed with `published`+`createdAt`. No `type` / `projectType` field exists on Project.
- **Actual per-project saved categories** — read via the app's own read-only `GET /api/projects` (published documents, pass-through of the stored `category`; no DB write performed):

| # | Title | Slug | Saved `category` |
|---|-------|------|------------------|
| 1 | Contemporary 3 BHK Residence | `contemporary-3-bhk-residence` | `Residential` |
| 2 | BHAVYA Jewellery Showroom | `bhavya-jewellery-showroom` | `Residential` |
| 3 | KHADI Retail Store Design | `khadi-retail-store-design` | `Residential` |
| 4 | Modern Salon Interior | `modern-salon-interior` | `Residential` |

- **Kya sab documents `Residential` hain?** Haan — published set ke liye **Confirmed** via the API. (Unpublished/draft documents, if any, were **NOT VERIFIED** — `/api/projects` filters `published: true`.)
- **Kya `category` missing/null/empty ya doosre field mein stored hai?** **Nahi** — har document mein non-empty `category` present hai; koi alternate field name nahi.
- **Kya DB mein varied categories hain magar frontend `Residential` dikhata hai?** **Nahi.** DB/API bhi `Residential` hi deta hai — isliye ye frontend display bug nahi, **data/UI-authoring** issue hai.
- **Same DB/collection jo app query karta hai?** Haan — response objects mein real 24-hex `_id`s (`6ad35902d03ff8fab1a7aae6` etc.) hain, jo Mongoose/MongoDB documents hain (in-memory fallback `proj-1…proj-4` ids aur demo titles hain, live titles se match nahi karte). Isliye app ka query aur inspection ek hi DB/collection par hain.
- **Direct `mongosh`/Atlas document inspection:** **NOT VERIFIED** — no safe read-only production DB access was used, and none was configured or printed. The values above come from the application's own read API, which is authoritative for the persisted `category` field.

---

## G. End-to-End Chain + Direct Answers

### G.1 Traced chain
```
Admin Panel form (AdminProjectsPage.jsx:85 default, :240 hydration — NO category input)
   → payload (AdminProjectsPage.jsx:170  category = 'Residential')
   → adminApi.updateProject / createProject (PUT|POST /api/admin/projects[/:id])
   → apiHandler.js:433/447
   → controllers/project.controller.js:80/96  (pass-through)
   → services/project.service.js:115 (create) / :180 (update allow-list)
   → models/project.model.js:21-25 (default 'Residential')
   → MongoDB  db=sabrstudio  collection=projects
   → GET /api/projects (apiHandler.js:277 → controller:4 → service:14)
   → ProjectHomeThumb.jsx:108 setProjects(res.data)
   → ProjectHomeThumb.jsx:90 {proj.category}
```
**Break point:** the **Admin Panel → payload** stage. Everything downstream is correct and faithful.

### G.2 Direct Answers (7 questions)

1. **Kya category manually change ki ja sakti hai, exactly kahan se?**
   **Partially, only for newly created projects:** Admin Dashboard → Add Project modal → `Category` dropdown (`Residential`/`Commercial`/`Hospitality`). **Existing projects ke liye kahin se nahi** — dedicated Projects page ke edit modal mein field maujood nahi.

2. **Kya Admin Panel se category change karne par wo actually kaam karega? (Yes/No/Partially + evidence)**
   **Partially.**
   - *Create path — Yes:* `AdminDashboardPage.jsx:588-598` sends a real `category`; backend persists it. Proven by local read-only-safe probe: POST without `category` → stored/returned `"Residential"`; POST with `"Commercial"` → `"Commercial"`.
   - *Edit path — No:* `AdminProjectsPage.jsx` has no category control (`proj-category` absent in source **and** in deployed chunk `AdminProjectsPage-DAJg47_D.js`), while `:170` always sends `'Residential'` on update.

3. **Exact navigation path (agar available ho)?**
   `/admin` (consolidated Dashboard) → **Add Project** form → `Category` dropdown → Save. Values allowed by the UI: `Residential`, `Commercial`, `Hospitality`.
   Existing projects: **path does not exist** (`/admin/projects` → Edit project → no Category field).

4. **Admin Panel se possible nahi hai to kaunsi file/logic change chahiye aur kyun?**
   `frontend/src/features/admin-projects/pages/AdminProjectsPage.jsx` — project modal ko ek category control chahiye (same `<Select>` pattern as `AdminDashboardPage.jsx:588-598`), kyunki:
   - `:85` state default `Residential`,
   - `:170` payload `projectForm.category || 'Residential'`,
   - `:240` edit hydration `project.category || 'Residential'`,
   - aur koi input nahi → `projectForm.category` user se badla hi nahi ja sakta.
   Backend mein **koi change zaroori nahi** — update allow-list (`service:180`) aur schema already kisi bhi string category ko accept/persist karte hain. Optional (recommended, nahi-bhi-chal-jayega): `AdminDashboardPage` ke dropdown options ko broaden ya `project.model.js` par an `enum`/shared constant add karna taaki UI aur data ek hi controlled vocabulary use karein.

5. **Kya database data galat hai? Data correction ki recommendation (sirf recommendation, write nahi karna)?**
   Data "galat" nahi hai — wo UI-ja-rah default ka faithful result hai. **Recommendation (execute nahi kiya):** ek baar category control ship karne ke baad, existing 4 published documents ko Admin Panel se manually update karna sabse safe hai. Agar bulk correction chahiye to read-verify ke baad targeted `updateOne` by `slug` (sirf `category`, `updatedAt` intact rakhein) — **aaj ke audit mein koi write nahi kiya gaya**. Likely intended values: `bhavya-jewellery-showroom` → `Commercial`, `khadi-retail-store-design` → `Commercial`, `modern-salon-interior` → `Commercial` (ya `Hospitality`), `contemporary-3-bhk-residence` → `Residential`. **Final values owner/business decision hai.**

6. **Kya har existing project ko individually edit karna padega?**
   **Haan**, jab tak (a) category control ship ho jaye aur phir (b) bulk data update na kiya jaye. Control ke ship hone ke baad 4 projects = 4 individual edits (ya ek one-off bulk update).

7. **Fix ke baad Home Page par har project apni sahi category dikhayega?**
   **Haan**, in conditions ke saath:
   - `AdminProjectsPage` ke modal mein category control add ho aur payload (`:170`) us value ko bheje (default fallback `|| 'Residential'` ko optional/hata dena better hai),
   - existing documents ki `category` actually update ho jaye (edit-save ya bulk update se),
   - `ProjectHomeThumb.jsx:90` already `proj.category` render karta hai — usme change ki zaroorat **nahi**,
   - frontend rebuild + deploy ho (production chunks currently source se match karte hain, so build/deploy hi live change karega),
   - browser/home strip real API data use kar raha hai — verify: fallback array (`:12-41`) sirf API failure par dikhega.

---

## H. Recommended Fix Plan — No Execution

**Recommended (smallest, root-cause-level):**
1. Add a Category control to the dedicated Admin Projects modal in `AdminProjectsPage.jsx` (mirroring `AdminDashboardPage.jsx:588-598`), bound to `projectForm.category`. No backend change needed.

**Optional hardening (only if the team wants it — not required for the symptom):**
2. Share one category constant/list between both admin surfaces so Dashboard and Projects offer the same options.
3. Reconsider the `|| 'Residential'` fallbacks at `AdminProjectsPage.jsx:170` and `:240` — they silently rewrite a missing value instead of leaving it untouched.
4. If a controlled vocabulary is wanted at the data layer, add `enum` in `project.model.js:21-25` **after** all documents have valid categories (otherwise validation on `runValidators: true` updates could break).

**Deliberately NOT recommended:**
- Adding a category field is the only code change needed; Admin Panel already supports category at create time via the Dashboard, so no backend work is justified.
- No frontend rendering change (`ProjectHomeThumb.jsx` is correct).
- No dependency additions, no CSS changes, no DB migration.

**Data remediation (needs separate approval, out of audit scope):** 4 documented updates via the new Admin UI, or an approved one-off bulk update.

---

## I. Verification Checklist

| Check | Status |
|---|---|
| Frontend rendering traced (`Residential` source located) | **PASS** — `ProjectHomeThumb.jsx:90` renders API value |
| API endpoint identified | **PASS** — `apiHandler.js:277` → `controller:4` → `service:14` |
| Backend persistence traced | **PASS** — `service:115` (create), `service:180` (update), `model:21-25` |
| Admin category input verified | **PASS** — Projects page has none (source + deployed chunk); Dashboard has `proj-category` create-only |
| Database category values verified | **PASS (via app read API)** / **NOT VERIFIED (direct mongosh document read)** |
| Field mapping verified (API `category` ↔ frontend `category`) | **PASS** |
| Root cause established | **PASS — Confirmed** (Admin Projects form lacks category control; payload pins `Residential`) |
| Recommended solution identified | **PASS** — add category `<Select>` to `AdminProjectsPage.jsx` project modal |
| No source code changes made | **PASS** — only this report file written |
| No database writes performed | **PASS** — read-only GETs against production; write-path probe ran against a **local in-memory** backend only |
| No deployment or configuration changes made | **PASS** |
| Unpublished/draft project documents inspected | **NOT VERIFIED** |
| Production MongoDB accessed directly (mongosh/Atlas) | **NOT VERIFIED** — deliberately not attempted |
