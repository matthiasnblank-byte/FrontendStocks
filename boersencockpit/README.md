# BörsenCockpit – Phase 1 Fundament

BörsenCockpit ist der Startpunkt für ein webbasiertes Dashboard rund um Aktien- und Portfoliodaten. Phase 1 legt die technische Basis mit Angular 17, Tailwind CSS und einer klaren Tooling-Strategie für weitere Ausbaustufen.

## Mindestanforderungen & Tech-Stack

| Tool | Version |
| --- | --- |
| Node.js | >= 20.x |
| npm | >= 10.x |
| Angular | 17.x (Standalone Components) |
| Tailwind CSS | 3.x |
| Jest | 29.x (mit jest-preset-angular) |
| Cypress | 13.x |
| ESLint / Prettier | aktuell integriert |

Weitere Kernabhängigkeiten sind in der [`package.json`](./package.json) dokumentiert.

## Loslegen

```bash
npm install
npm run start
# neues Terminal für Tests:
npm run test
npm run e2e
```

Für reproduzierbare Builds empfiehlt sich `npm ci` in CI-Umgebungen.

## Architekturüberblick (Phase 1)

- **Standalone Bootstrap** via `bootstrapApplication` in [`src/main.ts`](./src/main.ts) mit registriertem `de-DE` Locale und globalen Providern für `LOCALE_ID`, `DEFAULT_CURRENCY_CODE` (EUR) sowie dem Injection-Token [`APP_TIMEZONE`](./src/app/core/tokens/timezone.token.ts).
- **Routing-Grundlage**: [`provideRouter`](./src/app/app.config.ts) mit `withInMemoryScrolling` und Platzhalter-Routen für `/portfolio` und `/stocks`, jeweils als eigenständige Standalone-Komponenten.
- **UI-Skelett**: Header, Navigation und Content-Container folgen Tailwind-Komponentenklassen (`.app-container`, `.card`, `.btn`, `.badge`). Die Locale-Funktionalität wird über einen sichtbaren Currency-Pipe-Check demonstriert.
- **Utilities**: [`formatInAppTimezone`](./src/app/core/utils/timezone.util.ts) kapselt die Zeitzonen-Konfiguration (placeholder für spätere date-fns-tz-Integration).

## Tailwind, Linting & Testing

- **Tailwind** läuft im JIT-Modus via [`tailwind.config.js`](./tailwind.config.js) und greift auf alle Angular-Templates (`./src/**/*.{html,ts}`) zu. Zusätzliche Komponenten-Layer definieren Basis-Utilities.
- **ESLint & Prettier** teilen sich die Konfiguration in [.eslintrc.cjs](./.eslintrc.cjs) bzw. [.prettierrc](./.prettierrc). Striktes TypeScript ist aktiv (`"strict": true`) und `any` ist nicht erlaubt.
- **Jest** ersetzt Karma: [`jest.config.cjs`](./jest.config.cjs) + [`src/setup-jest.ts`](./src/setup-jest.ts) sorgen für Angular-Testumgebung. Beispieltests prüfen Locale/Timezone.
- **Cypress** liefert einen ersten Smoke-Test in [`cypress/e2e/smoke.cy.ts`](./cypress/e2e/smoke.cy.ts), inklusive Navigation zwischen den Platzhalterseiten.

## Arbeitsweise & Konventionen

- **Linting**: `npm run lint` (ESLint über `.ts` und `.html`).
- **Formatting**: `npm run format` formatiert TypeScript, HTML, CSS, Markdown und JSON.
- **Commits**: Aussagekräftige Messages, optional Conventional Commits. Tests & Linting sollten vor dem Push grün sein.

## Bekannte Stolpersteine

- **Jest + TypeScript Paths**: Bei neuen Aliasen `paths` in `tsconfig.json` nicht vergessen, auch `jest.config.cjs` anzupassen.
- **ESM in Dependencies**: Sollte Jest mit ESM-Paketen hadern, `transformIgnorePatterns` erweitern.
- **Tailwind Purge**: Neue Template-Verzeichnisse müssen in `tailwind.config.js` eingetragen werden.
- **Cypress**: E2E-Tests erwarten ein laufendes `npm run start` unter `http://localhost:4200`.

## Roadmap – Ausblick auf Phase 2–6

1. **Phase 2** – Daten- und Zeitformatierung (echte Zeitzonen-Logik, Datumspipes, API-Adapter).
2. **Phase 3** – Portfolio-Datenmodell & Services.
3. **Phase 4** – Theming & Dark-Mode-Toggle.
4. **Phase 5** – Charting & Interaktive Visualisierungen.
5. **Phase 6** – Deployment-Pipeline & Observability.

