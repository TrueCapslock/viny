# Viny

Viny er en personlig vin- og øl-notatapp med kjellerstyring, vennefunksjoner, delte lister og nå også personlige samlinger av dine egne viner.

## Features

- **Vinnotater / ølnotater** — smaksnotater med score, nese, gane, ettersmak, matpairing, pris og sted.
- **Kjellerlager** — hold oversikt over hvor mange flasker du har av hver vin/øl.
- **Venner** — legg til venner og foreslå viner/øl til hverandre.
- **Delte lister** — slå sammen samlingen din med en venns i en felles liste (`/venner`).
- **Personlige lister** (ny fra v0.4.0) — opprett dine egne lister («Favoritter», «Sommer 2024», …) og legg til viner fra hvilken som helst vinside. Lister finner du i den nye «Lister»-fanen i bunnmenyen.
- **Øl-modus** — slå på/av i profilen for å bytte hele appen mellom vin- og øl-tekst (inkl. logo og fargepalett).
- **Vinmonopolet-søk** og **wineapi.io-søk** for å fylle ut nye viner raskt.
- **App-ikon** — Logoen brukes som tab-favicon, iOS home-screen-ikon og PWA-manifest.

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router) + React 19
- [Prisma 7](https://www.prisma.io/) + PostgreSQL (Neon)
- [NextAuth 5](https://authjs.dev/) med credentials-provider
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for bildeopplasting
- [Tailwind 4](https://tailwindcss.com/) + Material Symbols
- [SWR](https://swr.vercel.app/) for klientdata

## Kom i gang

```bash
npm install
npx prisma migrate dev
npm run dev
```

Åpne http://localhost:3000.

## Nyttige kommandoer

Definert i `dcc.config.js`, kjørbar via `npx dcc`:

- `dev`, `build`, `lint`, `typecheck` — utvikling og kvalitetssjekk.
- `studio` — Prisma Studio mot databasen.
- `migrate-dev`, `generate`, `reset-db` — databaseverktøy.
- `kill` — stopp dev-serveren på port 3000.

CI-profilen (`build`, `lint`, `typecheck`) og en «full check»-pipeline er også tilgjengelig.

## Konvensjoner

- Tailwind 4 med Material Symbols-ikoner (`src/app/_components/icons.tsx`).
- Alkoholmodus via `useBeerMode()` (`src/app/_components/beer-mode-provider.tsx`).
- Norsk UI-tekst.
- Spør AGENTS.md / docs i `node_modules/next/dist/docs/` før du skriver filkonvensjons-routes — denne Next-versjonen har adferdsendringer.

## Testing

End-to-end smoke tests kjører med [Playwright](https://playwright.dev/) og dekker de viktigste brukerreisene (per nå: personlige lister). Oppsettet er tre-trinns:

```bash
# 1. Last ned Chromium (engangs, ~150 MB; legges i ~/.cache/ms-playwright)
npx playwright install chromium

# 2. Seed testbruker og en Testvin i databasen (idempotent)
npm run seed:test

# 3. Kjør smoke-testene (Playwright auto-starter dev-server hvis den ikke kjører)
npm run test:e2e
```

`playwright.config.ts` gjenbruker en kjørende dev-server lokalt (`reuseExistingServer: !process.env.CI`), så du trenger ikke stoppe `npm run dev` først. I CI settes `CI=1` og Playwright starter sin egen server. Testene kjører serielt (`workers: 1`) fordi de deler den seeded testbrukerens database-tilstand.

- `npm run test:e2e:ui` — Playwright UI-modus (trinnvis debugging).
- `npm run test:e2e:debug` — debug-modus med Playwright Inspector.

Logger og selectors finner du i `e2e/lists.spec.ts`; den seeded testbrukeren og dens Testvin i `scripts/seed-test-user.ts`.
