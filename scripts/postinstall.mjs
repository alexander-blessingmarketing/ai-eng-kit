/**
 * Laeuft automatisch nach jedem `npm install`.
 *
 * Aktiviert die versionierten Git-Hooks (.githooks/pre-push), die direkte
 * Pushes auf main abfangen.
 *
 * Warum hier und nicht als Anleitung: `/verify-setup` ist eine managed Datei
 * des Kits und kennt diese Fork-Ergaenzung nicht — anfassen duerfen wir sie
 * nicht, das naechste `update` wuerde es ueberschreiben. Ein Handgriff, an den
 * sich jeder erinnern muss, wird frueher oder spaeter vergessen. `npm install`
 * laeuft dagegen ohnehin, auch aus `/verify-setup` heraus.
 *
 * Bricht nie ab: In einer CI-Checkout, einem Build-Container oder einem
 * Nicht-Git-Verzeichnis gibt es nichts zu tun, und ein fehlgeschlagenes
 * postinstall wuerde dort die Installation killen.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

function still(...args) {
  return execFileSync("git", args, { stdio: ["ignore", "pipe", "ignore"] })
    .toString()
    .trim();
}

try {
  if (!existsSync(".githooks")) process.exit(0);

  // Kein Git-Repo (z. B. Tarball-Install, Docker-Build) → nichts zu tun.
  still("rev-parse", "--git-dir");

  const gesetzt = (() => {
    try {
      return still("config", "--get", "core.hooksPath");
    } catch {
      return "";
    }
  })();

  if (gesetzt === ".githooks") process.exit(0);

  still("config", "core.hooksPath", ".githooks");
  console.log(
    "✓ Git-Hooks aktiviert (.githooks) — direkte Pushes auf main werden abgefangen.",
  );
} catch {
  // Absicht: kein Git, keine Rechte, was auch immer — die Installation soll
  // deshalb nicht scheitern. Der Hook ist ein Komfort-Netz, kein Muss; der
  // eigentliche Schutz ist das Ruleset auf GitHub.
}
