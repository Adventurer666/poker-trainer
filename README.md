# Poker Trainer

A personal web app for practicing poker hand reading against 8 AI opponents
with distinct, persistent playing styles. Built to run on desktop and phone
browsers alike.

Full product spec: see the "Poker Trainer App — PRD" doc.

## Tech stack

- React + TypeScript + Vite
- Tailwind CSS (minimal visual style, per the PRD)
- Zustand for app/session state
- A dedicated poker engine (hand evaluation, deck, personas) kept separate
  from UI state
- [pokersolver](https://github.com/goldfire/pokersolver) for showdown hand
  evaluation
- Vitest for engine-layer unit tests
- No backend in v1 — session state lives in the browser; deployed on Vercel

## AI opponents

Each of the 8 personas (`src/personas/personas.ts`) is a rule-based,
version-controlled definition: a positional opening-range percentage plus
postflop tendency parameters (c-bet %, bluff %, sizing, etc.). This is
deliberate — the app's core feature scores your hand-reading read against a
*known, reproducible* ground truth, which an LLM-driven or fully randomized
opponent couldn't provide.

## Getting started

```bash
npm install
npm run dev       # start the dev server
npm test          # run the engine test suite once
npm run test:watch
npm run build      # typecheck + production build
```
