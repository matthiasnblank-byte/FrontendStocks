# Beitragen zum Börsencockpit

Danke, dass du zur Qualität des Projekts beitragen möchtest! Dieses Dokument erklärt den Ablauf von lokalen Setups, Branch-Strategie, Commit-Konventionen und Qualitätschecks.

## Lokales Setup

1. Stelle sicher, dass Node.js 20.x und npm 10.x installiert sind (`nvm use` liest die `.nvmrc`).
2. Installiere Abhängigkeiten mit `npm ci`.
3. Starte die Anwendung über `npm start` oder nutze `npm run build` für ein Production-Bundle.

## Branch-Strategie

- `main`: stabile, produktionsreife Releases.
- `next`: optionale Vorab-Releases.
- Feature-Branches folgen dem Muster `feature/<beschreibung>` oder `fix/<beschreibung>`.

## Commit-Konvention

Wir verwenden [Conventional Commits](https://www.conventionalcommits.org/) für automatische Versionierung. Beispiele:

- `feat: fügt Dashboard-Filter hinzu`
- `fix: behebt Rundungsfehler im Kurs-Parser`
- `chore(ci): aktualisiert Release-Workflow`

Commits außerhalb des Schemas werden vom `commit-msg`-Hook abgewiesen.

## Qualitätschecks

Vor jedem Commit laufen automatisch die Husky-Hooks:

- `pre-commit`: `npx lint-staged` formatiert und lintet geänderte Dateien.
- `commit-msg`: erzwingt Conventional Commits via `commitlint`.
- `pre-push`: führt `npm run build`, `npm run test:cov` und optional (`HUSKY_SKIP_E2E=1`) `npm run e2e` aus.

Bitte stelle sicher, dass `npm run ci` lokal erfolgreich ist, bevor du einen Pull Request erstellst.

## Tests

- Unit-Tests: `npm run test:cov` (Coverage-Gates > 85/90%).
- E2E-Tests: `npm run e2e` (Cypress, läuft headless in CI).

## Release-Prozess

`semantic-release` läuft automatisch auf `main`, erstellt Tags, aktualisiert die `CHANGELOG.md` und publiziert Artefakte im GitHub Release. Nutze Conventional Commits, um automatische Versionierung zu steuern (`feat` => Minor, `fix` => Patch, `BREAKING CHANGE` => Major).

## Security & Compliance

- Abhängigkeiten prüfen: `npm run audit` (lokal, toleriert moderate Findings) und `npm run licenses:check` (strikte Lizenz-Policy).
- Secrets werden über `.env` geladen. Beispielwerte findest du in `.env.example`. Die Datei `.env` ist gitignored und darf nicht eingecheckt werden.

Danke für deinen Beitrag!
