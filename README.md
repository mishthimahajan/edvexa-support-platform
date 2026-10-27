# Edvexa — AI-Powered Customer Support Platform

Edvexa is a full-stack customer support and knowledge management platform that helps customers raise support tickets and enables support agents to manage conversations, search internal knowledge, and generate AI-assisted reply drafts.

## Live Deployment

- **Frontend:** https://edvexa-support-platform.vercel.app
- **Backend health check:** https://edvexa-support-platform.onrender.com/api/health
- **GitHub repository:** https://github.com/mishthimahajan/edvexa-support-platform.

> The backend health endpoint verifies API availability. Test registration, authentication, and database operations separately before describing the complete deployment as verified.

## Features

### Authentication and access control
- Customer registration and login.
- JWT-based authentication.
- Role-based access for customers, support agents, and administrators.

### Support ticket management
- Create and view support tickets.
- View ticket details and conversation history.
- Send replies to ticket conversations.
- Filter tickets and search ticket lists.
- Update ticket status and record status history.
- Paginated ticket listing.

### Knowledge management
- Upload supported PDF and TXT documents.
- Extract and process document text into chunks.
- Search the knowledge base.
- Generate answers grounded in retrieved knowledge, with source references when available.

### AI-assisted support
- Generate suggested replies for support tickets.
- Approve or reject generated suggestions.
- Review a suggestion before sending a reply.
- Use retrieval-augmented generation (RAG) for knowledge-based answers.

### Dashboard
- View ticket metrics, including status totals.
- Review recent tickets and relevant activity.

## Technology Stack

- **Frontend:** React, TypeScript, Vite, Axios, React Router, CSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL
- **ORM and migrations:** Prisma
- **Authentication:** JWT
- **AI and retrieval:** Gemini integration, embeddings, vector similarity/retrieval, and a mock AI draft provider for development
- **Deployment:** Vercel for the frontend and Render for the backend and PostgreSQL database

Update this list if the final code uses a different provider or component.

## Architecture

```text
Browser
  |
  v
React + TypeScript frontend (Vercel)
  |
  | HTTPS /api requests with JWT
  v
Express + TypeScript backend (Render)
  |
  +---- Authentication and authorization
  +---- Ticket and conversation services
  +---- Knowledge ingestion and retrieval
  +---- AI answer and reply-draft services
  +---- Dashboard metrics
  |
  v
PostgreSQL database (Render)
```

The frontend calls the backend through an Axios client. Authenticated requests include a bearer token. Prisma manages database access and schema migrations.

## Project Structure

```text
edvexa-support-platform/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── lib/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── scripts/
│   │   ├── services/
│   │   ├── types/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── pages/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.example
│   └── package.json
├── docs/
│   └── API.md
└── README.md
```

## Prerequisites

- Node.js compatible with the project's package configuration
- npm
- PostgreSQL
- Git

## Local Setup

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd edvexa-support-platform
```

### 2. Configure the backend

```bash
cd backend
npm install
```

Create `backend/.env` using the variables described in the Environment Variables section. Use your local PostgreSQL URL for local development.

### 3. Generate Prisma Client and apply migrations

```bash
npx prisma generate
npx prisma migrate deploy
```

For a new development database where migrations have not yet been created, follow Prisma's development migration workflow rather than using `migrate deploy` to create a new migration.

### 4. Start the backend

```bash
npm run dev
```

The local API is expected at `http://localhost:4000` when `PORT=4000`.

### 5. Configure and start the frontend

Open another terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:4000/api
```

Start the frontend:

```bash
npm run dev
```

Vite normally serves the frontend at `http://localhost:5173`.

### 6. Build checks

Run the project's configured build command in both the backend and frontend directories:

```bash
npm run build
```

Run tests using the scripts available in the relevant `package.json`.

## Environment Variables

### Backend (`backend/.env`)

| Variable | Purpose |
|---|---|
| `PORT` | API listening port; commonly `4000` locally |
| `NODE_ENV` | Runtime environment |
| `FRONTEND_URL` | Allowed frontend origin for CORS |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign JWTs |
| `JWT_EXPIRES_IN` | Token expiry, if supported by the application |
| `AI_PROVIDER` | Configured AI draft provider, such as `mock` |
| `GEMINI_API_KEY` | Private Gemini API key, if Gemini is enabled |
| `GEMINI_MODEL` | Configured Gemini model |
| `UPLOAD_DIR` | Directory used for uploaded files |
| `MAX_UPLOAD_MB` | Maximum upload size in MB |

Only configure variables that the application actually reads. Check the backend source and `.env.example` for exact names and defaults.

### Frontend (`frontend/.env.local`)

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL for backend API requests |

For Vercel, set `VITE_API_URL` to:

`https://edvexa-support-platform.onrender.com/api`

Vite variables are included in the client bundle. Never put passwords, JWT secrets, or private API keys in frontend environment variables.

## Database Migrations

Prisma schema: `backend/prisma/schema.prisma`

Migration directory: `backend/prisma/migrations/`

Apply committed migrations against the configured database:

```bash
npx prisma migrate deploy
```

Run this command from the backend directory with the intended database connection configured. Verify the target database before running migrations.

## API Documentation

See [`docs/API.md`](docs/API.md) for endpoint details, authentication requirements, request examples, and testing notes.

## Deployment

### Frontend — Vercel
- Set the project root to `frontend` if deploying from the repository root.
- Configure `VITE_API_URL` with the deployed backend API base URL.
- Redeploy after changing environment variables.

### Backend — Render
- Configure the backend service's root directory and build/start commands to match the repository layout and package scripts.
- Configure the production environment variables in Render.
- Set `DATABASE_URL` to the correct Render PostgreSQL connection string.
- Ensure the committed Prisma migrations are applied to the production database.
- Set `FRONTEND_URL` to the deployed frontend origin.
- Redeploy and inspect logs if startup fails.

Never commit `.env` files or credentials.

## Security Notes

- Keep production credentials in deployment environment settings.
- Do not commit API keys, passwords, or database connection strings.
- Use a strong, unique JWT secret.
- Enforce authorization on protected routes in the backend.
- Validate file type and size on uploads.
- Do not expose sensitive stack traces in production responses.
- Use HTTPS for deployed services.

## Testing and Evidence

Document the tests that were actually run. Include screenshots or a short demonstration of registration/login, ticket creation and replies, ticket status history, knowledge upload/search, AI answer sources, AI draft approval, and dashboard metrics where these features have been verified.

## Known Limitations

List any incomplete functionality, unsupported file types, AI provider limitations, or deployment constraints honestly.

## Author

Mishthi Mahajan
https://github.com/mishthimahajan
