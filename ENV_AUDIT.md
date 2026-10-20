# SabrStudio — Environment Variables & Production Configuration Audit

> **Configuration policy:** Fixed environment variable inventory for local development and production.
>
> **Backend:** Exactly 26 application-configured variables.
>
> **Frontend:** Exactly 1 environment variable.
>
> **Total:** 27 explicitly configured application environment variables.
>
> **Frontend variable:** `VITE_API_BASE_URL=/api` only.
>
> **Security:** Never commit real credentials, API secrets, passwords, tokens, or database connection strings.

## 1. Purpose and Scope

This document defines the approved environment variable configuration for the SabrStudio application.

The application uses a React + Vite frontend, a Node.js + Express backend, and MongoDB Atlas. The same approved variable names must be used in local development and production deployment.

The configuration must follow these rules:

1. All backend application environment variables must be defined in the backend `.env` file.
2. The frontend `.env` file must contain only `VITE_API_BASE_URL=/api`.
3. No additional frontend environment variables are permitted.
4. No additional manually configured backend environment variables are permitted.
5. Backend and frontend code, API integrations, authentication, database connections, payments, uploads, email notifications, and Google Sign-In must follow this configuration.
6. Existing environment variable references must be checked before being renamed or removed.
7. Local and production configurations must use the same variable names, but environment-specific values may differ.
8. Real secrets must be supplied through local environment files or the hosting provider's environment settings. They must never be committed to Git.

This document defines the intended configuration contract. Actual code compliance must be verified through repository inspection and automated checks.

## 2. Approved Backend Environment Variables

The backend `.env` file is the single application-level configuration source for the backend.

Exactly the following 26 variables are approved.

### 2.1 Server and Hosting

| Variable | Required value or configuration |
|---|---|
| `PORT` | Local: `3000`; production: Hostinger-assigned port, currently configured as `65002` |
| `NODE_ENV` | Local: `development`; production: `production` |
| `SERVE_FRONTEND` | `true` when the backend serves the built frontend |

The production port must match the port assigned to the deployed application. If Hostinger injects the port automatically, the application must use the injected value rather than relying on a hardcoded port.

### 2.2 Database and Authentication

| Variable | Required value or configuration |
|---|---|
| `MONGODB_URI` | Actual MongoDB Atlas connection string |
| `JWT_SECRET` | Strong, randomly generated secret |
| `JWT_EXPIRES_IN` | `7d`, subject to the application's supported duration format |
| `ADMIN_PASSWORD` | Unique, strong production administrator password |
| `ADMIN_EMAIL` | Valid administrator email address, unless the application explicitly supports usernames |
| `ADMIN_NAME` | `sabrstudio`, if supported by the existing bootstrap logic |

`MONGODB_URI`, `JWT_SECRET`, and `ADMIN_PASSWORD` must contain valid values in production.

The example value `admin` must not be used as the production administrator password.

The administrator bootstrap variables must follow the existing application's account creation and authentication logic. Changing these variables must not silently reset an existing administrator account unless the application explicitly implements that behavior.

### 2.3 Cookies and Domain Configuration

| Variable | Production value |
|---|---|
| `COOKIE_SECURE` | `true` |
| `COOKIE_SAME_SITE` | `lax` |
| `CORS_ORIGIN` | `https://sabrstudio.in,https://www.sabrstudio.in` |
| `APP_URL` | `https://sabrstudio.in` |
| `EMAILJS_ORIGIN` | `https://sabrstudio.in` |

For local development, `CORS_ORIGIN` may contain the required local frontend origin, such as `http://localhost:5173`, if cross-origin requests are used.

When the frontend and backend are served from the same origin, the API base URL should remain `/api`.

Production cookie, CORS, and origin settings must not be weakened merely to make a deployment work.

### 2.4 Cloudinary

| Variable | Required value |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | Actual Cloudinary cloud name |
| `CLOUDINARY_API_SECRET` | Actual Cloudinary API secret |
| `CLOUDINARY_API_KEY` | Actual Cloudinary API key |

These values must come from the Cloudinary account used by SabrStudio.

All Cloudinary credentials must remain server-side. The frontend must never receive the API secret.

### 2.5 EmailJS

| Variable | Required value |
|---|---|
| `EMAILJS_SERVICE_ID` | Actual EmailJS service ID |
| `EMAILJS_TEMPLATE_ID` | Actual EmailJS template ID |
| `EMAILJS_PUBLIC_KEY` | Actual EmailJS public key |
| `EMAILJS_PRIVATE_KEY` | Actual EmailJS private key, if required by the backend implementation |

The backend must use these variables consistently with the existing EmailJS integration.

The enquiry record must be persisted before attempting email delivery, according to the application's existing data-flow contract. Missing credentials or a failed email request must not produce a false success response.

### 2.6 Razorpay

| Variable | Required value |
|---|---|
| `RAZORPAY_KEY_ID` | Actual Razorpay key ID for the selected environment |
| `RAZORPAY_KEY_SECRET` | Matching Razorpay key secret |
| `RAZORPAY_WEBHOOK_SECRET` | Actual webhook signing secret |

The frontend must obtain the payment key ID from the backend checkout response rather than reading a separate frontend Razorpay environment variable.

Payment creation, signature verification, webhook verification, and order status updates must remain server-controlled.

Production payment verification must fail closed when the required secret or signature is missing or invalid.

### 2.7 Google Sign-In (customer authentication)

| Variable | Required value |
|---|---|
| `GOOGLE_CLIENT_ID` | Actual Google OAuth client ID (Web application) |

Google Sign-In is the **only** customer authentication method: there is no customer password,
no SMS OTP and no email/password login. The browser renders the official Google Identity
Services button using the client id published by `GET /api/config/public`, sends the resulting
opaque ID token to `POST /api/customer/google`, and the backend verifies it against Google's
published JWKS (RS256, audience = `GOOGLE_CLIENT_ID`, issuer = `accounts.google.com`,
`email_verified` must be true).

The client secret must never be exposed to the frontend and is not used by this flow.

The client's authorised JavaScript origins and redirect URIs in the Google Cloud Console must
match the deployed origins (e.g. `https://sabrstudio.in`, `http://localhost:5173`).

**Important:** This fixed configuration intentionally does not include `VITE_GOOGLE_CLIENT_ID`.
The frontend obtains the public client ID from the backend instead, so the built bundle contains
no environment-specific credential and can be re-pointed server-side without a rebuild.

### 2.8 Twilio OTP

**Removed.** Phone OTP is no longer an authentication method; the Twilio variables are not part
of the approved backend configuration and no route consumes them.

## 3. Complete Backend `.env` Template

The following is the approved backend variable structure. Replace every placeholder with the real value for the relevant environment.

```dotenv
# Server & Hosting
PORT=3000
NODE_ENV=development
SERVE_FRONTEND=true

# Database & Authentication
MONGODB_URI=REPLACE_WITH_MONGODB_ATLAS_URI
JWT_SECRET=REPLACE_WITH_STRONG_RANDOM_SECRET
JWT_EXPIRES_IN=7d
ADMIN_PASSWORD=REPLACE_WITH_STRONG_ADMIN_PASSWORD
ADMIN_EMAIL=REPLACE_WITH_ADMIN_EMAIL
ADMIN_NAME=sabrstudio

# Cookies & Domain
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
CORS_ORIGIN=http://localhost:5173
APP_URL=http://localhost:5173
EMAILJS_ORIGIN=http://localhost:5173

# Cloudinary
CLOUDINARY_CLOUD_NAME=REPLACE_WITH_CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_SECRET=REPLACE_WITH_CLOUDINARY_API_SECRET
CLOUDINARY_API_KEY=REPLACE_WITH_CLOUDINARY_API_KEY

# EmailJS
EMAILJS_SERVICE_ID=REPLACE_WITH_EMAILJS_SERVICE_ID
EMAILJS_TEMPLATE_ID=REPLACE_WITH_EMAILJS_TEMPLATE_ID
EMAILJS_PUBLIC_KEY=REPLACE_WITH_EMAILJS_PUBLIC_KEY
EMAILJS_PRIVATE_KEY=REPLACE_WITH_EMAILJS_PRIVATE_KEY

# Razorpay
RAZORPAY_KEY_ID=REPLACE_WITH_RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET=REPLACE_WITH_RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET=REPLACE_WITH_RAZORPAY_WEBHOOK_SECRET

# Google Sign-In (customer authentication - client id only)
GOOGLE_CLIENT_ID=REPLACE_WITH_GOOGLE_CLIENT_ID
```

**Note:** This is a local-development template, not a file to copy unchanged into production. Placeholder strings are not real credentials. Local cookie and domain values are suitable only when consistent with the actual local setup.

For production, configure the same 26 variable names with production values in Hostinger's environment settings.

The production configuration must use:

```dotenv
PORT=65002
NODE_ENV=production
SERVE_FRONTEND=true

JWT_EXPIRES_IN=7d
ADMIN_NAME=sabrstudio

COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
CORS_ORIGIN=https://sabrstudio.in,https://www.sabrstudio.in
APP_URL=https://sabrstudio.in
EMAILJS_ORIGIN=https://sabrstudio.in
```

The remaining production variables must be populated with actual database, authentication, administrator, Cloudinary, EmailJS, Razorpay, and Google values.

Do not use the local placeholder credentials or development cookie settings in production.

## 4. Approved Frontend Environment Variables

The frontend is permitted to use exactly one environment variable.

| Variable | Value | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `/api` | Routes frontend API requests through the same origin |

No other frontend environment variables are permitted.

In particular, the frontend must not define or require:

- `VITE_GOOGLE_CLIENT_ID`
- `VITE_RAZORPAY_KEY_ID`
- `VITE_MONGODB_URI`
- `VITE_JWT_SECRET`
- Any Cloudinary, EmailJS private, Razorpay secret, or Google client secret variable

The application must not expose backend credentials through Vite environment variables.

### 4.1 Complete Frontend `.env` File

The frontend `.env` file must contain only:

```dotenv
VITE_API_BASE_URL=/api
```

This is the complete approved frontend environment configuration. Do not add other variables to the frontend `.env` file.

### 4.2 Frontend API Configuration

The frontend HTTP client must use the approved variable, with `/api` as its fallback where appropriate:

```js
baseURL: import.meta.env.VITE_API_BASE_URL || '/api'
```

The frontend must continue to use the existing API routes and credential-handling behavior.

The application must not introduce new frontend environment variables to work around a backend configuration problem.

## 5. Local and Production Configuration Policy

The approved variable names must remain identical between local development and production.

| Setting | Local development | Production |
|---|---|---|
| Backend environment file | `backend/.env` | Hostinger environment settings |
| Frontend environment file | `frontend/.env` | Build environment, with the same single approved variable |
| `PORT` | `3000`, or the actual local backend port | Hostinger-assigned port |
| `NODE_ENV` | `development` | `production` |
| `SERVE_FRONTEND` | Based on the local startup architecture | `true` for the configured Hostinger deployment |
| `VITE_API_BASE_URL` | `/api` | `/api` |
| `MONGODB_URI` | Actual development database URI | Actual production database URI |
| `JWT_SECRET` | Dedicated development secret | Separate strong production secret |
| Administrator credentials | Local development credentials | Strong production credentials |
| Cookie security | Based on local HTTP/HTTPS setup | `true` on HTTPS |
| CORS and application URLs | Actual local origins | `https://sabrstudio.in` and `https://www.sabrstudio.in` |
| Third-party credentials | Credentials for the intended test environment | Credentials for the intended production environment |

Local and production values must not be assumed to be interchangeable.

Separate secrets and database environments are strongly recommended to prevent development activity from modifying production data.

## 6. Required Code and Data-Flow Compatibility

All application code must remain compatible with the approved configuration.

### 6.1 Backend Startup

- Load backend environment variables before dependent modules initialize.
- Validate required production configuration before accepting requests.
- Use the hosting-assigned port correctly.
- Do not introduce unnecessary environment variable aliases.
- Do not require manually configured `HOST`, `BACKEND_PORT`, or `FALLBACK_DIR` variables.
- If existing code uses those names, refactor the relevant code to use the approved configuration or safe internal defaults.

### 6.2 Database

- Connect to MongoDB through `MONGODB_URI`.
- Keep connection failures visible in server logs without printing the URI.
- Do not add a second database URI variable.
- Keep production and development data isolated where possible.

### 6.3 Authentication and Cookies

- Use `JWT_SECRET` for the relevant token-signing operations.
- Apply `JWT_EXPIRES_IN` only where the existing authentication flow supports it.
- Preserve the current admin and customer authentication behavior.
- Do not print passwords, JWTs, cookie contents, or secret values in logs.
- Keep secure cookie and cross-origin settings appropriate to each environment.

### 6.4 Email and Enquiries

- Use the approved EmailJS variables for the current email integration.
- Preserve enquiry database persistence and error handling.
- Keep the configured application origin consistent with the deployed domain.
- Do not create duplicate or alternative EmailJS environment variables.

### 6.5 Payments and Orders

- Use the approved Razorpay variables on the backend.
- Keep payment signature verification server-side.
- Preserve order persistence and status transitions.
- Do not trust frontend payment-success indicators without server-side verification.
- Do not create a separate `VITE_RAZORPAY_KEY_ID` dependency.

### 6.6 Google Sign-In

- Use the approved Google OAuth configuration (`GOOGLE_CLIENT_ID` on the backend).
- The frontend obtains the public client ID from `GET /api/config/public`; it must not read
  `VITE_GOOGLE_CLIENT_ID` or any other frontend credential variable.
- Keep token verification and any client secret handling server-side.
- Verify that the final sign-in flow works before removing the old configuration.

### 6.7 Cloudinary

- Use only the approved Cloudinary backend variables.
- Preserve existing upload routes.
- Keep credentials on the backend.
- Do not introduce new configuration variables without an explicit change to this policy.

## 7. Existing Variables That Must Be Audited Before Removal

The earlier audit reported additional environment references, including `BACKEND_PORT`, `HOST`, `FALLBACK_DIR`, platform-provided variables, and a frontend `VITE_GOOGLE_CLIENT_ID` dependency.

These references must be reviewed against the current repository.

The intended final state is:

- Exactly 26 manually configured backend application variables.
- Exactly 1 frontend variable.
- No application requirement for additional manually configured variables.
- No dependency on a second frontend API base URL.
- No unused environment variable documented as required.
- No production code relying on development-only mock credentials or simulated payment verification.

Platform-injected values and runtime-generated metadata, such as `npm_package_version`, must be treated separately from the approved application `.env` inventory. Their existence does not authorize adding more manually configured variables.

Do not remove an existing reference until the affected code, scripts, deployment entry points, and tests have been updated and verified.

## 8. Validation and Acceptance Criteria

The configuration change is complete only when all the following conditions are met:

- [ ] The backend `.env.example` contains exactly the 26 approved backend variables.
- [ ] The frontend `.env.example` contains only `VITE_API_BASE_URL=/api`.
- [ ] Local backend configuration uses the approved backend variable names.
- [ ] Hostinger production configuration uses the same approved backend variable names.
- [ ] No additional manually configured backend variables are required.
- [ ] No frontend environment variable other than `VITE_API_BASE_URL` is read or required.
- [ ] The frontend build succeeds without `VITE_GOOGLE_CLIENT_ID` and `VITE_RAZORPAY_KEY_ID`.
- [ ] Google sign-in remains functional through the approved configuration path.
- [ ] Razorpay checkout obtains its key ID from the backend.
- [ ] Database connection, admin login, customer authentication, and cookies work.
- [ ] Enquiry persistence and email error handling work.
- [ ] Uploads work when their integrations are configured.
- [ ] Production startup fails safely when mandatory secrets are missing.
- [ ] The environment validation does not print real secret values.
- [ ] The environment leak scan passes.
- [ ] Route tests and production build tests pass.
- [ ] Live third-party integrations are tested with appropriate credentials before claiming full verification.

Record actual command outputs and test results in the audit. Never mark a check as passed unless it has actually been run.

## 9. Security Requirements

1. Never commit `.env`, `.env.local`, or other files containing real credentials.
2. Keep backend `.env` files ignored by Git.
3. Use `.env.example` files containing variable names and safe placeholders only.
4. Never expose private API keys, passwords, access tokens, or connection strings in the frontend.
5. Use a strong production administrator password; never use `admin`.
6. Use a randomly generated production JWT secret and keep it private.
7. Do not reuse production secrets in development.
8. Do not log secret values during environment validation or debugging.
9. Rotate any credential accidentally committed or publicly exposed.
10. Verify payment signatures and webhook authenticity on the backend.

## 10. Final Configuration Contract

The approved environment configuration for SabrStudio is fixed as follows:

**Backend:** 26 explicitly configured variables, all defined in the backend environment configuration.

**Frontend:** 1 variable only:

```dotenv
VITE_API_BASE_URL=/api
```

**Total:** 27 explicitly configured application environment variables.

The frontend must not contain any additional environment variables. The backend must not require additional manually configured environment variables.

All backend logic, frontend API communication, database access, authentication, payments, email notifications, uploads, and Google Sign-In must be implemented and validated against this contract.

Any future addition, removal, or renaming of an environment variable requires an explicit update to this document, the corresponding example files, the environment validation logic, and the affected code and tests.

**Important:** The approved inventory is the intended final configuration, not proof that the current repository already complies. Compliance must be established by inspecting the code and successfully running the relevant checks.
