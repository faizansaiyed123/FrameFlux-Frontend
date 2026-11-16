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

### Connect through the shared personal-projects tunnel

The shared personal-projects gateway lets multiple local demo APIs use **one Cloudflare Quick Tunnel**. Each project gets a path prefix, while its backend keeps its own local port.

For FrameFlux, configure the gateway route as:

```json
"frameflux": {
  "enabled": true,
  "description": "FrameFlux recruiter demo API",
  "upstream": "http://127.0.0.1:8000",
  "strip_prefix": true,
  "allowed_origins": [
    "https://frame-flux-demo-git-demo-focus-journals-projects.vercel.app"
  ]
}
```

Clone the backend `demo` branch and prepare its isolated Python environment once:

```powershell
cd C:\Users\saiye
git clone --branch demo https://github.com/faizansaiyed123/FrameFlux-Backend.git
cd FrameFlux-Backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install fastapi "uvicorn[standard]" pydantic python-multipart
```

Start the FrameFlux backend API separately on port 8000 (do not start the backend's standalone tunnel script when using the shared gateway):

```powershell
cd C:\Users\saiye\FrameFlux-Backend
.\.venv\Scripts\python.exe -m uvicorn app.demo.main:app --host 127.0.0.1 --port 8000
```

Start the shared gateway once from its own folder with `.`\start-gateway.ps1`. It starts the gateway on port 8787 and creates the single Cloudflare Quick Tunnel. Keep the gateway terminal open while demos are in use.

After Cloudflare prints the one temporary tunnel address, use this FrameFlux-specific frontend URL (replace the host with the current tunnel host):

```text
https://frame-flux-demo-git-demo-focus-journals-projects.vercel.app/?demoBackend=https%3A%2F%2FYOUR-TUNNEL.trycloudflare.com%2Fframeflux
```

Other projects use the same tunnel host with their own paths, for example `/agencyos`. Add each project to the gateway's `config.json` with a unique slug, its own localhost port, and its own allowed frontend origin. The gateway strips the project prefix before forwarding each request.

The frontend validates the HTTPS Cloudflare tunnel host and optional single project path, stores it for the current browser tab session, and removes the parameter from the address bar. When the backend or tunnel is unreachable, the browser-only simulation remains available. A new Quick Tunnel run gets a new host, so generate a fresh frontend link after restarting it.

The older backend-specific tunnel launcher remains available for isolated FrameFlux testing, but do not run it alongside the shared gateway: that would create a second tunnel.

Only use this with the separately deployed Frontend `demo` branch. Do not change or redeploy the production application from `main` to use the demo tunnel.

To switch the current tab back to browser-only simulation, open the frontend with `?demoBackend=local`.

Only use this with the separately deployed Frontend `demo` branch. Do not change or redeploy the production application from `main` to use the demo tunnel.

This demo behavior exists only on the `demo` branch. The production
application on `main` continues to use `NEXT_PUBLIC_API_URL` and its normal
backend authentication flow.
