# FrameFlux Frontend

The web client for **FrameFlux**, a media-processing workspace built around asynchronous server-side processing.

The frontend is a Next.js application with React, TypeScript, Zustand and Radix UI. It communicates with the FrameFlux backend through a centralized API boundary and presents upload, media, processing and workspace flows without coupling the UI to the worker implementation.

## Product surface

The repository is structured as a full application rather than a single-page demo. The UI is built around the backend capabilities exposed by FrameFlux, including:

- media upload and processing workflows
- resumable upload flows
- processing/job state and progress
- previews and media information
- projects and project-level operations
- editing and transformation controls
- favorites, quick actions and reusable presets
- workflows, versions and comparisons
- sharing, history, storage and search surfaces
- authenticated workspace navigation

The backend remains responsible for authorization, media validation, job execution and persistent state.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         Next.js App                           │
│  pages / workspace UI / forms / dialogs / state composition  │
└────────────────────────────┬─────────────────────────────────┘
                             │
                      typed client boundary
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                       FrameFlux API                           │
│     auth · media · jobs · projects · processing · search     │
└────────────────────────────┬─────────────────────────────────┘
                             │
                ┌────────────┴─────────────┐
                ▼                          ▼
         PostgreSQL + storage       Redis / ARQ workers
                                         │
                                         ▼
                                      FFmpeg
```

### Frontend responsibilities

- compose product screens from reusable UI primitives
- keep browser state predictable with Zustand
- centralize API communication
- provide loading, error and confirmation states around asynchronous operations
- present long-running processing state without performing media work in the browser

### Backend responsibilities

- validate and persist uploaded media
- authorize protected operations
- enqueue expensive work
- run FFmpeg processing in background workers
- track job state and progress
- expose durable project/media metadata

## Engineering highlights

### Asynchronous processing

FrameFlux is designed around the reality that transcoding and media transformation are long-running operations. The UI treats processing as a job lifecycle instead of blocking a request while FFmpeg runs.

### Resumable uploads

Large media is not treated as a single fragile browser request. The backend exposes session-based chunk upload operations with pause, resume, retry, cancellation and finalization; the frontend provides the corresponding user flow.

### Centralized API boundary

The frontend keeps backend communication behind a dedicated client layer. This avoids scattering endpoint strings, authentication headers and response handling across presentation components.

### Product-scale UI state

The application has separate concerns for authentication, workspace data, media operations and feature surfaces such as projects, workflows, history and sharing. Reusable components and typed state reduce coupling between these surfaces.

### Browser verification

Playwright is included as a development dependency for browser-level verification. The application can therefore be exercised against the real frontend/backend boundary without coupling QA concerns to presentation components.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 |
| UI | React 19 |
| Language | TypeScript |
| State | Zustand |
| UI primitives | Radix UI |
| Styling | Tailwind CSS |
| Icons | lucide-react |
| Browser QA | Playwright |
| Backend | FastAPI |
| Data | PostgreSQL |
| Async processing | Redis + ARQ |
| Media engine | FFmpeg |

## Local development

### Prerequisites

- Node.js compatible with the project's Next.js toolchain
- npm
- a running FrameFlux backend
- PostgreSQL / Redis / worker services as required by the backend environment

### Install

```bash
npm ci
```

### Start development

```bash
npm run dev
```

The Next.js development server runs on the configured local port, commonly:

```
http://localhost:3000
```

### Production build

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```

## Configuration

The frontend is intentionally configured with browser-safe values only.

The application may use a public API origin for browser requests. Private database, queue, signing-key or storage credentials belong to the backend environment and must never be placed in client-exposed variables.

## Repository map

```
FrameFlux-Frontend/
├── app/                 # Next.js application routes and layouts
├── components/          # dashboard, landing and shared UI
├── hooks/               # browser/application hooks
├── lib/api/             # centralized API + resumable-upload clients
├── public/              # static assets
├── package.json
├── next.config.ts
└── tsconfig.json
```

The exact directory set evolves with the product; the important boundary is that presentation, browser state and API communication remain separable.

## Project links

- Backend: https://github.com/faizansaiyed123/FrameFlux-Backend
- Frontend: https://github.com/faizansaiyed123/FrameFlux-Frontend

## Scope

FrameFlux is a personal engineering project focused on building a coherent full-stack media-processing system. The repository documents the implementation itself; it should not be read as a claim of operating a public production video-processing service at internet scale.

## License

MIT
