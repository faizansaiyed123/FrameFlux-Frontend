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

The backend is maintained in a separate repository and must be running separately when the frontend makes API requests.

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

Do not hardcode the backend URL into Docker configuration outside the environment/build-argument mechanism.

Because this is a `NEXT_PUBLIC_` variable, the value is embedded into the Next.js client bundle during the build.

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

No backend, PostgreSQL, Redis, worker, or other service is started by this repository.

## Configure the backend for Docker

Set the API URL at build time when the backend is exposed on a different host/port:

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

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | No | Base URL of the separately running FrameFlux backend. |

No secrets are required by the frontend container itself.

## Manual setup

Start the backend separately from `FrameFlux-Backend` before using API-backed features:

```bash
cd FrameFlux-Backend
python run.py
```

Then start the frontend from this repository with either `npm run dev` or Docker Compose.
