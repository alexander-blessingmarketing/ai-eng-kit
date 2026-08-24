# Rulesets

`main.json` ist der Schutz für `main`, zum Import in GitHub. Die Datei wird von GitHub **nicht** automatisch gelesen — sie liegt hier, damit die Einstellung versioniert und nachvollziehbar ist. Wer sie ändert, muss sie in GitHub neu importieren.

## Reihenfolge — wichtig

Das Ruleset verlangt einen Pull Request für jede Änderung an `main`. Das gilt auch für den **allerersten** Push, der `main` überhaupt erst anlegt. Wer zuerst importiert und dann pusht, sperrt sich aus.

1. `main` pushen (`git push -u origin main` — der lokale Pre-Push-Hook fragt nach, `ALLOW_MAIN_PUSH=1` für diesen einen Fall)
2. Einen Test-PR öffnen und den CI-Workflow **einmal** laufen lassen
3. Erst danach importieren

Schritt 2 ist nicht optional: GitHub kennt einen Status-Check-Namen erst, wenn er mindestens einmal gemeldet wurde. Vorher lehnt der Import ihn ab oder verwirft ihn still.

## Import

**Settings → Rules → Rulesets → New ruleset → Import a ruleset**, dann `main.json` hochladen.

## Was drinsteht

| Regel | Wirkung |
|---|---|
| `pull_request` | Kein direkter Push auf `main`, alles läuft über einen PR |
| `required_status_checks` | `Lint + Typecheck + Test` muss grün sein |
| `deletion` | `main` kann nicht gelöscht werden |
| `non_fast_forward` | Kein Force-Push auf `main` |

### Bewusst gesetzte Werte

**`required_approving_review_count: 0`** — GitHub lässt niemanden den eigenen PR freigeben. Bei einer Ein-Personen-Entwicklung würde jeder Wert über 0 bedeuten, dass sich nichts mehr mergen lässt. Sobald ein zweiter Mensch mitarbeitet, gehört hier `1` hin.

**`strict_required_status_checks_policy: true`** — der Branch muss vor dem Merge auf dem Stand von `main` sein. Kostet gelegentlich ein `git rebase`, fängt dafür den Fall ab, dass zwei Branches einzeln grün sind und zusammen kaputt.

**`bypass_actors: []`** — niemand umgeht die Regeln, auch Admins nicht. Kein Risiko, sich auszusperren: Wenn CI einmal hängt, lässt sich das Ruleset in den Settings in Sekunden auf `evaluate` oder `disabled` stellen.

**Kein `integration_id` beim Status-Check** — der Check wird allein über den Namen zugeordnet. Ausreichend, solange nur GitHub Actions Checks meldet.

## Noch nicht enthalten: E2E

`Playwright (gegen Vercel-Preview)` fehlt bewusst. Der Job endet aktuell **grün, wenn gar keine Preview existiert**:

```yaml
- name: Wait for Vercel Preview
  continue-on-error: true          # Fehler wird geschluckt
- name: Run Playwright
  if: steps.vercel-preview.outcome == 'success' && ...   # sonst übersprungen
```

Ohne verknüpfte Vercel-Integration läuft also kein einziger Test, und der Check meldet trotzdem Erfolg. Als Pflicht-Gate wäre das eine Lücke, die aussieht wie ein Schutz — genau das Muster, wegen dem die PR-Pflicht überhaupt eingeführt wurde (`CLAUDE.md` → Key Conventions).

Der Skip selbst ist richtig, solange Vercel nicht angebunden ist. **Sobald es das ist:**

1. `e2e.yml` so ändern, dass eine fehlende Preview den Job **scheitern** lässt statt ihn durchzuwinken
2. Diesen Eintrag in `required_status_checks` ergänzen und neu importieren:

```json
{
  "context": "Playwright (gegen Vercel-Preview)"
}
```

## Status-Check-Namen

GitHub identifiziert Checks über den **Job**-Namen, nicht den Workflow-Namen:

| Datei | `name:` des Workflows | Job-Name = Check |
|---|---|---|
| `ci.yml` | CI | `Lint + Typecheck + Test` |
| `e2e.yml` | E2E | `Playwright (gegen Vercel-Preview)` |

Wer einen Job umbenennt, muss das Ruleset nachziehen — sonst wartet es auf einen Check, den es nicht mehr gibt, und **kein PR wird je mergebar**.

## Verhältnis zum lokalen Hook

`.githooks/pre-push` macht dasselbe auf diesem Rechner. Beides ergänzt sich:

- Der Hook meldet sich **vor** dem Push, spart also den vergeblichen Versuch — wirkt aber nur, wo er aktiviert ist (`git config core.hooksPath .githooks`).
- Das Ruleset wirkt serverseitig für alle und lässt sich nicht umgehen.

Der Hook war der Ersatz, solange das Repo privat und ohne GitHub Pro war. Er darf bleiben.
