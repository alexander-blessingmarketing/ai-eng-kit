# AI Engineering Kit

> Built with the AI Engineering Kit — a spec-driven workflow for Claude Code.

<!-- AI-ENG-KIT:START (managed — do not edit by hand; refreshed by /verify-setup) -->
## AI Engineering Workflow

This project uses the AI Engineering Kit — a spec-driven workflow. Development runs in phases, each driven by a skill:

`/init → /write-spec → /architecture → /tasks → /build → /qa → /deploy`   (`/refine` & `/audit` anytime · `/dsgvo` when personal data is involved · `/e2e-tests` for critical flows · `/security-check` & `/cleanup` after `/deploy`)

- **Feature specs** live in `features/PROJ-X-name/`: `spec.md` (the contract — WHAT), `design.md` (the technical design — HOW), `tasks.md` (the ordered build plan), `qa-report.md` (the test report).
- **Acceptance Criteria** carry stable IDs (`AC-1`, `AC-2`, …). The chain is **AC → Task → Test**.
- **Project status** is tracked in `features/INDEX.md`.
- `spec.md` is **read-only during `/build`** — it is the stable contract.
- **One working language** for the whole project — the conversation *and* every document the skills write, acceptance criteria included. It is recorded under Key Conventions below.

@.claude/rules/general.md
@.claude/rules/security.md
<!-- AI-ENG-KIT:END -->

## Tech Stack

- **Framework:** Next.js 16 (App Router), TypeScript
- **Styling:** Tailwind CSS + shadcn/ui (copy-paste components)
- **Backend:** Supabase (PostgreSQL + Auth + Storage) - optional
- **Deployment:** Vercel or Hostinger (GitHub-connected auto-deploy)
- **Validation:** Zod + react-hook-form
- **State:** React useState / Context API

## Project Structure

```
src/
  app/              Pages (Next.js App Router)
  components/
    ui/             shadcn/ui components (NEVER recreate these)
  hooks/            Custom React hooks
  lib/              Utilities (supabase.ts, utils.ts)
supabase/
  migrations/       Schema changes as .sql files (one per change)
tests/              Playwright E2E tests (added by /e2e-tests)
features/           Feature specs, one folder per feature
  PROJ-X-name/      spec.md, design.md, tasks.md, qa-report.md
  INDEX.md          Feature status overview
docs/
  PRD.md            Product Requirements Document
  data-model.md     App-wide data model (entities + relationships); built by /init, refined by /architecture
  app-shell.md      App-wide frame (navigation, layout regions, page pattern); built by /init, refined by /architecture
  privacy.md        What personal data the product processes, why, how long; kept current by /dsgvo
  production/       Production guides (Sentry, security, performance)
```

## Key Conventions

- **Working language: Deutsch.** Talk to the user in Deutsch and write every project document in Deutsch — see `.claude/rules/general.md` → Working Language.
- **Feature IDs:** PROJ-1, PROJ-2, etc. (sequential)
- **Commits:** `feat(PROJ-X): description`, `fix(PROJ-X): description`
- **Single Responsibility:** One feature per folder
- **Feature branches:** you create a branch `feat/PROJ-X-name` before `/build`; work stays there through build/QA/E2E. `main` always stays deployable.
- **⚠️ Nichts geht direkt nach `main` — `/deploy` merged NICHT selbst, sondern öffnet einen Pull Request.**
  Das weicht bewusst von der Skill `/deploy` (Schritt 3) und von `.claude/rules/general.md` ab, die beide einen direkten Merge beschreiben. **Diese Konvention hier gewinnt.** Beide Dateien sind managed und werden von `create-ai-eng-app update` überschrieben — nach jedem Update gegenprüfen, ob diese Zeile noch greift.

  Ablauf: `/deploy` führt seine Vorabprüfungen und die DB-Promotion wie beschrieben aus, öffnet dann statt des Merges einen PR gegen `main` und **wartet**. Nach grüner CI merged der Mensch, danach macht `/deploy` mit Verifikation und Bookkeeping weiter.

  **Grund:** `.github/workflows/e2e.yml` triggert ausschließlich auf `pull_request`. Es wartet auf die Vercel-Preview und testet gegen diese — also gegen ein echtes Deployment, bevor es live geht. Ohne PR läuft dieser Workflow **nie**, ohne Fehlermeldung und ohne roten Haken. Ein direkter Merge würde die einzige Stelle entfernen, an der eine Regression vor Produktion auffällt. (`ci.yml` läuft auf PR *und* Push, ist also nicht betroffen.)

  **Durchgesetzt wird das lokal, nicht auf GitHub.** Branch Protection und Rulesets brauchen bei privaten Repos GitHub Pro — im Free-Plan liefert die API dafür `403`. Ersatz ist der versionierte Hook `.githooks/pre-push`, der Pushes auf `main` ablehnt.

  Einmalig pro Klon zu aktivieren (`scripts/bootstrap.sh` erledigt das mit):

  ```bash
  git config core.hooksPath .githooks
  ```

  Notausgang, wenn es wirklich sein muss: `ALLOW_MAIN_PUSH=1 git push origin main`.

  Der Hook ist schwächer als serverseitiger Schutz — er wirkt nur auf Rechnern, die ihn aktiviert haben. Er fängt aber den Fall, um den es geht: den versehentlichen Push. Sobald das Repo öffentlich wird oder ein Pro-Plan existiert, gehört zusätzlich echte Branch Protection auf `main`.
- **shadcn/ui first:** NEVER create custom versions of installed shadcn components
- **App shell:** navigation, layout regions, and the page pattern live in `docs/app-shell.md` and belong to the feature recorded there. Reuse those components — never add a second sidebar, header, or nav inside a feature. Changing how the shell behaves is a `/refine` on its owning feature.
- **Parallel build:** `/build` runs file-disjoint [P] tasks from `tasks.md` as isolated subagents
- **Human-in-the-loop:** All workflows have user approval checkpoints
- **Secrets / env files:** Never read, edit, or create `.env.local` (it's permission-blocked and holds your private keys). To document a variable, add a placeholder to `.env.local.example` (the one env file Claude may edit). When a real value is needed, Claude asks you in chat what to paste into `.env.local` — it never writes it itself.
- **Tests:** Unit tests co-located next to source files (`useHook.test.ts` next to `useHook.ts`), written by `/qa`. E2E tests live in `tests/`, added on demand by `/e2e-tests` for critical core journeys only.
- **Supabase environments:** The test-vs-live strategy (`local` / `two-projects` / `single` / `branching`) is chosen at `/init` and recorded in `docs/PRD.md` → Constraints. Default is **`local`** — Supabase runs in Docker while you build, then migrates to a hosted live project at `/deploy` (`supabase db push`). `.env.local` always holds **test** keys, never live. Schema changes are captured as `supabase/migrations/*.sql` and promoted to production at `/deploy`.

## Build & Test Commands

```bash
npm run dev          # Development server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run start        # Production server
npm test             # Vitest unit/integration tests
npm run test:e2e     # Playwright E2E tests
npm run test:all     # Both test suites
```

## Product Context

@docs/PRD.md

## Data Model

@docs/data-model.md

## Feature Overview

@features/INDEX.md
