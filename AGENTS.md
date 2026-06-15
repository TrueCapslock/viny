<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:dcc-agent-rules -->
# Developer Control Center (DCC)

`dcc` is a TUI launcher for project commands. Config lives in `dcc.config.js`.

## Build & Run
- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- TypeScript check: `npx tsc --noEmit`
- Prisma Studio: `npx prisma studio`
- Prisma migrate: `npx prisma migrate dev`
- Prisma generate: `npx prisma generate`

## Launch DCC
- `npx dcc` — runs from project root using `dcc.config.js`
<!-- END:dcc-agent-rules -->
