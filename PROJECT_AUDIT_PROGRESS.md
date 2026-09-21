# FrameFlux Frontend Engineering Audit

Base branch: qa/full-e2e-testing
Verified head at audit start: d5fe181cf37f43036d2a119292601f733517dfa0

Status vocabulary: NOT_STARTED | IN_PROGRESS | FIXED | TESTING | PASSED | FAILED | BLOCKED

## Coverage
| Area | Status | Notes |
|---|---|---|
| Repository/branch state | PASSED | Branch and head verified remotely |
| Authentication/session | IN_PROGRESS | Review token/session restoration and protected routing |
| Dashboard | IN_PROGRESS | Core route exists; E2E has selector issues |
| Projects | IN_PROGRESS | Folder setup/test environment issues |
| Media library | IN_PROGRESS | Multiple upload present; filters/organization need alignment |
| Uploads | IN_PROGRESS | Resumable controls need UI verification |
| Media processing | IN_PROGRESS | Core processing exists; exhaustive regressions pending |
| Video editor | IN_PROGRESS | Core editor exists; UI selectors/options need verification |
| Audio | IN_PROGRESS | Rich controls exist; backend failures under investigation |
| Subtitles | IN_PROGRESS | Sync/edit contract mismatches found |
| Thumbnails | IN_PROGRESS | Backend endpoint failure under investigation |
| GIF/preview | IN_PROGRESS | Coverage present |
| Conversion/WebM | IN_PROGRESS | WebM integration exists; exhaustive run failed on FFmpeg |
| Batch | IN_PROGRESS | API/UI coverage present |
| Favorites | IN_PROGRESS | Focused QA history exists |
| Search | IN_PROGRESS | UI/API present |
| Workflows | IN_PROGRESS | UI/API present; exhaustive selector issues |
| Presets | IN_PROGRESS | UI/API present; test selector issue |
| Sharing | IN_PROGRESS | Embed/player failure under investigation |
| Notifications | IN_PROGRESS | UI/API present |
| History | IN_PROGRESS | Current backend is list/create; richer test expectations exceed contract |
| Storage | IN_PROGRESS | Current product exposes usage; richer destructive-management expectations exceed contract |
| Settings/preferences | IN_PROGRESS | Preference method contract needs alignment |
| Responsive/accessibility | IN_PROGRESS | Existing coverage has selector/strict-mode failures |
| Security | IN_PROGRESS | No unsafe HTML sink found in inspected source; token storage requires review |
| TypeScript | NOT_STARTED | Run after first correction batch |
| ESLint | NOT_STARTED | Run after first correction batch |
| Production build | NOT_STARTED | Run after first correction batch |
| Playwright full suite | FAILED | Baseline: 184 tests, 140 passed, 44 failed |

## Findings
| ID | Feature | Severity | File | Problem | Root cause | Fix | Verification |
|---|---|---|---|---|---|---|---|
| AUD-001 | Resumable retry | HIGH | lib/api/client.ts | Retry URL uses /retry/{index} | Backend route is POST /retry with index query parameter | Pending | Pending |
| AUD-002 | Subtitle sync | HIGH | SubtitleForm.tsx/client | Caller omits required subtitle_path and expects JSON preview while client returns Blob | Frontend/backend contract mismatch | Pending | Pending |
| AUD-003 | Preferences test | MEDIUM | e2e/backend-feature-matrix.spec.ts | Test posts to PUT-only preference endpoint | Stale test HTTP method | Pending | Pending |
| AUD-004 | Exhaustive DB setup | HIGH | .github/workflows/frameflux-final-exhaustive.yml | project_folders table missing during exhaustive run | ProjectFolder model not registered before create_all | Pending | Pending |
| AUD-005 | Compression label | MEDIUM | components/dashboard/media/CompressForm.tsx | getByLabel cannot find target-size input | Label/input association issue | Pending | Pending |
| AUD-006 | Multiple checklist expectations | MEDIUM | e2e checklist/UI tests | Several tests assume controls not present or use brittle selectors | Test/product contract drift | Pending | Pending |

## Verification rule
A feature is only marked PASSED after an execution-backed test or verification. Static inspection alone is not sufficient.
