# FrameFlux Frontend

Next.js App Router frontend for FrameFlux.

## Stack

- Next.js 16.3.4
- React 19.2.8
- TypeScript
- npm
- Playwright

## Prerequisites

For local development:

- Node.js 22+
- npm

For Docker:

- Docker
- Docker Compose

The backend is maintained in a separate repository and must be running
separately when the frontend makes API requests.

## Local development

Install dependencies and start the existing Next.js development server:

```bash
npm install
npm run dev
```

The frontend runs at:

```text
http://localhost:3000
```

## Backend API URL

The existing API client reads:

```text
NEXT_PUBLIC_API_URL
```

The application uses this value for browser-to-backend API requests.

For the default local backend:

```text
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Do not hardcode the backend URL into Docker configuration outside the
environment/build-argument mechanism.

Because this is a `NEXT_PUBLIC_` variable, the value is embedded into the
Next.js client bundle during the build.

## Docker startup

The frontend repository is completely independent from the backend repository.

Run:

```bash
docker compose up --build
```

The container:

1. Installs dependencies with the existing `package-lock.json` using `npm ci`.
2. Runs the existing `npm run build` command.
3. Runs the existing `npm run start` command.
4. Exposes port `3000`.

The frontend is available at:

```text
http://localhost:3000
```

No backend, PostgreSQL, Redis, worker, or other service is started by this
repository.

## Configure the backend for Docker

Set the API URL at build time when the backend is exposed on a different
host/port:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000 docker compose up --build
```

The default is already `http://localhost:8000`.

## Stop

```bash
docker compose down
```

## Rebuild

```bash
docker compose up --build
```

## Environment variables

| Variable              | Required | Purpose                                               |
| --------------------- | -------- | ----------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | No       | Base URL of the separately running FrameFlux backend. |

No secrets are required by the frontend container itself.

## Manual setup

Start the backend separately from `FrameFlux-Backend` before using API-backed
features:

```bash
cd FrameFlux-Backend
python run.py
```

Then start the frontend from this repository with either `npm run dev` or Docker
Compose.


## Demo mode

The `demo` branch is designed to run as a standalone recruiter-facing workspace.

By default, the browser uses a local API-compatible runtime with seeded projects,
media, jobs, notifications, folders, workflows, and processing state. Mutations
persist in the browser so the workspace remains interactive across page reloads.

The demo can also use the standalone recruiter API in the
[FrameFlux-Backend `demo` branch](https://github.com/faizansaiyed123/FrameFlux-Backend/tree/demo):

```text
NEXT_PUBLIC_FRAMEFLUX_DEMO_BACKEND_URL=http://localhost:8000
```

Start that API from the backend repository:

```bash
python -m pip install fastapi "uvicorn[standard]" python-multipart
uvicorn app.demo.main:app --host 127.0.0.1 --port 8000
```

Then start this frontend with the demo API configured:

```bash
NEXT_PUBLIC_FRAMEFLUX_DEMO=true NEXT_PUBLIC_FRAMEFLUX_DEMO_BACKEND_URL=http://127.0.0.1:8000 npm run dev
```

The backend demo is an **in-memory simulation**, not the production media
processing stack. It does not use PostgreSQL, Redis, or FFmpeg. Project and media
actions, uploads, and job progress are interactive, but generated media files
are representative placeholders rather than actual transcoded exports. Backend
state resets when that demo server process restarts. The browser-only mode
remains available as a fallback and persists its workspace in browser storage.

Use the profile menu inside the dashboard to reset the workspace. When the
standalone API is connected, the reset action resets both the browser workspace
and backend demo state.

The `demo` branch also includes an automated full-stack check: it starts the
standalone backend, builds and starts the frontend against it, and runs
Playwright browser tests for dashboard loading, project creation, resumable
upload, and processing-job progress.

This demo behavior exists only on the `demo` branch. The production
application on `main` continues to use `NEXT_PUBLIC_API_URL` and its normal
backend authentication flow.
