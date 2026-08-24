# Bekannte Schwächen dieser Basis

> Was hier steht, ist geprüft und bewusst offen — keine Überraschung, sondern eine Liste. Wer auf dieser Basis ein Projekt baut, sollte sie einmal durchgehen und entscheiden, was für den konkreten Fall relevant ist.
>
> Stand: 2026-08-24. Herkunft: Code-Audit beim Zusammenführen des Vorgänger-Kits mit dem AI Engineering Kit 0.4.1.

## Datenschutz

### Session-Recording zeichnet alle Eingaben außer Passwörtern auf

`src/instrumentation-client.ts`:

```ts
session_recording: {
  maskAllInputs: false,
  maskInputOptions: { password: true },
},
```

Jedes Eingabefeld außer Passwort landet im PostHog-Replay — Namen, E-Mail-Adressen, Freitext, Suchbegriffe.

**Für ein Projekt mit echten Nutzerdaten ist das die falsche Voreinstellung.** Empfohlen: `maskAllInputs: true` und gezielt einzelne unkritische Felder freigeben.

Vor dem ersten Deploy mit echten Nutzern per `/dsgvo` bewerten lassen.

### Kein Scrubbing bei der Exception-Erfassung

`capture_exceptions` ist aktiv, ein Gegenstück zu Sentrys `beforeSend` fehlt. Was im Fehlerkontext liegt, geht mit an PostHog. `docs/production/error-tracking.md` beschreibt das Muster für Sentry — für PostHog ist es nicht umgesetzt.

### Pageviews erfassen die vollständige URL inklusive Query-String

`src/components/posthog-pageview.tsx` hängt `?…` an. Solange keine URL personenbezogene Parameter trägt, unkritisch — und `.claude/rules/security.md` verbietet PII in URLs ohnehin. Es ist aber eine stille Kopplung: Ein Filter mit E-Mail-Adresse in der URL landet damit bei PostHog.

### `identify()` überträgt E-Mail und Name

`src/hooks/use-posthog-identity.ts` — beabsichtigt und normal, gehört aber ins Verarbeitungsverzeichnis. `/dsgvo` legt dafür `docs/privacy.md` an.

## Sicherheit

### Rate-Limit zählt nur pro IP, nicht pro Account

`src/app/login/actions.ts` ruft `checkRateLimit(ip, "login")`. Ein verteilter Angriff auf ein Konto und Credential Stuffing laufen damit in kein Limit.

Die Tabelle kann beides — `identifier` ist freier Text. Ein zweiter Aufruf mit `email:<adresse>` schließt die Lücke. Gehört in die Acceptance Criteria des Auth-Features, sobald es eine Spec dafür gibt. Details: [architektur/rate-limiting.md](architektur/rate-limiting.md).

### Rate-Limit fällt bei Fehler offen aus

Schlägt die RPC fehl, wird der Request erlaubt. Bewusste Entscheidung (Verfügbarkeit vor Härte), aber es wird nur `console.error` geschrieben — ein dauerhaft kaputtes Rate-Limit bleibt unsichtbar. Der Logging-Stack steht; hier gehört ein `logger.error` mit `request_id` hin.

### Keine CSP, keine Permissions-Policy

`next.config.ts` setzt vier Header: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`. Es fehlen `Content-Security-Policy` und `Permissions-Policy`.

`docs/production/security-headers.md` liefert eine fertige Nonce-basierte CSP — mit der wichtigen Warnung, **niemals** `script-src 'self' 'unsafe-inline'` auszuliefern. Anpassung nötig: Das Beispiel liegt dort in `middleware.ts`, unter Next 16 heißt die Datei `src/proxy.ts`.

`/security-check` prüft beide Header gegen die Live-Seite und wird sie melden.

### Health-Endpoint gibt DB-Fehlermeldungen nach außen

`src/app/api/health/route.ts` gibt `error.message` im 503 zurück. Der Endpoint ist unauthentifiziert erreichbar, und Postgres-Meldungen können Schema- und Rollennamen enthalten. Für Uptime-Monitoring reicht der Statuscode.

## Betrieb

### Plattform-Kopplung an Vercel

Fünf Stellen lesen `NEXT_PUBLIC_VERCEL_ENV` bzw. `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`. Auf einem anderen Host — `/deploy` unterstützt auch Hostinger — fallen alle Environment-Labels still auf `"development"` und die Release-Version auf `"unknown"`. Kein Absturz, aber falsche Zuordnung in PostHog.

### Ein HTTP-Request pro Logzeile

`src/instrumentation-node.ts` nutzt einen `SimpleLogRecordProcessor`, der synchron exportiert. Bei der erwarteten Menge unauffällig; unter Last ist der Wechsel auf `BatchLogRecordProcessor` die erste Stellschraube.

### Sourcemap-Upload ist nicht aktiv

`@posthog/nextjs-config` ist nicht installiert, der Aufruf in `next.config.ts` steht als Kommentar. Ohne Aktivierung bleiben Stack-Traces in PostHog minifiziert. Anleitung: `docs/production/posthog-sourcemaps.md`.

## Was bereits behoben ist

Der Vollständigkeit halber, damit niemand doppelt sucht:

| Was | Wie |
|---|---|
| `rate_limits` ohne RLS | `enable row level security` + `revoke` in Migration 002 |
| `getClientIp()` nahm den fälschbaren linkesten `x-forwarded-for`-Eintrag | Jetzt `x-real-ip` zuerst, sonst der rechteste Eintrag |
| `tsconfig.json` ohne Test-Typen | `"types": ["vitest/globals", "@testing-library/jest-dom"]` |
| Vitest lud die Playwright-Specs aus `tests/` | `include`/`exclude` gesetzt |
| Observability-Skill dokumentierte sechs falsche APIs | An den Code angeglichen |
